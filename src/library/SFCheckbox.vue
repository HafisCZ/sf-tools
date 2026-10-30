<template>
  <div class="flex flex-col justify-center gap-1.5">
    <div class="flex items-center gap-2">
      <input :id="id" ref="input-ref" v-model="modelValue" type="checkbox" class="size-4 cursor-pointer accent-accent" :aria-describedby="descriptionId" />
      <label v-if="props.label || slots.default" :for="id" class="flex flex-1 cursor-pointer items-center">
        <slot>{{ props.label }}</slot>
      </label>
    </div>
    <SFParagraph v-if="props.description" :id="descriptionId" type="muted" size="sm">{{ props.description }}</SFParagraph>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, useId, useTemplateRef, watch } from 'vue'
import SFParagraph from './SFParagraph.vue'

defineOptions({
  name: 'SFCheckbox'
})

const props = defineProps<{
  /**
   * Text next to the checkbox, also its accessible name
   */
  label?: string
  /**
   * Smaller grey text shown under the checkbox
   */
  description?: string
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

const descriptionId = computed(() => (props.description ? `${id}-description` : undefined))

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
