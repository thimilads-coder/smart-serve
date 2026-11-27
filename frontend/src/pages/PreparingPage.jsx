import { useCallback, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import OrderCard from '../components/OrderCard.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useNow, usePolled } from '../hooks/usePolled.js';
import { api } from '../services/api.js';

export default function PreparingPage() {
  const load = useCallback(() => api.getOrders('PREPARING'), []);
  const { data, error, loading, reload } = usePolled(load);
  const now = useNow();
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  async function confirmComplete() {
    setBusy(true);
    setActionError('');
    try {
      await api.completeOrder(target.id);
      setTarget(null);
      await reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const orders = data?.orders || [];

  return (
    <section className="page">
      <PageHeader
        eyebrow="Pass window"
        title="Preparing"
        description="The clock below is a live view. The saved preparation time is calculated on the server when the order is completed."
      />

      {error || actionError ? (
        <p className="banner banner-error" role="alert">
          {actionError || error}
        </p>
      ) : null}
      {loading && !data ? <p className="muted">Loading preparing orders…</p> : null}

      {data && orders.length === 0 ? <p className="empty">Nothing is being prepared.</p> : null}
      {orders.length ? (
        <div className="card-list">
          {orders.map((order) => {
            const started = new Date(order.startedAt).getTime();
            const elapsedSeconds = Number.isNaN(started) ? null : Math.floor((now - started) / 1000);
            return (
              <OrderCard
                key={order.id}
                order={order}
                elapsedSeconds={elapsedSeconds}
                action={
                  <button type="button" className="btn btn-primary" onClick={() => setTarget(order)}>
                    Mark completed
                  </button>
                }
              />
            );
          })}
        </div>
      ) : null}

      {target ? (
        <ConfirmDialog
          title={`Complete ${target.orderNumber}?`}
          message={`This records the finish time for ${target.customerName} and removes the order from active workload.`}
          confirmLabel="Mark completed"
          busy={busy}
          onConfirm={confirmComplete}
          onCancel={() => setTarget(null)}
        />
      ) : null}
    </section>
  );
}
