import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";

let cached: FeatureCollection<Geometry> | null = null;

export async function loadWorldLand(): Promise<FeatureCollection<Geometry>> {
  if (cached) return cached;
  const res = await fetch("/world-110m.json");
  if (!res.ok) throw new Error(`Не удалось загрузить world-110m.json: ${res.status}`);
  const topo = await res.json();

  // land-110m.json → objects.land
  // countries-110m.json → objects.countries (FeatureCollection)
  const obj = topo.objects?.land ?? topo.objects?.countries;
  if (!obj) throw new Error("В TopoJSON нет objects.land или objects.countries");

  const fc = feature(topo, obj) as unknown as FeatureCollection<Geometry>;
  cached = fc;
  return fc;
}