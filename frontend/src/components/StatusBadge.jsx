const labels = {
  PENDING: 'Pending',
  PREPARING: 'Preparing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{labels[status] || status}</span>;
}
