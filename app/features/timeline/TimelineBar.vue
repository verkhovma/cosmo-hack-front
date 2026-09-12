<script setup lang="ts">
import { fmtClock } from '~~/shared/utils/format'

import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Slider } from '~/components/ui/slider'

const props = defineProps<{ tS: number, horizon: number, step: number }>()
const emit = defineEmits<{ change: [t: number] }>()

const human = ref(true)
const playing = ref(false)
let timer: null | ReturnType<typeof setInterval> = null

function onSlide(v: number[] | undefined) {
  const next = v?.[0]
  if (next !== undefined)
    emit('change', next)
}

function stepBy(k: number) {
  const max = Math.max(0, props.horizon - props.step)
  emit('change', Math.min(max, Math.max(0, props.tS + k * props.step)))
}

function togglePlay() {
  playing.value = !playing.value
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  if (playing.value) {
    timer = setInterval(() => {
      const max = Math.max(0, props.horizon - props.step)
      const next = props.tS + props.step
      if (next > max) {
        togglePlay()
        return
      }
      emit('change', next)
    }, 400)
  }
}

onUnmounted(() => {
  if (timer)
    clearInterval(timer)
})
</script>

<template>
  <Card class="p-4">
    <div class="flex items-center gap-3">
      <Button size="sm" variant="secondary" @click="stepBy(-1)">− шаг</Button>
      <Button size="sm" variant="secondary" @click="togglePlay">{{ playing ? '⏸' : '▶' }}</Button>
      <Button size="sm" variant="secondary" @click="stepBy(1)">+ шаг</Button>
      <Slider :model-value="[tS]" :min="0" :max="Math.max(0, horizon - step)" :step="step" class="flex-1" @update:model-value="onSlide" />
      <span class="min-w-36 text-right text-sm tabular-nums text-secondary">
        {{ human ? `${fmtClock(tS)} / ${fmtClock(horizon)}` : `${tS} с / ${horizon} с` }}
      </span>
      <Button size="sm" variant="ghost" @click="human = !human">{{ human ? 'сек' : 'ЧЧ:ММ:СС' }}</Button>
    </div>
  </Card>
</template>
