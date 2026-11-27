// Format a UTC timestamp for a MySQL DATETIME(3) column.
export function toSqlDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid timestamp.');
  }

  const pad = (number, size = 2) => String(number).padStart(size, '0');
  return [
    date.getUTCFullYear(),
    '-',
    pad(date.getUTCMonth() + 1),
    '-',
    pad(date.getUTCDate()),
    ' ',
    pad(date.getUTCHours()),
    ':',
    pad(date.getUTCMinutes()),
    ':',
    pad(date.getUTCSeconds()),
    '.',
    pad(date.getUTCMilliseconds(), 3),
  ].join('');
}

// Read a stored UTC datetime back as an ISO string.
export function fromSqlDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return value.toISOString();

  const text = String(value).trim().replace(' ', 'T');
  const withZone = /[zZ]|[+-]\d{2}:\d{2}$/.test(text) ? text : `${text}Z`;
  const date = new Date(withZone);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
