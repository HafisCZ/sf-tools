<template>
  <div class="flex items-center gap-2">
    <input :id="id" ref="input-ref" v-model="modelValue" type="checkbox" class="size-4 cursor-pointer accent-accent" />
    <label v-if="props.label || slots.default" :for="id" class="flex flex-1 cursor-pointer items-center">
      <slot>{{ props.label }}</slot>
    </label>
  </div>
</template>

<script setup lang="ts">
import { onMounted, useId, useTemplateRef, watch } from 'vue'

defineOptions({
  name: 'SFCheckbox'
})

const props = defineProps<{
  /**
   * Text next to the checkbox, also its accessible name
   */
  label?: string
  /**
   * Shows the mixed state
   */
  indeterminate?: boolean
}>()

const slots = defineSlots<{
  default?(): unknown
}>()

const modelValue = defineModel<boolean>({ default: false })

defineExpose({
  get isValid() {
    return true
  }
})

const id = useId()

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
