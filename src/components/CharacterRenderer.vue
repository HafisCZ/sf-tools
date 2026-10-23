<template>
  <canvas ref="canvas-ref" :width="PORTRAIT_SIZE" :height="PORTRAIT_SIZE" aria-hidden="true" class="aspect-square w-full" />
</template>

<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue'
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

let drawCount = 0

const portrait = computed(() => getPortrait(props.data))

watch(
  [canvasElement, portrait],
  async ([canvas, value]) => {
    if (!canvas) return

    const current = ++drawCount
    const images = await loadPortraitImages(value)

    if (current === drawCount) {
      drawPortrait(canvas, value, images)
    }
  },
  { immediate: true }
)
</script>
