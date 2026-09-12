<script setup lang="ts">
import type { RouteEntry } from '~~/shared/types/scenario'

import { fmtClock, fmtDuration, fmtPercent } from '~~/shared/utils/format'
import { availabilityOf, groupSegments, maxGapOf, REASON_LABEL } from '~~/shared/utils/routes'

import { Badge } from '~/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'

const props = defineProps<{
  clientId: string
  entries: RouteEntry[]
  step: number
  visibleLog?: string[][]
}>()
const emit = defineEmits<{ seek: [t: number] }>()

const routeSegs = computed(() => groupSegments(props.entries, props.step))
const maxGap = computed(() => maxGapOf(routeSegs.value))
const avail = computed(() => availabilityOf(props.entries))
const total = computed(() => props.entries.length * props.step)

const visSegs = computed(() => {
  const vis = props.visibleLog
  if (!vis)
    return []
  const visEntries = props.entries.map((e, i) => ({
    path: (vis[i]?.length ?? 0) > 0 ? ['x'] : [],
    reason: (vis[i]?.length ?? 0) > 0 ? 'ok' : 'no_visible_satellite',
    t_s: e.t_s,
  }))
  return groupSegments(visEntries, props.step)
})
</script>

<template>
  <div>
    <div class="mb-1 flex items-baseline gap-3 text-sm">
      <b>{{ clientId }}</b>
      <span>{{ fmtPercent(avail) }}</span>
      <span class="text-mist">макс. перерыв {{ maxGap ? fmtDuration(maxGap.to - maxGap.from) : '—' }}</span>
      <Tooltip v-if="maxGap">
        <TooltipTrigger as-child>
          <Badge variant="destructive" class="cursor-help">разрыв {{ fmtClock(maxGap.from) }}</Badge>
        </TooltipTrigger>
        <TooltipContent>причина: {{ REASON_LABEL[maxGap.reason] ?? maxGap.reason }}</TooltipContent>
      </Tooltip>
    </div>

    <div v-if="visibleLog" class="mb-1 flex items-center gap-2">
      <span class="w-20 text-[11px] tracking-wide text-mist uppercase">видимость</span>
      <div class="flex h-[18px] flex-1 overflow-hidden rounded bg-ink">
        <div
          v-for="(s, i) in visSegs"
          :key="`v${i}`"
          class="h-full cursor-pointer"
          :class="s.ok ? 'bg-orbital-light' : 'bg-ink brightness-150'"
          :style="{ width: `${((s.to - s.from) / total) * 100}%` }"
          :title="`${fmtClock(s.from)} — ${fmtClock(s.to)}`"
          @click="emit('seek', s.from)"
        />
      </div>
    </div>

    <div class="flex items-center gap-2">
      <span class="w-20 text-[11px] tracking-wide text-mist uppercase">маршрут</span>
      <div class="flex h-[18px] flex-1 overflow-hidden rounded bg-ink">
        <Tooltip v-for="(s, i) in routeSegs" :key="`r${i}`">
          <TooltipTrigger as-child>
            <div
              class="h-full cursor-pointer"
              :class="s.ok ? 'bg-orbital-light' : 'bg-primary'"
              :style="{ width: `${((s.to - s.from) / total) * 100}%` }"
              @click="emit('seek', s.from)"
            />
          </TooltipTrigger>
          <TooltipContent>
            {{ fmtClock(s.from) }} — {{ fmtClock(s.to) }} ({{ fmtDuration(s.to - s.from) }})<br>
            причина: {{ REASON_LABEL[s.reason] ?? s.reason }}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  </div>
</template>
