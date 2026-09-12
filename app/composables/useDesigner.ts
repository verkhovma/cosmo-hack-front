import type {
  ComputeResult,
  RouteEntry,
  Scenario,
  Snapshot,
} from '~~/shared/types/scenario'

// Состояние конструктора: черновик правится мгновенно,
// расчёт — по кнопке «Запустить» или debounce 600 мс (PLAN 1.2).
// Валидация — локально через validateScenario, бэк не спамим при ошибках.
import { toast } from 'vue-sonner'
import { validateScenario } from '~~/shared/utils/validate'

import { errorMessage, useApi } from './useApi'
import { useHistory } from './useHistory'
import { useJobs } from './useJobs'

export function emptyScenario(): Scenario {
  return {
    design: { launch_stage: 3, planes: [], satellites: [] },
    environment: {
      altitude_km: 550,
      earth_angle0_deg: 12,
      horizon_s: 86400,
      inclination_deg: 87,
      isl_range_km: 3000,
      min_elevation_deg: 10,
      step_s: 120,
      target_availability: 0.9,
    },
    failures: [],
    gateway_outages: [],
    ground_sites: [],
    meta: { id: 'user_project', title: 'Пустая конфигурация' },
    schema_version: 'cosmo-A-1.0',
  }
}

/** Доминирующая причина перерывов по клиенту (для MetricsTable). */
export function dominantReasons(routes: null | Record<string, RouteEntry[]>): Record<string, string> {
  const out: Record<string, string> = {}
  if (!routes)
    return out
  for (const [cid, entries] of Object.entries(routes)) {
    const counts: Record<string, number> = {}
    for (const e of entries) {
      if (e.reason === 'ok')
        continue
      counts[e.reason] = (counts[e.reason] ?? 0) + 1
    }
    let best = 'ok'
    let bestN = 0
    for (const [r, n] of Object.entries(counts)) {
      if (n > bestN) {
        best = r
        bestN = n
      }
    }
    out[cid] = best
  }
  return out
}

export function useDesignerState() {
  const draft = useState<null | Scenario>('designer-draft', () => null)
  const applied = useState<null | Scenario>('designer-applied', () => null)
  const result = useState<ComputeResult | null>('designer-result', () => null)
  const routes = useState<null | Record<string, RouteEntry[]>>('designer-routes', () => null)
  const visibleLog = useState<null | Record<string, string[][]>>('designer-visible', () => null)
  const snapshot = useState<null | Snapshot>('designer-snapshot', () => null)
  const ts = useState('designer-ts', () => 0)
  const busy = useState('designer-busy', () => false)
  const computeError = useState<null | string>('designer-compute-error', () => null)
  const showStart = useState('designer-show-start', () => true)
  const selectedClient = useState<null | string>('designer-client', () => null)
  const selectedSatellite = useState<null | string>('designer-sat', () => null)
  const hiddenSats = useState<Set<string>>('designer-hidden', () => new Set())

  const errors = computed(() => (draft.value ? validateScenario(draft.value) : []))
  const canRun = computed(() => !!draft.value && errors.value.length === 0 && !busy.value)
  const clients = computed(
    () => draft.value?.ground_sites.filter(g => g.role === 'client') ?? [],
  )
  const reasons = computed(() => dominantReasons(routes.value))

  return {
    applied,
    busy,
    canRun,
    clients,
    computeError,
    draft,
    errors,
    hiddenSats,
    reasons,
    result,
    routes,
    selectedClient,
    selectedSatellite,
    showStart,
    snapshot,
    ts,
    visibleLog,
  }
}

export type DesignerState = ReturnType<typeof useDesignerState>

const OPEN_LABEL = 'Открыт сценарий'
type HistoryApi = ReturnType<typeof useHistory>
type ScheduleRun = () => void

function openLabel(s: Scenario): string {
  return s.meta.title ? `Открыт: ${s.meta.title}` : OPEN_LABEL
}

function recordDraft(history: HistoryApi, prev: null | Scenario, next: Scenario) {
  // Первая правка после reload: восстанавливаем базу в журнал.
  if (prev && history.entries.value.length === 0)
    history.reset(prev, OPEN_LABEL)
  if (prev)
    history.push(prev, next)
  else
    history.reset(next, OPEN_LABEL)
}

function createHistoryNav(state: DesignerState, history: HistoryApi, scheduleRun: ScheduleRun) {
  function apply(s: null | Scenario) {
    if (!s)
      return
    state.draft.value = s
    scheduleRun()
  }
  function undo() {
    const s = history.undo()
    if (!s) {
      toast.info('Дальше откатывать нечего')
      return
    }
    apply(s)
  }
  function redo() {
    const s = history.redo()
    if (!s) {
      toast.info('Дальше вперёд некуда')
      return
    }
    apply(s)
  }
  function jumpToHistory(target: number) {
    apply(history.jumpTo(target))
  }
  return { jumpToHistory, redo, undo }
}

let runToken = 0
let debounceTimer: null | ReturnType<typeof setTimeout> = null
let snapToken = 0

export function useDesignerRunner(state: DesignerState) {
  const api = useApi()
  const { addJob } = useJobs()

  async function runNow() {
    const s = state.draft.value
    if (!s)
      return
    if (validateScenario(s).length > 0) {
      state.computeError.value = 'В сценарии есть ошибки — расчёт не запущен'
      return
    }
    const my = ++runToken
    state.busy.value = true
    state.computeError.value = null
    try {
      const r = await api.compute(s)
      if (my !== runToken)
        return
      state.applied.value = s
      state.result.value = r
      state.ts.value = 0
      addJob({ jobId: r.job_id, result: r, scenario: s, title: s.meta.title })
      const rr = await api.getRoutes(r.job_id)
      if (my !== runToken)
        return
      state.routes.value = rr.routes
      state.visibleLog.value = rr.visible_log
      if (!state.selectedClient.value) {
        const first = s.ground_sites.find(g => g.role === 'client')
        if (first)
          state.selectedClient.value = first.id
      }
    }
    catch (e) {
      if (my !== runToken)
        return
      state.computeError.value = errorMessage(e, 'Ошибка расчёта')
      toast.error('Расчёт не удался', { description: state.computeError.value })
    }
    finally {
      if (my === runToken)
        state.busy.value = false
    }
  }

  async function refreshSnapshot() {
    const jobId = state.result.value?.job_id
    if (!jobId)
      return
    const my = ++snapToken
    try {
      const s = await api.getSnapshot(jobId, state.ts.value)
      if (my === snapToken)
        state.snapshot.value = s.snapshot
    }
    catch (e) {
      if (my === snapToken)
        toast.error('Не удалось получить снимок', { description: errorMessage(e, 'Ошибка сети') })
    }
  }

  function scheduleRun() {
    if (debounceTimer)
      clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      if (state.draft.value && validateScenario(state.draft.value).length === 0)
        void runNow()
    }, 600)
  }

  watch([state.result, state.ts], () => {
    void refreshSnapshot()
  })

  return { refreshSnapshot, runNow, scheduleRun }
}

export function useDesigner() {
  const state = useDesignerState()
  const { runNow, scheduleRun } = useDesignerRunner(state)
  const history = useHistory()
  const { jumpToHistory, redo, undo } = createHistoryNav(state, history, scheduleRun)

  function updateDraft(s: Scenario) {
    recordDraft(history, state.draft.value, s)
    state.draft.value = s
    scheduleRun()
  }

  function loadScenario(s: Scenario) {
    state.draft.value = s
    history.reset(s, openLabel(s))
    state.applied.value = null
    state.result.value = null
    state.routes.value = null
    state.visibleLog.value = null
    state.snapshot.value = null
    state.ts.value = 0
    state.selectedClient.value = s.ground_sites.find(g => g.role === 'client')?.id ?? null
    state.selectedSatellite.value = null
    state.showStart.value = false
    state.computeError.value = null
    // Невалидный сценарий (напр. пустой) не считаем — ошибки уже видны в редакторе.
    if (validateScenario(s).length === 0)
      void runNow()
  }

  // Отказ в 1 клик из карточки спутника (PLAN 1.3).
  function addFailureFor(satId: string) {
    const s = state.draft.value
    if (!s)
      return
    const horizon = s.environment.horizon_s
    const start = Math.min(state.ts.value, Math.max(0, horizon - 1))
    const end = Math.min(horizon, start + 3600)
    if (end <= start) {
      toast.error('Нет места для отказа в конце горизонта')
      return
    }
    updateDraft({ ...s, failures: [...s.failures, { end_s: end, satellite_id: satId, start_s: start }] })
    toast.success(`Отказ ${satId}`, { description: `+ [${start}; ${end}) — расчёт перезапустится` })
  }

  function downloadScenarioJson() {
    const s = state.draft.value
    if (!s)
      return
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${s.meta.id || 'scenario'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return {
    ...state,
    addFailureFor,
    canRedo: history.canRedo,
    canUndo: history.canUndo,
    downloadScenarioJson,
    historyEntries: history.entries,
    historyIndex: history.index,
    jumpToHistory,
    loadScenario,
    redo,
    runNow,
    scheduleRun,
    undo,
    updateDraft,
  }
}
