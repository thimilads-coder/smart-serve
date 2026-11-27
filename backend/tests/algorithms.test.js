import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyzeEstimationAccuracy } from '../src/algorithms/accuracy.js';
import { detectOrderDelay } from '../src/algorithms/delayDetection.js';
import { calculateActualDuration } from '../src/algorithms/preparationTime.js';
import { linearSearchFirst, linearSearchOrders } from '../src/algorithms/search.js';
import { calculateWorkload } from '../src/algorithms/workload.js';
import { fromSqlDate, toSqlDate } from '../src/utils/dates.js';

const orders = [
  { id: 1, orderNumber: 'SS-0001', customerName: 'Ada Lovelace', status: 'PENDING' },
  { id: 2, orderNumber: 'SS-0002', customerName: 'Grace Hopper', status: 'PREPARING' },
  { id: 12, orderNumber: 'SS-0012', customerName: 'Lin', status: 'COMPLETED' },
];

describe('linear search', () => {
  it('finds an order by id, order number, or customer name', () => {
    assert.equal(linearSearchFirst(orders, '2').customerName, 'Grace Hopper');
    assert.equal(linearSearchFirst(orders, 'ss-0001').id, 1);
    assert.equal(linearSearchFirst(orders, 'grace').id, 2);
    assert.equal(linearSearchFirst(orders, 'missing'), null);
    assert.equal(linearSearchFirst(orders, '   '), null);
  });

  it('returns every name match and ignores a partial order number', () => {
    const matches = linearSearchOrders(
      [
        ...orders,
        { id: 3, orderNumber: 'SS-0003', customerName: 'Grace Kelly', status: 'PENDING' },
      ],
      'Grace'
    );
    assert.deepEqual(
      matches.map((order) => order.id),
      [2, 3]
    );
    assert.deepEqual(linearSearchOrders(orders, '0001'), []);
  });
});

describe('workload', () => {
  it('excludes completed and cancelled orders from active minutes', () => {
    const summary = calculateWorkload([
      { status: 'PENDING', estimatedPreparationMinutes: 10 },
      { status: 'PREPARING', estimatedPreparationMinutes: 5 },
      { status: 'COMPLETED', estimatedPreparationMinutes: 99 },
      { status: 'CANCELLED', estimatedPreparationMinutes: 40 },
    ]);

    assert.equal(summary.totalOrders, 4);
    assert.equal(summary.pending, 1);
    assert.equal(summary.preparing, 1);
    assert.equal(summary.completed, 1);
    assert.equal(summary.cancelled, 1);
    assert.equal(summary.activeOrders, 2);
    assert.equal(summary.estimatedMinutesRemaining, 15);
  });
});

describe('preparation time', () => {
  it('calculates minutes and seconds from start and finish', () => {
    const duration = calculateActualDuration({
      status: 'COMPLETED',
      startedAt: '2026-01-01T10:00:00.000Z',
      completedAt: '2026-01-01T10:07:30.000Z',
    });
    assert.deepEqual(duration, { totalSeconds: 450, minutes: 7, seconds: 30 });
  });

  it('returns null when the order is not completed or times are missing', () => {
    assert.equal(
      calculateActualDuration({
        status: 'PREPARING',
        startedAt: '2026-01-01T10:00:00.000Z',
        completedAt: '2026-01-01T10:07:00.000Z',
      }),
      null
    );
    assert.equal(
      calculateActualDuration({
        status: 'COMPLETED',
        startedAt: null,
        completedAt: '2026-01-01T10:07:00.000Z',
      }),
      null
    );
    assert.equal(
      calculateActualDuration({
        status: 'COMPLETED',
        startedAt: '2026-01-01T10:08:00.000Z',
        completedAt: '2026-01-01T10:07:00.000Z',
      }),
      null
    );
  });
});

describe('delay detection', () => {
  const pending = {
    status: 'PENDING',
    estimatedPreparationMinutes: 10,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('does not flag an order that is still inside its estimate', () => {
    const now = new Date('2026-01-01T00:10:00.000Z');
    assert.equal(detectOrderDelay(pending, now), null);
  });

  it('flags a waiting delay only after the estimate is passed', () => {
    const delay = detectOrderDelay(pending, new Date('2026-01-01T00:12:05.000Z'));
    assert.equal(delay.type, 'WAITING');
    assert.equal(delay.delaySeconds, 125);
  });

  it('uses the preparation start for a preparing order', () => {
    const order = {
      status: 'PREPARING',
      estimatedPreparationMinutes: 10,
      createdAt: '2026-01-01T00:00:00.000Z',
      startedAt: '2026-01-01T00:30:00.000Z',
    };
    assert.equal(detectOrderDelay(order, new Date('2026-01-01T00:35:00.000Z')), null);
    const delay = detectOrderDelay(order, new Date('2026-01-01T00:41:00.000Z'));
    assert.equal(delay.type, 'PREPARATION');
    assert.equal(delay.delaySeconds, 60);
  });

  it('ignores completed orders', () => {
    assert.equal(
      detectOrderDelay({
        status: 'COMPLETED',
        estimatedPreparationMinutes: 5,
        createdAt: '2026-01-01T00:00:00.000Z',
        startedAt: '2026-01-01T00:00:00.000Z',
        completedAt: '2026-01-01T01:00:00.000Z',
      }),
      null
    );
  });
});

describe('estimation accuracy', () => {
  it('ignores incomplete or invalid records and averages the rest', () => {
    const result = analyzeEstimationAccuracy([
      {
        id: 1,
        status: 'COMPLETED',
        estimatedPreparationMinutes: 10,
        startedAt: '2026-01-01T10:00:00.000Z',
        completedAt: '2026-01-01T10:12:00.000Z',
        items: [{ itemName: 'Soup' }, { itemName: 'Soup' }],
      },
      {
        id: 2,
        status: 'COMPLETED',
        estimatedPreparationMinutes: 8,
        startedAt: '2026-01-01T11:00:00.000Z',
        completedAt: '2026-01-01T11:06:00.000Z',
        items: [{ itemName: 'Salad' }],
      },
      {
        id: 3,
        status: 'PREPARING',
        estimatedPreparationMinutes: 30,
        startedAt: '2026-01-01T12:00:00.000Z',
        completedAt: null,
        items: [{ itemName: 'Soup' }],
      },
      {
        id: 4,
        status: 'COMPLETED',
        estimatedPreparationMinutes: 5,
        startedAt: null,
        completedAt: null,
        items: [],
      },
    ]);

    assert.equal(result.samples.length, 2);
    assert.equal(result.averageErrorMinutes, 0);
    assert.deepEqual(result.items.find((item) => item.itemName === 'Soup'), {
      itemName: 'Soup',
      ordersWithItem: 1,
      lateOrders: 1,
      lateRate: 1,
    });
    assert.equal(result.items.find((item) => item.itemName === 'Salad').lateOrders, 0);
  });
});

describe('UTC timestamps', () => {
  it('round-trips a SQL datetime through ISO', () => {
    const iso = '2026-03-15T08:04:05.006Z';
    assert.equal(toSqlDate(iso), '2026-03-15 08:04:05.006');
    assert.equal(fromSqlDate('2026-03-15 08:04:05.006'), iso);
  });
});
