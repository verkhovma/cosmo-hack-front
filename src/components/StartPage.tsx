import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { Scenario, ScenarioListItem } from "../types";

export default function StartPage({
  onLoaded, onEmpty,
}: {
  onLoaded: (s: Scenario) => void;
  onEmpty: () => void;
}) {
  const [examples, setExamples] = useState<ScenarioListItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.listScenarios().then(setExamples).catch(e => setErr(e.message));
  }, []);

  async function upload(file: File) {
    setBusy(true); setErr(null);
    try {
      const { scenario } = await api.uploadScenario(file);
      onLoaded(scenario);           // сразу запускает расчёт (в DesignerPage)
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function pickExample(file: string) {
    setBusy(true); setErr(null);
    try {
      const s = await api.getScenario(file);
      onLoaded(s);                  // сразу запускает расчёт
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="start-page">
      <div className="start-left">
        <h2>Примеры конфигураций</h2>
        {examples.map(it => (
          <button key={it.file} disabled={busy}
                  onClick={() => pickExample(it.file)}>
            {it.title || it.file}
          </button>
        ))}
      </div>

      <div className="start-right">
        <h1>Проектирование спутниковой группировки</h1>

        <button className="big primary" disabled={busy}
                onClick={() => fileRef.current?.click()}>
          📂 Загрузить мою конфигурацию (JSON)
        </button>
        <input ref={fileRef} type="file" accept=".json" hidden
               onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />

        <button className="big" disabled={busy} onClick={onEmpty}>
          ✨ Начать с пустой конфигурации
        </button>

        {err && <div className="error-banner">{err}</div>}
      </div>
    </div>
  );
}