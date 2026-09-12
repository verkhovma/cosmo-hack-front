export type TabId =
  | "planes"
  | "batches"
  | "ground"
  | "failures"
  | "gateway_outages";

export const TABS: { id: TabId; label: string }[] = [
  { id: "planes",           label: "Плоскости" },
  { id: "batches",          label: "Очереди и спутники" },
  { id: "ground",           label: "Наземные пункты" },
  { id: "failures",         label: "Отказы спутников" },
  { id: "gateway_outages",  label: "Отказы шлюзов" },
];

export default function TabBar({
  active, onChange, badges,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
  badges?: Partial<Record<TabId, number>>;
}) {
  return (
    <div className="tab-bar">
      {TABS.map(t => {
        const bad = badges?.[t.id] ?? 0;
        return (
          <button
            key={t.id}
            className={"tab" + (active === t.id ? " active" : "")
                       + (bad > 0 ? " has-errors" : "")}
            onClick={() => onChange(t.id)}
            title={bad > 0 ? `${bad} ошибок` : undefined}
          >
            {t.label}
            {bad > 0 && <span className="badge">{bad}</span>}
          </button>
        );
      })}
    </div>
  );
}