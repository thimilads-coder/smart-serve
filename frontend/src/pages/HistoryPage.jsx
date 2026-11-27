import { useCallback, useState } from 'react';
import OrderCard from '../components/OrderCard.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { usePolled } from '../hooks/usePolled.js';
import { api } from '../services/api.js';

export default function HistoryPage() {
  const load = useCallback(() => api.getOrders(), []);
  const { data, error, loading, reload } = usePolled(load);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);

  async function handleSearch(event) {
    event.preventDefault();
    setSearching(true);
    setSearchError('');
    try {
      setSearch(await api.search(query));
    } catch (err) {
      setSearch(null);
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  }

  const orders = data?.orders || [];
  const completed = orders
    .filter((order) => order.status === 'COMPLETED')
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  const cancelled = orders
    .filter((order) => order.status === 'CANCELLED')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <section className="page">
      <PageHeader
        eyebrow="Records"
        title="History"
        description="Search uses a linear scan of the orders loaded into memory. Completed orders stay here with their actual preparation time."
      >
        <button type="button" className="btn btn-ghost" onClick={reload}>
          Refresh
        </button>
      </PageHeader>

      <form className="search-bar" onSubmit={handleSearch}>
        <label>
          Order id, order number, or customer name
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="SS-0001 or Ada"
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={searching}>
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {searchError ? (
        <p className="banner banner-error" role="alert">
          {searchError}
        </p>
      ) : null}
      {error ? (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      ) : null}

      {search ? (
        <section className="panel">
          <h2>Search results</h2>
          <p className="quiet">
            {search.meta.algorithm}. Best {search.meta.bestCase}. Average {search.meta.averageCase}. Worst{' '}
            {search.meta.worstCase}. Scanned {search.meta.searched}{' '}
            {search.meta.searched === 1 ? 'order' : 'orders'}.
          </p>
          {search.orders.length ? (
            <div className="card-list">
              {search.orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <p className="empty">No order matched that search.</p>
          )}
        </section>
      ) : null}

      {loading && !data ? <p className="muted">Loading history…</p> : null}

      {data ? (
        <div className="split">
          <section className="panel">
            <h2>Completed</h2>
            {completed.length ? (
              <div className="card-list">
                {completed.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <p className="empty">No completed orders yet.</p>
            )}
          </section>
          <section className="panel">
            <h2>Cancelled</h2>
            {cancelled.length ? (
              <div className="card-list">
                {cancelled.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <p className="empty">No cancelled orders.</p>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}
