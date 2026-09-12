<script setup lang="ts">
import type { CompareResponse, JobEntry } from '~~/shared/types/scenario'
import type { ScenarioChange } from '~~/shared/utils/compare'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

defineProps<{
  backendDiff: CompareResponse['config_diff']
  diffs: Record<string, ScenarioChange[]>
  jobs: JobEntry[]
}>()

function humanBackendDiff(k: string, v: [number, number]): string {
  if (Array.isArray(v) && v.length === 2)
    return `${k}: ${v[0]} → ${v[1]}`
  return `${k}: ${JSON.stringify(v)}`
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Что меняли</CardTitle>
      <CardDescription>Дифф сценариев относительно первого варианта</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-3 text-sm">
      <div v-for="job in jobs.slice(1)" :key="job.jobId">
        <b>{{ job.title }}</b>
        <ul v-if="(diffs[job.jobId] ?? []).length > 0" class="mt-1 flex flex-col gap-1">
          <li v-for="(c, i) in diffs[job.jobId]" :key="i" class="flex flex-wrap items-center gap-2">
            <span class="text-secondary">{{ c.label }}:</span>
            <code class="rounded bg-neutral px-1.5 py-0.5 text-xs">{{ c.before }}</code>
            <span aria-hidden="true">→</span>
            <code class="rounded bg-neutral px-1.5 py-0.5 text-xs">{{ c.after }}</code>
          </li>
        </ul>
        <ul v-else-if="backendDiff[job.jobId]" class="mt-1 list-disc pl-5 text-secondary">
          <li v-for="(v, k) in backendDiff[job.jobId]" :key="k">{{ humanBackendDiff(String(k), v as [number, number]) }}</li>
        </ul>
        <p v-else class="mt-1 text-mist">без изменений</p>
      </div>
    </CardContent>
  </Card>
</template>
