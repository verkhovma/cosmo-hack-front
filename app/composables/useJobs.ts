// Замена JobsContext: useState + персист в localStorage (PLAN 2.2).
// Храним jobId/title/scenario/result, чтобы сравнение жило после reload.
import type { JobEntry } from '~~/shared/types/scenario'

const KEY = 'cosmo:jobs:v1'

function load(): JobEntry[] {
  if (import.meta.server)
    return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw)
      return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as JobEntry[]) : []
  }
  catch {
    return []
  }
}

export function useJobs() {
  const jobs = useState<JobEntry[]>('cosmo-jobs', () => [])

  if (import.meta.client && jobs.value.length === 0) {
    const saved = load()
    if (saved.length)
      jobs.value = saved
  }

  function persist() {
    if (import.meta.server)
      return
    try {
      localStorage.setItem(KEY, JSON.stringify(jobs.value))
    }
    catch {
      // quota/privacy — молча, сравнение просто не переживёт reload
    }
  }

  function addJob(entry: JobEntry) {
    jobs.value = [...jobs.value.filter(j => j.jobId !== entry.jobId), entry]
    persist()
  }

  function removeJob(jobId: string) {
    jobs.value = jobs.value.filter(j => j.jobId !== jobId)
    persist()
  }

  function clear() {
    jobs.value = []
    persist()
  }

  return { addJob, clear, jobs, removeJob }
}
