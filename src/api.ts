import type {
  ComputeResult,
  CompareResponse,
  ProjectMeta,
  RoutesResponse,
  Scenario,
  ScenarioListItem,
  Snapshot,
} from "./types";

const BASE = import.meta.env.VITE_API_URL || "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || body.error || JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  listScenarios: () => request<ScenarioListItem[]>("/scenarios"),

  getScenario: (name: string) =>
    request<Scenario>(`/scenarios/${encodeURIComponent(name)}`),

  uploadScenario: async (file: File): Promise<{ scenario: Scenario }> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${BASE}/scenarios/upload`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  validate: (scenario: Scenario) =>
    request<{ valid: boolean }>("/scenarios/validate", {
      method: "POST",
      body: JSON.stringify({ scenario }),
    }),

  editScenario: (scenario: Scenario, edits: {
    launch_stage?: 1 | 2 | 3;
    planes?: { plane_id: string; raan_deg?: number; phase_deg?: number }[];
    add_failures?: { satellite_id: string; start_s: number; end_s: number }[];
    add_gateway_outages?: { gateway_id: string; start_s: number; end_s: number }[];
  }) =>
    request<{ scenario: Scenario }>("/scenarios/edit", {
      method: "POST",
      body: JSON.stringify({ scenario, ...edits }),
    }),

  compute: (scenario: Scenario) =>
    request<ComputeResult>("/compute", {
      method: "POST",
      body: JSON.stringify({ scenario }),
    }),

  getSnapshot: (jobId: string, t_s: number) =>
    request<{ t_s: number; snapshot: Snapshot }>(
      `/compute/${jobId}/snapshot?t_s=${t_s}`,
    ),

  getRoutes: (jobId: string, clientId: string) =>
    request<RoutesResponse>(
      `/compute/${jobId}/routes?client_id=${encodeURIComponent(clientId)}`,
    ),

  getMetrics: (jobId: string) =>
    request<{ metrics: Record<string, any>; target_availability: number }>(
      `/compute/${jobId}/metrics`,
    ),

  exportUrl: (jobId: string) => `${BASE}/compute/${jobId}/export`,

  saveProject: (title: string, scenario: Scenario) =>
    request<{ id: string; title: string }>("/projects", {
      method: "POST",
      body: JSON.stringify({ title, scenario }),
    }),

  listProjects: () => request<ProjectMeta[]>("/projects"),

  getProject: (pid: string) =>
    request<{ scenario: Scenario }>(`/projects/${pid}`),

  compare: (jobIds: string[]) =>
    request<CompareResponse>("/compare", {
      method: "POST",
      body: JSON.stringify({ job_ids: jobIds }),
    }),

  listJobs: () => request<any[]>("/jobs"),
};