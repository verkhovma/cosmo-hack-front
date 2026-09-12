import { useState } from "react";
import { fmtClock } from "../utils/format";

export default function Timeline({
  t_s, horizon, step, onChange,
}: {
  t_s: number; horizon: number; step: number;
  onChange: (t: number) => void;
}) {
  const [human, setHuman] = useState(true);
  return (
    <div className="timeline">
      <input type="range" min={0} max={horizon - step} step={step}
             value={t_s} onChange={e => onChange(+e.target.value)} />
      <span className="time-label">
        {human ? `${fmtClock(t_s)} / ${fmtClock(horizon)}` : `${t_s} с / ${horizon} с`}
      </span>
      <button className="btn tiny" onClick={() => setHuman(h => !h)}>
        {human ? "сек" : "ЧЧ:ММ:СС"}
      </button>
    </div>
  );
}