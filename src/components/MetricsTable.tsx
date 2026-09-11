import type { ClientMetrics } from "../types";

export default function MetricsTable({
  metrics, target,
}: {
  metrics: Record<string, ClientMetrics>;
  target: number;
}) {
  return (
    <table className="metrics">
      <thead>
        <tr>
          <th>Клиент</th>
          <th>Доступность</th>
          <th>Макс. перерыв</th>
          <th>Цель ≥ {(target * 100).toFixed(0)}%</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(metrics).map(([cid, m]) => (
          <tr key={cid}>
            <td>{cid}</td>
            <td>{(m.availability * 100).toFixed(2)}%</td>
            <td>{m.max_gap_s} с</td>
            <td>{m.availability >= target ? "✓" : "✗"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}