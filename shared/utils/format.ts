export function fmtClock(t_s: number): string {
  const h = Math.floor(t_s / 3600)
  const m = Math.floor((t_s % 3600) / 60)
  const s = Math.floor(t_s % 60)
  return [h, m, s].map(x => String(x).padStart(2, '0')).join(':')
}

export function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.round(seconds % 60)
  const parts: string[] = []
  if (h)
    parts.push(`${h} ч`)
  if (m)
    parts.push(`${m} мин`)
  if (s || !parts.length)
    parts.push(`${s} с`)
  return parts.join(' ')
}

export function fmtPercent(x: number): string {
  return `${(x * 100).toFixed(2)}%`
}
