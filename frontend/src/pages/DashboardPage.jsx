import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import OrderCard from '../components/OrderCard.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StartNextButton from '../components/StartNextButton.jsx';
import { usePolled } from '../hooks/usePolled.js';
import { api } from '../services/api.js';

export default function DashboardPage() {
  const load = useCallback(() => api.getDashboard(), []);
  const { data, error, loading, reload } = usePolled(load);

  return (
    <section className="page">
      <PageHeader
        eyebrow="Service pass"
        title="Dashboard"
        description="Counts, the FCFS queue, and orders that have passed their estimate. This board refreshes every 5 seconds."
      >
        <button type="button" className="btn btn-ghost" onClick={reload}>
          Refresh
        </button>
        <Link className="btn btn-primary" to="/new">
          New order
        </Link>
      </PageHeader>

      {error ? (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      ) : null}
      {loading && !data ? <p className="muted">Loading kitchen board…</p> : null}

      {data ? (
        <>
          <div className="stats">
            <Stat label="Total orders" value={data.summary.totalOrders} />
            <Stat label="Pending" value={data.summary.pending} />
            <Stat label="Preparing" value={data.summary.preparing} />
            <Stat label="Completed" value={data.summary.completed} />
            <Stat label="In queue" value={data.summary.queueSize} />
            <Stat label="Active estimated minutes" value={data.summary.estimatedMinutesRemaining} />
            <Stat label="Delayed" value={data.summary.delayedCount} warn={data.summary.delayedCount > 0} />
          </div>
          <p className="quiet">
            Active workload counts pending and preparing orders only.
            {data.summary.cancelled
              ? ` ${data.summary.cancelled} cancelled ${data.summary.cancelled === 1 ? 'order is' : 'orders are'} excluded.`
              : ''}{' '}
            Times are stored in UTC and shown in your local timezone.
          </p>

          <div className="split">
            <section className="panel">
              <div className="panel-head">
                <h2>Next order</h2>
                <StartNextButton disabled={!data.queue.length} onDone={reload} />
              </div>
              {data.queue[0] ? (
                <OrderCard order={data.queue[0]} />
              ) : (
                <p className="empty">The queue is clear. New orders join at the back.</p>
              )}
              {data.queue.length > 1 ? (
                <ol className="mini-queue">
                  {data.queue.slice(1).map((order) => (
                    <li key={order.id}>
                      <span>{order.queuePosition}</span>
                      {order.customerName}
                      <small>{order.orderNumber}</small>
                    </li>
                  ))}
                </ol>
              ) : null}
            </section>

            <section className="panel">
              <h2>Delayed orders</h2>
              <p className="note">{data.delayRule}</p>
              {data.delayedOrders.length ? (
                <div className="card-list">
                  {data.delayedOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              ) : (
                <p className="empty">No order is past its estimate.</p>
              )}
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}

function Stat({ label, value, warn = false }) {
  return (
    <article className={`stat${warn ? ' is-warn' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
