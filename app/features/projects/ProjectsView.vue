<script setup lang="ts">
import type { ProjectMeta, Scenario } from '~~/shared/types/scenario'

import { toast } from 'vue-sonner'

import { Alert, AlertDescription } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '~/components/ui/empty'
import { Skeleton } from '~/components/ui/skeleton'

const api = useApi()
const { loadScenario } = useDesigner()

const items = ref<ProjectMeta[]>([])
const current = ref<null | Scenario>(null)
const error = ref<null | string>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    items.value = await api.listProjects()
  }
  catch (e: unknown) {
    error.value = errorMessage(e, 'Не удалось загрузить проекты')
  }
  finally {
    loading.value = false
  }
})

async function preview(pid: string) {
  try {
    const { scenario } = await api.getProject(pid)
    current.value = scenario
  }
  catch (e: unknown) {
    toast.error('Не удалось открыть проект', { description: errorMessage(e, 'Ошибка сети') })
  }
}

async function openInDesigner(pid: string) {
  try {
    const { scenario } = await api.getProject(pid)
    loadScenario(scenario)
    await navigateTo('/')
  }
  catch (e: unknown) {
    toast.error('Не удалось открыть проект', { description: errorMessage(e, 'Ошибка сети') })
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-4xl flex-col gap-4">
    <h2 class="font-h2 text-h2 font-medium">Сохранённые проекты</h2>
    <Alert v-if="error" variant="destructive">
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>
    <Card>
      <CardContent class="flex flex-col gap-2 p-4">
        <Empty v-if="!items.length && !loading">
          <EmptyHeader>
            <EmptyTitle>Проектов пока нет</EmptyTitle>
            <EmptyDescription>Сохраните вариант из конструктора.</EmptyDescription>
          </EmptyHeader>
        </Empty>
        <Skeleton v-if="loading" class="h-10 w-full" />
        <div v-for="p in items" :key="p.id" class="flex flex-col gap-2 rounded-md border border-border p-2 text-sm sm:flex-row sm:items-center sm:gap-3">
          <div class="flex min-w-0 flex-col">
            <b class="truncate">{{ p.title }}</b>
            <small class="text-mist">{{ new Date(p.created_at).toLocaleString() }}</small>
          </div>
          <div class="flex gap-2 sm:ml-auto">
            <Button size="sm" variant="secondary" class="flex-1 sm:flex-none" @click="preview(p.id)">JSON</Button>
            <Button size="sm" class="flex-1 sm:flex-none" @click="openInDesigner(p.id)">Открыть в конструкторе</Button>
          </div>
        </div>
      </CardContent>
    </Card>
    <Card v-if="current">
      <CardHeader>
        <CardTitle>Сценарий</CardTitle>
      </CardHeader>
      <CardContent>
        <pre class="max-h-[500px] overflow-auto rounded-lg bg-ink p-3 text-xs text-white">{{ JSON.stringify(current, null, 2) }}</pre>
      </CardContent>
    </Card>
  </div>
</template>
