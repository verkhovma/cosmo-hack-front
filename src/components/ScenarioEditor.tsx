import { useState } from "react";
import { api } from "../api";
import type { Scenario } from "../types";

export default function ScenarioEditor({
  scenario,
  onChange,
}: {
  scenario: Scenario;
  onChange: (s: Scenario) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function apply(edits: Parameters<typeof api.editScenario>[1]) {
    setBusy(true);
    setErr(null);
    try {
      const { scenario: next } = await api.editScenario(scenario, edits);
      onChange(next);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>Конфигурация</h2>
      {err && <div className="error">{err}</div>}

      <label>
        Очередь запуска (launch_stage):
        <select
          value={scenario.design.launch_stage}
          disabled={busy}
          onChange={(e) =>
            apply({ launch_stage: Number(e.target.value) as 1 | 2 | 3 })
          }
        >
          <option value={1}>1 — 16 аппаратов</option>
          <option value={2}>2 — 32 аппарата</option>
          <option value={3}>3 — все 48</option>
        </select>
      </label>

      <h3>Плоскости</h3>
      <table className="planes">
        <thead>
          <tr><th>ID</th><th>RAAN°</th><th>Phase°</th><th /></tr>
        </thead>
        <tbody>
          {scenario.design.planes.map((p) => (
            <PlaneRow key={p.id} plane={p} busy={busy} onApply={apply} />
          ))}
        </tbody>
      </table>

      <h3>Периоды недоступности спутников</h3>
      <FailuresEditor scenario={scenario} busy={busy} onApply={apply} />
    </section>
  );
}

function PlaneRow({ plane, busy, onApply }: any) {
  const [raan, setRaan] = useState(plane.raan_deg);
  const [phase, setPhase] = useState(plane.phase_deg);

  return (
    <tr>
      <td>{plane.id}</td>
      <td>
        <input
          type="number" step="0.1" value={raan}
          onChange={(e) => setRaan(Number(e.target.value))}
        />
      </td>
      <td>
        <input
          type="number" step="0.1" value={phase}
          onChange={(e) => setPhase(Number(e.target.value))}
        />
      </td>
      <td>
        <button
          disabled={busy}
          onClick={() =>
            onApply({
              planes: [{ plane_id: plane.id, raan_deg: raan, phase_deg: phase }],
            })
          }
        >
          Применить
        </button>
      </td>
    </tr>
  );
}

function FailuresEditor({ scenario, busy, onApply }: any) {
  const [satId, setSatId] = useState(scenario.design.satellites[0]?.id ?? "");
  const [start, setStart] = useState(21600);
  const [end, setEnd] = useState(scenario.environment.horizon_s);

  return (
    <div className="failures">
      <select value={satId} onChange={(e) => setSatId(e.target.value)}>
        {scenario.design.satellites.map((s: any) => (
          <option key={s.id} value={s.id}>{s.id}</option>
        ))}
      </select>
      <input type="number" value={start} onChange={(e) => setStart(+e.target.value)} />
      <input type="number" value={end} onChange={(e) => setEnd(+e.target.value)} />
      <button
        disabled={busy}
        onClick={() =>
          onApply({
            add_failures: [{ satellite_id: satId, start_s: start, end_s: end }],
          })
        }
      >
        Добавить отказ
      </button>
      <ul>
        {scenario.failures.map((f: any, i: number) => (
          <li key={i}>
            {f.satellite_id}: [{f.start_s}; {f.end_s})
          </li>
        ))}
      </ul>
    </div>
  );
}