export function part(value: string, max: number) {
  const digits = value.replace(/\D/g, "").slice(0, 2);
  if (!digits) return 0;
  return Math.min(max, Number(digits));
}

export function toSeconds(hours: string, minutes: string, seconds: string) {
  return part(hours, 99) * 3600 + part(minutes, 59) * 60 + part(seconds, 59);
}

export function formatDuration(total: number) {
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function daysSince(at: number, now = Date.now()) {
  const days = Math.floor((now - at) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}
