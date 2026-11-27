import { calculateActualDuration } from './preparationTime.js';

export const ACCURACY_FORMULA =
  'Error = actual minutes − estimated minutes. A positive error means the order took longer than estimated. The average uses only completed orders that have an estimate, a start time, and a finish time.';

export const ITEM_NOTE =
  'Items are not timed on their own. An item counts as late when it is on a completed order whose actual time was longer than that order estimate.';

function round(value) {
  if (value == null) return null;
  return Math.round(value * 10000) / 10000;
}

// Compare estimates with actual preparation time. Time O(n).
export function analyzeEstimationAccuracy(orders) {
  const samples = [];

  for (const order of orders) {
    const duration = calculateActualDuration(order);
    const estimatedMinutes = Number(order.estimatedPreparationMinutes);
    if (!duration || !Number.isFinite(estimatedMinutes) || estimatedMinutes <= 0) continue;

    const actualMinutes = duration.totalSeconds / 60;
    samples.push({
      order,
      estimatedMinutes,
      actualMinutes: round(actualMinutes),
      errorMinutes: round(actualMinutes - estimatedMinutes),
    });
  }

  const averageErrorMinutes = samples.length
    ? round(samples.reduce((sum, sample) => sum + sample.errorMinutes, 0) / samples.length)
    : null;

  const items = new Map();
  for (const sample of samples) {
    const late = sample.errorMinutes > 0;
    const seen = new Set();
    for (const item of sample.order.items || []) {
      const name = String(item.itemName || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const current = items.get(key) || {
        itemName: name,
        ordersWithItem: 0,
        lateOrders: 0,
      };
      current.ordersWithItem += 1;
      if (late) current.lateOrders += 1;
      items.set(key, current);
    }
  }

  const itemStats = [...items.values()]
    .map((item) => ({
      ...item,
      lateRate: round(item.ordersWithItem ? item.lateOrders / item.ordersWithItem : 0),
    }))
    .sort((a, b) => b.lateOrders - a.lateOrders || b.lateRate - a.lateRate || a.itemName.localeCompare(b.itemName));

  return { samples, averageErrorMinutes, items: itemStats };
}
