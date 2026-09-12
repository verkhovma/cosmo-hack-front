<script setup lang="ts">
import type { RouteEntry, Scenario } from '~~/shared/types/scenario'
import type { ValidationError } from '~~/shared/utils/validate'

import { fmtClock } from '~~/shared/utils/format'
import { hasPath } from '~~/shared/utils/routes'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'

const props = defineProps<{
  scenario: Scenario
  errors: ValidationError[]
  routes?: null | Record<string, RouteEntry[]>
  tS?: number
}>()
const emit = defineEmits<{ update: [s: Scenario] }>()

const query = ref('')

const bySat = computed(() => {
  const m = new Map<string, { start_s: number, end_s: number, idx: number }[]>()
  for (const s of props.scenario.design.satellites) m.set(s.id, [])
  props.scenario.failures.forEach((f, idx) => {
    const list = m.get(f.satellite_id)
    if (list)
      list.push({ ...f, idx })
    else m.set(f.satellite_id, [{ ...f, idx }])
  })
  return m
})

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const all = Array.from(bySat.value.entries())
  if (!q)
    return all
  return all.filter(([sid]) => sid.toLowerCase().includes(q))
})

// Подсветка «в текущем маршруте» (PLAN 1.3).
const inRoute = computed(() => {
  const set = new Set<string>()
  if (!props.routes)
    return set
  for (const entries of Object.values(props.routes)) {
    const entry = entries.find(e => e.t_s === (props.tS ?? 0))
    if (entry && hasPath(entry.path)) {
      for (const id of entry.path) set.add(id)
    }
  }
  return set
})

function add(satId: string) {
  const horizon = props.scenario.environment.horizon_s
  emit('update', {
    ...props.scenario,
    failures: [...props.scenario.failures, {
      end_s: Math.min(3600, horizon),
      satellite_id: satId,
      start_s: 0,
    }],
  })
}

function remove(idx: number) {
  emit('update', { ...props.scenario, failures: props.scenario.failures.filter((_, k) => k !== idx) })
}

function upd(idx: number, k: 'end_s' | 'start_s', v: number) {
  emit('update', {
    ...props.scenario,
    failures: props.scenario.failures.map((f, k2) => (k2 === idx ? { ...f, [k]: v } : f)),
  })
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-sm font-medium">Отказы спутников</h3>
      <Input v-model="query" placeholder="Поиск по ID…" class="max-w-56" />
    </div>
    <p v-if="!scenario.design.satellites.length" class="text-sm text-mist">
      Сначала добавьте спутники на вкладке «Очереди и спутники».
    </p>
    <div class="flex flex-col gap-3">
      <Card v-for="[sid, list] in filtered" :key="sid" class="p-3">
        <div class="mb-2 flex items-center gap-2">
          <b>{{ sid }}</b>
          <span class="text-xs text-mist">— отказов: {{ list.length }}</span>
          <Badge v-if="inRoute.has(sid)" class="ml-1">в маршруте</Badge>
          <Button size="sm" variant="secondary" class="ml-auto" @click="add(sid)">+ отказ</Button>
        </div>
        <p v-if="!list.length" class="text-xs text-mist">Отказов нет</p>
        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Начало, с</TableHead>
              <TableHead>ЧЧ:ММ:СС</TableHead>
              <TableHead>Конец, с</TableHead>
              <TableHead>ЧЧ:ММ:СС</TableHead>
              <TableHead class="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="f in list" :key="f.idx">
              <TableCell><Input type="number" step="60" :model-value="f.start_s" @update:model-value="upd(f.idx, 'start_s', Number($event))" /></TableCell>
              <TableCell class="text-xs text-mist">{{ fmtClock(f.start_s) }}</TableCell>
              <TableCell><Input type="number" step="60" :model-value="f.end_s" @update:model-value="upd(f.idx, 'end_s', Number($event))" /></TableCell>
              <TableCell class="text-xs text-mist">{{ fmtClock(f.end_s) }}</TableCell>
              <TableCell><Button size="sm" variant="destructive" @click="remove(f.idx)">−</Button></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  </div>
</template>
