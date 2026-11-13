<template>
  <div class="flex flex-col">
    <div class="relative">
      <svg :viewBox="`0 0 ${WIDTH} ${HEIGHT}`" role="img" :aria-label="localize('chart.description', { levels: totalLevels.toFixed(2), mushrooms: formatMushrooms(totalMushrooms) })" class="block h-auto w-full">
        <line v-for="tick in levelTicks" :key="tick" :x1="LEFT" :x2="WIDTH - RIGHT" :y1="toY(tick)" :y2="toY(tick)" class="stroke-white/10" />
        <polygon :points="toArea(props.curve)" class="fill-accent/7" />
        <polygon :points="toArea(boughtCurve)" class="fill-accent/22" />
        <polyline :points="toLine(props.curve)" fill="none" stroke-width="2" stroke-linejoin="round" class="stroke-accent/45" />
        <polyline :points="toLine(boughtCurve)" fill="none" stroke-width="2.5" stroke-linejoin="round" class="stroke-accent" />
        <template v-if="marker">
          <line v-if="marker.position > totalMushrooms" :x1="toX(totalMushrooms)" :x2="toX(marker.position)" :y1="toY(totalLevels)" :y2="toY(totalLevels)" stroke-width="1.5" stroke-dasharray="4 5" class="stroke-white/55" />
          <line :x1="toX(marker.position)" :x2="toX(marker.position)" :y1="TOP" :y2="HEIGHT - BOTTOM" stroke-dasharray="3 4" class="stroke-white/60" />
          <circle :cx="toX(marker.position)" :cy="toY(marker.levels)" r="5" stroke-width="2" class="fill-accent stroke-surface" />
        </template>
      </svg>
      <span v-for="tick in levelTicks" :key="`y${tick}`" class="absolute -translate-x-full -translate-y-1/2 text-[11px] text-white/60" :style="{ left: toLeft(LEFT - 8), top: toTop(toY(tick)) }">{{ tick }}</span>
      <span v-for="tick in mushroomTicks" :key="`x${tick}`" class="absolute -translate-x-1/2 -translate-y-1/2 text-[11px] text-white/60" :style="{ left: toLeft(toX(tick)), top: toTop(HEIGHT - BOTTOM + 14) }">{{ formatMushrooms(tick) }}</span>
      <span v-if="marker" class="absolute -translate-y-[130%] rounded border border-white/30 bg-dialog px-2 py-0.5 text-xs font-bold whitespace-nowrap" :class="isMarkerLabelRight ? 'translate-x-2' : '-translate-x-full'" :style="{ left: toLeft(toX(marker.position)), top: toTop(toY(marker.levels)) }">
        {{ localize('chart.marker', { mushrooms: formatMushrooms(marker.mushrooms), levels: marker.levels.toFixed(2) }) }}
      </span>
    </div>
    <div class="flex justify-between pt-1.5 text-[11px] text-white/60">
      <span>{{ localize('chart.levels') }}</span>
      <span>{{ localize('chart.mushrooms') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLocalize } from '@utils/localization'
import { formatMushrooms } from '~/pages/dungeon-break/dungeon-break'

defineOptions({
  name: 'DungeonBreakChart'
})

const props = defineProps<{
  /**
   * Levels gained after each fight against the mushrooms spent so far, starting at zero
   */
  curve: CurvePoint[]
  /**
   * Mushrooms marked on the chart, nothing is marked when empty
   */
  mushrooms: number | null
}>()

type CurvePoint = {
  mushrooms: number
  levels: number
}

const WIDTH = 1060
const HEIGHT = 170
const LEFT = 44
const RIGHT = 18
const TOP = 18
const BOTTOM = 30

const localize = useLocalize('dungeon_break')

const lastPoint = computed(() => props.curve.at(-1) ?? { mushrooms: 0, levels: 0 })

const totalMushrooms = computed(() => lastPoint.value.mushrooms)

const totalLevels = computed(() => lastPoint.value.levels)

const boughtCurve = computed(() => (props.mushrooms === null ? props.curve : props.curve.filter((point) => point.mushrooms <= (props.mushrooms ?? 0) + 1e-9)))

const shownMushrooms = computed(() => Math.max(totalMushrooms.value, Math.min(props.mushrooms ?? 0, totalMushrooms.value * 1.25)))

const marker = computed(() => {
  if (props.mushrooms === null) return null

  return { mushrooms: props.mushrooms, position: Math.min(props.mushrooms, shownMushrooms.value), levels: boughtCurve.value.at(-1)?.levels ?? 0 }
})

const isMarkerLabelRight = computed(() => (marker.value?.position ?? 0) < 0.4 * shownMushrooms.value)

const mushroomStep = computed(() => getStep(shownMushrooms.value))

const maxMushrooms = computed(() => Math.max(mushroomStep.value, Math.ceil(shownMushrooms.value / mushroomStep.value) * mushroomStep.value))

const levelStep = computed(() => getStep(totalLevels.value))

const maxLevels = computed(() => Math.max(levelStep.value, Math.ceil(totalLevels.value / levelStep.value) * levelStep.value))

const levelTicks = computed(() => createTicks(maxLevels.value, levelStep.value))

const mushroomTicks = computed(() => createTicks(maxMushrooms.value, mushroomStep.value))

const STEPS = [1, 2, 5]

function getStep(max: number) {
  const scale = 10 ** Math.floor(Math.log10(Math.max(1, max / 5)))

  return STEPS.map((step) => step * scale).find((step) => max / step <= 6) ?? 10 * scale
}

function createTicks(max: number, step: number) {
  return Array.from({ length: Math.round(max / step) + 1 }, (_, index) => index * step)
}

function toX(mushrooms: number) {
  return LEFT + ((WIDTH - LEFT - RIGHT) * mushrooms) / maxMushrooms.value
}

function toY(levels: number) {
  return HEIGHT - BOTTOM - ((HEIGHT - TOP - BOTTOM) * levels) / maxLevels.value
}

function toLeft(x: number) {
  return `${(100 * x) / WIDTH}%`
}

function toTop(y: number) {
  return `${(100 * y) / HEIGHT}%`
}

function toLine(points: CurvePoint[]) {
  return points.map((point) => `${toX(point.mushrooms).toFixed(1)},${toY(point.levels).toFixed(1)}`).join(' ')
}

function toArea(points: CurvePoint[]) {
  const last = points.at(-1)

  if (!last) return ''

  return `${toX(0)},${toY(0)} ${toLine(points)} ${toX(last.mushrooms).toFixed(1)},${toY(0)}`
}
</script>
