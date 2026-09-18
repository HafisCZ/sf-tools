<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="props.label" :for="id" class="font-bold text-white">{{ props.label }}</label>
    <div class="relative">
      <input
        :id="id"
        v-model="modelValue"
        v-bind="$attrs"
        type="text"
        spellcheck="false"
        autocomplete="off"
        class="w-full rounded-md border bg-surface px-3 py-2 font-mono leading-5 text-transparent caret-white/60 outline-none placeholder:text-white/40"
        :class="BORDER_CLASSES[validationResult?.[0] ?? 'default']"
        :aria-invalid="validationResult?.[0] === 'error'"
        @keydown="showValidation"
        @scroll="updateScroll"
      />
      <div aria-hidden="true" class="expression-text pointer-events-none absolute inset-0 overflow-hidden border border-transparent px-3 py-2 font-mono leading-5 whitespace-pre text-white">
        <div :style="{ transform: `translateX(${-scrollLeft}px)` }" v-html="highlightedText" />
      </div>
    </div>
    <SFValidation v-if="validationResult" :type="validationResult[0]" :message="validationResult[1]" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { createDefaultValidator, useValidation, type ValidationProps } from '@utils/validations'
import SFValidation from './SFValidation.vue'

defineOptions({
  name: 'SFExpressionInput',
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
    /**
     * Turns the value into the highlighted HTML shown over the field
     */
    highlight: (value: string) => string
  }
>()

const modelValue = defineModel<string>({ required: true })

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

const scrollLeft = ref(0)

const { validationVisible, validationResult, isValid } = useValidation(modelValue, props, createDefaultValidator(props))

const highlightedText = computed(() => props.highlight(modelValue.value))

function showValidation() {
  validationVisible.value = true
}

function updateScroll(event: Event) {
  if (event.target instanceof HTMLInputElement) {
    scrollLeft.value = event.target.scrollLeft
  }
}
</script>
