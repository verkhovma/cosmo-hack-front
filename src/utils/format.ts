export function fmtPercent(x: number): string {
  return `${(x * 100).toFixed(2)}%`;
}

export function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h} ч ${m} мин`;
  if (m > 0) return `${m} мин ${s} с`;
  return `${s} с`;
}

export function fmtTime(t_s: number): string {
  const h = Math.floor(t_s / 3600);
  const m = Math.floor((t_s % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}