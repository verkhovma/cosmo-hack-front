import { useMemo, useState } from "react";
import { fmtClock, fmtDuration, fmtPercent } from "../utils/format";
import type { RouteEntry } from "../types";

export const REASON_LABEL: Record<string, string> = {
  ok: "маршрут есть",
  no_visible_satellite: "нет видимого спутника",
  no_isl_path: "разрыв межспутниковой сети",
  no_gateway_contact: "нет контакта со шлюзом",
  gateway_offline: "шлюз недоступен",
};

interface Seg {
  from: number;
  to: number;
  ok: boolean;
  reason: string;
}

function groupSegments(
  entries: { t_s: number; path: string[] | null; reason: string }[],
  step: number,
  isOk: (e: { path: string[] | null; reason: string }) => boolean,
  reasonOf: (e: { path: string[] | null; reason: string }) => string,
): Seg[] {
  const segs: Seg[] = [];
  let cur: Seg | null = null;
  for (const e of entries) {
    const ok = isOk(e);
    const reason = reasonOf(e);
    if (!cur || cur.ok !== ok || cur.reason !== reason) {
      if (cur) segs.push(cur);
      cur = { from: e.t_s, to: e.t_s + step, ok, reason };
    } else {
      cur.to = e.t_s + step;
    }
  }
  if (cur) segs.push(cur);
  return segs;
}

export default function AvailabilityStrip({
  clientId,
  entries,
  step,
  onSeek,
  visibleLog,
}: {
  clientId: string;
  entries: { t_s: number; path: string[] | null; reason: string }[];
  step: number;
  onSeek: (t: number) => void;
  /** visibleLog[i] — список спутников, видимых клиенту на i-м шаге (может быть пусто) */
  visibleLog?: string[][];
}) {
  const [hover, setHover] = useState<{ x: number; text: string } | null>(null);

  const total = entries.length * step;
  const avail = entries.filter(e => e.path !== null).length / entries.length;

  // полоса маршрута
  const routeSegs = useMemo(
    () => groupSegments(entries, step, e => e.path !== null, e => e.reason),
    [entries, step],
  );

  // полоса видимости: ok = есть хотя бы один видимый спутник
  const visibilitySegs = useMemo(() => {
    if (!visibleLog) return [];
    const visEntries = entries.map((e, i) => ({
      t_s: e.t_s,
      path: (visibleLog[i]?.length ?? 0) > 0 ? ["x"] : null,
      reason: (visibleLog[i]?.length ?? 0) > 0 ? "ok" : "no_visible_satellite",
    }));
    return groupSegments(visEntries, step, e => e.path !== null, e => e.reason);
  }, [entries, visibleLog, step]);

  // максимальный перерыв маршрута
  const maxGap = routeSegs
    .filter(s => !s.ok)
    .reduce((a, b) => (b.to - b.from > a.to - a.from ? b : a),
            { from: 0, to: 0, ok: true, reason: "" });

  return (
    <div className="avail-strip">
      <div className="avail-header">
        <b>{clientId}</b>
        <span>{fmtPercent(avail)}</span>
        <span className="muted">
          макс. перерыв {fmtDuration(maxGap.to - maxGap.from)}
        </span>
      </div>

      {/* Полоса 1 — видимость хотя бы одного спутника */}
      {visibleLog && (
        <div className="strip-row">
          <span className="strip-label">видимость</span>
          <div className="strip" onMouseLeave={() => setHover(null)}>
            {visibilitySegs.map((s, i) => (
              <div
                key={i}
                className={"seg " + (s.ok ? "vis-ok" : "vis-bad")}
                style={{ width: `${((s.to - s.from) / total) * 100}%` }}
                onMouseMove={(e) => {
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                  setHover({
                    x: e.clientX - rect.left,
                    text:
                      `${fmtClock(s.from)} — ${fmtClock(s.to)} (${fmtDuration(s.to - s.from)})\n` +
                      (s.ok ? "есть видимый спутник" : "нет видимого спутника"),
                  });
                }}
                onClick={() => onSeek(s.from)}
              />
            ))}
            {hover && (
              <div className="strip-popup" style={{ left: hover.x }}>
                {hover.text.split("\n").map((l, i) => <div key={i}>{l}</div>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Полоса 2 — доступность маршрута */}
      <div className="strip-row">
        <span className="strip-label">маршрут</span>
        <div className="strip" onMouseLeave={() => setHover(null)}>
          {routeSegs.map((s, i) => (
            <div
              key={i}
              className={"seg " + (s.ok ? "ok" : "bad")}
              style={{ width: `${((s.to - s.from) / total) * 100}%` }}
              onMouseMove={(e) => {
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                setHover({
                  x: e.clientX - rect.left,
                  text:
                    `${fmtClock(s.from)} — ${fmtClock(s.to)} (${fmtDuration(s.to - s.from)})\n` +
                    `причина: ${REASON_LABEL[s.reason] ?? s.reason}`,
                });
              }}
              onClick={() => onSeek(s.from)}
            />
          ))}
          {hover && (
            <div className="strip-popup" style={{ left: hover.x }}>
              {hover.text.split("\n").map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}