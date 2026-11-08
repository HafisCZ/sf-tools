<template>
  <Teleport v-if="props.position === 'floating'" to="body">
    <div v-if="open" ref="floating-ref" class="fixed z-[1002] flex max-w-[380px] items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1.5 text-xs shadow-xl" :class="[TYPE_CLASSES[props.type], { invisible: !style }]" :style="style" role="status" aria-live="polite">
      <SFIcon name="triangle-exclamation" />
      <SFParagraph>{{ props.message }}</SFParagraph>
    </div>
  </Teleport>
  <div v-else class="flex items-center gap-1.5 text-xs" :class="TYPE_CLASSES[props.type]" role="status" aria-live="polite">
    <SFIcon name="triangle-exclamation" />
    <SFParagraph>{{ props.message }}</SFParagraph>
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { pickVisibleAxisPosition, useAnimationFramePosition } from '@utils/position'
import SFIcon from './SFIcon.vue'
import SFParagraph from './SFParagraph.vue'

defineOptions({
  name: 'SFValidation'
})

const props = defineProps<{
  /**
   * Colour of the message
   */
  type: 'error' | 'warning'
  /**
   * Text of the message
   */
  message: string
  /**
   * Where the message shows: under the field, or over the page next to `anchor`
   */
  position?: 'inline' | 'floating'
  /**
   * Field the floating message is placed against
   */
  anchor?: HTMLElement | null
  /**
   * Shows the floating message, true while the field has focus
   */
  anchorFocused?: boolean
}>()

const TYPE_CLASSES = {
  error: 'text-red-400',
  warning: 'text-yellow-400'
}

const GAP = 2

const floatingElement = useTemplateRef('floating-ref')

const open = computed(() => props.position === 'floating' && props.anchorFocused && !!props.anchor)

const anchorRectangle = useAnimationFramePosition(open, () => props.anchor?.getBoundingClientRect())

const style = computed(() => {
  const rectangle = anchorRectangle.value
  const floating = floatingElement.value

  if (!rectangle || !floating) return undefined

  const width = floating.offsetWidth
  const height = floating.offsetHeight

  const left = pickVisibleAxisPosition(rectangle.left, rectangle.right - width, width, window.innerWidth)
  const top = pickVisibleAxisPosition(rectangle.bottom + GAP, rectangle.top - height - GAP, height, window.innerHeight)

  return { top: `${top}px`, left: `${left}px`, minWidth: `${rectangle.right - rectangle.left}px` }
})
</script>
