<script setup lang="ts">
import type { CompareResponse, JobEntry } from '~~/shared/types/scenario'

import { fmtDuration, fmtPercent } from '~~/shared/utils/format'

import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'

const props = defineProps<{
  data: CompareResponse
  jobs: JobEntry[]
  target: number
}>()

const clients = computed(() => Object.keys(props.data.metrics_diff))

function metric(cid: string, jobId: string) {
  return props.data.metrics_diff[cid]?.[jobId]
}

function bestAvail(cid: string): number {
  return Math.max(...props.jobs.map(j => metric(cid, j.jobId)?.availability ?? -1))
}

function bestGap(cid: string): number {
  return Math.min(...props.jobs.map(j => metric(cid, j.jobId)?.max_gap_s ?? Number.MAX_SAFE_INTEGER))
}

function firstAvail(cid: string): number | undefined {
  const first = props.jobs[0]
  return first ? metric(cid, first.jobId)?.availability : undefined
}

function jobOk(jobId: string): boolean {
  return props.jobs.length > 0 && clients.value.every(cid => (metric(cid, jobId)?.availability ?? 0) >= props.target)
}

function titleOf(jid: string): string {
  return props.jobs.find(j => j.jobId === jid)?.title ?? jid
}

// config_diff вида { "stage": [3, 1] } → «stage 3 → 1», иначе честный JSON.
function humanDiff(k: string, v: [number, number]): string {
  if (Array.isArray(v) && v.length === 2)
    return `${k}: ${v[0]} → ${v[1]}`
  return `${k}: ${JSON.stringify(v)}`
}

// Ячейка вынесена в локальный компонент, чтобы подсветка лучшего считалась рядом с данными.
const CellValue = defineComponent({
  props: { cid: { required: true, type: String }, jobId: { required: true, type: String } },
  setup(cellProps) {
    return () => {
      const m = metric(cellProps.cid, cellProps.jobId)
      if (!m)
        return h('span', { class: 'text-mist' }, '—')
      const isBestA = m.availability === bestAvail(cellProps.cid)
      const isBestG = m.max_gap_s === bestGap(cellProps.cid)
      const base = firstAvail(cellProps.cid)
      const firstId = props.jobs[0]?.jobId
      const diff = base === undefined || cellProps.jobId === firstId ? null : m.availability - base
      const delta = diff === null
        ? null
        : `${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(2)} п.п.`
      return h('div', { class: 'flex flex-col gap-1' }, [
        h('span', { class: isBestA ? 'font-bold text-orbital-light' : '' }, fmtPercent(m.availability)),
        h('small', { class: `text-mist ${isBestG ? 'font-bold' : ''}` }, `перерыв ${fmtDuration(m.max_gap_s)}`),
        delta ? h('small', { class: 'text-secondary' }, `Δ ${delta}`) : null,
      ])
    }
  },
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <Card>
      <CardHeader>
        <CardTitle>Доступность и перерывы</CardTitle>
        <CardDescription>Лучший подсвечен, дельта — относительно первого варианта</CardDescription>
      </CardHeader>
      <CardContent class="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Клиент</TableHead>
              <TableHead v-for="j in jobs" :key="j.jobId">{{ j.title }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="clientId in clients" :key="clientId">
              <TableCell><b>{{ clientId }}</b></TableCell>
              <TableCell v-for="j in jobs" :key="j.jobId">
                <CellValue :cid="clientId" :job-id="j.jobId" />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell class="text-mist">Цель ≥ {{ fmtPercent(target) }}</TableCell>
              <TableCell v-for="j in jobs" :key="j.jobId">
                <Badge :variant="jobOk(j.jobId) ? 'default' : 'destructive'">
                  {{ jobOk(j.jobId) ? '✓' : '✗' }}
                </Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Различия конфигурации</CardTitle>
      </CardHeader>
      <CardContent class="flex flex-col gap-2 text-sm">
        <div v-for="(changes, jid) in data.config_diff" :key="jid">
          <b>{{ titleOf(String(jid)) }}</b>
          <ul class="list-disc pl-5 text-secondary">
            <li v-for="(v, k) in changes" :key="k">{{ humanDiff(String(k), v as [number, number]) }}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
