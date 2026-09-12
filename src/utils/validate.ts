import type { Scenario } from "../types";

export interface ValidationError {
  path: string;      // напр. "design.planes[0].raan_deg" или "ground_sites[2].lat_deg"
  message: string;
  list?: string;     // "planes" | "satellites" | "ground_sites" | "failures" | "gateway_outages"
  index?: number;
}

export function validateScenario(s: any): ValidationError[] {
  const errors: ValidationError[] = [];
  const push = (
    path: string, message: string, list?: string, index?: number,
  ) => errors.push({ path, message, list, index });

  if (s?.schema_version !== "cosmo-A-1.0")
    push("schema_version", "Ожидается 'cosmo-A-1.0'");

  const e = s?.environment ?? {};
  const envKeys = [
    "altitude_km", "inclination_deg", "earth_angle0_deg",
    "horizon_s", "step_s", "min_elevation_deg",
    "isl_range_km", "target_availability",
  ];
  for (const k of envKeys) {
    if (typeof e[k] !== "number" || !Number.isFinite(e[k]))
      push(`environment.${k}`, "Должно быть конечным числом");
  }
  if (typeof e.altitude_km === "number" && (e.altitude_km < 200 || e.altitude_km > 1200))
    push("environment.altitude_km", "Допустимо 200…1200 км");
  if (typeof e.inclination_deg === "number" && (e.inclination_deg <= 0 || e.inclination_deg > 180))
    push("environment.inclination_deg", "Допустимо (0, 180]°");
  if (typeof e.min_elevation_deg === "number" && (e.min_elevation_deg < 0 || e.min_elevation_deg >= 90))
    push("environment.min_elevation_deg", "Допустимо [0, 90)°");
  if (typeof e.isl_range_km === "number" && (e.isl_range_km <= 0 || e.isl_range_km > 10000))
    push("environment.isl_range_km", "Допустимо (0, 10000] км");
  if (typeof e.target_availability === "number" && (e.target_availability < 0 || e.target_availability > 1))
    push("environment.target_availability", "Допустимо [0, 1]");
  if (typeof e.horizon_s === "number" && typeof e.step_s === "number"
      && e.step_s > 0 && e.horizon_s > 0 && e.horizon_s % e.step_s !== 0)
    push("environment.horizon_s", "Должно быть кратно step_s");

  const d = s?.design ?? {};
  if (![1, 2, 3].includes(d.launch_stage))
    push("design.launch_stage", "Должно быть 1, 2 или 3");

  // Плоскости
  const planeIds = new Set<string>();
  (d.planes ?? []).forEach((p: any, i: number) => {
    if (!p.id) push(`design.planes[${i}].id`, "Пустой id", "planes", i);
    else if (planeIds.has(p.id))
      push(`design.planes[${i}].id`, "Дубликат id", "planes", i);
    else planeIds.add(p.id);
    if (typeof p.raan_deg !== "number" || p.raan_deg < 0 || p.raan_deg >= 360)
      push(`design.planes[${i}].raan_deg`, "RAAN ∈ [0, 360)", "planes", i);
    if (typeof p.phase_deg !== "number" || p.phase_deg < 0 || p.phase_deg >= 360)
      push(`design.planes[${i}].phase_deg`, "phase ∈ [0, 360)", "planes", i);
  });

  // Спутники
  const satIds = new Set<string>();
  (d.satellites ?? []).forEach((sat: any, i: number) => {
    if (!sat.id) push(`design.satellites[${i}].id`, "Пустой id", "satellites", i);
    else if (satIds.has(sat.id))
      push(`design.satellites[${i}].id`, "Дубликат id", "satellites", i);
    else satIds.add(sat.id);
    if (!planeIds.has(sat.plane_id))
      push(`design.satellites[${i}].plane_id`, "Неизвестная плоскость", "satellites", i);
    if (![1, 2, 3].includes(sat.launch_batch))
      push(`design.satellites[${i}].launch_batch`, "1, 2 или 3", "satellites", i);
    if (typeof sat.slot_deg !== "number" || !Number.isFinite(sat.slot_deg))
      push(`design.satellites[${i}].slot_deg`, "Число", "satellites", i);
  });

  // Наземные пункты
  const groundIds = new Set<string>();
  (s.ground_sites ?? []).forEach((g: any, i: number) => {
    if (!g.id) push(`ground_sites[${i}].id`, "Пустой id", "ground_sites", i);
    else if (groundIds.has(g.id) || satIds.has(g.id))
      push(`ground_sites[${i}].id`, "Дубликат id", "ground_sites", i);
    else groundIds.add(g.id);
    if (!["client", "gateway"].includes(g.role))
      push(`ground_sites[${i}].role`, "client или gateway", "ground_sites", i);
    if (typeof g.lat_deg !== "number" || g.lat_deg < -90 || g.lat_deg > 90)
      push(`ground_sites[${i}].lat_deg`, "[-90, 90]", "ground_sites", i);
    if (typeof g.lon_deg !== "number" || g.lon_deg < -180 || g.lon_deg > 180)
      push(`ground_sites[${i}].lon_deg`, "[-180, 180]", "ground_sites", i);
  });

  const clients = (s.ground_sites ?? []).filter((g: any) => g.role === "client");
  const gws = (s.ground_sites ?? []).filter((g: any) => g.role === "gateway");
  if (clients.length === 0)
    push("ground_sites", "Нужен хотя бы один клиент", "ground_sites");
  if (gws.length === 0)
    push("ground_sites", "Нужен хотя бы один шлюз", "ground_sites");

  // Отказы спутников
  (s.failures ?? []).forEach((f: any, i: number) => {
    if (!satIds.has(f.satellite_id))
      push(`failures[${i}].satellite_id`, "Неизвестный спутник", "failures", i);
    if (!(typeof f.start_s === "number" && typeof f.end_s === "number"
          && f.start_s >= 0 && f.start_s < f.end_s && f.end_s <= (e.horizon_s ?? 0)))
      push(`failures[${i}]`, "0 ≤ start < end ≤ horizon", "failures", i);
  });

  // Отказы шлюзов
  (s.gateway_outages ?? []).forEach((f: any, i: number) => {
    if (!gws.some((g: any) => g.id === f.gateway_id))
      push(`gateway_outages[${i}].gateway_id`, "Неизвестный шлюз", "gateway_outages", i);
    if (!(typeof f.start_s === "number" && typeof f.end_s === "number"
          && f.start_s >= 0 && f.start_s < f.end_s && f.end_s <= (e.horizon_s ?? 0)))
      push(`gateway_outages[${i}]`, "0 ≤ start < end ≤ horizon", "gateway_outages", i);
  });

  return errors;
}

/** Индекс ошибок для подсветки: path → message. */
export function buildErrorIndex(errors: ValidationError[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of errors) m.set(e.path, e.message);
  return m;
}

/** Ошибки по конкретному элементу списка: list + index. */
export function errorsForItem(
  errors: ValidationError[], list: string, index: number,
): ValidationError[] {
  return errors.filter(e => e.list === list && e.index === index);
}