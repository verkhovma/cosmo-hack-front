import { useState } from "react";
import { api } from "../api";
import CompareView from "../components/CompareView";
import ErrorBanner from "../components/ErrorBanner";
import { useJobs } from "../JobsContext";
import type { CompareResponse } from "../types";

export default function ComparePage() {
  const { jobs, removeJob, clear } = useJobs();
  const [selected, setSelected] = useState<string[]>([]);
  const [data, setData] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(jobId: string) {
    setSelected((prev) =>
      prev.includes(jobId) ? prev.filter((x) => x !== jobId) : [...prev, jobId],
    );
  }

  async function run() {
    setError(null);
    try {
      const d = await api.compare(selected);
      setData(d);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="compare-page">
      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}
      <h2>Сравнение вариантов</h2>
      <ul className="jobs">
        {jobs.map((j) => (
          <li key={j.jobId}>
            <label>
              <input
                type="checkbox"
                checked={selected.includes(j.jobId)}
                onChange={() => toggle(j.jobId)}
              />
              {j.title} · <code>{j.jobId.slice(0, 8)}</code>
            </label>
            <button onClick={() => removeJob(j.jobId)}>×</button>
          </li>
        ))}
      </ul>
      <div className="row">
        <button disabled={selected.length < 2} onClick={run}>
          Сравнить ({selected.length})
        </button>
        <button onClick={clear}>Очистить</button>
      </div>
      {data && (
        <CompareView
          data={data}
          jobs={jobs.filter((j) => selected.includes(j.jobId))}
        />
      )}
    </div>
  );
}