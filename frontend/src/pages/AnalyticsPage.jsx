import { useCallback } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { usePolled } from '../hooks/usePolled.js';
import { api } from '../services/api.js';
import { delayLabel, formatDuration, formatSignedMinutes, formatTime } from '../utils/format.js';

export default function AnalyticsPage() {
  const load = useCallback(async () => {
    const [delays, accuracy] = await Promise.all([api.getDelays(), api.getAccuracy()]);
    return { delays, accuracy };
  }, []);
  const { data, error, loading, reload } = usePolled(load);

  const lateItems = (data?.accuracy.items || []).filter((item) => item.lateOrders > 0);

  return (
    <section className="page">
      <PageHeader
        eyebrow="Review"
        title="Analytics"
        description="Delay detection and estimate accuracy. Station balancing is not part of this build, so a newer order cannot jump the queue."
      >
        <button type="button" className="btn btn-ghost" onClick={reload}>
          Refresh
        </button>
      </PageHeader>

      {error ? (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      ) : null}
      {loading && !data ? <p className="muted">Loading analytics…</p> : null}

      {data ? (
        <div className="stack">
          <section className="panel">
            <h2>Delays</h2>
            <p className="note">{data.delays.rule}</p>
            {data.delays.orders.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Delay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.delays.orders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.orderNumber}</td>
                        <td>{order.customerName}</td>
                        <td>{order.status === 'PENDING' ? 'Pending' : 'Preparing'}</td>
                        <td>{delayLabel(order.delay)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty">No active order is past its estimate.</p>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Estimate accuracy</h2>
              <p className="accuracy-figure">
                <span>Average error</span>
                <strong>{formatSignedMinutes(data.accuracy.averageErrorMinutes)}</strong>
              </p>
            </div>
            <p className="note">{data.accuracy.formula}</p>
            <p className="quiet">
              {data.accuracy.sampleCount} completed {data.accuracy.sampleCount === 1 ? 'order' : 'orders'} in
              the average.
            </p>
            {data.accuracy.orders.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Finished</th>
                      <th>Estimated</th>
                      <th>Actual</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.accuracy.orders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.orderNumber}</td>
                        <td>{order.customerName}</td>
                        <td>{formatTime(order.completedAt)}</td>
                        <td>{order.estimatedMinutes} min</td>
                        <td>{formatDuration(order.actualDuration)}</td>
                        <td>{formatSignedMinutes(order.errorMinutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty">Complete an order to compare the estimate with the actual time.</p>
            )}
          </section>

          <section className="panel">
            <h2>Items on late orders</h2>
            <p className="note">{data.accuracy.itemNote}</p>
            {lateItems.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Late orders</th>
                      <th>Orders with item</th>
                      <th>Late rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lateItems.map((item) => (
                      <tr key={item.itemName}>
                        <td>{item.itemName}</td>
                        <td>{item.lateOrders}</td>
                        <td>{item.ordersWithItem}</td>
                        <td>{Math.round(item.lateRate * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty">No item has been on an order that ran past its estimate.</p>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}
