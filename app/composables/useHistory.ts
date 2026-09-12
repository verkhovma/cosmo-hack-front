// Журнал изменений черновика: undo/redo + персист в localStorage.
// Храним только конфигурацию (Scenario), без UI-состояния.
// Схема хранения: { entries, index } — index указывает на текущую позицию.
import type { Scenario } from '~~/shared/types/scenario'

import { toPlain } from '~~/shared/utils/plain'
import { describeChange } from '~~/shared/utils/scenarioDiff'

export interface HistoryEntry {
  at: number
  label: string
  scenario: Scenario
}

interface Persisted {
  entries: HistoryEntry[]
  index: number
}

const KEY = 'cosmo:history:v1'
const LIMIT = 50

function clone(s: Scenario): Scenario {
  // Черновик приходит из reactive-состояния и из spread-объектов редактора,
  // где вложенные значения — Proxy; structuredClone на Proxy падает с
  // DataCloneError, из-за чего ломался и push, и undo/redo.
  return toPlain(s)
}

function load(): null | Persisted {
  if (import.meta.server)
    return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw)
      return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null)
      return null
    const { entries: rawEntries, index: rawIndex } = parsed as { entries?: unknown, index?: unknown }
    if (!Array.isArray(rawEntries) || typeof rawIndex !== 'number')
      return null
    // Лёгкая валидация записей.
    const entries = rawEntries.filter((e): e is HistoryEntry => {
      if (typeof e !== 'object' || e === null)
        return false
      const rec = e as Record<string, unknown>
      return typeof rec.label === 'string' && typeof rec.scenario === 'object' && rec.scenario !== null
    })
    if (!entries.length)
      return null
    const index = Math.min(Math.max(0, rawIndex), entries.length - 1)
    return { entries, index }
  }
  catch {
    return null
  }
}

export function useHistory() {
  const entries = useState<HistoryEntry[]>('cosmo-history-entries', () => [])
  const index = useState('cosmo-history-index', () => -1)
  const hydrated = useState('cosmo-history-hydrated', () => false)

  // Гидратация один раз на клиенте (как в useJobs).
  if (import.meta.client && !hydrated.value) {
    hydrated.value = true
    const saved = load()
    if (saved) {
      entries.value = saved.entries
      index.value = saved.index
    }
  }

  function persist() {
    if (import.meta.server)
      return
    try {
      const data: Persisted = { entries: entries.value, index: index.value }
      localStorage.setItem(KEY, JSON.stringify(data))
    }
    catch {
      // quota/privacy — молча, история просто не переживёт reload
    }
  }

  const canUndo = computed(() => index.value > 0)
  const canRedo = computed(() => index.value >= 0 && index.value < entries.value.length - 1)
  const current = computed(() => (index.value >= 0 ? (entries.value[index.value] ?? null) : null))

  function reset(scenario: Scenario, label = 'Открыт сценарий') {
    const entry: HistoryEntry = { at: Date.now(), label, scenario: clone(scenario) }
    entries.value = [entry]
    index.value = 0
    persist()
  }

  function push(prev: Scenario, next: Scenario) {
    // Нет изменений — не пишем.
    if (JSON.stringify(prev) === JSON.stringify(next))
      return
    const label = describeChange(prev, next)
    const entry: HistoryEntry = { at: Date.now(), label, scenario: clone(next) }
    // Режем хвост redo и кладём новую запись.
    const head = index.value >= 0 ? entries.value.slice(0, index.value + 1) : []
    const nextEntries = [...head, entry]
    // Окно лимита.
    const trimmed = nextEntries.length > LIMIT ? nextEntries.slice(nextEntries.length - LIMIT) : nextEntries
    entries.value = trimmed
    index.value = trimmed.length - 1
    persist()
  }

  function undo(): null | Scenario {
    if (!canUndo.value)
      return null
    index.value -= 1
    persist()
    return clone(entries.value[index.value]?.scenario as Scenario)
  }

  function redo(): null | Scenario {
    if (!canRedo.value)
      return null
    index.value += 1
    persist()
    return clone(entries.value[index.value]?.scenario as Scenario)
  }

  /** Прыжок к записи по индексу (для выпадающего журнала). */
  function jumpTo(target: number): null | Scenario {
    if (target < 0 || target >= entries.value.length || target === index.value)
      return null
    index.value = target
    persist()
    return clone(entries.value[target]?.scenario as Scenario)
  }

  function clear() {
    entries.value = []
    index.value = -1
    persist()
  }

  return { canRedo, canUndo, clear, current, entries, index, jumpTo, push, redo, reset, undo }
}
