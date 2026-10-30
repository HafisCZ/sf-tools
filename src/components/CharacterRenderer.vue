<template>
  <canvas ref="canvas-ref" :width="pixelSize" :height="pixelSize" aria-hidden="true" class="aspect-square w-full" />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'
import type { PlayerModel } from '~/core/models/player'
import { drawPortrait, getPortrait, loadPortraitImages, PORTRAIT_SIZE } from '~/playa/portraits'

defineOptions({
  name: 'CharacterRenderer'
})

const props = defineProps<{
  /**
   * Character whose portrait is drawn, the portrait fills the width of the root element
   */
  data: Pick<PlayerModel, 'Face' | 'Race' | 'Gender' | 'Class'>
}>()

const canvasElement = useTemplateRef('canvas-ref')

const pixelSize = shallowRef(PORTRAIT_SIZE)

let drawCount = 0

// The canvas is drawn at its real screen size, the browser shrinking a bigger canvas leaves jagged edges
const resizeObserver = new ResizeObserver(([entry]) => {
  pixelSize.value = Math.max(1, Math.round(entry.contentBoxSize[0].inlineSize * window.devicePixelRatio))
})

const portrait = computed(() => getPortrait(props.data))

watch(canvasElement, (element, previousElement) => {
  if (previousElement) {
    resizeObserver.unobserve(previousElement)
  }

  if (element) {
    resizeObserver.observe(element)
  }
})

watch(
  [canvasElement, portrait, pixelSize],
  async ([canvas, value]) => {
    if (!canvas) return

    const current = ++drawCount
    const images = await loadPortraitImages(value)

    if (current === drawCount) {
      drawPortrait(canvas, value, images)
    }
  },
  { immediate: true, flush: 'post' }
)

onBeforeUnmount(() => {
  resizeObserver.disconnect()
})
</script>
