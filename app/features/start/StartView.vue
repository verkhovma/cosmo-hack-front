<script setup lang="ts">
import type { Scenario, ScenarioListItem } from '~~/shared/types/scenario'

import { SparklesIcon, UploadIcon } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'

const emit = defineEmits<{
  loaded: [s: Scenario]
  empty: []
}>()

const api = useApi()
const examples = ref<ScenarioListItem[]>([])
const busy = ref(false)
const err = ref<null | string>(null)
const loading = ref(true)
const file = useTemplateRef<HTMLInputElement>('file')

onMounted(async () => {
  try {
    examples.value = await api.listScenarios()
  }
  catch (e: unknown) {
    err.value = errorMessage(e, 'Нет связи с бэком')
  }
  finally {
    loading.value = false
  }
})

async function pickExample(name: string) {
  busy.value = true
  err.value = null
  try {
    emit('loaded', await api.getScenario(name))
  }
  catch (e: unknown) {
    err.value = errorMessage(e, 'Не удалось открыть пример')
    toast.error('Не удалось открыть пример', { description: err.value })
  }
  finally {
    busy.value = false
  }
}

async function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f)
    return
  busy.value = true
  err.value = null
  try {
    const { scenario } = await api.uploadScenario(f)
    emit('loaded', scenario)
  }
  catch (e: unknown) {
    err.value = errorMessage(e, 'Не удалось загрузить файл')
    toast.error('Не удалось загрузить файл', { description: err.value })
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="grid min-h-[70vh] items-start gap-6 p-8 lg:grid-cols-[320px_1fr]">
    <Card>
      <CardHeader>
        <CardTitle>Примеры конфигураций</CardTitle>
        <CardDescription>Данные из /api/scenarios</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-2">
        <Skeleton v-if="loading && !examples.length" class="h-10 w-full" />
        <Button
          v-for="it in examples"
          :key="it.file"
          variant="secondary"
          class="justify-start"
          :disabled="busy"
          @click="pickExample(it.file)"
        >
          {{ it.title || it.file }}
        </Button>
        <p v-if="!loading && !examples.length" class="text-sm text-mist">
          Примеров нет — загрузите JSON или начните с пустой.
        </p>
      </CardContent>
    </Card>

    <div class="flex flex-col items-center gap-4 pt-12">
      <h2 class="font-h1 text-h1 font-medium">Проектирование спутниковой группировки</h2>
      <Button size="lg" class="w-full max-w-[460px]" :disabled="busy" @click="file?.click()">
        <UploadIcon data-icon="inline-start" />
        Загрузить мою конфигурацию (JSON)
      </Button>
      <input ref="file" type="file" accept=".json" class="hidden" @change="onFile">
      <Button size="lg" variant="secondary" class="w-full max-w-[460px]" :disabled="busy" @click="emit('empty')">
        <SparklesIcon data-icon="inline-start" />
        Начать с пустой конфигурации
      </Button>
      <Alert v-if="err" variant="destructive" class="max-w-[460px]">
        <AlertTitle>Не удалось загрузить</AlertTitle>
        <AlertDescription>{{ err }}</AlertDescription>
      </Alert>
    </div>
  </div>
</template>
