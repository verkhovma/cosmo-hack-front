// Скоринг вердикта + дифф сценариев для сравнения вариантов (ТЗ §4.4).
// Всё детерминировано: победитель считается из метрик, а не придумывается.
import type { CompareResponse, JobEntry, Scenario } from '../types/scenario'

import { fmtDuration, fmtPercent } from './format'

export interface JobScore {
  allOk: boolean
  below: string[]
  jobId: string
  meanAvail: number
  worstGap: number
}

export interface Verdict {
  bullets: string[]
  runnerUpId: null | string
  summary: string
  winnerId: null | string
}

export interface ScenarioChange {
  after: string
  before: string
  label: string
}

interface PickedMetrics {
  availability: number
  maxGap: number
}

function numOrUndef(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

/** Безопасное чтение метрики: бэк может отдать null при разных наборах клиентов. */
export function pickMetrics(
  data: CompareResponse,
  cid: string,
  jobId: string,
): PickedMetrics | undefined {
  const raw: unknown = data.metrics_diff[cid]?.[jobId]
  if (typeof raw !== 'object' || raw === null)
    return undefined
  const rec = raw as Record<string, unknown>
  const availability = numOrUndef(rec.availability)
  const maxGap = numOrUndef(rec.max_gap_s)
  if (availability === undefined || maxGap === undefined)
    return undefined
  return { availability, maxGap }
}

function scoreOne(
  data: CompareResponse,
  target: number,
  jobId: string,
  cids: string[],
): JobScore {
  let sum = 0
  let worstGap = 0
  const below: string[] = []
  for (const cid of cids) {
    const m = pickMetrics(data, cid, jobId)
    const a = m?.availability ?? 0
    sum += a
    worstGap = Math.max(worstGap, m?.maxGap ?? 0)
    if (a < target)
      below.push(cid)
  }
  const meanAvail = cids.length > 0 ? sum / cids.length : 0
  return { allOk: below.length === 0 && cids.length > 0, below, jobId, meanAvail, worstGap }
}

/** Ранжирование: сначала цель везде, затем средняя доступность, затем перерыв. */
export function scoreJobs(
  jobs: JobEntry[],
  data: CompareResponse,
  target: number,
): JobScore[] {
  const cids = Object.keys(data.metrics_diff)
  const scores = jobs.map(j => scoreOne(data, target, j.jobId, cids))
  scores.sort((a, b) => {
    if (a.allOk !== b.allOk)
      return a.allOk ? -1 : 1
    if (a.meanAvail !== b.meanAvail)
      return b.meanAvail - a.meanAvail
    return a.worstGap - b.worstGap
  })
  return scores
}

function titleOf(jobs: JobEntry[], jobId: string): string {
  return jobs.find(j => j.jobId === jobId)?.title ?? jobId.slice(0, 8)
}

function fmtPp(diff: number): string {
  const sign = diff >= 0 ? '+' : ''
  return `${sign}${(diff * 100).toFixed(2)} п.п.`
}

export function buildVerdict(
  jobs: JobEntry[],
  data: CompareResponse,
  target: number,
): Verdict {
  const empty: Verdict = { bullets: [], runnerUpId: null, summary: 'Нет вариантов', winnerId: null }
  if (jobs.length === 0)
    return empty
  const scores = scoreJobs(jobs, data, target)
  const winner = scores[0]
  if (!winner)
    return empty
  const runnerUp = scores[1] ?? null
  const winnerTitle = titleOf(jobs, winner.jobId)
  const tied = runnerUp?.allOk === winner.allOk
    && runnerUp.meanAvail === winner.meanAvail
    && runnerUp.worstGap === winner.worstGap
  if (tied) {
    return {
      bullets: [
        `Средняя доступность: ${fmtPercent(winner.meanAvail)} — одинаково`,
        `Максимальный перерыв: ${fmtDuration(winner.worstGap)} — одинаково`,
      ],
      runnerUpId: runnerUp.jobId,
      summary: 'Паритет — варианты эквивалентны',
      winnerId: winner.jobId,
    }
  }
  const bullets: string[] = [
    `Средняя доступность: ${fmtPercent(winner.meanAvail)}${runnerUp ? ` против ${fmtPercent(runnerUp.meanAvail)} (${fmtPp(winner.meanAvail - runnerUp.meanAvail)})` : ''}`,
    `Максимальный перерыв: ${fmtDuration(winner.worstGap)}${runnerUp ? ` против ${fmtDuration(runnerUp.worstGap)}` : ''}`,
  ]
  if (winner.allOk)
    bullets.push(`Цель ≥${fmtPercent(target)}: достигнута везде — единственный критерий с вето выполнен`)
  else if (winner.below.length > 0)
    bullets.push(`Цель ≥${fmtPercent(target)}: не достигнута (${winner.below.join(', ')}) — но это лучший из имеющихся`)
  return {
    bullets,
    runnerUpId: runnerUp?.jobId ?? null,
    summary: `Рекомендуем: ${winnerTitle}`,
    winnerId: winner.jobId,
  }
}

function fmtDeg(v: number): string {
  return String(Number(v.toFixed(2)))
}

function planeDesc(raan: number, phase: number): string {
  return `RAAN ${fmtDeg(raan)}°, phase ${fmtDeg(phase)}°`
}

function activeCount(s: Scenario, stage: number): number {
  return s.design.satellites.filter(x => x.launch_batch <= stage).length
}

/** Человеческий дифф двух сценариев (опора — сохранённые сценарии джобов). */
export function diffScenarios(base: Scenario, next: Scenario): ScenarioChange[] {
  const out: ScenarioChange[] = []
  const bs = base.design.launch_stage
  const ns = next.design.launch_stage
  if (bs !== ns || activeCount(base, bs) !== activeCount(next, ns)) {
    out.push({
      after: `${ns} · ${activeCount(next, ns)} аппаратов`,
      before: `${bs} · ${activeCount(base, bs)} аппаратов`,
      label: 'Очередь запуска',
    })
  }
  const bPlanes = new Map(base.design.planes.map(p => [p.id, p]))
  const nPlanes = new Map(next.design.planes.map(p => [p.id, p]))
  for (const [id, p] of nPlanes) {
    const was = bPlanes.get(id)
    if (!was)
      out.push({ after: planeDesc(p.raan_deg, p.phase_deg), before: '—', label: `Плоскость ${id} (новая)` })
    else if (was.raan_deg !== p.raan_deg)
      out.push({ after: `${fmtDeg(p.raan_deg)}°`, before: `${fmtDeg(was.raan_deg)}°`, label: `${id}: RAAN` })
    if (was && was.phase_deg !== p.phase_deg) {
      out.push({ after: `${fmtDeg(p.phase_deg)}°`, before: `${fmtDeg(was.phase_deg)}°`, label: `${id}: phase` })
    }
  }
  for (const [id] of bPlanes) {
    if (!nPlanes.has(id))
      out.push({ after: '—', before: 'была', label: `Плоскость ${id} (удалена)` })
  }
  if (base.failures.length !== next.failures.length) {
    out.push({
      after: String(next.failures.length),
      before: String(base.failures.length),
      label: 'Отказы спутников',
    })
  }
  if (base.gateway_outages.length !== next.gateway_outages.length) {
    out.push({
      after: String(next.gateway_outages.length),
      before: String(base.gateway_outages.length),
      label: 'Отказы шлюзов',
    })
  }
  const bClients = base.ground_sites.filter(g => g.role === 'client').length
  const nClients = next.ground_sites.filter(g => g.role === 'client').length
  if (bClients !== nClients)
    out.push({ after: String(nClients), before: String(bClients), label: 'Клиенты' })
  if (base.environment.isl_range_km !== next.environment.isl_range_km) {
    out.push({
      after: `${next.environment.isl_range_km} км`,
      before: `${base.environment.isl_range_km} км`,
      label: 'Дальность ISL',
    })
  }
  return out
}

export interface MarkdownInput {
  diffs: Record<string, ScenarioChange[]>
  jobs: JobEntry[]
  scores: JobScore[]
  target: number
  verdict: Verdict
}

/** Текстовый отчёт сравнения (ТЗ §7 — выгружаемость результатов). */
export function buildCompareMarkdown(input: MarkdownInput): string {
  const lines: string[] = [
    '# Сравнение вариантов группировки',
    '',
    `Дата: ${new Date().toLocaleString('ru-RU')}`,
    `Цель: ≥${fmtPercent(input.target)}`,
    '',
    `## Вердикт: ${input.verdict.summary}`,
    '',
  ]
  for (const b of input.verdict.bullets) lines.push(`- ${b}`)
  lines.push('', '## Метрики', '')
  lines.push('| Вариант | Средняя доступность | Макс. перерыв | Цель |')
  lines.push('|---|---|---|---|')
  for (const s of input.scores) {
    const job = input.jobs.find(j => j.jobId === s.jobId)
    const title = job?.title ?? s.jobId.slice(0, 8)
    lines.push(`| ${title} | ${fmtPercent(s.meanAvail)} | ${fmtDuration(s.worstGap)} | ${s.allOk ? '✓' : '✗'} |`)
  }
  lines.push('', '## Изменения конфигурации', '')
  const base = input.jobs[0]
  for (const job of input.jobs.slice(1)) {
    const changes = input.diffs[job.jobId] ?? []
    lines.push(`### ${job.title} (vs ${base?.title ?? '—'})`)
    if (changes.length === 0)
      lines.push('- без изменений')
    for (const c of changes) lines.push(`- ${c.label}: ${c.before} → ${c.after}`)
    lines.push('')
  }
  return lines.join('\n')
}
