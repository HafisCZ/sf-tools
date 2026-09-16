<template>
  <button
    type="button"
    class="relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
    :class="[VARIANT_CLASSES[props.variant], props.icon ? ICON_SIZE_CLASSES[props.size] : SIZE_CLASSES[props.size], { 'w-full': props.block }]"
    :disabled="!!props.disabled"
    :aria-busy="loading || undefined"
  >
    <span class="contents" :class="{ invisible: loading }">
      <slot />
    </span>
    <span v-if="loading" class="pointer-events-none absolute inset-0 flex items-center justify-center">
      <SFIcon name="spinner" class="animate-spin" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFIcon from './SFIcon.vue'

defineOptions({
  name: 'SFButton'
})

const props = withDefaults(
  defineProps<{
    /**
     * Visual style of the button, `ghost` has no background until hovered, `outline` only has a light border
     */
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
    /**
     * Padding and text size, `sm` for compact buttons in panels and lists
     */
    size?: 'sm' | 'md'
    /**
     * Uses even padding for a button that only holds an icon or an image
     */
    icon?: boolean
    /**
     * Stretches the button to the full width of its container
     */
    block?: boolean
    /**
     * Disables the button. Pass `'loading'` to also show a spinner over the content
     */
    disabled?: boolean | 'loading'
  }>(),
  {
    variant: 'secondary',
    size: 'md'
  }
)

const VARIANT_CLASSES = {
  primary: 'bg-accent text-black enabled:hover:brightness-110',
  secondary: 'bg-surface text-white/90 enabled:hover:bg-surface-hover',
  ghost: 'text-white/90 enabled:hover:bg-surface-hover',
  outline: 'border border-white/60 text-white/90 enabled:hover:border-white'
}

const SIZE_CLASSES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5'
}

const ICON_SIZE_CLASSES = {
  sm: 'p-1.5 text-xs',
  md: 'p-2'
}

const loading = computed(() => props.disabled === 'loading')
</script>
