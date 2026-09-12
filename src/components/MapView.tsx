import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import type { Scenario, Snapshot } from "../types";
import { loadWorldLand } from "../utils/world";
import { planeColor, routeColor } from "../utils/colors";
import { fmtClock } from "../utils/format";

const W = 1200;
const H = 600;

interface Popup {
  x: number;
  y: number;
  lines: string[];
}

interface SatellitePopupInfo {
  id: string;
  active: boolean;
  visibleTo: string[];
  inRoutes: string[];
  t_s: number;
}

export default function MapView({
  scenario,
  snapshot,
  routes,
  t_s,
  selectedClient,
  hiddenSats,
  onSelectSatellite,
}: {
  scenario: Scenario;
  snapshot: Snapshot | null;
  routes: Record<string, { t_s: number; path: string[] | null; reason: string }[]>;
  t_s: number;
  selectedClient: string | null;
  hiddenSats: Set<string>;
  onSelectSatellite?: (id: string) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [world, setWorld] = useState<FeatureCollection<Geometry> | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [popup, setPopup] = useState<Popup | null>(null);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  // --- загрузка Natural Earth ---
  useEffect(() => {
    loadWorldLand().then(setWorld).catch(console.error);
  }, []);

  // --- проекция: Меркатор с ручным масштабированием ---
  const projection = useMemo(() => {
    return geoMercator()
      .scale((W / (2 * Math.PI)) * zoom)
      .translate([W / 2 + pan.x, H / 2 + pan.y])
      .center([0, 20]);   // чуть выше экватора — северные широты в центре
  }, [zoom, pan]);

  const path = useMemo(() => geoPath(projection), [projection]);

  // --- утилита: lat/lon → x/y на canvas ---
  function project(lat: number, lon: number): [number, number] | null {
    const p = projection([lon, lat]);
    return p ? [p[0], p[1]] : null;
  }

  function satLatLon(s: { x_km: number; y_km: number; z_km: number }): [number, number] {
    const r = Math.hypot(s.x_km, s.y_km, s.z_km);
    const lat = (Math.asin(s.z_km / r) * 180) / Math.PI;
    const lon = (Math.atan2(s.y_km, s.x_km) * 180) / Math.PI;
    return [lat, lon];
  }

  // --- отрисовка ---
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);

    // фон
    ctx.fillStyle = "#0b1021";
    ctx.fillRect(0, 0, W, H);

    // сетка lat/lon
    ctx.strokeStyle = "#1e2a4a";
    ctx.lineWidth = 1;
    for (let lon = -180; lon <= 180; lon += 30) {
      const p1 = project(-85, lon);
      const p2 = project(85, lon);
      if (!p1 || !p2) continue;
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
    }
    for (let lat = -60; lat <= 80; lat += 30) {
      const p1 = project(lat, -180);
      const p2 = project(lat, 180);
      if (!p1 || !p2) continue;
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
    }

    // контуры суши
    if (world) {
      ctx.fillStyle = "#17223f";
      ctx.strokeStyle = "#2a3a66";
      ctx.lineWidth = 1;
      for (const f of world.features) {
        const d = path(f);
        if (!d) continue;
        const p = new Path2D(d);
        ctx.fill(p);
        ctx.stroke(p);
      }
    }

    if (!snapshot) return;

    const satById = new Map(snapshot.satellites.map(s => [s.id, s]));
    const siteById = new Map(scenario.ground_sites.map(g => [g.id, g]));

    // ISL-рёбра
    ctx.strokeStyle = "rgba(100,150,255,0.18)";
    ctx.lineWidth = 1;
    for (const [a, b] of snapshot.edges) {
      const sa = satById.get(a);
      const sb = satById.get(b);
      if (!sa || !sb) continue;
      const [la1, lo1] = satLatLon(sa);
      const [la2, lo2] = satLatLon(sb);
      const p1 = project(la1, lo1);
      const p2 = project(la2, lo2);
      if (!p1 || !p2) continue;
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
    }

    // маршрут выбранного клиента (только его — по уточнению п.5)
    if (selectedClient) {
      const entries = routes[selectedClient];
      const entry = entries?.find(e => e.t_s === t_s);
      if (entry?.path) {
        ctx.strokeStyle = routeColor(selectedClient);
        ctx.lineWidth = 2.5;
        const p = entry.path;
        for (let i = 0; i < p.length - 1; i++) {
          const a = p[i];
          const b = p[i + 1];
          const pa = satById.get(a) ?? siteById.get(a);
          const pb = satById.get(b) ?? siteById.get(b);
          if (!pa || !pb) continue;
          const [la1, lo1] = "x_km" in pa
            ? satLatLon(pa as any)
            : [(pa as any).lat_deg, (pa as any).lon_deg];
          const [la2, lo2] = "x_km" in pb
            ? satLatLon(pb as any)
            : [(pb as any).lat_deg, (pb as any).lon_deg];
          const p1 = project(la1 as number, lo1 as number);
          const p2 = project(la2 as number, lo2 as number);
          if (!p1 || !p2) continue;
          ctx.beginPath();
          ctx.moveTo(p1[0], p1[1]);
          ctx.lineTo(p2[0], p2[1]);
          ctx.stroke();
        }
      }
    }

    // наземные пункты
    for (const g of scenario.ground_sites) {
      const p = project(g.lat_deg, g.lon_deg);
      if (!p) continue;
      ctx.fillStyle = g.role === "gateway" ? "#f5a623" : "#4cd964";
      ctx.beginPath();
      ctx.arc(p[0], p[1], 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "11px sans-serif";
      ctx.fillText(g.id, p[0] + 7, p[1] + 4);
    }

    // спутники
    const planeOf = new Map(scenario.design.satellites.map(s => [s.id, s.plane_id]));
    for (const s of snapshot.satellites) {
      if (hiddenSats.has(s.id)) continue;
      const [lat, lon] = satLatLon(s);
      const p = project(lat, lon);
      if (!p) continue;
      ctx.fillStyle = s.active ? planeColor(planeOf.get(s.id) ?? "") : "#555";
      ctx.beginPath();
      ctx.arc(p[0], p[1], s.active ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [world, snapshot, routes, t_s, zoom, pan, selectedClient, hiddenSats, path, projection]);

  // --- мышь ---
  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = ref.current!.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);

    if (dragRef.current) {
      setPan({
        x: dragRef.current.panX + (e.clientX - dragRef.current.x),
        y: dragRef.current.panY + (e.clientY - dragRef.current.y),
      });
      return;
    }

    if (!snapshot) { setPopup(null); return; }

    // ищем ближайший спутник
    let best: { id: string; d: number; x: number; y: number } | null = null;
    for (const s of snapshot.satellites) {
      if (hiddenSats.has(s.id)) continue;
      const [lat, lon] = satLatLon(s);
      const p = project(lat, lon);
      if (!p) continue;
      const d = Math.hypot(p[0] - mx, p[1] - my);
      if (d < 10 && (!best || d < best.d)) {
        best = { id: s.id, d, x: p[0], y: p[1] };
      }
    }
    if (!best) { setPopup(null); return; }

    const s = snapshot.satellites.find(x => x.id === best!.id)!;
    const visibleTo = (s as any).visible_to as string[] ?? [];
    const inRoutes: string[] = [];
    for (const [cid, entries] of Object.entries(routes)) {
      const entry = entries.find(en => en.t_s === t_s);
      if (entry?.path?.includes(best.id)) inRoutes.push(cid);
    }

    // явный статус
    const statusLine = s.active
      ? (visibleTo.length > 0 ? "активен · виден" : "активен · не виден")
      : "неактивен (отказ или не запущен)";

    setPopup({
      x: best.x,
      y: best.y,
      lines: [
        `${best.id} · ${statusLine}`,
        `виден: ${visibleTo.length ? visibleTo.join(", ") : "—"}`,
        `в маршруте: ${inRoutes.length ? inRoutes.join(", ") : "—"}`,
        `t = ${fmtClock(t_s)}`,
      ],
    });
  }

  function onWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    setZoom(z => Math.max(0.5, Math.min(8, z * (e.deltaY < 0 ? 1.15 : 1 / 1.15))));
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }
  function onMouseUp() { dragRef.current = null; }
  function onMouseLeave() { dragRef.current = null; setPopup(null); }

  function onClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!snapshot || !onSelectSatellite) return;
    const rect = ref.current!.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);
    let best: { id: string; d: number } | null = null;
    for (const s of snapshot.satellites) {
      const [lat, lon] = satLatLon(s);
      const p = project(lat, lon);
      if (!p) continue;
      const d = Math.hypot(p[0] - mx, p[1] - my);
      if (d < 8 && (!best || d < best.d)) best = { id: s.id, d };
    }
    if (best) onSelectSatellite(best.id);
  }

  return (
    <div className="map-wrap">
      <canvas
        ref={ref}
        width={W}
        height={H}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onWheel={onWheel}
        onClick={onClick}
      />
      <div className="map-controls">
        <button onClick={() => setZoom(z => Math.min(8, z * 1.2))} title="Приблизить">+</button>
        <button onClick={() => setZoom(z => Math.max(0.5, z / 1.2))} title="Отдалить">−</button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Сбросить">⟲</button>
      </div>
      {popup && (
        <div className="sat-popup" style={{ left: popup.x, top: popup.y }}>
          {popup.lines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  );
}