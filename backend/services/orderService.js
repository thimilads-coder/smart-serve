import { analyzeEstimationAccuracy, ACCURACY_FORMULA, ITEM_NOTE } from '../algorithms/accuracy.js';
import { detectDelays, detectOrderDelay, DELAY_RULE } from '../algorithms/delayDetection.js';
import { calculateActualDuration } from '../algorithms/preparationTime.js';
import { linearSearchOrders } from '../algorithms/search.js';
import { calculateWorkload } from '../algorithms/workload.js';
import { HttpError } from '../errors/HttpError.js';
import { normalizeCreateOrder, validateCreateOrder } from '../validation/orderValidation.js';

const STATUSES = ['PENDING', 'PREPARING', 'COMPLETED', 'CANCELLED'];

function parseId(id) {
  const value = Number(id);
  if (!Number.isInteger(value) || value <= 0) {
    throw new HttpError(400, 'Order id must be a positive whole number.');
  }
  return value;
}

export function createOrderService({ repository, queue, now = () => new Date() }) {
  let gate = Promise.resolve();

  // One mutation at a time so two starts cannot dequeue the same order.
  function withGate(task) {
    const run = gate.then(task, task);
    gate = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  function present(order, clock = now()) {
    if (!order) return null;
    return {
      ...order,
      items: (order.items || []).map((item) => ({ ...item })),
      actualDuration: calculateActualDuration(order),
      delay: detectOrderDelay(order, clock),
    };
  }

  async function rebuildQueue() {
    // Pending rows in arrival order, then enqueue front to rear.
    const pending = await repository.findPendingOrdered();
    queue.clear();
    for (const order of pending) queue.enqueue(order);
    return queue.toArray();
  }

  async function syncQueue() {
    const pending = await repository.findPendingOrdered();
    const queuedIds = queue.toArray().map((order) => order.id);
    const pendingIds = pending.map((order) => order.id);
    const matches =
      queuedIds.length === pendingIds.length &&
      queuedIds.every((id, index) => id === pendingIds[index]);

    if (!matches) {
      queue.clear();
      for (const order of pending) queue.enqueue(order);
    }
  }

  async function createOrder(input) {
    const error = validateCreateOrder(input);
    if (error) throw new HttpError(400, error);
    const payload = normalizeCreateOrder(input);

    return withGate(async () => {
      // Server time decides queue order. A client timestamp is ignored.
      const createdAt = now();
      const order = await repository.createOrder({ ...payload, createdAt });
      queue.enqueue(order);
      return present(order, createdAt);
    });
  }

  async function startNext() {
    return withGate(async () => {
      if (queue.isEmpty()) await rebuildQueue();

      let front = queue.peek();
      if (front) {
        const current = await repository.findById(front.id);
        if (!current || current.status !== 'PENDING') await rebuildQueue();
      }

      // 1. Oldest pending order is at the front.
      front = queue.peek();
      if (!front) {
        throw new HttpError(404, 'The queue is empty. There is no order to start.');
      }

      // 2–3. It is still the front order. Remove it. O(1).
      const dequeued = queue.dequeue();
      const startedAt = now();

      try {
        // 4–6. PREPARING plus start time, only if the row is still PENDING.
        const updated = await repository.markPreparing(dequeued.id, startedAt);
        if (!updated) {
          await rebuildQueue();
          throw new HttpError(409, 'That order is no longer pending, so it was not started.');
        }
        return present(updated, startedAt);
      } catch (error) {
        if (!(error instanceof HttpError)) await rebuildQueue();
        throw error;
      }
    });
  }

  async function completeOrder(id) {
    const orderId = parseId(id);
    return withGate(async () => {
      const completedAt = now();
      const updated = await repository.markCompleted(orderId, completedAt);
      if (!updated) {
        const existing = await repository.findById(orderId);
        if (!existing) throw new HttpError(404, 'Order not found.');
        throw new HttpError(409, 'Only a preparing order can be completed.');
      }
      return present(updated, completedAt);
    });
  }

  async function cancelOrder(id) {
    const orderId = parseId(id);
    return withGate(async () => {
      // Deletion algorithm: unlink this id in the linked list. O(n).
      queue.removeByOrderId(orderId);
      try {
        const updated = await repository.markCancelled(orderId);
        if (!updated) {
          await rebuildQueue();
          const existing = await repository.findById(orderId);
          if (!existing) throw new HttpError(404, 'Order not found.');
          throw new HttpError(409, 'Only a pending order can be cancelled.');
        }
        return present(updated);
      } catch (error) {
        if (!(error instanceof HttpError)) await rebuildQueue();
        throw error;
      }
    });
  }

  async function getQueue() {
    await syncQueue();
    const ids = queue.toArray().map((order) => order.id);
    const byId = await repository.findByIds(ids);
    const orders = [];

    for (const id of ids) {
      const fresh = byId.get(id);
      if (fresh && fresh.status === 'PENDING') orders.push(present(fresh));
    }

    return {
      nextOrder: orders[0] ? { ...orders[0], queuePosition: 1, isNext: true } : null,
      orders: orders.map((order, index) => ({
        ...order,
        queuePosition: index + 1,
        isNext: index === 0,
      })),
      meta: {
        structure: 'Queue (FIFO) backed by a singly linked list',
        enqueue: 'O(1)',
        dequeue: 'O(1)',
        peek: 'O(1)',
        removal: 'O(n) linked-list deletion when cancelling',
      },
    };
  }

  async function listOrders(status) {
    let filter = status;
    if (Array.isArray(filter)) {
      throw new HttpError(400, 'Status must be a single value.');
    }
    if (typeof filter === 'string') filter = filter.trim();
    if (!filter) filter = undefined;
    if (filter && !STATUSES.includes(filter)) {
      throw new HttpError(400, 'Status must be PENDING, PREPARING, COMPLETED, or CANCELLED.');
    }

    const orders = filter ? await repository.findByStatus(filter) : await repository.findAll();
    const clock = now();
    return orders.map((order) => present(order, clock));
  }

  async function getOrder(id) {
    const order = await repository.findById(parseId(id));
    if (!order) throw new HttpError(404, 'Order not found.');
    return present(order);
  }

  async function searchOrders(query) {
    const term = typeof query === 'string' ? query.trim() : '';
    if (!term) throw new HttpError(400, 'Enter an order id or customer name.');

    // Load records, then search in memory. This is not a SQL search.
    const orders = await repository.findAll();
    const clock = now();
    return {
      orders: linearSearchOrders(orders, term).map((order) => present(order, clock)),
      meta: {
        algorithm: 'Linear search',
        bestCase: 'O(1) when stopping at the first match',
        averageCase: 'O(n)',
        worstCase: 'O(n)',
        collectedMatches: 'O(n), the full list is scanned',
        searched: orders.length,
      },
    };
  }

  async function getDashboard() {
    const orders = await repository.findAll();
    await syncQueue();
    const clock = now();
    const summary = calculateWorkload(orders);
    const delayedOrders = detectDelays(orders, clock).map((order) => present(order, clock));
    const queued = queue.toArray();
    const next = queued.length ? orders.find((order) => order.id === queued[0].id) : null;

    return {
      delayRule: DELAY_RULE,
      summary: {
        ...summary,
        queueSize: queue.size(),
        delayedCount: delayedOrders.length,
        nextOrder: next ? present(next, clock) : null,
      },
      delayedOrders,
      queue: queued.map((snapshot, index) => {
        const fresh = orders.find((order) => order.id === snapshot.id) || snapshot;
        return {
          ...present(fresh, clock),
          queuePosition: index + 1,
          isNext: index === 0,
        };
      }),
    };
  }

  async function getDelays() {
    const orders = await repository.findAll();
    const clock = now();
    return {
      rule: DELAY_RULE,
      orders: detectDelays(orders, clock).map((order) => present(order, clock)),
    };
  }

  async function getAccuracy() {
    const orders = await repository.findAll();
    const accuracy = analyzeEstimationAccuracy(orders);
    return {
      formula: ACCURACY_FORMULA,
      itemNote: ITEM_NOTE,
      averageErrorMinutes: accuracy.averageErrorMinutes,
      sampleCount: accuracy.samples.length,
      orders: accuracy.samples.map((sample) => ({
        ...present(sample.order),
        estimatedMinutes: sample.estimatedMinutes,
        actualMinutes: sample.actualMinutes,
        errorMinutes: sample.errorMinutes,
      })),
      items: accuracy.items,
    };
  }

  return {
    rebuildQueue,
    createOrder,
    startNext,
    completeOrder,
    cancelOrder,
    getQueue,
    listOrders,
    getOrder,
    searchOrders,
    getDashboard,
    getDelays,
    getAccuracy,
  };
}
