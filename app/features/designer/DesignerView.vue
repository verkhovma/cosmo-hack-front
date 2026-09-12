<script setup lang="ts">
import { ArrowLeftIcon, DownloadIcon, FileDownIcon, HistoryIcon, PlayIcon, RedoIcon, UndoIcon } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Field, FieldGroup, FieldLabel } from '~/components/ui/field'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import MapView from '~/features/map/MapView.vue'
import MetricsTable from '~/features/metrics/MetricsTable.vue'
import RecommendationsPanel from '~/features/metrics/RecommendationsPanel.vue'
import SatelliteDetails from '~/features/metrics/SatelliteDetails.vue'
import ScenarioEditor from '~/features/scenario/ScenarioEditor.vue'
import StartView from '~/features/start/StartView.vue'
import AvailabilityStrip from '~/features/timeline/AvailabilityStrip.vue'
import TimelineBar from '~/features/timeline/TimelineBar.vue'

const {
  addFailureFor,
  busy,
  canRedo,
  canRun,
  canUndo,
  clients,
  computeError,
  downloadScenarioJson,
  draft,
  errors,
  hiddenSats,
  historyEntries,
  historyIndex,
  jumpToHistory,
  loadScenario,
  reasons,
  redo,
  result,
  routes,
  runNow,
  selectedClient,
  selectedSatellite,
  showStart,
  snapshot,
  ts,
  undo,
  updateDraft,
  visibleLog,
} = useDesigner()

const api = useApi()
const clientId = useId()

// Ctrl/Cmd+Z — назад, Ctrl+Shift+Z / Ctrl+Y — вперёд. В полях ввода не перехватываем.
function onKeydown(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable))
    return
  const mod = e.ctrlKey || e.metaKey
  if (!mod)
    return
  if (e.key.toLowerCase() === 'з' || e.key.toLowerCase() === 'я')
    return // русская раскладка: не мешаем вводу
  if ((e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
    e.preventDefault()
    undo()
  }
  else if ((e.key === 'y' || e.key === 'Y') || ((e.key === 'z' || e.key === 'Z') && e.shiftKey)) {
    e.preventDefault()
    redo()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})

// Журнал newest-first для выпадашки: храним исходный индекс для прыжка.
const historyReversed = computed(() =>
  historyEntries.value.map((h, i) => ({ ...h, idx: i })).reverse(),
)

async function save(anyway: boolean) {
  if (!draft.value)
    return
  try {
    await api.saveProject(draft.value.meta.title, draft.value, { saveAnyway: anyway })
    toast.success('Проект сохранён')
  }
  catch (e: unknown) {
    toast.error('Не удалось сохранить', { description: errorMessage(e, 'Ошибка сети') })
  }
}

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
</script>

<template>
  <StartView v-if="showStart || !draft" @loaded="loadScenario" @empty="loadScenario(emptyScenario())" />

  <div v-else class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-2">
      <Button variant="secondary" size="sm" @click="showStart = true">
        <ArrowLeftIcon data-icon="inline-start" />Сменить сценарий
      </Button>
      <span class="text-sm text-secondary">{{ draft.meta.title }}</span>
      <span v-if="busy" class="text-sm text-mist">Идёт расчёт…</span>
      <div class="ml-auto flex gap-2">
        <Button size="sm" variant="secondary" :disabled="!canUndo" title="Вернуть назад (Ctrl+Z)" @click="undo">
          <UndoIcon data-icon="inline-start" />Назад
        </Button>
        <Button size="sm" variant="secondary" :disabled="!canRedo" title="Вернуть вперёд (Ctrl+Shift+Z)" @click="redo">
          <RedoIcon data-icon="inline-start" />Вперёд
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button size="sm" variant="secondary" :disabled="!historyEntries.length" title="Журнал изменений конфигурации">
              <HistoryIcon data-icon="inline-start" />История{{ historyEntries.length ? ` (${historyIndex + 1}/${historyEntries.length})` : '' }}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="max-h-80 w-72 overflow-y-auto">
            <DropdownMenuLabel>Журнал изменений</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              v-for="h in historyReversed"
              :key="`${h.at}-${h.idx}`"
              :disabled="h.idx === historyIndex"
              @click="jumpToHistory(h.idx)"
            >
              <span class="flex w-full items-center justify-between gap-2">
                <span class="truncate">{{ h.label }}</span>
                <span v-if="h.idx === historyIndex" class="shrink-0 text-xs text-mist">• сейчас</span>
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" variant="secondary" @click="downloadScenarioJson">
          <DownloadIcon data-icon="inline-start" />scenario.json
        </Button>
        <Button size="sm" :disabled="busy || !result" @click="runNow">
          <PlayIcon data-icon="inline-start" />Запустить
        </Button>
        <Button
          size="sm"
          variant="secondary"
          :disabled="busy || !result"
          @click="openExport"
        >
          <FileDownIcon data-icon="inline-start" />Результат
        </Button>
      </div>
    </div>

    <Alert v-if="computeError" variant="destructive">
      <AlertTitle>Расчёт не удался</AlertTitle>
      <AlertDescription>{{ computeError }}</AlertDescription>
    </Alert>

    <div class="grid items-start gap-4 xl:grid-cols-[360px_minmax(0,1fr)_320px]">
      <ScenarioEditor
        :scenario="draft"
        :errors="errors"
        :can-run="canRun"
        :routes="routes"
        :t-s="ts"
        @update="updateDraft"
        @save="save(false)"
        @save-anyway="save(true)"
      />

      <div class="flex min-w-0 flex-col gap-4">
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
