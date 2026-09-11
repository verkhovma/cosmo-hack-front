import { fmtTime } from "../utils/format";

export default function Timeline({
  t_s, horizon, step, onChange,
}: {
  t_s: number;
  horizon: number;
  step: number;
  onChange: (t: number) => void;
}) {
  return (
    <div className="timeline">
      <input
        type="range"
        min={0}
        max={horizon - step}
        step={step}
        value={t_s}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="time-label">{fmtTime(t_s)} / {fmtTime(horizon)}</span>
    </div>
  );
}