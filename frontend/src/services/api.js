const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error('Cannot reach the kitchen server.');
  }

  const text = await response.text();
  let body = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = {};
    }
  }

  if (!response.ok) {
    throw new Error(body.error || 'Request failed.');
  }
  return body;
}

export const api = {
  getDashboard: () => request('/api/dashboard/summary'),
  getQueue: () => request('/api/orders/queue'),
  getOrders: (status) => request(status ? `/api/orders?status=${status}` : '/api/orders'),
  search: (query) => request(`/api/orders/search?q=${encodeURIComponent(query)}`),
  createOrder: (payload) => request('/api/orders', { method: 'POST', body: JSON.stringify(payload) }),
  startNext: () => request('/api/orders/start-next', { method: 'POST' }),
  completeOrder: (id) => request(`/api/orders/${id}/complete`, { method: 'PATCH' }),
  cancelOrder: (id) => request(`/api/orders/${id}/cancel`, { method: 'PATCH' }),
  getDelays: () => request('/api/analytics/delays'),
  getAccuracy: () => request('/api/analytics/preparation-times'),
};
