<template>
  <p :class="[props.type && TYPE_CLASSES[props.type], props.size && SIZE_CLASSES[props.size]]">
    <slot />
  </p>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SFParagraph'
})

const props = defineProps<{
  /**
   * Colour variant. Omit to keep the surrounding text colour.
   */
  type?: 'muted' | 'accent'
  /**
   * Text size. Omit to keep the surrounding text size.
   */
  size?: 'sm' | 'lg'
}>()

const TYPE_CLASSES = {
  muted: 'text-white/60',
  accent: 'text-accent'
}

const SIZE_CLASSES = {
  sm: 'text-xs',
  lg: 'text-lg'
}
</script>
