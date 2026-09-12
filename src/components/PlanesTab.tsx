import { Field, ListHeader } from "./Field";
import type { Scenario } from "../types";
import type { ValidationError } from "../utils/validate";
import { errorsForItem } from "../utils/validate";

export default function PlanesTab({
  scenario, errors, onChange,
}: {
  scenario: Scenario;
  errors: ValidationError[];
  onChange: (s: Scenario) => void;
}) {
  const planes = scenario.design.planes;

  function upd(i: number, k: "id" | "raan_deg" | "phase_deg", v: any) {
    const next = planes.map((p, k2) => (k2 === i ? { ...p, [k]: v } : p));
    onChange({ ...scenario, design: { ...scenario.design, planes: next } });
  }

  function add() {
    const id = `P${planes.length + 1}`;
    onChange({
      ...scenario,
      design: {
        ...scenario.design,
        planes: [...planes, { id, raan_deg: 0, phase_deg: 0 }],
      },
    });
  }

  function remove(i: number) {
    onChange({
      ...scenario,
      design: { ...scenario.design, planes: planes.filter((_, k) => k !== i) },
    });
  }

  return (
    <div className="tab-pane">
      <ListHeader title="Орбитальные плоскости" errors={errors} onAdd={add} />

      {planes.length === 0 && (
        <p className="muted">Плоскостей нет. Нажмите «+ добавить».</p>
      )}

      <table className="edit-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>RAAN, °</th>
            <th>Phase, °</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {planes.map((p, i) => {
            const ierr = errorsForItem(errors, "planes", i);
            const errFor = (k: string) =>
              ierr.find(e => e.path.endsWith("." + k))?.message;
            return (
              <tr key={i} className={ierr.length ? "row-error" : ""}>
                <td>
                  <Field error={errFor("id")}>
                    <input value={p.id} onChange={e => upd(i, "id", e.target.value)} />
                  </Field>
                </td>
                <td>
                  <Field error={errFor("raan_deg")}>
                    <input type="number" step="0.1" value={p.raan_deg}
                           onChange={e => upd(i, "raan_deg", +e.target.value)} />
                  </Field>
                </td>
                <td>
                  <Field error={errFor("phase_deg")}>
                    <input type="number" step="0.1" value={p.phase_deg}
                           onChange={e => upd(i, "phase_deg", +e.target.value)} />
                  </Field>
                </td>
                <td>
                  <button className="btn tiny danger" onClick={() => remove(i)}>−</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}