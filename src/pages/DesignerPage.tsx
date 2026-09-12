import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import StartPage from "../components/StartPage";
import ScenarioEditor from "../components/ScenarioEditor";
import MapView from "../components/MapView";
import Timeline from "../components/Timeline";
import AvailabilityStrip from "../components/AvailabilityStrip";
import MetricsTable from "../components/MetricsTable";
import ExportButton from "../components/ExportButton";
import ErrorList from "../components/ErrorList";
import { useJobs } from "../JobsContext";
import type { Scenario, Snapshot, ComputeResult } from "../types";
import type { ValidationError } from "../utils/validate";
import { validateScenario } from "../utils/validate";

const EMPTY_SCENARIO = (): Scenario => ({
  schema_version: "cosmo-A-1.0",
  meta: { id: "user_project", title: "Пустая конфигурация" },
  environment: {
    altitude_km: 550,
    inclination_deg: 87,
    earth_angle0_deg: 12,
    horizon_s: 86400,
    step_s: 120,
    min_elevation_deg: 10,
    isl_range_km: 3000,
    target_availability: 0.9,
  },
  design: { launch_stage: 3, planes: [], satellites: [] },
  ground_sites: [],
  failures: [],
  gateway_outages: [],
});

export default function DesignerPage() {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [result, setResult] = useState<ComputeResult | null>(null);
  const [routes, setRoutes] = useState<Record<string, any[]> | null>(null);
  const [visibleLog, setVisibleLog] = useState<Record<string, string[][]> | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [t_s, setTs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [showStart, setShowStart] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedSatellite, setSelectedSatellite] = useState<string | null>(null);
  const [hiddenSats, setHiddenSats] = useState<Set<string>>(new Set());
  const { addJob } = useJobs();

  // --- валидация при изменении сценария ---
  useEffect(() => {
    if (!scenario) return;
    setErrors(validateScenario(scenario));
  }, [scenario]);

  // --- расчёт при загрузке/изменении сценария ---
  useEffect(() => {
    if (!scenario) return;
    let cancelled = false;
    setBusy(true);
    api.compute(scenario)
      .then(r => {
        if (cancelled) return;
        setResult(r);
        addJob({ jobId: r.job_id, title: scenario.meta.title, result: r });
        return api.getRoutes(r.job_id);
      })
      .then(r => {
        if (cancelled || !r) return;
        setRoutes(r.routes);
        setVisibleLog(r.visible_log);
      })
      .catch(e => {
        if (!cancelled) setErrors([{ path: "compute", message: e.message }]);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => { cancelled = true; };
  }, [scenario]);

  // --- снимок на каждом шаге ---
  useEffect(() => {
    if (!result) return;
    api.getSnapshot(result.job_id, t_s).then(s => setSnapshot(s.snapshot));
  }, [result, t_s]);

  // --- выбор клиента по умолчанию ---
  const clients = useMemo(
    () => scenario?.ground_sites.filter(g => g.role === "client") ?? [],
    [scenario],
  );
  useEffect(() => {
    if (!selectedClient && clients.length > 0) setSelectedClient(clients[0].id);
  }, [clients, selectedClient]);

  // --- доминирующая причина по клиенту ---
  const reasons = useMemo(() => {
    if (!routes) return {};
    const out: Record<string, string> = {};
    for (const [cid, entries] of Object.entries(routes)) {
      const counts: Record<string, number> = {};
      for (const e of entries) {
        if (e.reason === "ok") continue;
        counts[e.reason] = (counts[e.reason] ?? 0) + 1;
      }
      let best = "ok", bestN = 0;
      for (const [r, n] of Object.entries(counts)) {
        if (n > bestN) { best = r; bestN = n; }
      }
      out[cid] = best;
    }
    return out;
  }, [routes]);

  // --- сохранение ---
  async function handleSave() {
    if (!scenario) return;
    try {
      await api.saveProject(scenario.meta.title, scenario);
    } catch (e: any) {
      setErrors([{ path: "save", message: e.message }]);
    }
  }

  async function handleSaveAnyway() {
    if (!scenario) return;
    try {
      await api.saveProject(scenario.meta.title, scenario, { saveAnyway: true });
    } catch (e: any) {
      setErrors([{ path: "save", message: e.message }]);
    }
  }

  // --- стартовый экран ---
  if (showStart || !scenario) {
    return (
      <StartPage
        onLoaded={(s) => { setScenario(s); setShowStart(false); }}
        onEmpty={() => { setScenario(EMPTY_SCENARIO()); setShowStart(false); }}
      />
    );
  }

  return (
    <div className="designer">
      {errors.length > 0 && (
        <ErrorList errors={errors} title="Ошибки валидации" />
      )}

      <aside className="sidebar">
        <ScenarioEditor
          scenario={scenario}
          errors={errors}
          onChange={setScenario}
          onSave={handleSave}
          onSaveAnyway={handleSaveAnyway}
        />
      </aside>

      <section className="content">
        <MapView
          scenario={scenario}
          snapshot={snapshot}
          routes={routes ?? {}}
          t_s={t_s}
          selectedClient={selectedClient}
          hiddenSats={hiddenSats}
          onSelectSatellite={setSelectedSatellite}
        />

        <Timeline
          t_s={t_s}
          horizon={scenario.environment.horizon_s}
          step={scenario.environment.step_s}
          onChange={setTs}
        />

        {/* выбор клиента */}
        <div className="row">
          <label>
            Клиент:&nbsp;
            <select
              value={selectedClient ?? ""}
              onChange={e => setSelectedClient(e.target.value)}
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.id}</option>
              ))}
            </select>
          </label>

          <ExportButton jobId={result?.job_id ?? ""} disabled={busy || !result} />

          {busy && <span className="muted">Идёт расчёт…</span>}
        </div>

        {/* полосы доступности */}
        {routes && Object.entries(routes).map(([cid, entries]) => (
          <AvailabilityStrip
            key={cid}
            clientId={cid}
            entries={entries}
            step={scenario.environment.step_s}
            onSeek={setTs}
            visibleLog={visibleLog?.[cid]}
          />
        ))}

        {/* метрики */}
        {result && (
          <MetricsTable
            metrics={result.metrics}
            target={result.target_availability}
            reasons={reasons}
          />
        )}

        {/* подсказка по выбранному спутнику */}
        {selectedSatellite && snapshot && (
          <SatelliteDetails
            satelliteId={selectedSatellite}
            snapshot={snapshot}
            routes={routes ?? {}}
            t_s={t_s}
            onClose={() => setSelectedSatellite(null)}
          />
        )}
      </section>
    </div>
  );
}

// ---- Подсказка по выбранному спутнику ----

function SatelliteDetails({
  satelliteId, snapshot, routes, t_s, onClose,
}: {
  satelliteId: string;
  snapshot: Snapshot;
  routes: Record<string, any[]>;
  t_s: number;
  onClose: () => void;
}) {
  const s = snapshot.satellites.find(x => x.id === satelliteId);
  if (!s) return null;
  const visibleTo = (s as any).visible_to ?? [];
  const inRoutes: string[] = [];
  for (const [cid, entries] of Object.entries(routes)) {
    const entry = entries.find(e => e.t_s === t_s);
    if (entry?.path?.includes(satelliteId)) inRoutes.push(cid);
  }
  return (
    <div className="sat-details">
      <div className="row">
        <b>{satelliteId}</b>
        <span>{s.active ? "активен" : "неактивен"}</span>
        <button className="btn tiny" onClick={onClose}>×</button>
      </div>
      <div>виден: {visibleTo.length ? visibleTo.join(", ") : "—"}</div>
      <div>в маршруте: {inRoutes.length ? inRoutes.join(", ") : "—"}</div>
    </div>
  );
}