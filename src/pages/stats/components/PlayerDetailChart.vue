<template>
  <div class="relative">
    <svg ref="chart-ref" :viewBox="`0 0 ${WIDTH} ${HEIGHT}`" role="img" :aria-label="props.title" class="block h-auto w-full" @mousemove="hoverAt" @mouseleave="hovered = null">
      <line v-for="tick in ticks" :key="tick" :x1="LEFT" :x2="WIDTH - RIGHT" :y1="toY(tick)" :y2="toY(tick)" class="stroke-white/10" />
      <polygon :points="area" class="fill-accent/10" />
      <polyline :points="line" fill="none" stroke-width="2" stroke-linejoin="round" class="stroke-accent" />
      <line v-if="hoveredPoint" :x1="toX(hoveredPoint.timestamp)" :x2="toX(hoveredPoint.timestamp)" :y1="TOP" :y2="PLOT_BOTTOM" stroke-dasharray="3 4" class="stroke-white/50" />
      <circle v-for="point in markers" :key="point.timestamp" :cx="toX(point.timestamp)" :cy="toY(point.value)" r="4.5" stroke-width="2" class="fill-accent stroke-surface" />
    </svg>
    <span v-for="tick in ticks" :key="`y${tick}`" class="absolute -translate-x-full -translate-y-1/2 text-[11px] text-white/60" :style="{ left: toLeft(LEFT - 8), top: toTop(toY(tick)) }">{{ formatNamedNumber(tick) }}</span>
    <span class="absolute -translate-y-1/2 text-[11px] text-white/60" :style="{ left: toLeft(LEFT), top: toTop(DATE_ROW) }">{{ formatDate(firstPoint.timestamp, true, false) }}</span>
    <span class="absolute -translate-x-full -translate-y-1/2 text-[11px] text-white/60" :style="{ left: toLeft(WIDTH - RIGHT), top: toTop(DATE_ROW) }">{{ formatDate(lastPoint.timestamp, true, false) }}</span>
    <span v-if="hoveredPoint" class="pointer-events-none absolute -translate-x-1/2 -translate-y-[130%] rounded border border-white/30 bg-dialog px-2 py-0.5 text-xs font-bold whitespace-nowrap" :style="{ left: tooltipLeft, top: toTop(toY(hoveredPoint.value)) }">
      {{ formatDate(hoveredPoint.timestamp) }}: {{ formatSpacedNumber(hoveredPoint.value) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { formatDate, formatNamedNumber, formatSpacedNumber } from '@utils/formatting'

defineOptions({
  name: 'PlayerDetailChart'
})

const props = defineProps<{
  /**
   * Name of the charted value, read out instead of the chart
   */
  title: string
  /**
   * Value at each scan, oldest first, at least two
   */
  points: ChartPoint[]
}>()

type ChartPoint = {
  timestamp: number
  value: number
}

const WIDTH = 440
const HEIGHT = 210
const LEFT = 60
const RIGHT = 10
const TOP = 14
const PLOT_BOTTOM = 178
const DATE_ROW = 198

const chartElement = useTemplateRef('chart-ref')

const hovered = shallowRef<number | null>(null)

const firstPoint = computed(() => props.points[0])

const lastPoint = computed(() => props.points[props.points.length - 1])

const hoveredPoint = computed(() => (hovered.value === null ? null : props.points[hovered.value]))

const markers = computed(() => (hoveredPoint.value ? [firstPoint.value, lastPoint.value, hoveredPoint.value] : [firstPoint.value, lastPoint.value]).filter((point, index, list) => list.indexOf(point) === index))

// Keeps the centred tooltip inside the chart near its edges
const tooltipLeft = computed(() => (hoveredPoint.value ? `${Math.min(80, Math.max(20, (100 * toX(hoveredPoint.value.timestamp)) / WIDTH))}%` : '0%'))

const range = computed(() => {
  const values = props.points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const step = getStep(max - min || Math.abs(max) || 1)
  const low = Math.floor(min / step) * step
  const high = Math.ceil(max / step) * step

  return { low, high: high === low ? low + step : high, step }
})

const ticks = computed(() => {
  const { low, high, step } = range.value

  return Array.from({ length: Math.round((high - low) / step) + 1 }, (_, index) => low + index * step)
})

const line = computed(() => props.points.map((point) => `${toX(point.timestamp).toFixed(1)},${toY(point.value).toFixed(1)}`).join(' '))

const area = computed(() => `${toX(firstPoint.value.timestamp).toFixed(1)},${toY(range.value.low)} ${line.value} ${toX(lastPoint.value.timestamp).toFixed(1)},${toY(range.value.low)}`)

const STEPS = [1, 2, 5]

function getStep(span: number) {
  const scale = 10 ** Math.floor(Math.log10(Math.max(1, span / 4)))

  return STEPS.map((step) => step * scale).find((step) => span / step <= 4) ?? 10 * scale
}

function toX(timestamp: number) {
  const first = firstPoint.value.timestamp

  return LEFT + ((WIDTH - LEFT - RIGHT) * (timestamp - first)) / Math.max(1, lastPoint.value.timestamp - first)
}

function toY(value: number) {
  const { low, high } = range.value

  return PLOT_BOTTOM - ((PLOT_BOTTOM - TOP) * (value - low)) / (high - low)
}

function toLeft(x: number) {
  return `${(100 * x) / WIDTH}%`
}

function toTop(y: number) {
  return `${(100 * y) / HEIGHT}%`
}

function hoverAt(event: MouseEvent) {
  const bounds = chartElement.value?.getBoundingClientRect()

  if (!bounds) return

  const x = ((event.clientX - bounds.left) / bounds.width) * WIDTH

  let nearest = 0

  for (let index = 1; index < props.points.length; index++) {
    if (Math.abs(toX(props.points[index].timestamp) - x) < Math.abs(toX(props.points[nearest].timestamp) - x)) {
      nearest = index
    }
  }

  hovered.value = nearest
}
</script>
