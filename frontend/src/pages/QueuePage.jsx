import { useCallback, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import OrderCard from '../components/OrderCard.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StartNextButton from '../components/StartNextButton.jsx';
import { usePolled } from '../hooks/usePolled.js';
import { api } from '../services/api.js';

export default function QueuePage() {
  const load = useCallback(() => api.getQueue(), []);
  const { data, error, loading, reload } = usePolled(load);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  async function confirmCancel() {
    setBusy(true);
    setActionError('');
    try {
      await api.cancelOrder(cancelTarget.id);
      setCancelTarget(null);
      await reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow="FCFS"
        title="Order queue"
        description="Position 1 is the front. Only that order can start. A newer pending order cannot pass an older one."
      >
        <StartNextButton disabled={!data?.orders?.length} onDone={reload} />
      </PageHeader>

      {error || actionError ? (
        <p className="banner banner-error" role="alert">
          {actionError || error}
        </p>
      ) : null}
      {loading && !data ? <p className="muted">Loading the queue…</p> : null}

      {data ? (
        <>
          <p className="note">
            {data.meta.structure}. Enqueue {data.meta.enqueue}, dequeue {data.meta.dequeue}, peek{' '}
            {data.meta.peek}. Cancel uses {data.meta.removal}. The queue is rebuilt from MySQL when the
            server starts. This demo expects one backend process.
          </p>
          {data.orders.length ? (
            <div className="card-list">
              {data.orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  action={
                    <button type="button" className="btn btn-ghost" onClick={() => setCancelTarget(order)}>
                      Cancel order
                    </button>
                  }
                />
              ))}
            </div>
          ) : (
            <p className="empty">No pending orders. The front of the queue is empty.</p>
          )}
        </>
      ) : null}

      {cancelTarget ? (
        <ConfirmDialog
          title={`Cancel ${cancelTarget.orderNumber}?`}
          message={`${cancelTarget.customerName}'s order will leave the pending queue. This cannot be started later.`}
          confirmLabel="Cancel order"
          busy={busy}
          onConfirm={confirmCancel}
          onCancel={() => setCancelTarget(null)}
        />
      ) : null}
    </section>
  );
}
