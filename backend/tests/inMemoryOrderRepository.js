function cloneOrder(order) {
  return {
    ...order,
    items: order.items.map((item) => ({ ...item })),
  };
}

function byArrival(a, b) {
  const time = new Date(a.createdAt) - new Date(b.createdAt);
  if (time !== 0) return time;
  return a.id - b.id;
}

// Test double with the same status rules as the MySQL repository.
export class InMemoryOrderRepository {
  constructor() {
    this.orders = new Map();
    this.nextOrderId = 1;
    this.nextItemId = 1;
  }

  async createOrder({ customerName, notes, estimatedPreparationMinutes, items, createdAt }) {
    const id = this.nextOrderId;
    this.nextOrderId += 1;
    const order = {
      id,
      orderNumber: `SS-${String(id).padStart(4, '0')}`,
      customerName,
      status: 'PENDING',
      estimatedPreparationMinutes,
      createdAt: new Date(createdAt).toISOString(),
      startedAt: null,
      completedAt: null,
      notes: notes ?? null,
      items: items.map((item) => ({
        id: this.nextItemId++,
        orderId: id,
        itemName: item.itemName,
        quantity: item.quantity,
        notes: item.notes ?? null,
      })),
    };
    this.orders.set(id, order);
    return cloneOrder(order);
  }

  async findAll() {
    return [...this.orders.values()].sort(byArrival).map(cloneOrder);
  }

  async findByStatus(status) {
    return [...this.orders.values()]
      .filter((order) => order.status === status)
      .sort(byArrival)
      .map(cloneOrder);
  }

  async findPendingOrdered() {
    return this.findByStatus('PENDING');
  }

  async findById(id) {
    const order = this.orders.get(Number(id));
    return order ? cloneOrder(order) : null;
  }

  async findByIds(ids) {
    const map = new Map();
    for (const id of ids) {
      const order = await this.findById(id);
      if (order) map.set(order.id, order);
    }
    return map;
  }

  async markPreparing(id, startedAt) {
    const order = this.orders.get(Number(id));
    if (!order || order.status !== 'PENDING') return null;
    order.status = 'PREPARING';
    order.startedAt = new Date(startedAt).toISOString();
    return cloneOrder(order);
  }

  async markCompleted(id, completedAt) {
    const order = this.orders.get(Number(id));
    if (!order || order.status !== 'PREPARING') return null;
    order.status = 'COMPLETED';
    order.completedAt = new Date(completedAt).toISOString();
    return cloneOrder(order);
  }

  async markCancelled(id) {
    const order = this.orders.get(Number(id));
    if (!order || order.status !== 'PENDING') return null;
    order.status = 'CANCELLED';
    return cloneOrder(order);
  }
}
