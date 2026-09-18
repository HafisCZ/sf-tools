<template>
  <div ref="container-ref" class="contents" @mouseenter="show" @mouseleave="hide" @focusin="show" @focusout="hide">
    <slot />
  </div>
  <Teleport to="body">
    <div v-if="open" ref="tooltip-ref" role="tooltip" class="pointer-events-none fixed z-[1002] max-w-[380px] rounded-md border border-line bg-surface px-3 py-2 text-white/90 shadow-xl" :class="{ invisible: !style }" :style="style">
      {{ props.content }}
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { pickVisibleAxisPosition, useAnimationFramePosition } from '@utils/position'

defineOptions({
  name: 'SFTooltip'
})

const props = defineProps<{
  /**
   * Text shown in the tooltip
   */
  content: string
}>()

const GAP = 4

const open = ref(false)

const containerElement = useTemplateRef('container-ref')
const tooltipElement = useTemplateRef('tooltip-ref')

// The container is display: contents and has no box of its own
const anchor = useAnimationFramePosition(open, () => containerElement.value?.firstElementChild?.getBoundingClientRect())

const style = computed(() => {
  const rectangle = anchor.value
  const tooltip = tooltipElement.value

  if (!rectangle || !tooltip) return undefined

  const width = tooltip.offsetWidth
  const height = tooltip.offsetHeight
  const center = (rectangle.left + rectangle.right) / 2

  const left = pickVisibleAxisPosition(center - width / 2, center - width / 2, width, window.innerWidth)
  const top = pickVisibleAxisPosition(rectangle.bottom + GAP, rectangle.top - height - GAP, height, window.innerHeight)

  return { top: `${top}px`, left: `${left}px` }
})

function show() {
  open.value = true
}

function hide() {
  open.value = false
}
</script>
