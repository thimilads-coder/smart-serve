import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Queue } from '../src/dsa/Queue.js';
import { HttpError } from '../src/errors/HttpError.js';
import { createOrderService } from '../src/services/orderService.js';
import { InMemoryOrderRepository } from './inMemoryOrderRepository.js';

function setup() {
  const clock = { time: Date.parse('2026-01-01T10:00:00.000Z') };
  const repository = new InMemoryOrderRepository();
  const queue = new Queue();
  const service = createOrderService({
    repository,
    queue,
    now: () => new Date(clock.time),
  });
  return { clock, repository, queue, service };
}

function order(name, minutes = 10) {
  return {
    customerName: name,
    estimatedPreparationMinutes: minutes,
    notes: '',
    items: [{ itemName: 'Soup', quantity: 1, notes: '' }],
  };
}

async function rejectsWith(promise, status) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof HttpError);
    assert.equal(error.status, status);
    return true;
  });
}

describe('order workflow', () => {
  it('saves an order and adds it to the rear of the queue', async () => {
    const { service, queue } = setup();
    const first = await service.createOrder(order('Ada'));
    const second = await service.createOrder(order('Grace'));

    assert.equal(first.status, 'PENDING');
    assert.equal(first.orderNumber, 'SS-0001');
    assert.deepEqual(
      queue.toArray().map((item) => item.customerName),
      ['Ada', 'Grace']
    );
    assert.equal(second.id, 2);
  });

  it('ignores a client arrival time', async () => {
    const { service, clock } = setup();
    await service.createOrder({
      ...order('Ada'),
      createdAt: '1999-01-01T00:00:00.000Z',
    });
    const saved = await service.getOrder(1);
    assert.equal(saved.createdAt, new Date(clock.time).toISOString());
  });

  it('starts the oldest pending order', async () => {
    const { service, clock, queue } = setup();
    await service.createOrder(order('Ada'));
    clock.time += 1000;
    await service.createOrder(order('Grace'));
    clock.time += 60_000;

    const started = await service.startNext();
    assert.equal(started.customerName, 'Ada');
    assert.equal(started.status, 'PREPARING');
    assert.equal(started.startedAt, new Date(clock.time).toISOString());
    assert.deepEqual(
      queue.toArray().map((item) => item.customerName),
      ['Grace']
    );
  });

  it('returns a clear error when the queue is empty', async () => {
    const { service } = setup();
    await rejectsWith(service.startNext(), 404);
  });

  it('records the completion time and actual duration', async () => {
    const { service, clock } = setup();
    await service.createOrder(order('Ada'));
    clock.time += 5 * 60 * 1000;
    await service.startNext();
    clock.time += 7 * 60 * 1000 + 30 * 1000;

    const completed = await service.completeOrder(1);
    assert.equal(completed.status, 'COMPLETED');
    assert.equal(completed.actualDuration.totalSeconds, 450);
    assert.equal(completed.actualDuration.minutes, 7);
    assert.equal(completed.actualDuration.seconds, 30);
  });

  it('rejects invalid status changes', async () => {
    const { service } = setup();
    await service.createOrder(order('Ada'));
    await rejectsWith(service.completeOrder(1), 409);
    await service.startNext();
    await rejectsWith(service.cancelOrder(1), 409);
    await service.completeOrder(1);
    await rejectsWith(service.completeOrder(1), 409);
    await rejectsWith(service.getOrder(99), 404);
  });

  it('cancels a middle order with linked-list deletion', async () => {
    const { service, queue } = setup();
    await service.createOrder(order('Ada'));
    await service.createOrder(order('Grace'));
    await service.createOrder(order('Lin'));

    const cancelled = await service.cancelOrder(2);
    assert.equal(cancelled.status, 'CANCELLED');
    assert.deepEqual(
      queue.toArray().map((item) => item.id),
      [1, 3]
    );

    const started = await service.startNext();
    assert.equal(started.customerName, 'Ada');
  });

  it('rebuilds FCFS order from saved arrival times', async () => {
    const { service, queue, clock } = setup();
    await service.createOrder(order('Ada'));
    clock.time += 1000;
    await service.createOrder(order('Grace'));
    clock.time += 1000;
    await service.createOrder(order('Lin'));
    queue.clear();
    queue.enqueue({ id: 99, customerName: 'Not real' });

    const rebuilt = await service.rebuildQueue();
    assert.deepEqual(
      rebuilt.map((item) => item.customerName),
      ['Ada', 'Grace', 'Lin']
    );
  });

  it('keeps equal timestamps in id order', async () => {
    const { service, queue } = setup();
    await service.createOrder(order('Ada'));
    await service.createOrder(order('Grace'));
    queue.clear();
    const rebuilt = await service.rebuildQueue();
    assert.deepEqual(
      rebuilt.map((item) => item.id),
      [1, 2]
    );
  });

  it('does not start the same order twice when start is called together', async () => {
    const { service } = setup();
    await service.createOrder(order('Ada'));
    await service.createOrder(order('Grace'));

    const [first, second] = await Promise.all([service.startNext(), service.startNext()]);
    assert.notEqual(first.id, second.id);
    assert.deepEqual([first.customerName, second.customerName].sort(), ['Ada', 'Grace']);
    assert.equal(first.status, 'PREPARING');
    assert.equal(second.status, 'PREPARING');

    await rejectsWith(service.startNext(), 404);
  });

  it('searches by order number and customer name', async () => {
    const { service } = setup();
    await service.createOrder(order('Ada Lovelace'));
    await service.createOrder({ ...order('Grace Hopper'), customerName: 'Grace Hopper' });

    const byName = await service.searchOrders('ada');
    assert.equal(byName.orders.length, 1);
    assert.equal(byName.orders[0].orderNumber, 'SS-0001');
    assert.equal(byName.meta.algorithm, 'Linear search');

    const byNumber = await service.searchOrders('SS-0002');
    assert.equal(byNumber.orders[0].customerName, 'Grace Hopper');
    await rejectsWith(service.searchOrders('  '), 400);
  });

  it('rejects an incomplete order', async () => {
    const { service } = setup();
    await rejectsWith(service.createOrder({ customerName: 'Ada' }), 400);
    await rejectsWith(
      service.createOrder({ ...order('Ada'), estimatedPreparationMinutes: 0 }),
      400
    );
  });

  it('keeps completed orders out of the workload', async () => {
    const { service, clock } = setup();
    await service.createOrder(order('Ada', 12));
    await service.createOrder(order('Grace', 8));
    await service.startNext();
    clock.time += 60_000;
    await service.completeOrder(1);

    const dashboard = await service.getDashboard();
    assert.equal(dashboard.summary.pending, 1);
    assert.equal(dashboard.summary.preparing, 0);
    assert.equal(dashboard.summary.completed, 1);
    assert.equal(dashboard.summary.activeOrders, 1);
    assert.equal(dashboard.summary.estimatedMinutesRemaining, 8);
    assert.equal(dashboard.summary.queueSize, 1);
    assert.equal(dashboard.summary.nextOrder.customerName, 'Grace');
  });
});
