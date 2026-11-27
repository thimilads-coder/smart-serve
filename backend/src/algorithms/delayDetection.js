export const DELAY_RULE =
  'A pending order is a waiting delay when time since arrival is longer than its estimated preparation time. A preparing order is a preparation delay when time since start is longer than that estimate. An order still inside its estimate is not delayed.';

// One order. Returns null when it is not past the estimate. O(1).
export function detectOrderDelay(order, now = new Date()) {
  if (!order) return null;

  const estimatedMinutes = Number(order.estimatedPreparationMinutes);
  if (!Number.isFinite(estimatedMinutes) || estimatedMinutes <= 0) return null;

  const nowMs = new Date(now).getTime();
  if (Number.isNaN(nowMs)) return null;

  let type = null;
  let startedFrom = null;
  if (order.status === 'PENDING') {
    type = 'WAITING';
    startedFrom = order.createdAt;
  } else if (order.status === 'PREPARING') {
    type = 'PREPARATION';
    startedFrom = order.startedAt;
  } else {
    return null;
  }

  const fromMs = new Date(startedFrom).getTime();
  if (Number.isNaN(fromMs)) return null;

  const elapsedSeconds = Math.floor((nowMs - fromMs) / 1000);
  const estimatedSeconds = estimatedMinutes * 60;
  if (elapsedSeconds <= estimatedSeconds) return null;

  return {
    type,
    elapsedSeconds,
    estimatedSeconds,
    delaySeconds: elapsedSeconds - estimatedSeconds,
  };
}

// Scan active orders. Time O(n).
export function detectDelays(orders, now = new Date()) {
  const delayed = [];
  for (const order of orders) {
    const delay = detectOrderDelay(order, now);
    if (delay) delayed.push({ ...order, delay });
  }
  return delayed;
}
