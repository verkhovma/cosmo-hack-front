// Клиентская валидация сценария (ТЗ §17) — портирована из src/utils/validate.ts.
// Вход — unknown (загрузка/черновик могут быть битыми), выход — плоские ошибки
// с привязкой к вкладкам редактора (list/index).
export interface ValidationError {
  index?: number
  list?: string
  message: string
  path: string
}

type Rec = Record<string, unknown>

function isRec(v: unknown): v is Rec {
  return typeof v === 'object' && v !== null
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

const DUP = 'Дубликат id'
const BAD_RANGE = '0 ≤ start < end ≤ horizon'

interface Ctx {
  errors: ValidationError[]
  horizon: number
  push: (path: string, message: string, list?: string, index?: number) => void
}

function createCtx(): Ctx {
  const ctx: Ctx = {
    errors: [],
    horizon: 0,
    push(path, message, list?, index?) {
      ctx.errors.push({ index, list, message, path })
    },
  }
  return ctx
}


function validateEnvironment(s: Rec, ctx: Ctx): Rec {
  const e = isRec(s.environment) ? s.environment : {}
  const keys = [
    'altitude_km',
    'inclination_deg',
    'earth_angle0_deg',
    'horizon_s',
    'step_s',
    'min_elevation_deg',
    'isl_range_km',
    'target_availability',
  ]
  for (const k of keys) {
    if (num(e[k]) === undefined)
      ctx.push(`environment.${k}`, 'Должно быть конечным числом')
  }
  const horizon = num(e.horizon_s) ?? 0
  const step = num(e.step_s) ?? 0
  if (horizon > 0 && step > 0 && horizon % step !== 0)
    ctx.push('environment.horizon_s', 'Должно быть кратно step_s')
  return e
}

function validatePlanes(d: Rec, ctx: Ctx): Set<string> {
  const ids = new Set<string>()
  const stage = num(d.launch_stage)
  if (stage !== 1 && stage !== 2 && stage !== 3)
    ctx.push('design.launch_stage', 'Должно быть 1, 2 или 3')
  arr(d.planes).forEach((raw, i) => {
    const p = isRec(raw) ? raw : {}
    const id = str(p.id)
    if (!id)
      ctx.push(`design.planes[${i}].id`, 'Пустой id', 'planes', i)
    else if (ids.has(id))
      ctx.push(`design.planes[${i}].id`, DUP, 'planes', i)
    else ids.add(id)
    const raan = num(p.raan_deg)
    if (raan === undefined || raan < 0 || raan >= 360)
      ctx.push(`design.planes[${i}].raan_deg`, 'RAAN ∈ [0, 360)', 'planes', i)
    const phase = num(p.phase_deg)
    if (phase === undefined || phase < 0 || phase >= 360)
      ctx.push(`design.planes[${i}].phase_deg`, 'phase ∈ [0, 360)', 'planes', i)
  })
  return ids
}

function validateSatellites(d: Rec, planeIds: Set<string>, ctx: Ctx): Set<string> {
  const ids = new Set<string>()
  arr(d.satellites).forEach((raw, i) => {
    const sat = isRec(raw) ? raw : {}
    const id = str(sat.id)
    if (!id)
      ctx.push(`design.satellites[${i}].id`, 'Пустой id', 'satellites', i)
    else if (ids.has(id))
      ctx.push(`design.satellites[${i}].id`, DUP, 'satellites', i)
    else ids.add(id)
    const planeId = str(sat.plane_id)
    if (!planeId || !planeIds.has(planeId))
      ctx.push(`design.satellites[${i}].plane_id`, 'Неизвестная плоскость', 'satellites', i)
    const batch = num(sat.launch_batch)
    if (batch !== 1 && batch !== 2 && batch !== 3)
      ctx.push(`design.satellites[${i}].launch_batch`, '1, 2 или 3', 'satellites', i)
    if (num(sat.slot_deg) === undefined)
      ctx.push(`design.satellites[${i}].slot_deg`, 'Число', 'satellites', i)
  })
  return ids
}

function validateGround(s: Rec, satIds: Set<string>, ctx: Ctx): string[] {
  const ids = new Set<string>()
  const gateways: string[] = []
  let clients = 0
  arr(s.ground_sites).forEach((raw, i) => {
    const g = isRec(raw) ? raw : {}
    const id = str(g.id)
    if (!id)
      ctx.push(`ground_sites[${i}].id`, 'Пустой id', 'ground_sites', i)
    else if (ids.has(id) || satIds.has(id))
      ctx.push(`ground_sites[${i}].id`, DUP, 'ground_sites', i)
    else ids.add(id)
    const role = str(g.role)
    if (role === 'client')
      clients++
    else if (role === 'gateway') {
      if (id)
        gateways.push(id)
    }
    else ctx.push(`ground_sites[${i}].role`, 'client или gateway', 'ground_sites', i)
    const lat = num(g.lat_deg)
    if (lat === undefined || lat < -90 || lat > 90)
      ctx.push(`ground_sites[${i}].lat_deg`, '[-90, 90]', 'ground_sites', i)
    const lon = num(g.lon_deg)
    if (lon === undefined || lon < -180 || lon > 180)
      ctx.push(`ground_sites[${i}].lon_deg`, '[-180, 180]', 'ground_sites', i)
  })
  if (clients === 0)
    ctx.push('ground_sites', 'Нужен хотя бы один клиент', 'ground_sites')
  if (gateways.length === 0)
    ctx.push('ground_sites', 'Нужен хотя бы один шлюз', 'ground_sites')
  return gateways
}

function validateOutages(s: Rec, satIds: Set<string>, gateways: string[], ctx: Ctx) {
  arr(s.failures).forEach((raw, i) => {
    const f = isRec(raw) ? raw : {}
    const sid = str(f.satellite_id)
    if (!sid || !satIds.has(sid))
      ctx.push(`failures[${i}].satellite_id`, 'Неизвестный спутник', 'failures', i)
    if (!inHorizon(num(f.start_s), num(f.end_s), ctx.horizon))
      ctx.push(`failures[${i}]`, BAD_RANGE, 'failures', i)
  })
  arr(s.gateway_outages).forEach((raw, i) => {
    const f = isRec(raw) ? raw : {}
    const gid = str(f.gateway_id)
    if (!gid || !gateways.includes(gid))
      ctx.push(`gateway_outages[${i}].gateway_id`, 'Неизвестный шлюз', 'gateway_outages', i)
    if (!inHorizon(num(f.start_s), num(f.end_s), ctx.horizon))
      ctx.push(`gateway_outages[${i}]`, BAD_RANGE, 'gateway_outages', i)
  })
}

function inHorizon(start: number | undefined, end: number | undefined, horizon: number): boolean {
  return start !== undefined && end !== undefined && start >= 0 && start < end && end <= horizon
}

export function validateScenario(input: unknown): ValidationError[] {
  const ctx = createCtx()
  const s = isRec(input) ? input : {}
  if (s.schema_version !== 'cosmo-A-1.0')
    ctx.push('schema_version', 'Ожидается \'cosmo-A-1.0\'')
  const env = validateEnvironment(s, ctx)
  ctx.horizon = num(env.horizon_s) ?? 0
  const design = isRec(s.design) ? s.design : {}
  const planeIds = validatePlanes(design, ctx)
  const satIds = validateSatellites(design, planeIds, ctx)
  const gateways = validateGround(s, satIds, ctx)
  validateOutages(s, satIds, gateways, ctx)
  return ctx.errors
}

/** Индекс ошибок для подсветки: path → message. */
export function buildErrorIndex(errors: ValidationError[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const e of errors) m.set(e.path, e.message)
  return m
}

/** Ошибки по конкретному элементу списка: list + index. */
export function errorsForItem(
  errors: ValidationError[],
  list: string,
  index: number,
): ValidationError[] {
  return errors.filter(e => e.list === list && e.index === index)
}
