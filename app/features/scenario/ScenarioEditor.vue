<script setup lang="ts">
import type { RouteEntry, Scenario } from '~~/shared/types/scenario'
import type { ValidationError } from '~~/shared/utils/validate'

import { SaveIcon } from 'lucide-vue-next'

import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'

import BatchesTab from './BatchesTab.vue'
import FailuresTab from './FailuresTab.vue'
import GatewayOutagesTab from './GatewayOutagesTab.vue'
import GroundSitesTab from './GroundSitesTab.vue'
import PlanesTab from './PlanesTab.vue'

type TabId = 'batches' | 'failures' | 'gateway_outages' | 'ground' | 'planes'

const props = defineProps<{
  scenario: Scenario
  errors: ValidationError[]
  canRun: boolean
  routes?: null | Record<string, RouteEntry[]>
  tS?: number
}>()
const emit = defineEmits<{
  'update': [s: Scenario]
  'save': []
  'save-anyway': []
}>()

const tab = ref<TabId>('batches')

const badges = computed(() => {
  const m: Partial<Record<TabId, number>> = {}
  const map: Record<string, TabId> = {
    failures: 'failures',
    gateway_outages: 'gateway_outages',
    ground_sites: 'ground',
    planes: 'planes',
    satellites: 'batches',
  }
  for (const e of props.errors) {
    const t = e.list ? map[e.list] : undefined
    if (t)
      m[t] = (m[t] ?? 0) + 1
  }
  return m
})
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Конфигурация</CardTitle>
      <CardDescription>{{ scenario.meta.title }}</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-4">
      <Alert v-if="errors.length" variant="destructive">
        <AlertTitle>Ошибки валидации ({{ errors.length }})</AlertTitle>
        <AlertDescription>
          <ul class="mt-1 list-disc pl-5">
            <li v-for="(e, i) in errors.slice(0, 8)" :key="i">
              <code>{{ e.path }}</code> — {{ e.message }}
            </li>
          </ul>
          <p v-if="errors.length > 8" class="mt-1">…и ещё {{ errors.length - 8 }}</p>
        </AlertDescription>
      </Alert>

      <Tabs v-model="tab" default-value="batches">
        <TabsList class="flex flex-wrap">
          <TabsTrigger value="planes">
            Плоскости
            <Badge v-if="badges.planes" variant="destructive" class="ml-1">{{ badges.planes }}</Badge>
          </TabsTrigger>
          <TabsTrigger value="batches">
            Очереди
            <Badge v-if="badges.batches" variant="destructive" class="ml-1">{{ badges.batches }}</Badge>
          </TabsTrigger>
          <TabsTrigger value="ground">
            Пункты
            <Badge v-if="badges.ground" variant="destructive" class="ml-1">{{ badges.ground }}</Badge>
          </TabsTrigger>
          <TabsTrigger value="failures">
            Отказы СА
            <Badge v-if="badges.failures" variant="destructive" class="ml-1">{{ badges.failures }}</Badge>
          </TabsTrigger>
          <TabsTrigger value="gateway_outages">
            Шлюзы
            <Badge v-if="badges.gateway_outages" variant="destructive" class="ml-1">{{ badges.gateway_outages }}</Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="planes">
          <PlanesTab :scenario="scenario" :errors="errors" @update="emit('update', $event)" />
        </TabsContent>
        <TabsContent value="batches">
          <BatchesTab :scenario="scenario" :errors="errors" @update="emit('update', $event)" />
        </TabsContent>
        <TabsContent value="ground">
          <GroundSitesTab :scenario="scenario" :errors="errors" @update="emit('update', $event)" />
        </TabsContent>
        <TabsContent value="failures">
          <FailuresTab :scenario="scenario" :errors="errors" :routes="routes" :t-s="tS" @update="emit('update', $event)" />
        </TabsContent>
        <TabsContent value="gateway_outages">
          <GatewayOutagesTab :scenario="scenario" :errors="errors" @update="emit('update', $event)" />
        </TabsContent>
      </Tabs>

      <div class="flex justify-end gap-2">
        <Button v-if="!errors.length" :disabled="!canRun" @click="emit('save')">
          <SaveIcon data-icon="inline-start" />Сохранить вариант
        </Button>
        <Button v-else variant="destructive" @click="emit('save-anyway')">
          Сохранить всё равно (есть ошибки)
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
