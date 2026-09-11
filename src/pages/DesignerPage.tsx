import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import ScenarioPicker from "../components/ScenarioPicker";
import ScenarioEditor from "../components/ScenarioEditor";
import MapView from "../components/MapView";
import Timeline from "../components/Timeline";
import RouteView from "../components/RouteView";
import MetricsTable from "../components/MetricsTable";
import ExportButton from "../components/ExportButton";
import ErrorBanner from "../components/ErrorBanner";
import { useJobs } from "../JobsContext";
import type {
  ComputeResult, RoutesResponse, Scenario, Snapshot,
} from "../types";

export default function DesignerPage() {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [result, setResult] = useState<ComputeResult | null>(null);
  const [t_s, setTs] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [routes, setRoutes] = useState<RoutesResponse | null>(null);
  const [clientId, setClientId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addJob } = useJobs();

  const clients = useMemo(
    () => scenario?.ground_sites.filter((g) => g.role === "client") ?? [],
    [scenario],
  );

  // при выборе клиента — сбросить маршрут
  useEffect(() => {
    if (!clientId && clients.length > 0) setClientId(clients[0].id);
  }, [clients, clientId]);

  async function runCompute() {
    if (!scenario) return;
    setBusy(true); setError(null);
    try {
      const r = await api.compute(scenario);
      setResult(r);
      addJob({
        jobId: r.job_id,
        title: `${scenario.meta.title} (${scenario.design.launch_stage} оч.)`,
        result: r,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // загрузка снимка при изменении t_s или job
  useEffect(() => {
    if (!result) return;
    api.getSnapshot(result.job_id, t_s).then((s) => setSnapshot(s.snapshot))
       .catch((e) => setError(e.message));
  }, [result, t_s]);

  // загрузка маршрутов при изменении клиента или job
  useEffect(() => {
    if (!result || !clientId) return;
    api.getRoutes(result.job_id, clientId).then(setRoutes)
       .catch((e) => setError(e.message));
  }, [result, clientId]);

  const routeAtT = useMemo(() => {
    if (!routes) return null;
    return routes.routes.find((r) => r.t_s === t_s)?.path ?? null;
  }, [routes, t_s]);

  return (
    <div className="designer">
      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}

      <aside className="sidebar">
        <ScenarioPicker onLoaded={(s) => { setScenario(s); setResult(null); }} />
        {scenario && (
          <>
            <ScenarioEditor scenario={scenario} onChange={(s) => { setScenario(s); setResult(null); }} />
            <button className="btn primary" disabled={busy} onClick={runCompute}>
              {busy ? "Расчёт…" : "Запустить расчёт"}
            </button>
          </>
        )}
      </aside>

      <section className="content">
        {scenario && (
          <>
            <MapView scenario={scenario} snapshot={snapshot} route={routeAtT} />
            {result && (
              <>
                <Timeline
                  t_s={t_s}
                  horizon={scenario.environment.horizon_s}
                  step={scenario.environment.step_s}
                  onChange={setTs}
                />
                <MetricsTable
                  metrics={result.metrics}
                  target={result.target_availability}
                />
                <div className="row">
                  <label>
                    Клиент:&nbsp;
                    <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.id}</option>)}
                    </select>
                  </label>
                  <ExportButton jobId={result.job_id} />
                </div>
                {routes && (
                  <RouteView
                    clientId={clientId}
                    data={routes}
                    horizon={scenario.environment.horizon_s}
                    step={scenario.environment.step_s}
                    onSelectTime={setTs}
                  />
                )}
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}