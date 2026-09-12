<script setup lang="ts">
import type { Scenario } from '~~/shared/types/scenario'
import type { ValidationError } from '~~/shared/utils/validate'

import { fmtClock } from '~~/shared/utils/format'

import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'

const props = defineProps<{ scenario: Scenario, errors: ValidationError[] }>()
const emit = defineEmits<{ update: [s: Scenario] }>()

const gateways = computed(() => props.scenario.ground_sites.filter(g => g.role === 'gateway'))

const byGw = computed(() => {
  const m = new Map<string, { start_s: number, end_s: number, idx: number }[]>()
  for (const g of gateways.value) m.set(g.id, [])
  props.scenario.gateway_outages.forEach((f, idx) => {
    const list = m.get(f.gateway_id)
    if (list)
      list.push({ ...f, idx })
    else m.set(f.gateway_id, [{ ...f, idx }])
  })
  return m
})

function add(gwId: string) {
  const horizon = props.scenario.environment.horizon_s
  emit('update', {
    ...props.scenario,
    gateway_outages: [...props.scenario.gateway_outages, {
      end_s: Math.min(3600, horizon),
      gateway_id: gwId,
      start_s: 0,
    }],
  })
}

function remove(idx: number) {
  emit('update', { ...props.scenario, gateway_outages: props.scenario.gateway_outages.filter((_, k) => k !== idx) })
}

function upd(idx: number, k: 'end_s' | 'start_s', v: number) {
  emit('update', {
    ...props.scenario,
    gateway_outages: props.scenario.gateway_outages.map((f, k2) => (k2 === idx ? { ...f, [k]: v } : f)),
  })
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <h3 class="text-sm font-medium">Отказы шлюзов</h3>
    <p v-if="!gateways.length" class="text-sm text-mist">
      Сначала добавьте шлюзы на вкладке «Наземные пункты».
    </p>
    <div class="flex flex-col gap-3">
      <Card v-for="[gid, list] in byGw" :key="gid" class="p-3">
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <b>{{ gid }}</b>
          <span class="text-xs text-mist">— отказов: {{ list.length }}</span>
          <Button size="sm" variant="secondary" class="ml-auto" @click="add(gid)">+ отказ</Button>
        </div>
        <p v-if="!list.length" class="text-xs text-mist">Отказов нет</p>
        <div v-else class="overflow-x-auto">
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
      </Card>
    </div>
  </div>
</template>
