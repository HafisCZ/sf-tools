<template>
  <button
    type="button"
    class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
    :class="[VARIANT_CLASSES[props.variant], props.icon ? 'p-2' : 'px-4 py-2.5', { 'w-full': props.block }]"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
defineOptions({
  name: "SFButton"
})

const props = withDefaults(
  defineProps<{
    /**
     * Visual style of the button, `ghost` has no background until hovered
     */
    variant?: "primary" | "secondary" | "ghost"
    /**
     * Uses even padding for a button that only holds an icon or an image
     */
    icon?: boolean
    /**
     * Stretches the button to the full width of its container
     */
    block?: boolean
  }>(),
  {
    variant: "secondary"
  }
)

const VARIANT_CLASSES = {
  primary: "bg-accent text-black enabled:hover:brightness-110",
  secondary: "bg-surface text-white/90 enabled:hover:bg-surface-hover",
  ghost: "text-white/90 enabled:hover:bg-surface-hover"
}
</script>
