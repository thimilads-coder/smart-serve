export function formatTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatSeconds(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;
  if (minutes === 0) return `${remain}s`;
  return `${minutes}m ${String(remain).padStart(2, '0')}s`;
}

export function formatDuration(duration) {
  if (!duration) return '—';
  return formatSeconds(duration.totalSeconds);
}

export function formatSignedMinutes(value) {
  if (value == null) return '—';
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded} min`;
}

export function delayLabel(delay) {
  if (!delay) return '';
  const name = delay.type === 'WAITING' ? 'Waiting delay' : 'Preparation delay';
  return `${name} · over by ${formatSeconds(delay.delaySeconds)}`;
}
