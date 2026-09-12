<script setup lang="ts">
import type { Scenario } from '~~/shared/types/scenario'
import type { ValidationError } from '~~/shared/utils/validate'

import { PlusIcon } from 'lucide-vue-next'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'

const props = defineProps<{ scenario: Scenario, errors: ValidationError[] }>()
const emit = defineEmits<{ update: [s: Scenario] }>()
const stageId = useId()

const design = computed(() => props.scenario.design)
const sats = computed(() => design.value.satellites)
const stageError = computed(() => props.errors.find(e => e.path === 'design.launch_stage')?.message)
const counts = computed(() => {
  const c: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 }
  for (const s of sats.value) {
    if (s.launch_batch === 1 || s.launch_batch === 2 || s.launch_batch === 3)
      c[s.launch_batch]++
  }
  return c
})

function setStage(stage: 1 | 2 | 3) {
  emit('update', { ...props.scenario, design: { ...design.value, launch_stage: stage } })
}

function updSat(i: number, k: string, v: unknown) {
  const next = sats.value.map((s, k2) => (k2 === i ? { ...s, [k]: v } : s))
  emit('update', { ...props.scenario, design: { ...design.value, satellites: next } })
}

function addSat() {
  const defaultPlane = design.value.planes[0]?.id ?? ''
  emit('update', {
    ...props.scenario,
    design: {
      ...design.value,
      satellites: [...sats.value, {
        id: `S${String(sats.value.length + 1).padStart(2, '0')}`,
        launch_batch: 1 as const,
        plane_id: defaultPlane,
        slot_deg: 0,
      }],
    },
  })
}

function removeSat(i: number) {
  emit('update', {
    ...props.scenario,
    design: { ...design.value, satellites: sats.value.filter((_, k) => k !== i) },
  })
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-medium">Очереди запуска</h3>
      <Button size="sm" variant="secondary" @click="addSat">
        <PlusIcon data-icon="inline-start" />Спутник
      </Button>
    </div>

    <FieldGroup>
      <Field :data-invalid="!!stageError || undefined">
        <FieldLabel :for="stageId">Активная очередь (launch_stage)</FieldLabel>
        <Select :model-value="String(design.launch_stage)" @update:model-value="setStage(Number($event) as 1 | 2 | 3)">
          <SelectTrigger :id="stageId" :aria-invalid="!!stageError || undefined">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="1">1 — 16 аппаратов</SelectItem>
              <SelectItem value="2">2 — 32 аппарата</SelectItem>
              <SelectItem value="3">3 — все 48</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldError v-if="stageError">{{ stageError }}</FieldError>
      </Field>
    </FieldGroup>

    <!-- min-w: колонки таблицы в узкой панели сжимали инпуты до 0px контента -->
    <div class="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Плоскость</TableHead>
            <TableHead>Slot, °</TableHead>
            <TableHead>Очередь</TableHead>
            <TableHead class="w-12" />
          </TableRow>
        </TableHeader>
      <TableBody>
        <TableRow v-if="!sats.length">
          <TableCell colspan="5" class="text-mist">Спутников нет. Нажмите «+ Спутник».</TableCell>
        </TableRow>
        <TableRow v-for="(s, i) in sats" :key="i">
          <TableCell>
            <Input class="min-w-20" :model-value="s.id" @update:model-value="updSat(i, 'id', String($event))" />
          </TableCell>
          <TableCell>
            <Select :model-value="s.plane_id" @update:model-value="updSat(i, 'plane_id', String($event))">
              <SelectTrigger class="min-w-20"><SelectValue placeholder="— выберите —" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="p in design.planes" :key="p.id" :value="p.id">{{ p.id }}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </TableCell>
          <TableCell>
            <Input class="min-w-20" type="number" step="0.1" :model-value="s.slot_deg" @update:model-value="updSat(i, 'slot_deg', Number($event))" />
          </TableCell>
          <TableCell>
            <Select :model-value="String(s.launch_batch)" @update:model-value="updSat(i, 'launch_batch', Number($event))">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </TableCell>
          <TableCell>
            <Button size="sm" variant="destructive" @click="removeSat(i)">−</Button>
          </TableCell>
        </TableRow>
        </TableBody>
      </Table>
    </div>

    <div class="flex flex-col gap-2 sm:flex-row">
      <Card v-for="b in ([1, 2, 3] as const)" :key="b" class="flex-1 p-3 text-xs">
        <b>Очередь {{ b }}</b>
        <span> — {{ counts[b] }} аппаратов</span>
        <Badge v-if="design.launch_stage >= b" variant="secondary" class="ml-2">включена</Badge>
        <span v-else class="ml-2 text-mist">выключена</span>
      </Card>
    </div>
  </div>
</template>
