function normalize(query) {
  return String(query ?? '').trim().toLowerCase();
}

function matchesQuery(order, term) {
  const idMatch = String(order.id) === term;
  const numberMatch = String(order.orderNumber).toLowerCase() === term;
  const nameMatch = String(order.customerName).toLowerCase().includes(term);
  return idMatch || numberMatch || nameMatch;
}

// Linear search. Stops at the first hit.
// Best O(1), average O(n), worst O(n).
export function linearSearchFirst(orders, query) {
  const term = normalize(query);
  if (!term) return null;

  for (let index = 0; index < orders.length; index += 1) {
    if (matchesQuery(orders[index], term)) return orders[index];
  }
  return null;
}

// Same comparison, but every match is kept, so the whole list is scanned. O(n).
export function linearSearchOrders(orders, query) {
  const term = normalize(query);
  if (!term) return [];

  const matches = [];
  for (let index = 0; index < orders.length; index += 1) {
    if (matchesQuery(orders[index], term)) matches.push(orders[index]);
  }
  return matches;
}
