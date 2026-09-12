<script setup lang="ts">
import type { CompareResponse, JobEntry } from '~~/shared/types/scenario'

import { pickMetrics } from '~~/shared/utils/compare'
import { fmtDuration, fmtPercent } from '~~/shared/utils/format'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

const props = defineProps<{
  clients: string[]
  data: CompareResponse
  jobs: JobEntry[]
  target: number
}>()

function avail(cid: string, jobId: string): number | undefined {
  return pickMetrics(props.data, cid, jobId)?.availability
}

function gap(cid: string, jobId: string): number | undefined {
  return pickMetrics(props.data, cid, jobId)?.maxGap
}

function bestAvail(cid: string): number {
  return Math.max(-1, ...props.jobs.map(j => avail(cid, j.jobId) ?? -1))
}

function bestGap(cid: string): number {
  return Math.min(Number.MAX_SAFE_INTEGER, ...props.jobs.map(j => gap(cid, j.jobId) ?? Number.MAX_SAFE_INTEGER))
}

function maxGapAll(): number {
  return Math.max(1, ...props.clients.flatMap(cid => props.jobs.map(j => gap(cid, j.jobId) ?? 0)))
}

function barWidth(v: number): string {
  return `${Math.min(100, Math.max(0, v * 100))}%`
}

function gapWidth(v: number): string {
  return `${Math.min(100, Math.max(2, (v / maxGapAll()) * 100))}%`
}

function shortTitle(title: string): string {
  return title.length > 18 ? `${title.slice(0, 17)}…` : title
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Наглядно по клиентам</CardTitle>
      <CardDescription>Линия — цель {{ fmtPercent(target) }}, синее — лучший</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-5">
      <div v-for="cid in clients" :key="cid" class="flex flex-col gap-2">
        <b class="text-sm">{{ cid }}</b>
        <div v-for="j in jobs" :key="j.jobId" class="flex items-center gap-2">
          <span class="w-32 truncate text-xs text-secondary" :title="j.title">{{ shortTitle(j.title) }}</span>
          <div class="relative h-2.5 flex-1 overflow-hidden rounded bg-neutral">
            <div
              v-if="avail(cid, j.jobId) !== undefined"
              class="h-full rounded"
              :class="(avail(cid, j.jobId) ?? 0) >= target ? 'bg-orbital-light' : 'bg-primary'"
              :style="{ width: barWidth(avail(cid, j.jobId) ?? 0) }"
            />
            <div class="absolute top-0 h-full w-px bg-mist" :style="{ left: `${Math.min(100, target * 100)}%` }" />
          </div>
          <span
            class="w-20 text-right text-xs tabular-nums"
            :class="avail(cid, j.jobId) === bestAvail(cid) ? 'font-bold text-orbital-light' : ''"
          >
            {{ avail(cid, j.jobId) === undefined ? '—' : fmtPercent(avail(cid, j.jobId) ?? 0) }}
          </span>
        </div>
        <div v-for="j in jobs" :key="`g${j.jobId}`" class="flex items-center gap-2">
          <span class="w-32 truncate text-[11px] text-mist" :title="j.title">перерыв · {{ shortTitle(j.title) }}</span>
          <div class="h-1.5 flex-1 overflow-hidden rounded bg-neutral">
            <div
              v-if="gap(cid, j.jobId) !== undefined"
              class="h-full rounded bg-azure"
              :style="{ width: gapWidth(gap(cid, j.jobId) ?? 0) }"
            />
          </div>
          <span
            class="w-20 text-right text-[11px] tabular-nums text-mist"
            :class="gap(cid, j.jobId) === bestGap(cid) ? 'font-bold' : ''"
          >
            {{ gap(cid, j.jobId) === undefined ? '—' : fmtDuration(gap(cid, j.jobId) ?? 0) }}
          </span>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
