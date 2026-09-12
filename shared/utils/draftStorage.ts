// Персист черновика в localStorage: переживает reload — иначе возврат после
// перезагрузки приводил бы к пустому экрану, хотя джобы на месте.
import type { Scenario } from '~~/shared/types/scenario'

const DRAFT_KEY = 'cosmo:draft:v1'

export function loadPersistedDraft(): null | Scenario {
  if (import.meta.server)
    return null
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw)
      return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null && 'design' in parsed)
      return parsed as Scenario
    return null
  }
  catch {
    return null
  }
}

export function persistDraft(s: null | Scenario) {
  if (import.meta.server)
    return
  try {
    if (s)
      localStorage.setItem(DRAFT_KEY, JSON.stringify(s))
    else
      localStorage.removeItem(DRAFT_KEY)
  }
  catch {
    // quota/privacy — молча, черновик просто не переживёт reload
  }
}
