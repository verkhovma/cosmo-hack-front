// Порт src/types.ts — сценарий cosmo-A-1.0, снимки, маршруты, метрики.
export interface Environment {
  altitude_km: number
  earth_angle0_deg: number
  horizon_s: number
  inclination_deg: number
  isl_range_km: number
  min_elevation_deg: number
  step_s: number
  target_availability: number
}

export interface Plane {
  id: string
  phase_deg: number
  raan_deg: number
}

export interface Satellite {
  id: string
  launch_batch: 1 | 2 | 3
  plane_id: string
  slot_deg: number
}

export interface Design {
  launch_stage: 1 | 2 | 3
  planes: Plane[]
  satellites: Satellite[]
}

export interface GroundSite {
  id: string
  lat_deg: number
  lon_deg: number
  name: string
  role: 'client' | 'gateway'
}

export interface Failure {
  end_s: number
  satellite_id: string
  start_s: number
}

export interface GatewayOutage {
  end_s: number
  gateway_id: string
  start_s: number
}

export interface Scenario {
  design: Design
  environment: Environment
  failures: Failure[]
  gateway_outages: GatewayOutage[]
  ground_sites: GroundSite[]
  meta: { id: string, title: string }
  schema_version: 'cosmo-A-1.0'
}

export interface SatelliteState {
  active: boolean
  id: string
  visible_to?: string[]
  x_km: number
  y_km: number
  z_km: number
}

export type Edge = [string, string, number]

export interface Snapshot {
  edges: Edge[]
  satellites: SatelliteState[]
  t_s: number
}

export interface ClientMetrics {
  availability: number
  hop_counts?: (null | number)[]
  max_gap_s: number
}

export type Reason
  = 'gateway_offline'
    | 'no_gateway_contact'
    | 'no_isl_path'
    | 'no_visible_satellite'
    | 'ok'

export interface RouteEntry {
  path: null | string[]
  reason: Reason
  t_s: number
}

export interface RoutesResponse {
  metrics: Record<string, ClientMetrics>
  routes: Record<string, RouteEntry[]>
  visible_log: Record<string, string[][]>
}

export interface ComputeResult {
  elapsed_s: number
  job_id: string
  metrics: Record<string, ClientMetrics>
  target_availability: number
}

export interface CompareResponse {
  config_diff: Record<string, Record<string, [number, number]>>
  job_ids: string[]
  metrics_diff: Record<string, Record<string, ClientMetrics>>
}

export interface ProjectMeta {
  created_at: string
  id: string
  title: string
}

export interface ScenarioListItem {
  error?: string
  file: string
  id?: string
  title?: string
}

export interface JobEntry {
  jobId: string
  result: ComputeResult
  scenario: null | Scenario
  title: string
}
