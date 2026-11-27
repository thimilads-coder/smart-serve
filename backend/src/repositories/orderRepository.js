import { getPool } from '../config/db.js';
import { fromSqlDate, toSqlDate } from '../utils/dates.js';

function mapItem(row) {
  return {
    id: Number(row.id),
    orderId: Number(row.order_id),
    itemName: row.item_name,
    quantity: Number(row.quantity),
    notes: row.notes,
  };
}

function mapOrder(row, items) {
  return {
    id: Number(row.id),
    orderNumber: row.order_number,
    customerName: row.customer_name,
    status: row.status,
    estimatedPreparationMinutes: Number(row.estimated_preparation_minutes),
    createdAt: fromSqlDate(row.created_at),
    startedAt: fromSqlDate(row.started_at),
    completedAt: fromSqlDate(row.completed_at),
    notes: row.notes,
    items,
  };
}

const ORDER_COLUMNS = `
  id, order_number, customer_name, status, estimated_preparation_minutes,
  created_at, started_at, completed_at, notes
`;

export class OrderRepository {
  constructor(pool = getPool()) {
    this.pool = pool;
  }

  async fetchOrders(whereSql, params) {
    const [rows] = await this.pool.query(
      `SELECT ${ORDER_COLUMNS} FROM orders ${whereSql}`,
      params
    );
    if (!rows.length) return [];

    const ids = rows.map((row) => row.id);
    const [itemRows] = await this.pool.query(
      `SELECT id, order_id, item_name, quantity, notes
       FROM order_items
       WHERE order_id IN (?)
       ORDER BY id ASC`,
      [ids]
    );

    const itemsByOrder = new Map();
    for (const row of itemRows) {
      const list = itemsByOrder.get(Number(row.order_id)) || [];
      list.push(mapItem(row));
      itemsByOrder.set(Number(row.order_id), list);
    }

    return rows.map((row) => mapOrder(row, itemsByOrder.get(Number(row.id)) || []));
  }

  async findAll() {
    return this.fetchOrders('ORDER BY created_at ASC, id ASC', []);
  }

  async findByStatus(status) {
    return this.fetchOrders('WHERE status = ? ORDER BY created_at ASC, id ASC', [status]);
  }

  // Arrival order, oldest first. id breaks equal timestamps.
  async findPendingOrdered() {
    return this.fetchOrders(
      "WHERE status = 'PENDING' ORDER BY created_at ASC, id ASC",
      []
    );
  }

  async findById(id) {
    const orders = await this.fetchOrders('WHERE id = ?', [id]);
    return orders[0] || null;
  }

  async findByIds(ids) {
    const map = new Map();
    if (!ids.length) return map;
    const orders = await this.fetchOrders('WHERE id IN (?)', [ids]);
    for (const order of orders) map.set(order.id, order);
    return map;
  }

  async createOrder({ customerName, notes, estimatedPreparationMinutes, items, createdAt }) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const tempNumber = `TMP-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const [result] = await connection.query(
        `INSERT INTO orders
          (order_number, customer_name, status, estimated_preparation_minutes, created_at, notes)
         VALUES (?, ?, 'PENDING', ?, ?, ?)`,
        [tempNumber, customerName, estimatedPreparationMinutes, toSqlDate(createdAt), notes]
      );
      const id = Number(result.insertId);
      const orderNumber = `SS-${String(id).padStart(4, '0')}`;
      await connection.query('UPDATE orders SET order_number = ? WHERE id = ?', [orderNumber, id]);

      for (const item of items) {
        await connection.query(
          `INSERT INTO order_items (order_id, item_name, quantity, notes)
           VALUES (?, ?, ?, ?)`,
          [id, item.itemName, item.quantity, item.notes]
        );
      }

      await connection.commit();
      return this.findById(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Changes the row only while it is still PENDING. Stops a second start.
  async markPreparing(id, startedAt) {
    const [result] = await this.pool.query(
      `UPDATE orders
       SET status = 'PREPARING', started_at = ?
       WHERE id = ? AND status = 'PENDING'`,
      [toSqlDate(startedAt), id]
    );
    if (result.affectedRows !== 1) return null;
    return this.findById(id);
  }

  async markCompleted(id, completedAt) {
    const [result] = await this.pool.query(
      `UPDATE orders
       SET status = 'COMPLETED', completed_at = ?
       WHERE id = ? AND status = 'PREPARING'`,
      [toSqlDate(completedAt), id]
    );
    if (result.affectedRows !== 1) return null;
    return this.findById(id);
  }

  async markCancelled(id) {
    const [result] = await this.pool.query(
      `UPDATE orders
       SET status = 'CANCELLED'
       WHERE id = ? AND status = 'PENDING'`,
      [id]
    );
    if (result.affectedRows !== 1) return null;
    return this.findById(id);
  }
}
