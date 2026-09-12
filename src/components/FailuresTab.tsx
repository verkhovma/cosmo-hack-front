import { Field, ListHeader } from "./Field";
import { fmtClock } from "../utils/format";
import type { Scenario } from "../types";
import type { ValidationError } from "../utils/validate";
import { errorsForItem } from "../utils/validate";

export default function FailuresTab({
  scenario, errors, onChange,
}: {
  scenario: Scenario;
  errors: ValidationError[];
  onChange: (s: Scenario) => void;
}) {
  const horizon = scenario.environment.horizon_s;

  // группировка отказов по спутнику
  const bySat = new Map<string, { start_s: number; end_s: number; idx: number }[]>();
  scenario.design.satellites.forEach(s => bySat.set(s.id, []));
  scenario.failures.forEach((f, idx) => {
    if (!bySat.has(f.satellite_id)) bySat.set(f.satellite_id, []);
    bySat.get(f.satellite_id)!.push({ ...f, idx });
  });

  function add(satId: string) {
    onChange({
      ...scenario,
      failures: [...scenario.failures, {
        satellite_id: satId, start_s: 0, end_s: Math.min(3600, horizon),
      }],
    });
  }

  function remove(idx: number) {
    onChange({
      ...scenario,
      failures: scenario.failures.filter((_, k) => k !== idx),
    });
  }

  function upd(idx: number, k: "start_s" | "end_s", v: number) {
    const next = scenario.failures.map((f, k2) =>
      k2 === idx ? { ...f, [k]: v } : f,
    );
    onChange({ ...scenario, failures: next });
  }

  return (
    <div className="tab-pane">
      <ListHeader title="Отказы спутников" errors={errors} />

      {scenario.design.satellites.length === 0 && (
        <p className="muted">
          Сначала добавьте спутники на вкладке «Очереди и спутники».
        </p>
      )}

      <div className="failure-groups">
        {Array.from(bySat.entries()).map(([sid, list]) => (
          <div key={sid} className="failure-group">
            <div className="failure-group-header">
              <b>{sid}</b>
              <span className="muted"> — отказов: {list.length}</span>
              <button className="btn tiny" onClick={() => add(sid)}>+ отказ</button>
            </div>

            {list.length === 0 && (
              <div className="muted small">Отказов нет</div>
            )}

            <table className="edit-table small">
              <thead>
                <tr>
                  <th>Начало, с</th>
                  <th>ЧЧ:ММ:СС</th>
                  <th>Конец, с</th>
                  <th>ЧЧ:ММ:СС</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((f, k) => {
                  const ierr = errorsForItem(errors, "failures", f.idx);
                  const errMsg = ierr[0]?.message;
                  return (
                    <tr key={k} className={ierr.length ? "row-error" : ""}>
                      <td>
                        <Field error={
                          ierr.find(e => e.path.endsWith(".start_s"))?.message
                            || errMsg
                        }>
                          <input type="number" step="60" value={f.start_s}
                                 onChange={e => upd(f.idx, "start_s", +e.target.value)} />
                        </Field>
                      </td>
                      <td className="muted">{fmtClock(f.start_s)}</td>
                      <td>
                        <Field error={
                          ierr.find(e => e.path.endsWith(".end_s"))?.message
                            || errMsg
                        }>
                          <input type="number" step="60" value={f.end_s}
                                 onChange={e => upd(f.idx, "end_s", +e.target.value)} />
                        </Field>
                      </td>
                      <td className="muted">{fmtClock(f.end_s)}</td>
                      <td>
                        <button className="btn tiny danger"
                                onClick={() => remove(f.idx)}>−</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}