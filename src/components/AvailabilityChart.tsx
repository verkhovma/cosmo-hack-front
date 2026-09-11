import type { RouteEntry } from "../types";

export default function AvailabilityChart({
  routes, horizon, step,
}: {
  routes: RouteEntry[];
  horizon: number;
  step: number;
}) {
  const total = Math.floor(horizon / step);
  const avail = routes.map((r) => r.path !== null);

  return (
    <div className="availability-chart">
      <svg width="100%" height="40" viewBox={`0 0 ${total} 20`} preserveAspectRatio="none">
        {avail.map((a, i) => (
          <rect
            key={i}
            x={i} y={a ? 0 : 10}
            width={1} height={10}
            fill={a ? "#4cd964" : "#e6194b"}
          />
        ))}
      </svg>
      <div className="legend">
        <span className="ok">■ есть маршрут</span>
        <span className="bad">■ перерыв</span>
      </div>
    </div>
  );
}