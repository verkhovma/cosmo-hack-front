import { useMemo, useState } from "react";
import TabBar, { TabId } from "./TabBar";
import PlanesTab from "./PlanesTab";
import BatchesTab from "./BatchesTab";
import GroundSitesTab from "./GroundSitesTab";
import FailuresTab from "./FailuresTab";
import GatewayOutagesTab from "./GatewayOutagesTab";
import ErrorList from "./ErrorList";
import type { Scenario } from "../types";
import type { ValidationError } from "../utils/validate";

export default function ScenarioEditor({
  scenario, errors, onChange, onSave, onSaveAnyway,
}: {
  scenario: Scenario;
  errors: ValidationError[];
  onChange: (s: Scenario) => void;
  onSave: () => void;
  onSaveAnyway: () => void;
}) {
  const [tab, setTab] = useState<TabId>("batches");

  // счётчик ошибок по вкладкам
  const badges = useMemo(() => {
    const m: Partial<Record<TabId, number>> = {};
    const map: Record<string, TabId> = {
      planes: "planes",
      satellites: "batches",
      ground_sites: "ground",
      failures: "failures",
      gateway_outages: "gateway_outages",
    };
    for (const e of errors) {
      const t = e.list ? map[e.list] : undefined;
      if (t) m[t] = (m[t] ?? 0) + 1;
      // ошибки без привязки к списку — не показываем в бейджах
    }
    return m;
  }, [errors]);

  const hasErrors = errors.length > 0;

  return (
    <section className="panel scenario-editor">
      <h2>Конфигурация</h2>

      {hasErrors && (
        <ErrorList errors={errors} title="Ошибки валидации" />
      )}

      <TabBar active={tab} onChange={setTab} badges={badges} />

      <div className="tab-body">
        {tab === "planes"          && <PlanesTab          scenario={scenario} errors={errors} onChange={onChange} />}
        {tab === "batches"         && <BatchesTab         scenario={scenario} errors={errors} onChange={onChange} />}
        {tab === "ground"          && <GroundSitesTab     scenario={scenario} errors={errors} onChange={onChange} />}
        {tab === "failures"        && <FailuresTab        scenario={scenario} errors={errors} onChange={onChange} />}
        {tab === "gateway_outages" && <GatewayOutagesTab  scenario={scenario} errors={errors} onChange={onChange} />}
      </div>

      <div className="editor-actions">
        {!hasErrors && (
          <button className="btn primary" onClick={onSave}>
            Сохранить
          </button>
        )}
        {hasErrors && (
          <button className="btn danger" onClick={onSaveAnyway}>
            Сохранить всё равно (есть ошибки)
          </button>
        )}
      </div>
    </section>
  );
}