import { useEffect, useState } from "react";
import { api } from "../api";
import type { ProjectMeta, Scenario } from "../types";

export default function ProjectsPage() {
  const [items, setItems] = useState<ProjectMeta[]>([]);
  const [current, setCurrent] = useState<Scenario | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try { setItems(await api.listProjects()); }
    catch (e: any) { setError(e.message); }
  }

  useEffect(() => { refresh(); }, []);

  async function load(pid: string) {
    try {
      const { scenario } = await api.getProject(pid);
      setCurrent(scenario);
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div className="projects-page">
      <h2>Сохранённые проекты</h2>
      {error && <div className="error">{error}</div>}
      <ul>
        {items.map((p) => (
          <li key={p.id}>
            <button onClick={() => load(p.id)}>{p.title}</button>
            <small>{new Date(p.created_at).toLocaleString()}</small>
          </li>
        ))}
      </ul>
      {current && (
        <pre className="scenario-json">
          {JSON.stringify(current, null, 2)}
        </pre>
      )}
    </div>
  );
}