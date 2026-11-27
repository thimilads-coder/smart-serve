// actual duration = completedAt - startedAt.
// Only a completed order with both timestamps gets a duration.
export function calculateActualDuration(order) {
  if (!order || order.status !== 'COMPLETED') return null;
  if (!order.startedAt || !order.completedAt) return null;

  const started = new Date(order.startedAt).getTime();
  const completed = new Date(order.completedAt).getTime();
  if (Number.isNaN(started) || Number.isNaN(completed) || completed < started) return null;

  const totalSeconds = Math.floor((completed - started) / 1000);
  return {
    totalSeconds,
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
  };
}
