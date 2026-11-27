import { useCallback, useEffect, useState } from 'react';

export function usePolled(loader, intervalMs = 5000) {
  const [state, setState] = useState({ data: null, error: '', loading: true });

  const reload = useCallback(async () => {
    try {
      const data = await loader();
      setState({ data, error: '', loading: false });
    } catch (error) {
      setState((current) => ({
        data: current.data,
        error: error.message,
        loading: false,
      }));
    }
  }, [loader]);

  useEffect(() => {
    reload();
    const id = setInterval(reload, intervalMs);
    return () => clearInterval(id);
  }, [reload, intervalMs]);

  return { ...state, reload };
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
