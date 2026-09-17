<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="font-bold text-white">{{ props.label }}</label>
    <textarea :id="id" v-model="modelValue" v-bind="$attrs" class="w-full resize-none rounded-md border border-line bg-surface px-3 py-2 leading-5 text-white/90 outline-none placeholder:text-white/40 focus:border-accent" />
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'

defineOptions({
  name: 'SFTextarea',
  inheritAttrs: false
})

const props = defineProps<{
  /**
   * Text shown above the field, also its accessible name
   */
  label: string
}>()

const modelValue = defineModel<string>({ required: true })

const id = useId()
</script>
