<script setup lang="ts">
import type { RouteEntry, Scenario } from '~~/shared/types/scenario'
import type { ValidationError } from '~~/shared/utils/validate'

import { ChevronDownIcon } from 'lucide-vue-next'
import { fmtClock } from '~~/shared/utils/format'
import { hasPath } from '~~/shared/utils/routes'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible'
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
const filter = ref<'all' | 'route' | 'with'>('all')

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

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  let all = Array.from(bySat.value.entries())
  if (q)
    all = all.filter(([sid]) => sid.toLowerCase().includes(q))
  if (filter.value === 'with')
    all = all.filter(([, list]) => list.length > 0)
  if (filter.value === 'route')
    all = all.filter(([sid]) => inRoute.value.has(sid))
  return all
})

const withCount = computed(() => Array.from(bySat.value.values()).filter(l => l.length > 0).length)

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
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-sm font-medium">Отказы спутников</h3>
      <Input v-model="query" placeholder="Поиск по ID…" class="w-full sm:max-w-56" />
    </div>
    <div class="flex flex-wrap gap-2 text-xs">
      <Button size="sm" :variant="filter === 'all' ? 'default' : 'secondary'" @click="filter = 'all'">Все ({{ bySat.size }})</Button>
      <Button size="sm" :variant="filter === 'with' ? 'default' : 'secondary'" @click="filter = 'with'">С отказами ({{ withCount }})</Button>
      <Button size="sm" :variant="filter === 'route' ? 'default' : 'secondary'" @click="filter = 'route'">В маршруте ({{ inRoute.size }})</Button>
    </div>
    <p v-if="!scenario.design.satellites.length" class="text-sm text-mist">
      Сначала добавьте спутники на вкладке «Очереди и спутники».
    </p>
    <p v-else-if="!filtered.length" class="text-sm text-mist">
      Ничего не найдено — смените фильтр или поиск.
    </p>
    <div class="flex flex-col gap-2">
      <Collapsible v-for="[sid, list] in filtered" :key="sid" :default-open="list.length > 0 || inRoute.has(sid)">
        <Card class="p-3">
          <div class="flex flex-wrap items-center gap-2">
            <CollapsibleTrigger as-child>
              <Button size="sm" variant="ghost" class="h-8 gap-1 px-2">
                <ChevronDownIcon class="transition-transform [[data-state=open]_&]:rotate-180" />
                <b>{{ sid }}</b>
              </Button>
            </CollapsibleTrigger>
            <span class="text-xs text-mist">— отказов: {{ list.length }}</span>
            <Badge v-if="inRoute.has(sid)" class="ml-1">в маршруте</Badge>
            <Button size="sm" variant="secondary" class="ml-auto" @click="add(sid)">+ отказ</Button>
          </div>
          <CollapsibleContent>
            <p v-if="!list.length" class="pt-2 text-xs text-mist">Отказов нет</p>
            <div v-else class="overflow-x-auto pt-2">
              <Table class="min-w-[520px]">
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
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  </div>
</template>
