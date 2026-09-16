<template>
  <svg :viewBox="`0 0 ${definition[0]} ${definition[1]}`" class="inline-block h-[1em] w-auto shrink-0 fill-current" aria-hidden="true">
    <path v-for="(path, index) in paths" :key="index" :d="path" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { ICONS, type IconName } from "@utils/icons"

defineOptions({
  name: "SFIcon"
})

const props = defineProps<{
  /**
   * Icon to draw, one of ICONS in src/utils/icons.ts. It takes the current text colour and is one line of text tall.
   */
  name: IconName
}>()

const definition = computed(() => ICONS[props.name].icon)

const paths = computed(() => {
  const data = definition.value[4]

  return Array.isArray(data) ? data : [data]
})
</script>
