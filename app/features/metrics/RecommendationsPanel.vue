<script setup lang="ts">
import type { RouteEntry, Scenario } from '~~/shared/types/scenario'

import { hasPath } from '~~/shared/utils/routes'

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

  // 1. Доминирующая причина.
  const counts: Record<string, number> = {}
  for (const entries of Object.values(props.routes)) {
    for (const e of entries) {
      if (e.reason !== 'ok')
        counts[e.reason] = (counts[e.reason] ?? 0) + 1
    }
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  if (top) {
    const hint = top[0] === 'no_isl_path'
      ? 'разнесите phase плоскостей или поднимите isl_range'
      : top[0] === 'no_visible_satellite'
        ? 'поднимите launch_stage или сдвиньте RAAN к клиентам'
        : top[0] === 'no_gateway_contact' || top[0] === 'gateway_offline'
          ? 'проверьте шлюзы и gateway_outages'
          : 'смотрите полосы доступности'
    out.push({ text: hint, title: `Доминирует ${top[0]} (${top[1]} шагов)` })
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
      text: 'чаще всего в маршрутах — их отказ больнее всего. Кликните по спутнику на карте, чтобы увести в отказ и проверить.',
      title: `Уязвимые: ${topSats.map(([id]) => id).join(', ')}`,
    })
  }

  // 3. Цель не достигнута.
  const below = Object.entries(props.metrics).filter(([, m]) => m.availability < props.target)
  if (below.length) {
    const s = props.scenario
    if (s.design.launch_stage < 3) {
      out.push({
        action: {
          label: `Stage → ${(s.design.launch_stage + 1) as 2 | 3}`,
          run: () => { emit('apply', {
            ...s,
            design: { ...s.design, launch_stage: (s.design.launch_stage + 1) as 2 | 3 },
          }); },
        },
        text: 'попробуйте поднять очередь запуска — это самый дешёвый способ поднять доступность.',
        title: `Цель ≥90% не достигнута (${below.map(([c]) => c).join(', ')})`,
      })
    }
    else if (s.design.planes.length > 1) {
      const p = s.design.planes[1]
      if (!p) {
        out.push({
          text: 'очередь уже максимальная — смотрите доминирующую причину выше.',
          title: `Цель ≥90% не достигнута (${below.map(([c]) => c).join(', ')})`,
        })
      }
      else {
        out.push({
        action: {
          label: `${p.id} phase +15°`,
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
        text: `попробуйте сдвинуть phase плоскости ${p.id} на +15° — дешёвая эвристика фазирования.`,
        title: `Цель ≥90% не достигнута (${below.map(([c]) => c).join(', ')})`,
        })
      }
    }
    else {
      out.push({
        text: 'очередь уже максимальная — смотрите доминирующую причину выше.',
        title: `Цель ≥90% не достигнута (${below.map(([c]) => c).join(', ')})`,
      })
    }
  }
  else {
    out.push({ text: 'можно фиксировать вариант и идти в сравнение.', title: 'Цель ≥90% достигнута везде' })
  }

  return out
})
</script>

<template>
  <Card class="border-orbital-blue">
    <CardHeader>
      <CardTitle>Рекомендации</CardTitle>
      <CardDescription>Эвристики по текущим routes/metrics, без бэка</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-3 text-sm">
      <Alert v-if="!items.length">
        <AlertDescription>Данных для рекомендаций пока нет — дождитесь расчёта.</AlertDescription>
      </Alert>
      <div v-for="(it, i) in items" :key="i" class="flex items-start justify-between gap-3 rounded-md bg-neutral p-3">
        <div>
          <b>{{ it.title }}</b>
          <p class="text-secondary">{{ it.text }}</p>
        </div>
        <Button v-if="it.action" size="sm" variant="secondary" @click="it.action.run">{{ it.action.label }}</Button>
      </div>
    </CardContent>
  </Card>
</template>
