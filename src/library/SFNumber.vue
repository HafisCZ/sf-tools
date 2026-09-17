<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="font-bold text-white">{{ props.label }}</label>
    <input
      :id="id"
      v-model="text"
      type="text"
      :inputmode="allowsDecimals ? 'decimal' : 'numeric'"
      :placeholder="props.placeholder"
      class="w-full rounded-md border bg-surface px-3 py-2 leading-5 text-white/90 outline-none placeholder:text-white/40"
      :class="BORDER_CLASSES[validationResult?.[0] ?? 'default']"
      :aria-invalid="validationResult?.[0] === 'error'"
      @change="clampValue"
      @keydown="handleKeydown"
      @paste="handlePaste"
    />
    <SFValidation v-if="validationResult" :type="validationResult[0]" :message="validationResult[1]" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { createDefaultNumberValidator, useValidation, type ValidationProps } from '@utils/validations'
import SFValidation from './SFValidation.vue'

defineOptions({
  name: 'SFNumber'
})

const props = defineProps<
  ValidationProps<number> & {
    /**
     * Text shown above the field, also its accessible name
     */
    label: string
    /**
     * Shows an error while the field is empty
     */
    required?: boolean
    /**
     * Lowest allowed value. From 0 up, a minus sign can't be typed.
     */
    min?: number
    /**
     * Highest allowed value
     */
    max?: number
    /**
     * How much the arrow keys add or take away, 1 when left out. A whole number also stops a decimal point from being typed.
     */
    step?: number
    /**
     * Text shown while the field is empty
     */
    placeholder?: string
  }
>()

const modelValue = defineModel<number | null>({ required: true })

defineExpose({
  get isValid() {
    return isValid.value
  }
})

const BORDER_CLASSES = {
  default: 'border-line focus:border-accent',
  error: 'border-red-400',
  warning: 'border-yellow-400'
}

const id = useId()

// What the user typed, which can be a number in progress such as `-` or `1.`
const typedText = ref(formatValue(modelValue.value))

const { validationVisible, validationResult, isValid } = useValidation(modelValue, props, createDefaultNumberValidator(props))

const text = computed({
  get: () => typedText.value,
  set: (value) => {
    typedText.value = value
    modelValue.value = parseValue(value)
  }
})

const allowsDecimals = computed(() => props.step === undefined || !Number.isInteger(props.step))

// Decimal places of the step, so stepping by 0.1 gives 0.3 and not 0.30000000000000004
const stepDecimals = computed(() => String(props.step ?? 1).split('.')[1]?.length ?? 0)

watch(modelValue, (value) => {
  if (parseValue(typedText.value) !== value) {
    typedText.value = formatValue(value)
  }
})

function formatValue(value: number | null) {
  return value === null ? '' : String(value)
}

function parseValue(value: string) {
  const number = Number(value)

  return value.trim() === '' || !Number.isFinite(number) ? null : number
}

function clamp(value: number) {
  return Math.min(Math.max(value, props.min ?? -Infinity), props.max ?? Infinity)
}

function clampValue() {
  const value = parseValue(text.value)

  if (value !== null) {
    text.value = formatValue(clamp(value))
  }
}

function stepValue(direction: 1 | -1) {
  const value = (modelValue.value ?? props.min ?? 0) + direction * (props.step ?? 1)

  text.value = formatValue(clamp(Number(value.toFixed(stepDecimals.value))))
}

// Digits, a minus sign at the start when negative values are allowed, and one decimal point when decimals are
function canType(key: string, position: number | null) {
  if (key >= '0' && key <= '9') {
    return true
  } else if (key === '-') {
    return (props.min === undefined || props.min < 0) && position === 0 && !text.value.includes('-')
  } else if (key === '.') {
    return allowsDecimals.value && !text.value.includes('.')
  }

  return false
}

function handleKeydown(event: KeyboardEvent) {
  validationVisible.value = true

  if (event.ctrlKey || event.altKey || event.metaKey || !(event.currentTarget instanceof HTMLInputElement)) return

  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault()

    stepValue(event.key === 'ArrowUp' ? 1 : -1)
  } else if (event.key.length === 1 && !canType(event.key, event.currentTarget.selectionStart)) {
    event.preventDefault()
  }
}

function handlePaste(event: ClipboardEvent) {
  event.preventDefault()

  validationVisible.value = true

  const value = parseValue(event.clipboardData?.getData('text/plain').replace(/\s/g, '') ?? '')

  if (value !== null) {
    text.value = formatValue(allowsDecimals.value ? value : Math.trunc(value))

    clampValue()
  }
}
</script>
