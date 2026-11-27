// Count active kitchen work. Completed and cancelled orders are not workload.
// Time O(n). Extra space O(1).
export function calculateWorkload(orders) {
  const summary = {
    totalOrders: 0,
    pending: 0,
    preparing: 0,
    completed: 0,
    cancelled: 0,
    activeOrders: 0,
    estimatedMinutesRemaining: 0,
  };

  for (const order of orders) {
    summary.totalOrders += 1;
    const minutes = Number(order.estimatedPreparationMinutes) || 0;

    if (order.status === 'PENDING') {
      summary.pending += 1;
      summary.activeOrders += 1;
      summary.estimatedMinutesRemaining += minutes;
    } else if (order.status === 'PREPARING') {
      summary.preparing += 1;
      summary.activeOrders += 1;
      summary.estimatedMinutesRemaining += minutes;
    } else if (order.status === 'COMPLETED') {
      summary.completed += 1;
    } else if (order.status === 'CANCELLED') {
      summary.cancelled += 1;
    }
  }

  return summary;
}
