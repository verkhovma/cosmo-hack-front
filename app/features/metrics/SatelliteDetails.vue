<script setup lang="ts">
import type { RouteEntry, Snapshot } from '~~/shared/types/scenario'

import { PlusIcon } from 'lucide-vue-next'
import { hasPath } from '~~/shared/utils/routes'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

const props = defineProps<{
  satelliteId: string
  snapshot: Snapshot
  routes: Record<string, RouteEntry[]>
  tS: number
}>()
const emit = defineEmits<{
  close: []
  'add-failure': [satId: string]
}>()

const sat = computed(() => props.snapshot.satellites.find(x => x.id === props.satelliteId))
const visibleTo = computed(() => sat.value?.visible_to ?? [])
const inRoutes = computed(() => {
  const out: string[] = []
  for (const [cid, entries] of Object.entries(props.routes)) {
    const entry = entries.find(e => e.t_s === props.tS)
    if (entry && hasPath(entry.path) && entry.path.includes(props.satelliteId))
      out.push(cid)
  }
  return out
})
</script>

<template>
  <Card>
    <CardHeader class="flex flex-row items-center gap-3">
      <CardTitle>{{ satelliteId }}</CardTitle>
      <Badge :variant="sat?.active ? 'default' : 'secondary'">{{ sat?.active ? 'активен' : 'неактивен' }}</Badge>
      <Button size="sm" variant="ghost" class="ml-auto" @click="emit('close')">×</Button>
    </CardHeader>
    <CardContent class="flex flex-col gap-2 text-sm">
      <p>виден: {{ visibleTo.length ? visibleTo.join(', ') : '—' }}</p>
      <p>в маршруте: {{ inRoutes.length ? inRoutes.join(', ') : '—' }}</p>
      <div>
        <Button size="sm" :disabled="!sat?.active" @click="emit('add-failure', satelliteId)">
          <PlusIcon data-icon="inline-start" />В отказ [t; t+1ч)
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
