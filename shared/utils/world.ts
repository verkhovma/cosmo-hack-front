import type { FeatureCollection } from 'geojson'

import { feature } from 'topojson-client'

let cached: FeatureCollection | null = null

interface TopoObjects {
  objects?: Record<string, unknown>
}

export async function loadWorldLand(): Promise<FeatureCollection> {
  if (cached)
    return cached
  const res = await fetch('/world-110m.json')
  if (!res.ok)
    throw new Error(`Не удалось загрузить world-110m.json: ${res.status}`)
  const topo: unknown = await res.json()
  if (typeof topo !== 'object' || topo === null)
    throw new Error('world-110m.json — не TopoJSON')
  const obj = (topo as TopoObjects).objects?.land ?? (topo as TopoObjects).objects?.countries
  if (!obj)
    throw new Error('В TopoJSON нет objects.land или objects.countries')

  const fc = feature(topo as Parameters<typeof feature>[0], obj as Parameters<typeof feature>[1])
  cached = fc as FeatureCollection
  return cached
}
