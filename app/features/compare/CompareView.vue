<script setup lang="ts">
import type { CompareResponse, JobEntry, JobRoutesData } from '~~/shared/types/scenario'

import { toast } from 'vue-sonner'
import { buildCompareMarkdown, buildVerdict, diffScenarios, scoreJobs } from '~~/shared/utils/compare'
import { downloadTextFile } from '~~/shared/utils/download'

import { Alert, AlertDescription } from '~/components/ui/alert'

import CompareBars from './CompareBars.vue'
import CompareStrips from './CompareStrips.vue'
import CompareTable from './CompareTable.vue'
import ScenarioDiffPanel from './ScenarioDiffPanel.vue'
import VerdictCard from './VerdictCard.vue'

const props = defineProps<{
  data: CompareResponse
  jobs: JobEntry[]
  routesByJob: Record<string, JobRoutesData | undefined>
  routesError: null | string
  target: number
}>()

const { loadScenario } = useDesigner()

const clients = computed(() => Object.keys(props.data.metrics_diff))
const scores = computed(() => scoreJobs(props.jobs, props.data, props.target))
const verdict = computed(() => buildVerdict(props.jobs, props.data, props.target))

const diffs = computed(() => {
  const out: Record<string, ReturnType<typeof diffScenarios>> = {}
  const base = props.jobs[0]?.scenario
  for (const job of props.jobs.slice(1)) {
    out[job.jobId] = base && job.scenario ? diffScenarios(base, job.scenario) : []
  }
  return out
})

const winner = computed(() => props.jobs.find(j => j.jobId === verdict.value.winnerId) ?? null)

function openable(job: JobEntry): boolean {
  return job.scenario !== null
}

async function openJob(job: JobEntry) {
  if (!job.scenario) {
    toast.error('У варианта нет сохранённого сценария')
    return
  }
  loadScenario(job.scenario)
  await navigateTo('/')
}

function openWinner() {
  if (winner.value)
    void openJob(winner.value)
}

function downloadMd() {
  try {
    const md = buildCompareMarkdown({
      diffs: diffs.value,
      jobs: props.jobs,
      scores: scores.value,
      target: props.target,
      verdict: verdict.value,
    })
    downloadTextFile(`compare-${new Date().toISOString().slice(0, 10)}.md`, md, 'text/markdown')
  }
  catch (e: unknown) {
    toast.error('Не удалось собрать отчёт', { description: errorMessage(e, 'Ошибка') })
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <VerdictCard
      :verdict="verdict"
      :winner-title="winner?.title ?? ''"
      :can-open="winner !== null && openable(winner)"
      @open="openWinner"
      @download="downloadMd"
    />

    <Alert v-if="routesError" variant="destructive">
      <AlertDescription>{{ routesError }}</AlertDescription>
    </Alert>

    <CompareBars :clients="clients" :data="data" :jobs="jobs" :target="target" />

    <CompareStrips :jobs="jobs" :routes-by-job="routesByJob" :openable="openable" @open="openJob" />

    <ScenarioDiffPanel :jobs="jobs" :diffs="diffs" :backend-diff="data.config_diff" />

    <CompareTable :clients="clients" :data="data" :jobs="jobs" :target="target" />
  </div>
</template>
