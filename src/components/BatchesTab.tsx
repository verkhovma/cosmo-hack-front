import { Field, ListHeader } from "./Field";
import type { Scenario } from "../types";
import type { ValidationError } from "../utils/validate";
import { errorsForItem } from "../utils/validate";

export default function BatchesTab({
  scenario, errors, onChange,
}: {
  scenario: Scenario;
  errors: ValidationError[];
  onChange: (s: Scenario) => void;
}) {
  const d = scenario.design;
  const sats = d.satellites;
  const planes = d.planes;

  function setStage(stage: 1 | 2 | 3) {
    onChange({ ...scenario, design: { ...d, launch_stage: stage } });
  }

  function updSat(i: number, k: string, v: any) {
    const next = sats.map((s, k2) => (k2 === i ? { ...s, [k]: v } : s));
    onChange({ ...scenario, design: { ...d, satellites: next } });
  }

  function addSat() {
    const defaultPlane = planes[0]?.id ?? "";
    onChange({
      ...scenario,
      design: {
        ...d,
        satellites: [...sats, {
          id: `S${String(sats.length + 1).padStart(2, "0")}`,
          plane_id: defaultPlane,
          slot_deg: 0,
          launch_batch: 1,
        }],
      },
    });
  }

  function removeSat(i: number) {
    onChange({
      ...scenario,
      design: { ...d, satellites: sats.filter((_, k) => k !== i) },
    });
  }

  // группировка по launch_batch
  const batches: Record<1 | 2 | 3, { sat: any; idx: number }[]> = {
    1: [], 2: [], 3: [],
  };
  sats.forEach((s, idx) => {
    if (batches[s.launch_batch as 1 | 2 | 3]) {
      batches[s.launch_batch as 1 | 2 | 3].push({ sat: s, idx });
    }
  });

  const stageError = errors.find(e => e.path === "design.launch_stage")?.message;

  return (
    <div className="tab-pane">
      <ListHeader title="Очереди запуска" errors={errors} onAdd={addSat} />

      <div className="stage-select">
        <Field error={stageError}>
          <label>
            Активная очередь (launch_stage):&nbsp;
            <select value={d.launch_stage}
                    onChange={e => setStage(+e.target.value as 1 | 2 | 3)}>
              <option value={1}>1 — 16 аппаратов</option>
              <option value={2}>2 — 32 аппарата</option>
              <option value={3}>3 — все 48</option>
            </select>
          </label>
        </Field>
      </div>

      <table className="edit-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Плоскость</th>
            <th>Slot, °</th>
            <th>Очередь</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {sats.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                Спутников нет. Нажмите «+ добавить».
              </td>
            </tr>
          )}
          {sats.map((s, i) => {
            const ierr = errorsForItem(errors, "satellites", i);
            const errFor = (k: string) =>
              ierr.find(e => e.path.endsWith("." + k))?.message;
            return (
              <tr key={i} className={ierr.length ? "row-error" : ""}>
                <td>
                  <Field error={errFor("id")}>
                    <input value={s.id} onChange={e => updSat(i, "id", e.target.value)} />
                  </Field>
                </td>
                <td>
                  <Field error={errFor("plane_id")}>
                    <select value={s.plane_id}
                            onChange={e => updSat(i, "plane_id", e.target.value)}>
                      <option value="">— выберите —</option>
                      {planes.map(p => (
                        <option key={p.id} value={p.id}>{p.id}</option>
                      ))}
                    </select>
                  </Field>
                </td>
                <td>
                  <Field error={errFor("slot_deg")}>
                    <input type="number" step="0.1" value={s.slot_deg}
                           onChange={e => updSat(i, "slot_deg", +e.target.value)} />
                  </Field>
                </td>
                <td>
                  <Field error={errFor("launch_batch")}>
                    <select value={s.launch_batch}
                            onChange={e => updSat(i, "launch_batch", +e.target.value)}>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  </Field>
                </td>
                <td>
                  <button className="btn tiny danger" onClick={() => removeSat(i)}>−</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="batches-summary">
        {([1, 2, 3] as const).map(b => (
          <div key={b} className="batch-card">
            <b>Очередь {b}</b>
            <span> — {batches[b].length} аппаратов</span>
            {d.launch_stage >= b
              ? <span className="ok"> · включена</span>
              : <span className="muted"> · выключена</span>}
          </div>
        ))}
      </div>
    </div>
  );
}