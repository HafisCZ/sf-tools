<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="props.label || slots.label" :for="id" class="font-bold text-white">
      <slot name="label">{{ props.label }}</slot>
    </label>
    <input
      :id="id"
      v-model="modelValue"
      v-bind="$attrs"
      class="w-full rounded-md border bg-surface px-3 py-2 leading-5 text-white/90 outline-none read-only:caret-transparent placeholder:text-white/40"
      :class="BORDER_CLASSES[validationResult?.[0] ?? 'default']"
      :aria-invalid="validationResult?.[0] === 'error'"
      @keydown="showValidation"
    />
    <SFValidation v-if="validationResult" :type="validationResult[0]" :message="validationResult[1]" />
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import { createDefaultValidator, useValidation, type ValidationProps } from '@utils/validations'
import SFValidation from './SFValidation.vue'

defineOptions({
  name: 'SFInput',
  inheritAttrs: false
})

const props = defineProps<
  ValidationProps<string> & {
    /**
     * Text shown above the field, also its accessible name
     */
    label?: string
    /**
     * Shows an error while the field is empty
     */
    required?: boolean
  }
>()

const modelValue = defineModel<string>({ required: true })

const slots = defineSlots<{
  /**
   * Replaces the label text, for a label that holds more than plain text
   */
  label?(): unknown
}>()

defineExpose({
  get isValid() {
    return isValid.value
  }
})

const BORDER_CLASSES = {
  default: 'border-line focus:not-read-only:border-accent',
  error: 'border-red-400',
  warning: 'border-yellow-400'
}

const id = useId()

const { validationVisible, validationResult, isValid } = useValidation(modelValue, props, createDefaultValidator(props))

function showValidation() {
  validationVisible.value = true
}
</script>
