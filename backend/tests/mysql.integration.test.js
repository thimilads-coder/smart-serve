import fs from 'fs';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import mysql from 'mysql2/promise';
import { createPool } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { Queue } from '../src/dsa/Queue.js';
import { OrderRepository } from '../src/repositories/orderRepository.js';
import { createOrderService } from '../src/services/orderService.js';

const dbName = 'smartserve_test';
let pool;
let ready = false;

async function adminConnection() {
  return mysql.createConnection({
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    multipleStatements: true,
    timezone: 'Z',
  });
}

describe('MySQL order workflow', () => {
  before(async () => {
    const admin = await adminConnection();
    try {
      await admin.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
      await admin.query(
        `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      await admin.query(`USE \`${dbName}\``);
      const sql = fs.readFileSync(new URL('../database/schema.sql', import.meta.url), 'utf8');
      await admin.query(sql);
      pool = createPool(dbName);
      ready = true;
    } finally {
      await admin.end();
    }
  });

  after(async () => {
    if (pool) await pool.end();
    const admin = await adminConnection();
    try {
      await admin.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    } finally {
      await admin.end();
    }
  });

  it('persists FCFS order, blocks a second start, and restores the queue', async () => {
    assert.equal(ready, true);
    const repository = new OrderRepository(pool);
    const queue = new Queue();
    const clock = { time: Date.parse('2026-04-02T09:00:00.000Z') };
    const service = createOrderService({
      repository,
      queue,
      now: () => new Date(clock.time),
    });

    const ada = await service.createOrder({
      customerName: "Ada'); DROP TABLE orders;--",
      estimatedPreparationMinutes: 10,
      notes: 'No onion',
      items: [
        { itemName: 'Soup', quantity: 2, notes: 'Hot' },
        { itemName: 'Bread', quantity: 1 },
      ],
    });
    clock.time += 1000;
    const grace = await service.createOrder({
      customerName: 'Grace',
      estimatedPreparationMinutes: 6,
      items: [{ itemName: 'Salad', quantity: 1 }],
    });

    assert.equal(ada.orderNumber, 'SS-0001');
    assert.equal(ada.customerName, "Ada'); DROP TABLE orders;--");
    assert.equal(ada.items.length, 2);
    assert.equal(ada.createdAt, '2026-04-02T09:00:00.000Z');

    queue.clear();
    const rebuilt = await service.rebuildQueue();
    assert.deepEqual(
      rebuilt.map((order) => order.id),
      [ada.id, grace.id]
    );

    const started = await service.startNext();
    assert.equal(started.id, ada.id);
    assert.equal(started.status, 'PREPARING');
    assert.equal(await repository.markPreparing(ada.id, new Date()), null);

    clock.time += 90_000;
    const completed = await service.completeOrder(ada.id);
    assert.equal(completed.actualDuration.totalSeconds, 90);
    assert.equal(await repository.markCompleted(ada.id, new Date()), null);

    const cancelled = await service.cancelOrder(grace.id);
    assert.equal(cancelled.status, 'CANCELLED');
    assert.equal(queue.isEmpty(), true);

    const found = await service.searchOrders('Grace');
    assert.equal(found.orders[0].id, grace.id);
  });
});
