<script setup lang="ts">
import type { Scenario } from '~~/shared/types/scenario'
import type { ValidationError } from '~~/shared/utils/validate'

import { PlusIcon } from 'lucide-vue-next'
import { errorsForItem } from '~~/shared/utils/validate'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'

const props = defineProps<{ scenario: Scenario, errors: ValidationError[] }>()
const emit = defineEmits<{ update: [s: Scenario] }>()

function upd(i: number, k: 'id' | 'phase_deg' | 'raan_deg', v: number | string) {
  const planes = props.scenario.design.planes.map((p, k2) => (k2 === i ? { ...p, [k]: v } : p))
  emit('update', { ...props.scenario, design: { ...props.scenario.design, planes } })
}

function add() {
  const planes = props.scenario.design.planes
  const id = `P${planes.length + 1}`
  emit('update', {
    ...props.scenario,
    design: { ...props.scenario.design, planes: [...planes, { id, phase_deg: 0, raan_deg: 0 }] },
  })
}

function remove(i: number) {
  emit('update', {
    ...props.scenario,
    design: { ...props.scenario.design, planes: props.scenario.design.planes.filter((_, k) => k !== i) },
  })
}

function errFor(i: number, k: string): string | undefined {
  return errorsForItem(props.errors, 'planes', i).find(e => e.path.endsWith(`.${k}`))?.message
}

function hasRowError(i: number): boolean {
  return errorsForItem(props.errors, 'planes', i).length > 0
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-medium">Орбитальные плоскости</h3>
      <Button size="sm" variant="secondary" @click="add">
        <PlusIcon data-icon="inline-start" />Добавить
      </Button>
    </div>
    <p v-if="!scenario.design.planes.length" class="text-sm text-mist">
      Плоскостей нет. Нажмите «Добавить».
    </p>
    <!-- min-w: колонки таблицы в узкой панели сжимали инпуты до 0px контента -->
    <div v-else class="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>RAAN, °</TableHead>
            <TableHead>Phase, °</TableHead>
            <TableHead class="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="(p, i) in scenario.design.planes" :key="i" :data-invalid="hasRowError(i) || undefined">
            <TableCell>
              <Input class="min-w-20" :model-value="p.id" :aria-invalid="!!errFor(i, 'id')" @update:model-value="upd(i, 'id', String($event))" />
              <p v-if="errFor(i, 'id')" class="mt-1 text-xs text-primary">{{ errFor(i, 'id') }}</p>
            </TableCell>
            <TableCell>
              <Input class="min-w-20" type="number" step="0.1" :model-value="p.raan_deg" :aria-invalid="!!errFor(i, 'raan_deg')" @update:model-value="upd(i, 'raan_deg', Number($event))" />
              <p v-if="errFor(i, 'raan_deg')" class="mt-1 text-xs text-primary">{{ errFor(i, 'raan_deg') }}</p>
            </TableCell>
            <TableCell>
              <Input class="min-w-20" type="number" step="0.1" :model-value="p.phase_deg" :aria-invalid="!!errFor(i, 'phase_deg')" @update:model-value="upd(i, 'phase_deg', Number($event))" />
              <p v-if="errFor(i, 'phase_deg')" class="mt-1 text-xs text-primary">{{ errFor(i, 'phase_deg') }}</p>
            </TableCell>
            <TableCell>
              <Button size="sm" variant="destructive" @click="remove(i)">−</Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
