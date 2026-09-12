<script setup lang="ts">
import type { CompareResponse, JobEntry } from '~~/shared/types/scenario'

import { pickMetrics } from '~~/shared/utils/compare'
import { fmtDuration, fmtPercent } from '~~/shared/utils/format'

import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'

const props = defineProps<{
  clients: string[]
  data: CompareResponse
  jobs: JobEntry[]
  target: number
}>()

function bestAvail(cid: string): number {
  return Math.max(-1, ...props.jobs.map(j => pickMetrics(props.data, cid, j.jobId)?.availability ?? -1))
}

function bestGap(cid: string): number {
  const fallback = Number.MAX_SAFE_INTEGER
  return Math.min(fallback, ...props.jobs.map(j => pickMetrics(props.data, cid, j.jobId)?.maxGap ?? fallback))
}

function firstAvail(cid: string): number | undefined {
  const first = props.jobs[0]
  return first ? pickMetrics(props.data, cid, first.jobId)?.availability : undefined
}

function jobOk(jobId: string): boolean {
  return props.jobs.length > 0 && props.clients.every(cid => (pickMetrics(props.data, cid, jobId)?.availability ?? 0) >= props.target)
}

// Ячейка вынесена в локальный компонент, чтобы подсветка лучшего считалась рядом с данными.
const CellValue = defineComponent({
  props: { cid: { required: true, type: String }, jobId: { required: true, type: String } },
  setup(cellProps) {
    return () => {
      const m = pickMetrics(props.data, cellProps.cid, cellProps.jobId)
      if (!m)
        return h('span', { class: 'text-mist' }, '—')
      const isBestA = m.availability === bestAvail(cellProps.cid)
      const isBestG = m.maxGap === bestGap(cellProps.cid)
      const base = firstAvail(cellProps.cid)
      const firstId = props.jobs[0]?.jobId
      const diff = base === undefined || cellProps.jobId === firstId ? null : m.availability - base
      const delta = diff === null
        ? null
        : `${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(2)} п.п.`
      return h('div', { class: 'flex flex-col gap-1' }, [
        h('span', { class: isBestA ? 'font-bold text-orbital-light' : '' }, fmtPercent(m.availability)),
        h('small', { class: `text-mist ${isBestG ? 'font-bold' : ''}` }, `перерыв ${fmtDuration(m.maxGap)}`),
        delta ? h('small', { class: 'text-secondary' }, `Δ ${delta}`) : null,
      ])
    }
  },
})
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Детали по клиентам</CardTitle>
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
</template>
