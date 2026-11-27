import { useState } from 'react';
import { api } from '../services/api.js';

export default function StartNextButton({ disabled, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    setBusy(true);
    setError('');
    try {
      await api.startNext();
      await onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="action-stack">
      <button type="button" className="btn btn-primary" onClick={handleClick} disabled={disabled || busy}>
        {busy ? 'Starting…' : 'Start next order'}
      </button>
      {error ? (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
