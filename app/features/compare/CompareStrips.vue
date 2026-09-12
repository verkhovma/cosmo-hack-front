<script setup lang="ts">
import type { JobEntry, JobRoutesData } from '~~/shared/types/scenario'

import { ExternalLinkIcon } from 'lucide-vue-next'

import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import AvailabilityStrip from '~/features/timeline/AvailabilityStrip.vue'

const props = defineProps<{
  jobs: JobEntry[]
  openable: (job: JobEntry) => boolean
  routesByJob: Record<string, JobRoutesData | undefined>
}>()
const emit = defineEmits<{
  open: [job: JobEntry]
}>()

const sections = computed(() => props.jobs.map(job => ({
  job,
  rd: props.routesByJob[job.jobId],
})))
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Где переехали разрывы</CardTitle>
      <CardDescription>Полосы доступности каждого варианта — синее есть связь, красное перерыв</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-5">
      <div v-for="s in sections" :key="s.job.jobId" class="flex flex-col gap-2 rounded-lg border border-border p-3">
        <div class="flex items-center gap-2">
          <b class="text-sm">{{ s.job.title }}</b>
          <code class="text-xs text-mist">{{ s.job.jobId.slice(0, 8) }}</code>
          <Button
            size="sm"
            variant="ghost"
            class="ml-auto"
            :disabled="!openable(s.job)"
            title="Загрузить сценарий в конструктор"
            @click="emit('open', s.job)"
          >
            <ExternalLinkIcon data-icon="inline-start" />Открыть
          </Button>
        </div>
        <template v-if="s.rd && s.rd.step > 0">
          <AvailabilityStrip
            v-for="(entries, cid) in s.rd.routes"
            :key="cid"
            :client-id="String(cid)"
            :entries="entries"
            :step="s.rd.step"
            :visible-log="s.rd.visibleLog[String(cid)]"
          />
        </template>
        <p v-else class="text-sm text-mist">Маршруты не загрузились — видны только сводные цифры выше.</p>
      </div>
    </CardContent>
  </Card>
</template>
