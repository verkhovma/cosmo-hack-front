import type { ClientMetrics } from "../types";
import { REASON_LABEL } from "./AvailabilityStrip";
import { fmtDuration, fmtPercent } from "../utils/format";

export default function MetricsTable({
  metrics, target, reasons,
}: {
  metrics: Record<string, ClientMetrics>;
  target: number;
  reasons?: Record<string, string>;  // доминирующая причина перерыва по клиенту
}) {
  return (
    <table className="metrics">
      <thead>
        <tr>
          <th>Клиент</th>
          <th>Доступность</th>
          <th>Макс. перерыв</th>
          <th>Основная причина перерывов</th>
          <th>Цель ≥ {fmtPercent(target)}</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(metrics).map(([cid, m]) => {
          const ok = m.availability >= target;
          return (
            <tr key={cid}>
              <td>{cid}</td>
              <td>{fmtPercent(m.availability)}</td>
              <td>{fmtDuration(m.max_gap_s)}</td>
              <td className="muted">
                {reasons?.[cid] ? (REASON_LABEL[reasons[cid]] ?? reasons[cid]) : "—"}
              </td>
              <td className={ok ? "ok" : "bad"}>{ok ? "✓" : "✗"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}