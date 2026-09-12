<script setup lang="ts">
import type { ClientMetrics, CompareResponse } from '~~/shared/types/scenario'

import { GitCompareIcon } from 'lucide-vue-next'
import { fmtPercent } from '~~/shared/utils/format'

import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Checkbox } from '~/components/ui/checkbox'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '~/components/ui/empty'

import CompareView from './CompareView.vue'

function firstMetric(metrics: Record<string, ClientMetrics>): number {
  const key = Object.keys(metrics)[0]
  return key ? (metrics[key]?.availability ?? 0) : 0
}

const api = useApi()
const { clear, jobs, removeJob } = useJobs()

const selected = ref<string[]>([])
const data = ref<CompareResponse | null>(null)
const error = ref<null | string>(null)
const busy = ref(false)

const selectedJobs = computed(() => jobs.value.filter(j => selected.value.includes(j.jobId)))
const target = computed(() => selectedJobs.value[0]?.result.target_availability ?? 0.9)

function toggle(jobId: string) {
  selected.value = selected.value.includes(jobId)
    ? selected.value.filter(x => x !== jobId)
    : [...selected.value, jobId]
}

function clearAll() {
  clear()
  selected.value = []
  data.value = null
}

async function run() {
  error.value = null
  busy.value = true
  try {
    data.value = await api.compare(selected.value)
  }
  catch (e: unknown) {
    error.value = errorMessage(e, 'Не удалось сравнить')
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-4">
    <h2 class="font-h2 text-h2 font-medium">Сравнение вариантов</h2>
    <Alert v-if="error" variant="destructive">
      <AlertTitle>Не удалось сравнить</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <Card>
      <CardHeader>
        <CardTitle>Варианты ({{ jobs.length }})</CardTitle>
        <CardDescription>Варианты переживают reload — хранятся в localStorage</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-2">
        <Empty v-if="!jobs.length">
          <EmptyHeader>
            <EmptyTitle>Пока нет вариантов</EmptyTitle>
            <EmptyDescription>Запустите расчёт в конструкторе — каждый запуск сохраняется сюда.</EmptyDescription>
          </EmptyHeader>
        </Empty>
        <label v-for="j in jobs" :key="j.jobId" class="flex items-center gap-3 rounded-md border border-border p-2 text-sm">
          <Checkbox :model-value="selected.includes(j.jobId)" @update:model-value="toggle(j.jobId)" />
          <span class="font-medium">{{ j.title }}</span>
          <code class="text-xs text-mist">{{ j.jobId.slice(0, 8) }}</code>
          <span class="ml-auto text-xs text-mist">{{ fmtPercent(firstMetric(j.result.metrics)) }}</span>
          <Button size="sm" variant="ghost" @click="removeJob(j.jobId)">×</Button>
        </label>
        <div class="flex gap-2">
          <Button :disabled="selected.length < 2 || busy" @click="run">
            <GitCompareIcon data-icon="inline-start" />Сравнить ({{ selected.length }})
          </Button>
          <Button variant="secondary" @click="clearAll">Очистить</Button>
        </div>
      </CardContent>
    </Card>

    <CompareView
      v-if="data"
      :data="data"
      :jobs="selectedJobs"
      :target="target"
    />
  </div>
</template>
