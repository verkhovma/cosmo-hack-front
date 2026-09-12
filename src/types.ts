// ---------------------------------------------------------------------------
// Сценарий (cosmo-A-1.0)
// ---------------------------------------------------------------------------
export interface Environment {
  altitude_km: number;
  inclination_deg: number;
  earth_angle0_deg: number;
  horizon_s: number;
  step_s: number;
  min_elevation_deg: number;
  isl_range_km: number;
  target_availability: number;
}

export interface Plane {
  id: string;
  raan_deg: number;
  phase_deg: number;
}

export interface Satellite {
  id: string;
  plane_id: string;
  slot_deg: number;
  launch_batch: 1 | 2 | 3;
}

export interface Design {
  launch_stage: 1 | 2 | 3;
  planes: Plane[];
  satellites: Satellite[];
}

export interface GroundSite {
  id: string;
  name: string;
  role: "client" | "gateway";
  lat_deg: number;
  lon_deg: number;
}

export interface Failure {
  satellite_id: string;
  start_s: number;
  end_s: number;
}

export interface GatewayOutage {
  gateway_id: string;
  start_s: number;
  end_s: number;
}

export interface Scenario {
  schema_version: "cosmo-A-1.0";
  meta: { id: string; title: string };
  environment: Environment;
  design: Design;
  ground_sites: GroundSite[];
  failures: Failure[];
  gateway_outages: GatewayOutage[];
}

// ---------------------------------------------------------------------------
// Снимок сети
// ---------------------------------------------------------------------------
export interface SatelliteState {
  id: string;
  x_km: number;
  y_km: number;
  z_km: number;
  active: boolean;
  /** ID клиентов и шлюзов, которые видят спутник в данный момент. */
  visible_to?: string[];
}

export type Edge = [string, string, number];

export interface Snapshot {
  t_s: number;
  satellites: SatelliteState[];
  edges: Edge[];
}

// ---------------------------------------------------------------------------
// Маршруты и метрики
// ---------------------------------------------------------------------------
export interface ClientMetrics {
  availability: number;
  max_gap_s: number;
  hop_counts?: (number | null)[];
}

export type Reason =
  | "ok"
  | "no_visible_satellite"
  | "no_isl_path"
  | "no_gateway_contact"
  | "gateway_offline";

export interface RouteEntry {
  t_s: number;
  path: string[] | null;
  reason: Reason;
}

/** Ответ /api/compute/{job}/routes */
export interface RoutesResponse {
  routes: Record<string, RouteEntry[]>;
  visible_log: Record<string, string[][]>;
  metrics: Record<string, ClientMetrics>;
}

/** Ответ /api/compute */
export interface ComputeResult {
  job_id: string;
  elapsed_s: number;
  metrics: Record<string, ClientMetrics>;
  target_availability: number;
}

// ---------------------------------------------------------------------------
// Сравнение и проекты
// ---------------------------------------------------------------------------
export interface CompareResponse {
  job_ids: string[];
  metrics_diff: Record<string, Record<string, ClientMetrics>>;
  config_diff: Record<string, Record<string, [number, number]>>;
}

export interface ProjectMeta {
  id: string;
  title: string;
  created_at: string;
}

export interface ScenarioListItem {
  file: string;
  id?: string;
  title?: string;
  error?: string;
}