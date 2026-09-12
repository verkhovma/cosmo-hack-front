import { fmtClock } from "../utils/format";
import type { RoutesResponse, RouteEntry } from "../types";
import AvailabilityStrip from "./AvailabilityStrip";

export default function RouteView({
  clientId,
  data,
  step,
  onSelectTime,
}: {
  clientId: string;
  data: RoutesResponse;
  step: number;
  onSelectTime: (t: number) => void;
}) {
  // ВАЖНО: data.routes — это Record<string, RouteEntry[]>,
  // поэтому берём массив по clientId, а не итерируем сам Record.
  const entries: RouteEntry[] = data.routes[clientId] ?? [];
  const visible = data.visible_log[clientId];
  const metrics = data.metrics[clientId];

  if (!metrics) {
    return (
      <div className="route-view">
        <h3>Клиент {clientId}</h3>
        <p className="muted">Нет данных по этому клиенту.</p>
      </div>
    );
  }

  // перерывы
  const gaps: number[] = [];
  let cur = 0;
  for (const r of entries) {
    if (r.path === null) cur++;
    else {
      if (cur > 0) gaps.push(cur * step);
      cur = 0;
    }
  }
  if (cur > 0) gaps.push(cur * step);

  return (
    <div className="route-view">
      <h3>Клиент {clientId}</h3>
      <p>
        Доступность: <b>{(metrics.availability * 100).toFixed(2)}%</b> ·{" "}
        Максимальный перерыв: <b>{metrics.max_gap_s} с</b> ·{" "}
        Перерывов: <b>{gaps.length}</b>
      </p>

      <AvailabilityStrip
        clientId={clientId}
        entries={entries}
        step={step}
        onSeek={onSelectTime}
        visibleLog={visible}
      />

      <table className="routes">
        <thead>
          <tr>
            <th>Время</th>
            <th>Маршрут</th>
            <th>Причина</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(r => (
            <tr key={r.t_s} className={r.path ? "" : "gap"}>
              <td>
                <button onClick={() => onSelectTime(r.t_s)}>
                  {fmtClock(r.t_s)}
                </button>
              </td>
              <td>{r.path ? r.path.join(" → ") : "— нет маршрута"}</td>
              <td>{r.path ? "—" : r.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}