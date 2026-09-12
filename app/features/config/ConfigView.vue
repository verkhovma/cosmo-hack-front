<script setup lang="ts">
import { ArrowLeftIcon } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import ScenarioEditor from '~/features/scenario/ScenarioEditor.vue'

const {
  canRun,
  draft,
  errors,
  routes,
  ts,
  updateDraft,
} = useDesigner()

const api = useApi()

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

function back() {
  void navigateTo('/')
}
</script>

<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-4">
    <div class="flex flex-wrap items-center gap-2">
      <Button variant="secondary" size="sm" @click="back">
        <ArrowLeftIcon data-icon="inline-start" />К карте
      </Button>
      <h2 class="font-h2 text-lg font-medium sm:text-h2">Конфигурация</h2>
      <Badge v-if="draft && errors.length" variant="destructive" class="ml-1">ошибок: {{ errors.length }}</Badge>
    </div>

    <p v-if="draft" class="text-sm text-secondary">
      Правки применяются к черновику и пересчитываются автоматически. Кнопка «К карте» ничего не теряет.
    </p>

    <ScenarioEditor
      v-if="draft"
      :scenario="draft"
      :errors="errors"
      :can-run="canRun"
      :routes="routes"
      :t-s="ts"
      @update="updateDraft"
      @save="save(false)"
      @save-anyway="save(true)"
    />

    <div v-else class="flex flex-col items-start gap-3">
      <p class="text-sm text-secondary">Сценарий не выбран — сначала откройте пример или загрузите JSON.</p>
      <Button size="sm" @click="back">
        <ArrowLeftIcon data-icon="inline-start" />К выбору сценария
      </Button>
    </div>
  </div>
</template>
