export const REASON_LABEL: Record<string, string> = {
  gateway_offline: 'шлюз недоступен',
  no_gateway_contact: 'нет контакта со шлюзом',
  no_isl_path: 'разрыв межспутниковой сети',
  no_visible_satellite: 'нет видимого спутника',
  ok: 'маршрут есть',
}

/** P0-фикс (PLAN 1.1): `[]` — это тоже «нет маршрута», а не только `null`. */
export function hasPath(path: null | string[] | undefined): path is string[] {
  return Array.isArray(path) && path.length > 0
}

export function isEntryOk(e: { path: null | string[] | undefined, reason: string }): boolean {
  if (e.reason !== 'ok')
    return false
  return hasPath(e.path)
}

export interface Seg {
  from: number
  ok: boolean
  reason: string
  to: number
}

export function groupSegments(
  entries: { t_s: number, path: null | string[], reason: string }[],
  step: number,
): Seg[] {
  const segs: Seg[] = []
  let cur: null | Seg = null
  for (const e of entries) {
    const ok = isEntryOk(e)
    const reason = e.reason
    if (cur !== null && cur.ok === ok && cur.reason === reason) {
      cur.to = e.t_s + step
    }
    else {
      if (cur)
        segs.push(cur)
      cur = { from: e.t_s, ok, reason, to: e.t_s + step }
    }
  }
  if (cur)
    segs.push(cur)
  return segs
}

export function maxGapOf(segs: Seg[]): null | Seg {
  const gaps = segs.filter(s => !s.ok)
  if (!gaps.length)
    return null
  return gaps.reduce((a, b) => (b.to - b.from > a.to - a.from ? b : a))
}

export function availabilityOf(entries: { path: null | string[] | undefined, reason: string }[]): number {
  if (!entries.length)
    return 0
  return entries.filter(isEntryOk).length / entries.length
}
