import { Field, ListHeader } from "./Field";
import type { Scenario, GroundSite } from "../types";
import type { ValidationError } from "../utils/validate";
import { errorsForItem } from "../utils/validate";

export default function GroundSitesTab({
  scenario, errors, onChange,
}: {
  scenario: Scenario;
  errors: ValidationError[];
  onChange: (s: Scenario) => void;
}) {
  const sites = scenario.ground_sites;

  function upd(i: number, k: keyof GroundSite, v: any) {
    const next = sites.map((g, k2) => (k2 === i ? { ...g, [k]: v } : g));
    onChange({ ...scenario, ground_sites: next });
  }

  function add(role: "client" | "gateway") {
    const n = sites.filter(g => g.role === role).length + 1;
    const id = (role === "client" ? "C" : "G") + n;
    onChange({
      ...scenario,
      ground_sites: [...sites, {
        id,
        name: role === "client" ? `Клиент ${n}` : `Шлюз ${n}`,
        role,
        lat_deg: role === "client" ? 65 : 69,
        lon_deg: role === "client" ? 60 : 33,
      }],
    });
  }

  function remove(i: number) {
    onChange({ ...scenario, ground_sites: sites.filter((_, k) => k !== i) });
  }

  return (
    <div className="tab-pane">
      <ListHeader title="Наземные пункты" errors={errors} />

      <div className="list-actions">
        <button className="btn tiny" onClick={() => add("client")}>+ клиент</button>
        <button className="btn tiny" onClick={() => add("gateway")}>+ шлюз</button>
      </div>

      {sites.length === 0 && (
        <p className="muted">Пунктов нет. Добавьте хотя бы один клиент и один шлюз.</p>
      )}

      <table className="edit-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Название</th>
            <th>Роль</th>
            <th>Широта, °</th>
            <th>Долгота, °</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {sites.map((g, i) => {
            const ierr = errorsForItem(errors, "ground_sites", i);
            const errFor = (k: string) =>
              ierr.find(e => e.path.endsWith("." + k))?.message;
            return (
              <tr key={i} className={ierr.length ? "row-error" : ""}>
                <td>
                  <Field error={errFor("id")}>
                    <input value={g.id} onChange={e => upd(i, "id", e.target.value)} />
                  </Field>
                </td>
                <td>
                  <input value={g.name} onChange={e => upd(i, "name", e.target.value)} />
                </td>
                <td>
                  <Field error={errFor("role")}>
                    <select value={g.role}
                            onChange={e => upd(i, "role", e.target.value as any)}>
                      <option value="client">client</option>
                      <option value="gateway">gateway</option>
                    </select>
                  </Field>
                </td>
                <td>
                  <Field error={errFor("lat_deg")}>
                    <input type="number" step="0.01" value={g.lat_deg}
                           onChange={e => upd(i, "lat_deg", +e.target.value)} />
                  </Field>
                </td>
                <td>
                  <Field error={errFor("lon_deg")}>
                    <input type="number" step="0.01" value={g.lon_deg}
                           onChange={e => upd(i, "lon_deg", +e.target.value)} />
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