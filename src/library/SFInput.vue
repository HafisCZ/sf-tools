<template>
  <label class="flex flex-col gap-1.5">
    <span class="font-bold text-white">{{ props.label }}</span>
    <input v-model="modelValue" v-bind="$attrs" class="w-full rounded-md border border-line bg-surface px-3 py-2 leading-5 text-white/90 outline-none placeholder:text-white/40 focus:border-accent" />
  </label>
</template>

<script setup lang="ts">
defineOptions({
  name: "SFInput",
  inheritAttrs: false
})

const props = defineProps<{
  /**
   * Text shown above the field, also its accessible name
   */
  label: string
}>()

const modelValue = defineModel<string>({ required: true })
</script>
