<template>
  <svg :viewBox="`0 0 ${layout.width} ${layout.height}`" class="inline-block h-[1em] w-auto shrink-0 fill-current" :class="{ 'overflow-visible': layout.badge }" aria-hidden="true">
    <mask v-if="layout.badge" :id="id">
      <rect :width="definition[0]" :height="definition[1]" fill="white" />
      <rect :x="layout.badge.hole.x" :y="layout.badge.hole.y" :width="layout.badge.hole.size" :height="layout.badge.hole.size" :rx="layout.badge.hole.radius" fill="black" />
    </mask>
    <g :mask="layout.badge ? `url(#${id})` : undefined">
      <path v-for="(path, index) in paths" :key="index" :d="path" />
    </g>
    <g v-if="layout.badge" :transform="layout.badge.transform">
      <path v-for="(path, index) in layout.badge.paths" :key="index" :d="path" />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import { ICONS, type IconName } from '@utils/icons'

defineOptions({
  name: 'SFIcon'
})

const props = defineProps<{
  /**
   * Icon to draw
   */
  name: IconName
  /**
   * Smaller icon drawn over the bottom right corner
   */
  badge?: IconName
}>()

const id = useId()

const definition = computed(() => ICONS[props.name].icon)

const paths = computed(() => getPaths(definition.value))

const layout = computed(() => {
  const [width, height] = definition.value

  if (!props.badge) return { width, height, badge: null }

  const badge = ICONS[props.badge].icon
  const size = height / 2
  const x = width - size * 0.55
  const y = height - size * 0.8
  const scale = size / Math.max(badge[0], badge[1])
  const gap = height * 0.07

  return {
    width: x + size,
    height,
    badge: {
      paths: getPaths(badge),
      transform: `translate(${x + (size - badge[0] * scale) / 2} ${y + (size - badge[1] * scale) / 2}) scale(${scale})`,
      hole: { x: x - gap, y: y - gap, size: size + 2 * gap, radius: 2 * gap }
    }
  }
})

function getPaths(icon: (typeof ICONS)[IconName]['icon']) {
  const data = icon[4]

  return Array.isArray(data) ? data : [data]
}
</script>
