// Человеческие подписи изменений сценария для журнала истории.
// Первое найденное отличие побеждает — подпись короткая, для инженера.
import type { Scenario } from '~~/shared/types/scenario'

function fmtDeg(v: number): string {
  const r = Math.round(v * 10) / 10
  return Number.isInteger(r) ? String(r) : String(r)
}

function diffStage(a: Scenario, b: Scenario): null | string {
  if (a.design.launch_stage === b.design.launch_stage)
    return null
  return `Очередь ${a.design.launch_stage}→${b.design.launch_stage}`
}

function diffPlanes(a: Scenario, b: Scenario): null | string {
  const am = new Map(a.design.planes.map(p => [p.id, p]))
  for (const bp of b.design.planes) {
    const ap = am.get(bp.id)
    if (!ap)
      return `Плоскость ${bp.id} добавлена`
    if (ap.phase_deg !== bp.phase_deg) {
      const d = Math.round(((bp.phase_deg - ap.phase_deg + 540) % 360) - 180)
      return `${bp.id}: phase ${d >= 0 ? '+' : ''}${d}°`
    }
    if (ap.raan_deg !== bp.raan_deg)
      return `${bp.id}: RAAN ${fmtDeg(ap.raan_deg)}°→${fmtDeg(bp.raan_deg)}°`
  }
  const bm = new Set(b.design.planes.map(p => p.id))
  for (const ap of a.design.planes) {
    if (!bm.has(ap.id))
      return `Плоскость ${ap.id} удалена`
  }
  return null
}

function diffSatellites(a: Scenario, b: Scenario): null | string {
  const asm = new Map(a.design.satellites.map(s => [s.id, s]))
  for (const bs of b.design.satellites) {
    const as = asm.get(bs.id)
    if (!as)
      return `Спутник ${bs.id} добавлен`
    if (as.launch_batch !== bs.launch_batch)
      return `${bs.id}: очередь ${as.launch_batch}→${bs.launch_batch}`
    if (as.slot_deg !== bs.slot_deg)
      return `${bs.id}: slot ${fmtDeg(as.slot_deg)}°→${fmtDeg(bs.slot_deg)}°`
    if (as.plane_id !== bs.plane_id)
      return `${bs.id}: ${as.plane_id}→${bs.plane_id}`
  }
  const bsm = new Set(b.design.satellites.map(s => s.id))
  for (const as of a.design.satellites) {
    if (!bsm.has(as.id))
      return `Спутник ${as.id} удалён`
  }
  return null
}

function diffFailures(a: Scenario, b: Scenario): null | string {
  if (JSON.stringify(a.failures) === JSON.stringify(b.failures))
    return null
  const aKeys = new Set(a.failures.map(f => `${f.satellite_id}|${f.start_s}|${f.end_s}`))
  for (const f of b.failures) {
    if (!aKeys.has(`${f.satellite_id}|${f.start_s}|${f.end_s}`))
      return `Отказ ${f.satellite_id} +[${f.start_s}; ${f.end_s})`
  }
  const bKeys = new Set(b.failures.map(f => `${f.satellite_id}|${f.start_s}|${f.end_s}`))
  for (const f of a.failures) {
    if (!bKeys.has(`${f.satellite_id}|${f.start_s}|${f.end_s}`))
      return `Снят отказ ${f.satellite_id}`
  }
  return `Отказы изменены (${a.failures.length}→${b.failures.length})`
}

function diffGateways(a: Scenario, b: Scenario): null | string {
  if (JSON.stringify(a.gateway_outages) === JSON.stringify(b.gateway_outages))
    return null
  const aKeys = new Set(a.gateway_outages.map(g => `${g.gateway_id}|${g.start_s}|${g.end_s}`))
  for (const g of b.gateway_outages) {
    if (!aKeys.has(`${g.gateway_id}|${g.start_s}|${g.end_s}`))
      return `Шлюз ${g.gateway_id} недоступен +[${g.start_s}; ${g.end_s})`
  }
  return `Отказы шлюзов изменены`
}

function diffEnv(a: Scenario, b: Scenario): null | string {
  const e1 = a.environment
  const e2 = b.environment
  if (e1.isl_range_km !== e2.isl_range_km)
    return `ISL ${e1.isl_range_km}→${e2.isl_range_km} км`
  if (e1.min_elevation_deg !== e2.min_elevation_deg)
    return `Мин. возвышение ${e1.min_elevation_deg}→${e2.min_elevation_deg}°`
  if (e1.altitude_km !== e2.altitude_km)
    return `Высота ${e1.altitude_km}→${e2.altitude_km} км`
  if (e1.inclination_deg !== e2.inclination_deg)
    return `Наклонение ${e1.inclination_deg}→${e2.inclination_deg}°`
  if (e1.horizon_s !== e2.horizon_s)
    return `Горизонт ${e1.horizon_s}→${e2.horizon_s} с`
  if (e1.step_s !== e2.step_s)
    return `Шаг ${e1.step_s}→${e2.step_s} с`
  if (e1.target_availability !== e2.target_availability)
    return `Цель ${Math.round(e1.target_availability * 100)}→${Math.round(e2.target_availability * 100)}%`
  return null
}

function diffSites(a: Scenario, b: Scenario): null | string {
  if (a.ground_sites.length !== b.ground_sites.length)
    return `Наземные пункты (${a.ground_sites.length}→${b.ground_sites.length})`
  if (JSON.stringify(a.ground_sites) !== JSON.stringify(b.ground_sites))
    return `Наземные пункты изменены`
  if (a.meta.title !== b.meta.title)
    return `Переименован: ${b.meta.title}`
  return null
}

export function describeChange(a: Scenario, b: Scenario): string {
  return (
    diffStage(a, b)
    ?? diffPlanes(a, b)
    ?? diffSatellites(a, b)
    ?? diffFailures(a, b)
    ?? diffGateways(a, b)
    ?? diffEnv(a, b)
    ?? diffSites(a, b)
    ?? `Изменена конфигурация`
  )
}
