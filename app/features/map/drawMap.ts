// Canvas-отрисовка карты вынесена из MapView.vue (лимит 250 строк на .vue).
import type { GeoPath } from 'd3-geo'
import type { FeatureCollection } from 'geojson'
import type { GroundSite, RouteEntry, SatelliteState, Scenario, Snapshot } from '~~/shared/types/scenario'

import { ACTIVE_ROUTE_COLOR, planeColor } from '~~/shared/utils/colors'
import { hasPath } from '~~/shared/utils/routes'

export const MAP_W = 1200
export const MAP_H = 600

export type Project = (lat: number, lon: number) => [number, number] | null

export function satLatLon(s: { x_km: number, y_km: number, z_km: number }): [number, number] {
  const r = Math.hypot(s.x_km, s.y_km, s.z_km)
  return [(Math.asin(s.z_km / r) * 180) / Math.PI, (Math.atan2(s.y_km, s.x_km) * 180) / Math.PI]
}

export function drawFrame(ctx: CanvasRenderingContext2D, project: Project) {
  ctx.fillStyle = '#10141a'
  ctx.fillRect(0, 0, MAP_W, MAP_H)
  ctx.strokeStyle = '#2a3a56'
  ctx.lineWidth = 1
  for (let lon = -180; lon <= 180; lon += 30) {
    const p1 = project(-85, lon)
    const p2 = project(85, lon)
    if (!p1 || !p2)
      continue
    ctx.beginPath()
    ctx.moveTo(p1[0], p1[1])
    ctx.lineTo(p2[0], p2[1])
    ctx.stroke()
  }
  for (let lat = -60; lat <= 80; lat += 30) {
    const p1 = project(lat, -180)
    const p2 = project(lat, 180)
    if (!p1 || !p2)
      continue
    ctx.beginPath()
    ctx.moveTo(p1[0], p1[1])
    ctx.lineTo(p2[0], p2[1])
    ctx.stroke()
  }
}

export function drawLand(
  ctx: CanvasRenderingContext2D,
  pathGen: GeoPath,
  world: FeatureCollection | null,
) {
  if (!world)
    return
  ctx.fillStyle = '#1a2654'
  ctx.strokeStyle = '#598ebc'
  ctx.lineWidth = 1
  for (const f of world.features) {
    const d = pathGen(f)
    if (!d)
      continue
    const p = new Path2D(d)
    ctx.fill(p)
    ctx.stroke(p)
  }
}

function edgePoint(
  id: string,
  satById: Map<string, SatelliteState>,
  siteById: Map<string, GroundSite>,
): [number, number] | null {
  const sat = satById.get(id)
  if (sat)
    return satLatLon(sat)
  const site = siteById.get(id)
  if (site)
    return [site.lat_deg, site.lon_deg]
  return null
}

export interface RouteOpts {
  routes: Record<string, RouteEntry[]>
  scenario: Scenario
  selectedClient: null | string
  snapshot: Snapshot
  tS: number
}

export function drawRoute(
  ctx: CanvasRenderingContext2D,
  project: Project,
  opts: RouteOpts,
) {
  const { routes, scenario, selectedClient, snapshot, tS } = opts
  if (!selectedClient)
    return
  const entry = routes[selectedClient]?.find(e => e.t_s === tS)
  if (!entry || !hasPath(entry.path))
    return
  const satById = new Map(snapshot.satellites.map(s => [s.id, s]))
  const siteById = new Map(scenario.ground_sites.map(g => [g.id, g]))
  ctx.strokeStyle = ACTIVE_ROUTE_COLOR
  ctx.lineWidth = 2.5
  const p = entry.path
  for (let i = 0; i < p.length - 1; i++) {
    const a = edgePoint(p[i] ?? '', satById, siteById)
    const b = edgePoint(p[i + 1] ?? '', satById, siteById)
    if (!a || !b)
      continue
    const p1 = project(a[0], a[1])
    const p2 = project(b[0], b[1])
    if (!p1 || !p2)
      continue
    ctx.beginPath()
    ctx.moveTo(p1[0], p1[1])
    ctx.lineTo(p2[0], p2[1])
    ctx.stroke()
  }
}

export interface OverlayOpts {
  hiddenSats: Set<string>
  scenario: Scenario
  snapshot: Snapshot
}

export function drawOverlays(
  ctx: CanvasRenderingContext2D,
  project: Project,
  opts: OverlayOpts,
) {
  const { hiddenSats, scenario, snapshot } = opts
  const satById = new Map(snapshot.satellites.map(s => [s.id, s]))
  ctx.strokeStyle = 'rgba(89,142,188,0.25)'
  ctx.lineWidth = 1
  for (const [a, b] of snapshot.edges) {
    const sa = satById.get(a)
    const sb = satById.get(b)
    if (!sa || !sb)
      continue
    const [la1, lo1] = satLatLon(sa)
    const [la2, lo2] = satLatLon(sb)
    const p1 = project(la1, lo1)
    const p2 = project(la2, lo2)
    if (!p1 || !p2)
      continue
    ctx.beginPath()
    ctx.moveTo(p1[0], p1[1])
    ctx.lineTo(p2[0], p2[1])
    ctx.stroke()
  }

  for (const g of scenario.ground_sites) {
    const p = project(g.lat_deg, g.lon_deg)
    if (!p)
      continue
    ctx.fillStyle = g.role === 'gateway' ? '#f5a623' : '#4cd964'
    ctx.beginPath()
    ctx.arc(p[0], p[1], 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = '11px Inter, sans-serif'
    ctx.fillText(g.id, p[0] + 7, p[1] + 4)
  }

  const planeOf = new Map(scenario.design.satellites.map(s => [s.id, s.plane_id]))
  for (const s of snapshot.satellites) {
    if (hiddenSats.has(s.id))
      continue
    const [lat, lon] = satLatLon(s)
    const p = project(lat, lon)
    if (!p)
      continue
    ctx.fillStyle = s.active ? planeColor(planeOf.get(s.id) ?? '') : '#555'
    ctx.beginPath()
    ctx.arc(p[0], p[1], s.active ? 3 : 2, 0, Math.PI * 2)
    ctx.fill()
  }
}
