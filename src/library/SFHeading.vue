<template>
  <component :is="`h${props.level}`" :class="[LEVEL_CLASSES[props.level], TYPE_CLASSES[props.type ?? 'default']]">
    <slot />
  </component>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SFHeading'
})

const props = defineProps<{
  /**
   * Heading level, 1 renders an h1. Also sets the size.
   */
  level: 1 | 2 | 3 | 4 | 5 | 6 | '1' | '2' | '3' | '4' | '5' | '6'
  /**
   * Colour variant. Omit for white, `inherit` keeps the surrounding text colour.
   */
  type?: 'muted' | 'accent' | 'inherit'
}>()

// Lato is loaded in 400 and 700 only, so every level is bold
const LEVEL_CLASSES = {
  1: 'text-4xl font-bold',
  2: 'text-3xl font-bold',
  3: 'text-2xl font-bold',
  4: 'text-xl font-bold',
  5: 'text-lg font-bold',
  6: 'text-sm font-bold'
}

const TYPE_CLASSES = {
  default: 'text-white',
  muted: 'text-white/60',
  accent: 'text-accent',
  inherit: ''
}
</script>
