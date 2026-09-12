import { z } from 'zod'

// Граничные схемы (ТЗ §17): query/params/body валидируем через Zod,
// детальные сообщения — через validateScenario (shared/utils/validate.ts).

export const uuidParam = z.string().min(1, 'Пустой id')

export const tsQuery = z.object({
  t_s: z.coerce.number().int().min(0),
})

const finite = z.number().finite('Должно быть конечным числом')

export const environmentSchema = z.object({
  altitude_km: finite,
  earth_angle0_deg: finite,
  horizon_s: z.number().int().positive(),
  inclination_deg: finite,
  isl_range_km: finite,
  min_elevation_deg: finite,
  step_s: z.number().int().positive(),
  target_availability: finite.min(0).max(1),
}).refine(v => v.horizon_s % v.step_s === 0, {
  message: 'horizon_s должно быть кратно step_s',
  path: ['horizon_s'],
})

const planeSchema = z.object({
  id: z.string().min(1),
  phase_deg: finite.min(0).max(360),
  raan_deg: finite.min(0).max(360),
})

const satelliteSchema = z.object({
  id: z.string().min(1),
  launch_batch: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  plane_id: z.string().min(1),
  slot_deg: finite,
})

const groundSiteSchema = z.object({
  id: z.string().min(1),
  lat_deg: finite.min(-90).max(90),
  lon_deg: finite.min(-180).max(180),
  name: z.string(),
  role: z.enum(['client', 'gateway']),
})

const failureSchema = z.object({
  end_s: z.number().positive(),
  satellite_id: z.string().min(1),
  start_s: z.number().min(0),
}).refine(v => v.start_s < v.end_s, {
  message: '0 ≤ start < end',
  path: ['start_s'],
})

const gatewayOutageSchema = z.object({
  end_s: z.number().positive(),
  gateway_id: z.string().min(1),
  start_s: z.number().min(0),
}).refine(v => v.start_s < v.end_s, {
  message: '0 ≤ start < end',
  path: ['start_s'],
})

export const scenarioSchema = z.object({
  design: z.object({
    launch_stage: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    planes: z.array(planeSchema),
    satellites: z.array(satelliteSchema),
  }),
  environment: environmentSchema,
  failures: z.array(failureSchema),
  gateway_outages: z.array(gatewayOutageSchema),
  ground_sites: z.array(groundSiteSchema),
  meta: z.object({ id: z.string().min(1), title: z.string() }),
  schema_version: z.literal('cosmo-A-1.0'),
})

export type ScenarioInput = z.infer<typeof scenarioSchema>
