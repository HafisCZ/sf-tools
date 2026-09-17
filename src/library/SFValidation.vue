<template>
  <div class="flex items-center gap-1.5 text-xs" :class="TYPE_CLASSES[props.type]" role="status" aria-live="polite">
    <SFIcon name="triangle-exclamation" />
    <SFParagraph>{{ props.message }}</SFParagraph>
  </div>
</template>

<script setup lang="ts">
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
}>()

const TYPE_CLASSES = {
  error: 'text-red-400',
  warning: 'text-yellow-400'
}
</script>
