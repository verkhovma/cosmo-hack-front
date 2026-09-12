<script setup lang="ts">
import type { RouteEntry, Scenario } from '~~/shared/types/scenario'

import { hasPath, REASON_LABEL } from '~~/shared/utils/routes'

import { Alert, AlertDescription } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

interface Item {
  action?: { label: string, run: () => void }
  text: string
  title: string
}

const props = defineProps<{
  scenario: Scenario
  routes: null | Record<string, RouteEntry[]>
  metrics: null | Record<string, { availability: number, max_gap_s: number }>
  target: number
  reasons: Record<string, string>
}>()
const emit = defineEmits<{ apply: [s: Scenario] }>()

const items = computed<Item[]>(() => {
  const out: Item[] = []
  if (!props.routes || !props.metrics)
    return out

  // 1. Основная причина перерывов.
  const counts: Record<string, number> = {}
  let total = 0
  for (const entries of Object.values(props.routes)) {
    for (const e of entries) {
      total += 1
      if (e.reason !== 'ok')
        counts[e.reason] = (counts[e.reason] ?? 0) + 1
    }
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  if (top) {
    const [code, n] = top as [string, number]
    const label = REASON_LABEL[code] ?? code
    const pct = total ? Math.round((n / total) * 100) : 0
    const hint = code === 'no_isl_path'
      ? 'Разнесите phase плоскостей или увеличьте isl_range_km.'
      : code === 'no_visible_satellite'
        ? 'Поднимите launch_stage или скорректируйте RAAN к клиентам.'
        : code === 'no_gateway_contact' || code === 'gateway_offline'
          ? 'Проверьте шлюзы и gateway_outages.'
          : 'Смотрите полосы доступности на шкале времени.'
    out.push({ text: hint, title: `Основная причина перерывов: ${label} — ${pct}% времени` })
  }

  // 2. Топ-3 уязвимых спутника по вхождению в маршруты.
  const freq = new Map<string, number>()
  for (const entries of Object.values(props.routes)) {
    for (const e of entries) {
      if (hasPath(e.path)) {
        for (const id of e.path) {
          if (id.startsWith('S'))
            freq.set(id, (freq.get(id) ?? 0) + 1)
        }
      }
    }
  }
  const topSats = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  if (topSats.length) {
    out.push({
      text: 'Отказ любого из них даст максимальный перерыв. Нажмите на спутник на карте, чтобы увести его в отказ и проверить.',
      title: `Единичные точки отказа: ${topSats.map(([id]) => id).join(', ')} — чаще всего в маршрутах`,
    })
  }

  // 3. Цель не достигнута.
  const siteName = (id: string) => props.scenario.ground_sites.find(g => g.id === id)?.name ?? id
  const below = Object.entries(props.metrics).filter(([, m]) => m.availability < props.target)
  const belowNames = below.map(([c]) => siteName(c)).join(', ')
  const targetPct = Math.round(props.target * 100)
  if (below.length) {
    const s = props.scenario
    if (s.design.launch_stage < 3) {
      out.push({
        action: {
          label: `Поднять до очереди ${(s.design.launch_stage + 1) as 2 | 3}`,
          run: () => { emit('apply', {
            ...s,
            design: { ...s.design, launch_stage: (s.design.launch_stage + 1) as 2 | 3 },
          }); },
        },
        text: 'Самый дешёвый способ поднять доступность — ввести следующую очередь (больше аппаратов в работе).',
        title: `Цель ≥${targetPct}% не достигнута: ${belowNames}`,
      })
    }
    else if (s.design.planes.length > 1) {
      const p = s.design.planes[1]
      if (!p) {
        out.push({
          text: 'Очередь уже максимальная — смотрите основную причину выше.',
          title: `Цель ≥${targetPct}% не достигнута: ${belowNames}`,
        })
      }
      else {
        out.push({
        action: {
          label: `${p.id}: phase +15°`,
          run: () => { emit('apply', {
            ...s,
            design: {
              ...s.design,
              planes: s.design.planes.map(x => x.id === p.id
                ? { ...x, phase_deg: (x.phase_deg + 15) % 360 }
                : x),
            },
          }); },
        },
        text: `Дешёвая эвристика фазирования плоскости ${p.id} — проверить закрытие разрывов ISL.`,
        title: `Цель ≥${targetPct}% не достигнута: ${belowNames}`,
        })
      }
    }
    else {
      out.push({
        text: 'Очередь уже максимальная — смотрите основную причину выше.',
        title: `Цель ≥${targetPct}% не достигнута: ${belowNames}`,
      })
    }
  }
  else {
    out.push({ text: 'Можно фиксировать вариант и идти в сравнение.', title: `Цель ≥${targetPct}% достигнута везде` })
  }

  return out
})
</script>

<template>
  <Card class="border-orbital-blue">
    <CardHeader>
      <CardTitle>Рекомендации</CardTitle>
      <CardDescription>Эвристики по текущему расчёту: причина перерывов, точки отказа, цель</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-3 text-sm">
      <Alert v-if="!items.length">
        <AlertDescription>Данных для рекомендаций пока нет — дождитесь расчёта.</AlertDescription>
      </Alert>
      <div v-for="(it, i) in items" :key="i" class="flex flex-col gap-2 rounded-md bg-neutral p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div class="min-w-0">
          <b>{{ it.title }}</b>
          <p class="text-secondary">{{ it.text }}</p>
        </div>
        <Button v-if="it.action" size="sm" variant="secondary" class="w-full shrink-0 sm:w-auto" @click="it.action.run">{{ it.action.label }}</Button>
      </div>
    </CardContent>
  </Card>
</template>
