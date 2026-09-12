<script setup lang="ts">
import type { GroundSite, Scenario } from '~~/shared/types/scenario'
import type { ValidationError } from '~~/shared/utils/validate'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'

const props = defineProps<{ scenario: Scenario, errors: ValidationError[] }>()
const emit = defineEmits<{ update: [s: Scenario] }>()

const sites = computed(() => props.scenario.ground_sites)

function upd(i: number, k: keyof GroundSite, v: unknown) {
  const next = sites.value.map((g, k2) => (k2 === i ? { ...g, [k]: v } : g))
  emit('update', { ...props.scenario, ground_sites: next })
}

function add(role: 'client' | 'gateway') {
  const n = sites.value.filter(g => g.role === role).length + 1
  emit('update', {
    ...props.scenario,
    ground_sites: [...sites.value, {
      id: (role === 'client' ? 'C' : 'G') + n,
      lat_deg: role === 'client' ? 65 : 69,
      lon_deg: role === 'client' ? 60 : 33,
      name: role === 'client' ? `Клиент ${n}` : `Шлюз ${n}`,
      role,
    }],
  })
}

function remove(i: number) {
  emit('update', { ...props.scenario, ground_sites: sites.value.filter((_, k) => k !== i) })
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-medium">Наземные пункты</h3>
      <div class="flex gap-2">
        <Button size="sm" variant="secondary" @click="add('client')">+ клиент</Button>
        <Button size="sm" variant="secondary" @click="add('gateway')">+ шлюз</Button>
      </div>
    </div>
    <p v-if="!sites.length" class="text-sm text-mist">Пунктов нет. Добавьте хотя бы один клиент и один шлюз.</p>
    <!-- min-w: колонки таблицы в узкой панели сжимали инпуты до 0px контента -->
    <div v-else class="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Название</TableHead>
            <TableHead>Роль</TableHead>
            <TableHead>Широта</TableHead>
            <TableHead>Долгота</TableHead>
            <TableHead class="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="(g, i) in sites" :key="i">
            <TableCell><Input class="min-w-16" :model-value="g.id" @update:model-value="upd(i, 'id', String($event))" /></TableCell>
            <TableCell><Input class="min-w-28" :model-value="g.name" @update:model-value="upd(i, 'name', String($event))" /></TableCell>
            <TableCell>
              <Select :model-value="g.role" @update:model-value="upd(i, 'role', $event as 'client' | 'gateway')">
                <SelectTrigger class="min-w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="client">client</SelectItem>
                  <SelectItem value="gateway">gateway</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </TableCell>
          <TableCell><Input class="min-w-20" type="number" step="0.01" :model-value="g.lat_deg" @update:model-value="upd(i, 'lat_deg', Number($event))" /></TableCell>
          <TableCell><Input class="min-w-20" type="number" step="0.01" :model-value="g.lon_deg" @update:model-value="upd(i, 'lon_deg', Number($event))" /></TableCell>
          <TableCell><Button size="sm" variant="destructive" @click="remove(i)">−</Button></TableCell>
        </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
