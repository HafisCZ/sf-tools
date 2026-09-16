<template>
  <button
    type="button"
    class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2.5 font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
    :class="[VARIANT_CLASSES[props.variant], { 'w-full': props.block }]"
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
     * Visual style of the button
     */
    variant?: "primary" | "secondary"
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
  secondary: "bg-surface text-white/90 enabled:hover:bg-surface-hover"
}
</script>
