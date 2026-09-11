import { useEffect, useRef } from "react";
import type { GroundSite, Scenario, Snapshot } from "../types";
import { planeColor, routeColor } from "../utils/colors";

const W = 960, H = 480;

function toXY(lat: number, lon: number) {
  const x = ((lon + 180) / 360) * W;
  const y = ((90 - lat) / 180) * H;
  return [x, y];
}

function satLatLon(s: { x_km: number; y_km: number; z_km: number }) {
  const r = Math.hypot(s.x_km, s.y_km, s.z_km);
  const lat = Math.asin(s.z_km / r) * 180 / Math.PI;
  const lon = Math.atan2(s.y_km, s.x_km) * 180 / Math.PI;
  return [lat, lon] as const;
}

export default function MapView({
  scenario,
  snapshot,
  route,
}: {
  scenario: Scenario;
  snapshot: Snapshot | null;
  route: string[] | null;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);

    // фон
    ctx.fillStyle = "#0b1021";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#1e2a4a";
    for (let lon = -180; lon <= 180; lon += 30) {
      const [x] = toXY(0, lon);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const [, y] = toXY(lat, 0);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    if (!snapshot) return;

    // ISL-рёбра
    const satById = new Map(snapshot.satellites.map((s) => [s.id, s]));
    ctx.strokeStyle = "rgba(100,150,255,0.25)";
    ctx.lineWidth = 1;
    for (const [a, b] of snapshot.edges) {
      const sa = satById.get(a), sb = satById.get(b);
      if (!sa || !sb) continue;
      const [la1, lo1] = satLatLon(sa);
      const [la2, lo2] = satLatLon(sb);
      const [x1, y1] = toXY(la1, lo1);
      const [x2, y2] = toXY(la2, lo2);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }

    // наземные пункты
    const siteById = new Map(scenario.ground_sites.map((g) => [g.id, g]));
    for (const g of scenario.ground_sites) {
      const [x, y] = toXY(g.lat_deg, g.lon_deg);
      ctx.fillStyle = g.role === "gateway" ? "#f5a623" : "#4cd964";
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "11px sans-serif";
      ctx.fillText(g.id, x + 7, y + 4);
    }

    // спутники
    const planeOf = new Map(scenario.design.satellites.map((s) => [s.id, s.plane_id]));
    for (const s of snapshot.satellites) {
      const [lat, lon] = satLatLon(s);
      const [x, y] = toXY(lat, lon);
      ctx.fillStyle = s.active ? planeColor(planeOf.get(s.id) ?? "") : "#555";
      ctx.beginPath(); ctx.arc(x, y, s.active ? 3 : 2, 0, Math.PI * 2); ctx.fill();
    }

    // маршрут
    if (route && route.length >= 2) {
      ctx.strokeStyle = routeColor(route[0]);
      ctx.lineWidth = 2.5;
      for (let i = 0; i < route.length - 1; i++) {
        const a = route[i], b = route[i + 1];
        const pa = satById.get(a) ?? siteById.get(a);
        const pb = satById.get(b) ?? siteById.get(b);
        if (!pa || !pb) continue;
        const [la1, lo1] = "x_km" in pa ? satLatLon(pa as any) : [pa.lat_deg, pa.lon_deg];
        const [la2, lo2] = "x_km" in pb ? satLatLon(pb as any) : [pb.lat_deg, pb.lon_deg];
        const [x1, y1] = toXY(la1 as number, lo1 as number);
        const [x2, y2] = toXY(la2 as number, lo2 as number);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
    }
  }, [scenario, snapshot, route]);

  return (
    <div className="map-view">
      <canvas ref={ref} width={W} height={H} />
    </div>
  );
}