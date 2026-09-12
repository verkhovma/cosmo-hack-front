<script setup lang="ts">
import type { FeatureCollection } from 'geojson'
import type { RouteEntry, Scenario, Snapshot } from '~~/shared/types/scenario'

import { geoMercator, geoPath } from 'd3-geo'
import { MinusIcon, PlusIcon, RotateCcwIcon } from 'lucide-vue-next'
import { CLIENT_COLOR, GATEWAY_COLOR, INACTIVE_COLOR, planeColor } from '~~/shared/utils/colors'
import { fmtClock } from '~~/shared/utils/format'
import { hasPath } from '~~/shared/utils/routes'
import { loadWorldLand } from '~~/shared/utils/world'

import { Button } from '~/components/ui/button'
import { Card, CardContent, CardFooter } from '~/components/ui/card'

import { drawFrame, drawLand, drawOverlays, drawRoute, MAP_H, MAP_W, satLatLon } from './drawMap'

interface Popup {
  lines: string[]
  x: number
  y: number
}

const props = defineProps<{
  scenario: Scenario
  snapshot: null | Snapshot
  routes: Record<string, RouteEntry[]>
  tS: number
  selectedClient: null | string
  hiddenSats: Set<string>
}>()
const emit = defineEmits<{ selectSatellite: [id: string] }>()

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const world = ref<FeatureCollection | null>(null)
const zoom = ref(1)
const pan = ref({ x: 0, y: 0 })
const popup = ref<null | Popup>(null)
const drag = ref<{ x: number, y: number, panX: number, panY: number } | null>(null)

// Легенда плоскостей — те же цвета, что рисует canvas (colors.ts).
const planeLegend = computed(() =>
  props.scenario.design.planes.map(p => ({ color: planeColor(p.id), id: p.id })),
)

// Попап у правого/нижнего края разворачиваем внутрь, чтобы не обрезался.
const popupFlip = computed(() => {
  if (!popup.value)
    return ''
  const flipX = popup.value.x > MAP_W * 0.7 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)'
  const flipY = popup.value.y > MAP_H * 0.7 ? 'translateY(calc(-100% - 12px))' : 'translateY(12px)'
  return `${flipX} ${flipY}`
})

onMounted(async () => {
  try {
    world.value = await loadWorldLand()
  }
  catch (e) {
    console.error(e)
  }
})

const projection = computed(() =>
  geoMercator()
    .scale((MAP_W / (2 * Math.PI)) * zoom.value)
    .translate([MAP_W / 2 + pan.value.x, MAP_H / 2 + pan.value.y])
    .center([0, 20]),
)
const pathGen = computed(() => geoPath(projection.value))

function project(lat: number, lon: number): [number, number] | null {
  const p = projection.value([lon, lat])
  return p ? [p[0], p[1]] : null
}

function draw() {
  const c = canvas.value
  if (!c)
    return
  const ctx = c.getContext('2d')
  if (!ctx)
    return
  ctx.clearRect(0, 0, MAP_W, MAP_H)
  drawFrame(ctx, project)
  drawLand(ctx, pathGen.value, world.value)
  if (!props.snapshot)
    return
  drawRoute(ctx, project, {
    routes: props.routes,
    scenario: props.scenario,
    selectedClient: props.selectedClient,
    snapshot: props.snapshot,
    tS: props.tS,
  })
  drawOverlays(ctx, project, {
    hiddenSats: props.hiddenSats,
    scenario: props.scenario,
    snapshot: props.snapshot,
  })
}

watch(
  [canvas, world, () => props.snapshot, () => props.routes, () => props.tS, zoom, pan,
    () => props.selectedClient, () => props.hiddenSats],
  () => { draw(); },
  { flush: 'post' },
)

function canvasCoords(e: MouseEvent): [number, number] | null {
  const el = canvas.value
  if (!el)
    return null
  const rect = el.getBoundingClientRect()
  return [(e.clientX - rect.left) * (MAP_W / rect.width), (e.clientY - rect.top) * (MAP_H / rect.height)]
}

function nearest(mx: number, my: number, maxD: number) {
  if (!props.snapshot)
    return null
  let best: { id: string, d: number, x: number, y: number } | null = null
  for (const s of props.snapshot.satellites) {
    if (props.hiddenSats.has(s.id))
      continue
    const [lat, lon] = satLatLon(s)
    const p = project(lat, lon)
    if (!p)
      continue
    const d = Math.hypot(p[0] - mx, p[1] - my)
    if (d < maxD && (best === null || d < best.d))
      best = { d, id: s.id, x: p[0], y: p[1] }
  }
  return best
}

function onMouseMove(e: MouseEvent) {
  const coords = canvasCoords(e)
  if (!coords)
    return
  const [mx, my] = coords
  if (drag.value) {
    pan.value = {
      x: drag.value.panX + (e.clientX - drag.value.x),
      y: drag.value.panY + (e.clientY - drag.value.y),
    }
    return
  }
  if (!props.snapshot) {
    popup.value = null
    return
  }
  const best = nearest(mx, my, 10)
  if (!best) {
    popup.value = null
    return
  }
  const s = props.snapshot.satellites.find(x => x.id === best.id)
  if (!s) {
    popup.value = null
    return
  }
  const visibleTo = s.visible_to ?? []
  const inRoutes: string[] = []
  for (const [cid, entries] of Object.entries(props.routes)) {
    const entry = entries.find(en => en.t_s === props.tS)
    if (entry && hasPath(entry.path) && entry.path.includes(best.id))
      inRoutes.push(cid)
  }
  popup.value = {
    lines: [
      `${best.id} · ${s.active ? (visibleTo.length ? 'активен · виден' : 'активен · не виден') : 'неактивен (отказ или не запущен)'}`,
      `виден: ${visibleTo.length ? visibleTo.join(', ') : '—'}`,
      `в маршруте: ${inRoutes.length ? inRoutes.join(', ') : '—'}`,
      `t = ${fmtClock(props.tS)}`,
    ],
    x: best.x,
    y: best.y,
  }
}

function onWheel(e: WheelEvent) {
  zoom.value = Math.max(0.5, Math.min(8, zoom.value * (e.deltaY < 0 ? 1.15 : 1 / 1.15)))
}

function onMouseDown(e: MouseEvent) {
  drag.value = { panX: pan.value.x, panY: pan.value.y, x: e.clientX, y: e.clientY }
}
function onMouseUp() {
  drag.value = null
}
function onMouseLeave() {
  drag.value = null
  popup.value = null
}

function onClick(e: MouseEvent) {
  const coords = canvasCoords(e)
  if (!coords)
    return
  const best = nearest(coords[0], coords[1], 8)
  if (best)
    emit('selectSatellite', best.id)
}

function zoomIn() {
  zoom.value = Math.min(8, zoom.value * 1.2)
}
function zoomOut() {
  zoom.value = Math.max(0.5, zoom.value / 1.2)
}
function reset() {
  zoom.value = 1
  pan.value = { x: 0, y: 0 }
}
</script>

<template>
  <Card class="overflow-hidden">
    <CardContent class="p-0">
      <div class="relative bg-ink">
        <canvas
          ref="canvas"
          :width="MAP_W"
          :height="MAP_H"
          class="block h-auto min-h-[300px] w-full cursor-grab touch-pan-y rounded-lg active:cursor-grabbing"
          @mousemove="onMouseMove"
          @mousedown="onMouseDown"
          @mouseup="onMouseUp"
          @mouseleave="onMouseLeave"
          @wheel.prevent="onWheel"
          @click="onClick"
        />
        <div class="absolute top-2 right-2 flex flex-col gap-1">
          <Button size="icon" variant="secondary" class="h-10 w-10" title="Приблизить" @click="zoomIn"><PlusIcon /></Button>
          <Button size="icon" variant="secondary" class="h-10 w-10" title="Отдалить" @click="zoomOut"><MinusIcon /></Button>
          <Button size="icon" variant="secondary" class="h-10 w-10" title="Сбросить масштаб" @click="reset"><RotateCcwIcon /></Button>
        </div>
        <div
          v-if="popup"
          class="pointer-events-none absolute z-10 max-w-[220px] rounded-md border border-mist/40 bg-ink/95 px-2 py-1 text-xs whitespace-pre-wrap text-white"
          :style="{ left: `${(popup.x / MAP_W) * 100}%`, top: `${(popup.y / MAP_H) * 100}%`, transform: popupFlip }"
        >
          <div v-for="(l, i) in popup.lines" :key="i">{{ l }}</div>
        </div>
      </div>
    </CardContent>
    <CardFooter class="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-mist">
      <span class="flex items-center gap-1"><span class="inline-block size-2.5 rounded-sm" :style="{ background: CLIENT_COLOR }" />клиент</span>
      <span class="flex items-center gap-1"><span class="inline-block size-2.5 rounded-sm border border-mist/60" :style="{ background: GATEWAY_COLOR }" />шлюз</span>
      <span class="flex items-center gap-1"><span class="inline-block size-2.5 rounded-sm bg-azure" />маршрут</span>
      <span class="flex items-center gap-1"><span class="inline-block size-2.5 rounded-sm" :style="{ background: INACTIVE_COLOR }" />неактивен</span>
      <span v-for="p in planeLegend" :key="p.id" class="flex items-center gap-1"><span class="inline-block size-2.5 rounded-full" :style="{ background: p.color }" />{{ p.id }}</span>
    </CardFooter>
  </Card>
</template>
