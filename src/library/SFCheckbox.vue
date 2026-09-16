<template>
  <label class="flex cursor-pointer items-center gap-2">
    <input ref="input-ref" v-model="modelValue" type="checkbox" class="size-4 cursor-pointer accent-accent" />
    <slot>{{ props.label }}</slot>
  </label>
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef, watch } from 'vue'

defineOptions({
  name: 'SFCheckbox'
})

const props = defineProps<{
  /**
   * Text next to the checkbox, also its accessible name. The default slot replaces it.
   */
  label?: string
  /**
   * Shows the mixed state, such as a "select all" checkbox with only some items checked
   */
  indeterminate?: boolean
}>()

const modelValue = defineModel<boolean>({ default: false })

const inputElement = useTemplateRef('input-ref')

// Indeterminate only exists as a DOM property, not an attribute
watch(
  () => props.indeterminate,
  (value) => {
    if (inputElement.value) {
      inputElement.value.indeterminate = value
    }
  }
)

onMounted(() => {
  if (inputElement.value) {
    inputElement.value.indeterminate = props.indeterminate
  }
})
</script>
