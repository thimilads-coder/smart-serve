import { delayLabel, formatDuration, formatSeconds, formatTime } from '../utils/format.js';
import StatusBadge from './StatusBadge.jsx';

export default function OrderCard({ order, action, elapsedSeconds }) {
  return (
    <article className={`order-card${order.isNext ? ' is-next' : ''}${order.delay ? ' is-delayed' : ''}`}>
      <div className="order-card-top">
        <div className="order-identity">
          {order.queuePosition ? <span className="queue-index">{order.queuePosition}</span> : null}
          <div>
            {order.isNext ? <p className="next-flag">Next up</p> : null}
            <h3>{order.customerName}</h3>
            <p className="order-number">{order.orderNumber}</p>
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <ul className="item-list">
        {(order.items || []).map((item) => (
          <li key={item.id}>
            {item.quantity} × {item.itemName}
            {item.notes ? <span> · {item.notes}</span> : null}
          </li>
        ))}
      </ul>

      {order.notes ? <p className="order-notes">{order.notes}</p> : null}

      <dl className="meta-grid">
        <div>
          <dt>Estimate</dt>
          <dd>{order.estimatedPreparationMinutes} min</dd>
        </div>
        <div>
          <dt>Arrived</dt>
          <dd>{formatTime(order.createdAt)}</dd>
        </div>
        {order.startedAt ? (
          <div>
            <dt>Started</dt>
            <dd>{formatTime(order.startedAt)}</dd>
          </div>
        ) : null}
        {order.completedAt ? (
          <div>
            <dt>Finished</dt>
            <dd>{formatTime(order.completedAt)}</dd>
          </div>
        ) : null}
        {order.status === 'COMPLETED' ? (
          <div>
            <dt>Actual</dt>
            <dd>{formatDuration(order.actualDuration)}</dd>
          </div>
        ) : null}
        {elapsedSeconds != null ? (
          <div>
            <dt>Elapsed</dt>
            <dd>{formatSeconds(elapsedSeconds)}</dd>
          </div>
        ) : null}
      </dl>

      {order.delay ? <p className="delay-flag">{delayLabel(order.delay)}</p> : null}
      {action ? <div className="card-action">{action}</div> : null}
    </article>
  );
}
