// Тонкий API-клиент: validate → service → return.
// Базовый URL из runtimeConfig (dev: nitro devProxy, prod: nginx /api).
import type {
  CompareResponse,
  ComputeResult,
  ProjectMeta,
  RoutesResponse,
  Scenario,
  ScenarioListItem,
  Snapshot,
} from '~~/shared/types/scenario'

interface PostOpts {
  body?: string
}

export function errorMessage(e: unknown, fallback: string): string {
  if (typeof e === 'object' && e !== null) {
    const data = (e as { data?: unknown }).data
    if (typeof data === 'object' && data !== null) {
      const rec = data as Record<string, unknown>
      const detail = rec.detail ?? rec.error
      if (typeof detail === 'string')
        return detail
    }
    const msg = (e as { message?: unknown }).message
    if (typeof msg === 'string')
      return msg
  }
  if (typeof e === 'string')
    return e
  return fallback
}

export function useApi() {
  const config = useRuntimeConfig()
  const base = (config.public.apiUrl) || '/api'

  async function request<T>(path: string, opts?: PostOpts): Promise<T> {
    try {
      return await $fetch<T>(`${base}${path}`, {
        body: opts?.body,
        headers: { 'Content-Type': 'application/json' },
        method: opts?.body === undefined ? 'GET' : 'POST',
      })
    }
    catch (e) {
      throw new Error(errorMessage(e, 'Ошибка сети'), { cause: e })
    }
  }

  return {
    compare: async (jobIds: string[]) =>
      await request<CompareResponse>('/compare', { body: JSON.stringify({ job_ids: jobIds }) }),
    compute: async (scenario: Scenario) =>
      await request<ComputeResult>('/compute', { body: JSON.stringify({ scenario }) }),
    exportUrl: (jobId: string) => `${base}/compute/${jobId}/export`,

    getProject: async (pid: string) => await request<{ scenario: Scenario }>(`/projects/${pid}`),

    getRoutes: async (jobId: string) =>
      await request<RoutesResponse>(`/compute/${jobId}/routes`),

    getScenario: async (name: string) =>
      await request<Scenario>(`/scenarios/${encodeURIComponent(name)}`),

    getSnapshot: async (jobId: string, tS: number) =>
      await request<{ t_s: number, snapshot: Snapshot }>(
        `/compute/${jobId}/snapshot?t_s=${tS}`,
      ),

    health: async () => await request<{ status: string }>('/health'),

    listProjects: async () => await request<ProjectMeta[]>('/projects'),

    listScenarios: async () => await request<ScenarioListItem[]>('/scenarios'),
    saveProject: async (title: string, scenario: Scenario, opts?: { saveAnyway?: boolean }) =>
      await request<{ id: string, title: string }>('/projects', {
        body: JSON.stringify({ save_anyway: opts?.saveAnyway ?? false, scenario, title }),
      }),

    uploadScenario: async (file: File): Promise<{ scenario: Scenario }> => {
      const fd = new FormData()
      fd.append('file', file)
      try {
        return await $fetch<{ scenario: Scenario }>(`${base}/scenarios/upload`, {
          body: fd,
          method: 'POST',
        })
      }
      catch (e) {
        throw new Error(errorMessage(e, 'Не удалось загрузить файл'), { cause: e })
      }
    },
  }
}
