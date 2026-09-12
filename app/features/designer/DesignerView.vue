<script setup lang="ts">
import { ArrowLeftIcon, DownloadIcon, FileDownIcon, PlayIcon, Settings2Icon } from 'lucide-vue-next'

import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '~/components/ui/field'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import MapView from '~/features/map/MapView.vue'
import MetricsTable from '~/features/metrics/MetricsTable.vue'
import RecommendationsPanel from '~/features/metrics/RecommendationsPanel.vue'
import SatelliteDetails from '~/features/metrics/SatelliteDetails.vue'
import StartView from '~/features/start/StartView.vue'
import AvailabilityStrip from '~/features/timeline/AvailabilityStrip.vue'
import TimelineBar from '~/features/timeline/TimelineBar.vue'

const {
  addFailureFor,
  busy,
  canRun,
  clients,
  computeError,
  downloadScenarioJson,
  draft,
  errors,
  hiddenSats,
  loadScenario,
  reasons,
  result,
  routes,
  runNow,
  selectedClient,
  selectedSatellite,
  showStart,
  snapshot,
  ts,
  updateDraft,
  visibleLog,
} = useDesigner()

const api = useApi()
const clientId = useId()

// P0-фикс (PLAN 1.6): вместо битой <a> при disabled — кнопка активна только когда
// готово; скачивание через временный <a download> (window.open режут popup-блокеры).
function openExport() {
  const jobId = result.value?.job_id
  if (!jobId)
    return
  const a = document.createElement('a')
  a.href = api.exportUrl(jobId)
  a.download = `${jobId}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function goConfig() {
  void navigateTo('/config')
}
</script>

<template>
  <StartView v-if="showStart || !draft" @loaded="loadScenario" @empty="loadScenario(emptyScenario())" />

  <div v-else class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-2">
      <Button variant="secondary" size="sm" @click="showStart = true">
        <ArrowLeftIcon data-icon="inline-start" />Сменить сценарий
      </Button>
      <span class="min-w-0 flex-1 truncate text-sm text-secondary sm:flex-none">{{ draft.meta.title }}</span>
      <span v-if="busy" class="text-sm text-mist">Идёт расчёт…</span>
      <div class="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
        <Button size="sm" variant="secondary" @click="goConfig">
          <Settings2Icon data-icon="inline-start" />Конфигурация
          <Badge v-if="errors.length" variant="destructive" class="ml-1">{{ errors.length }}</Badge>
        </Button>
        <Button size="sm" variant="secondary" @click="downloadScenarioJson">
          <DownloadIcon data-icon="inline-start" /><span class="hidden md:inline">scenario.json</span>
        </Button>
        <Button
          size="sm"
          variant="secondary"
          :disabled="busy || !result"
          @click="openExport"
        >
          <FileDownIcon data-icon="inline-start" /><span class="hidden md:inline">Результат</span>
        </Button>
        <Button size="sm" class="min-w-28 flex-1 sm:flex-none" :disabled="!canRun" @click="runNow">
          <PlayIcon data-icon="inline-start" />Запустить
        </Button>
      </div>
    </div>

    <Alert v-if="computeError" variant="destructive">
      <AlertTitle>Расчёт не удался</AlertTitle>
      <AlertDescription>{{ computeError }}</AlertDescription>
    </Alert>

    <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div class="flex min-w-0 flex-col gap-4">
        <div class="sticky top-2 z-10 flex flex-col gap-4 lg:top-4">
          <MapView
            :scenario="draft"
            :snapshot="snapshot"
            :routes="routes ?? {}"
            :t-s="ts"
            :selected-client="selectedClient"
            :hidden-sats="hiddenSats"
            @select-satellite="selectedSatellite = $event"
          />
          <TimelineBar :t-s="ts" :horizon="draft.environment.horizon_s" :step="draft.environment.step_s" @change="ts = $event" />
        </div>
        <Card v-if="routes" class="p-4">
          <div class="flex flex-col gap-4">
            <AvailabilityStrip
              v-for="(entries, cid) in routes"
              :key="cid"
              :client-id="cid"
              :entries="entries"
              :step="draft.environment.step_s"
              :visible-log="visibleLog?.[cid]"
              @seek="ts = $event"
            />
          </div>
        </Card>
      </div>

      <div class="flex flex-col gap-4">
        <Card class="p-4">
          <FieldGroup>
            <Field>
              <FieldLabel :for="clientId">Клиент</FieldLabel>
              <Select :model-value="selectedClient ?? ''" @update:model-value="selectedClient = String($event)">
                <SelectTrigger :id="clientId"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem v-for="c in clients" :key="c.id" :value="c.id">{{ c.id }} — {{ c.name }}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </Card>

        <MetricsTable
          v-if="result"
          :metrics="result.metrics"
          :target="result.target_availability"
          :reasons="reasons"
        />

        <RecommendationsPanel
          v-if="result"
          :scenario="draft"
          :routes="routes"
          :metrics="result.metrics"
          :target="result.target_availability"
          :reasons="reasons"
          @apply="updateDraft"
        />

        <SatelliteDetails
          v-if="selectedSatellite && snapshot"
          :satellite-id="selectedSatellite"
          :snapshot="snapshot"
          :routes="routes ?? {}"
          :t-s="ts"
          @close="selectedSatellite = null"
          @add-failure="addFailureFor"
        />
      </div>
    </div>
  </div>
</template>
