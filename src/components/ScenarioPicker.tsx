import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { Scenario, ScenarioListItem } from "../types";

export default function ScenarioPicker({
  onLoaded,
}: {
  onLoaded: (s: Scenario) => void;
}) {
  const [items, setItems] = useState<ScenarioListItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.listScenarios().then(setItems).catch((e) => setErr(e.message));
  }, []);

  async function load(name: string) {
    setBusy(true);
    setErr(null);
    try {
      const s = await api.getScenario(name);
      onLoaded(s);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const { scenario } = await api.uploadScenario(file);
      onLoaded(scenario);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>Сценарий</h2>
      {err && <div className="error">{err}</div>}
      <ul className="scenario-list">
        {items.map((it) => (
          <li key={it.file}>
            <button disabled={busy} onClick={() => load(it.file)}>
              {it.title || it.file}
            </button>
          </li>
        ))}
      </ul>
      <div className="upload">
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
      </div>
    </section>
  );
}