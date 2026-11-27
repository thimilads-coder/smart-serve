import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import { api } from '../services/api.js';

let nextKey = 1;
const blankItem = () => ({ key: nextKey++, itemName: '', quantity: 1, notes: '' });

export default function NewOrderPage() {
  const [form, setForm] = useState({
    customerName: '',
    notes: '',
    estimatedPreparationMinutes: 15,
    items: [blankItem()],
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [busy, setBusy] = useState(false);

  function updateItem(key, field, value) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess(null);

    const customerName = form.customerName.trim();
    if (!customerName) {
      setError('Customer name is required.');
      return;
    }

    const minutes = Number(form.estimatedPreparationMinutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 480) {
      setError('Estimated preparation time must be a whole number of minutes from 1 to 480.');
      return;
    }

    const items = form.items.map((item) => ({
      itemName: item.itemName.trim(),
      quantity: Number(item.quantity),
      notes: item.notes.trim(),
    }));

    if (items.some((item) => !item.itemName)) {
      setError('Each food item needs a name.');
      return;
    }
    if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) {
      setError('Each quantity must be a whole number from 1 to 99.');
      return;
    }

    setBusy(true);
    try {
      const result = await api.createOrder({
        customerName,
        notes: form.notes.trim(),
        estimatedPreparationMinutes: minutes,
        items,
      });
      setSuccess(result.order);
      setForm({
        customerName: '',
        notes: '',
        estimatedPreparationMinutes: 15,
        items: [blankItem()],
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page narrow">
      <PageHeader
        eyebrow="Arrival"
        title="New order"
        description="The server records the arrival time and places the order at the rear of the queue."
      />

      {error ? (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="banner banner-success">
          {success.orderNumber} for {success.customerName} is at the back of the queue.{' '}
          <Link to="/queue">View the queue</Link>
        </p>
      ) : null}

      <form className="panel form-grid" onSubmit={handleSubmit} noValidate>
        <label>
          Customer name
          <input
            value={form.customerName}
            onChange={(event) => setForm({ ...form, customerName: event.target.value })}
            maxLength={120}
            required
          />
        </label>

        <div className="item-editor">
          <div className="panel-head">
            <h2>Food items</h2>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setForm({ ...form, items: [...form.items, blankItem()] })}
              disabled={form.items.length >= 20}
            >
              Add item
            </button>
          </div>
          {form.items.map((item, index) => (
            <div className="item-row" key={item.key}>
              <label>
                {index === 0 ? 'Item' : `Item ${index + 1}`}
                <input
                  value={item.itemName}
                  onChange={(event) => updateItem(item.key, 'itemName', event.target.value)}
                  maxLength={120}
                />
              </label>
              <label>
                Qty
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={item.quantity}
                  onChange={(event) => updateItem(item.key, 'quantity', event.target.value)}
                />
              </label>
              <label>
                Item note
                <input
                  value={item.notes}
                  onChange={(event) => updateItem(item.key, 'notes', event.target.value)}
                  maxLength={255}
                  placeholder="Optional"
                />
              </label>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  setForm({
                    ...form,
                    items: form.items.filter((entry) => entry.key !== item.key),
                  })
                }
                disabled={form.items.length === 1}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <label>
          Order notes
          <textarea
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            maxLength={500}
            placeholder="Optional"
          />
        </label>

        <label>
          Estimated preparation time (minutes)
          <input
            type="number"
            min="1"
            max="480"
            value={form.estimatedPreparationMinutes}
            onChange={(event) => setForm({ ...form, estimatedPreparationMinutes: event.target.value })}
          />
        </label>
        <p className="quiet">Used for workload and for delay detection. It is the whole order, not each item.</p>

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Add to queue'}
        </button>
      </form>
    </section>
  );
}
