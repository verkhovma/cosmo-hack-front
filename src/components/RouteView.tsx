import { fmtTime } from "../utils/format";
import type { RoutesResponse } from "../types";
import AvailabilityChart from "./AvailabilityChart";

export default function RouteView({
  clientId, data, horizon, step, onSelectTime,
}: {
  clientId: string;
  data: RoutesResponse;
  horizon: number;
  step: number;
  onSelectTime: (t: number) => void;
}) {
  const gaps: number[] = [];
  let cur = 0;
  for (const r of data.routes) {
    if (r.path === null) cur++;
    else { if (cur > 0) gaps.push(cur * step); cur = 0; }
  }
  if (cur > 0) gaps.push(cur * step);

  return (
    <div className="route-view">
      <h3>Клиент {clientId}</h3>
      <p>
        Доступность: <b>{(data.metrics.availability * 100).toFixed(2)}%</b> ·{" "}
        Максимальный перерыв: <b>{data.metrics.max_gap_s} с</b> ·{" "}
        Перерывов: <b>{gaps.length}</b>
      </p>
      <AvailabilityChart routes={data.routes} horizon={horizon} step={step} />
      <table className="routes">
        <thead>
          <tr><th>Время</th><th>Маршрут</th></tr>
        </thead>
        <tbody>
          {data.routes.map((r) => (
            <tr key={r.t_s} className={r.path ? "" : "gap"}>
              <td>
                <button onClick={() => onSelectTime(r.t_s)}>
                  {fmtTime(r.t_s)}
                </button>
              </td>
              <td>{r.path ? r.path.join(" → ") : "— нет маршрута"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}