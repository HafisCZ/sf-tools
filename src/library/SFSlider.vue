<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="props.label" :for="id" class="font-bold text-white">{{ props.label }}</label>
    <div class="relative h-5">
      <div class="absolute inset-x-2 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line">
        <div class="absolute inset-y-0 rounded-full bg-accent" :style="{ left: `${getPercent(fromValue)}%`, right: `${100 - getPercent(toValue)}%` }" />
      </div>
      <input
        v-for="(handle, index) in handles"
        :id="index === 0 ? id : undefined"
        :key="index"
        type="range"
        :min="props.min"
        :max="props.max"
        :step="props.step"
        :value="handle.value"
        :aria-label="handle.label"
        class="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent outline-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white focus-visible:[&::-moz-range-thumb]:outline-2 focus-visible:[&::-moz-range-thumb]:outline-offset-2 focus-visible:[&::-moz-range-thumb]:outline-accent focus-visible:[&::-webkit-slider-thumb]:outline-2 focus-visible:[&::-webkit-slider-thumb]:outline-offset-2 focus-visible:[&::-webkit-slider-thumb]:outline-accent"
        :class="{ 'z-10': index === 0 && getPercent(fromValue) > 50 }"
        @input="handle.update"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'

defineOptions({
  name: 'SFSlider'
})

const props = defineProps<{
  /**
   * Text shown above the slider
   */
  label?: string
  /**
   * Lowest value
   */
  min: number
  /**
   * Highest value
   */
  max: number
  /**
   * Distance between the values a handle can stop at
   */
  step?: number
  /**
   * Accessible name of the lower handle
   */
  fromLabel?: string
  /**
   * Accessible name of the upper handle
   */
  toLabel?: string
}>()

const from = defineModel<number | null>('from', { required: true })
const to = defineModel<number | null>('to', { required: true })

defineExpose({
  get isValid() {
    return true
  }
})

const id = useId()

const fromValue = computed(() => from.value ?? props.min)
const toValue = computed(() => to.value ?? props.max)

const handles = computed(() => [
  {
    value: fromValue.value,
    label: props.fromLabel,
    update: (event: Event) => {
      from.value = readValue(event, (value) => Math.min(value, toValue.value))
    }
  },
  {
    value: toValue.value,
    label: props.toLabel,
    update: (event: Event) => {
      to.value = readValue(event, (value) => Math.max(value, fromValue.value))
    }
  }
])

function getPercent(value: number) {
  return (100 * (value - props.min)) / (props.max - props.min)
}

// Writes the clamped value back, an unchanged model would leave the handle where it was dragged
function readValue(event: Event, clamp: (value: number) => number) {
  if (!(event.target instanceof HTMLInputElement)) return null

  const value = clamp(Number(event.target.value))

  event.target.value = String(value)

  return value
}
</script>
