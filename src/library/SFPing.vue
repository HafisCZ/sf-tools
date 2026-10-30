<template>
  <span :class="COLOR_CLASSES[props.color]" aria-hidden="true">&bull;</span>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SFPing'
})

const props = defineProps<{
  /**
   * Colour of the dot
   */
  color: 'blue' | 'red' | 'green' | 'accent'
}>()

const COLOR_CLASSES = {
  blue: 'text-[color:lightblue]',
  red: 'text-[color:crimson]',
  green: 'text-[color:green]',
  accent: 'text-accent'
}
</script>
