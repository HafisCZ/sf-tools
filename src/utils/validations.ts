import { computed, ref, type Ref } from 'vue'
import { globalLocalize } from './localization'

export type ValidationResult = [type: 'error' | 'warning', message: string] | null

type Validator<TValue> = (value: TValue | null) => ValidationResult

export type ValidationProps<TValue> = {
  /**
   * Checks what the input's own rules don't. Returns `validationError(message)`, or `null` when the value passes.
   */
  validator?: Validator<TValue>
  /**
   * `merge` checks `validator` first and then the input's own rules, `force` checks only `validator`
   */
  validatorMode?: 'merge' | 'force'
  /**
   * When the message starts showing: after the first key press (`input`, the default) or straight away (`immediate`)
   */
  validationTrigger?: 'input' | 'immediate'
}

export function validationError(message: string): ValidationResult {
  return ['error', message]
}

export function validationWarning(message: string): ValidationResult {
  return ['warning', message]
}

/**
 * Validates an input's value with `props.validator` and the input's own rules. Expose `isValid`, the rest is for display.
 */
export function useValidation<TValue>(value: Readonly<Ref<TValue | null>>, props: ValidationProps<TValue>, defaultValidator: Validator<TValue>) {
  const validationVisible = ref(props.validationTrigger === 'immediate')

  const result = computed(() => {
    const validatorResult = props.validator?.(value.value) ?? null

    return props.validatorMode === 'force' ? validatorResult : (validatorResult ?? defaultValidator(value.value))
  })

  const isValid = computed(() => result.value === null)

  const validationResult = computed(() => (validationVisible.value ? result.value : null))

  return {
    validationVisible,
    validationResult,
    isValid
  }
}

type ValidatedComponent = {
  isValid: boolean
}

/**
 * Whether every input or component behind a control is valid. Pass the template ref of each, they expose `isValid`. A ref inside `v-for` holds a list and every item in it is checked.
 */
export function useComponentValidation(...refs: Readonly<Ref<ValidatedComponent[] | ValidatedComponent | null>>[]) {
  return computed(() =>
    refs.every((ref) => {
      const value = ref.value

      return Array.isArray(value) ? value.every((component) => component.isValid) : (value?.isValid ?? true)
    })
  )
}

/**
 * Rules of an input of any kind of value: `required`, where blank text counts as empty
 */
export function createDefaultValidator<TValue>(props: { required?: boolean }): Validator<TValue> {
  return (value) => {
    const isEmpty = value === null || value === undefined || (typeof value === 'string' && !value.trim())

    if (props.required && isEmpty) {
      return validationError(globalLocalize('validations.empty'))
    }

    return null
  }
}

/**
 * Rules of a number input: `required`, `min` and `max`
 */
export function createDefaultNumberValidator(props: { required?: boolean; min?: number; max?: number }): Validator<number> {
  return (value) => {
    if (value === null) {
      return props.required ? validationError(globalLocalize('validations.empty')) : null
    } else if (props.min !== undefined && value < props.min) {
      return validationError(globalLocalize('validations.number_min', { min: props.min }))
    } else if (props.max !== undefined && value > props.max) {
      return validationError(globalLocalize('validations.number_max', { max: props.max }))
    }

    return null
  }
}
