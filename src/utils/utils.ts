import { ref } from 'vue'
import { type ToastParams } from './components'
import { globalLocalize } from './localization'
import { useErrorToast } from './toasts'

type ErrorToastText = Pick<ToastParams, 'title' | 'message'>

/**
 * Message of whatever was thrown: an Error, a legacy SiteAPI rejection (`{ error }`), or anything else
 */
export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  } else if (typeof error === 'object' && error !== null && 'error' in error && typeof error.error === 'string') {
    return error.error
  } else {
    return String(error)
  }
}

/**
 * Runs `onSubmit` for a control the user submits, refusing a second call while one is in flight. Bind `isSubmitting` to the control, `:disabled="isSubmitting ? 'loading' : !isValid"`.
 *
 * @param onSubmit - The submission. Let a failure throw; work that must only happen on success goes at the end.
 * @param onError - Receives what `onSubmit` threw and returns the error toast's title and message. Without it, or when it returns nothing, a generic error toast is shown.
 */
export function useSubmit<TArguments extends unknown[]>(onSubmit: (...args: TArguments) => Promise<void>, onError?: (error: unknown) => ErrorToastText | undefined) {
  const isSubmitting = ref(false)

  async function submit(...args: TArguments) {
    if (isSubmitting.value) return

    isSubmitting.value = true

    try {
      await onSubmit(...args)
    } catch (error) {
      const text = onError?.(error) ?? { title: globalLocalize('dialog.warning.title'), message: getErrorMessage(error) }

      useErrorToast(text.title, text.message)
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    submit,
    isSubmitting
  }
}

/**
 * Sorts `array` in place from the highest to the lowest number that `map` picks, and returns it
 */
export function sortDescending<TItem>(array: TItem[], map: (item: TItem) => number) {
  return array.sort((a, b) => map(b) - map(a))
}

/**
 * Image of a character class, such as `/res/class1.png` for the Warrior
 */
export function getClassImageUrl(classId: CharacterClass) {
  return `/res/class${classId}.png`
}

/**
 * Follows `path` into `value` one key at a time, and stops at the first missing value
 */
export function dig(value: unknown, ...path: string[]) {
  let current = value

  for (let i = 0; current && i < path.length; i++) {
    current = Reflect.get(Object(current), path[i])
  }

  return current
}

/**
 * Adds up `values`, starting from `base`
 */
export function sum(values: number[], base = 0) {
  return values.reduce((total, value) => total + value, base)
}

/**
 * Takes `length` items from `array` starting at `begin`
 */
export function sliceLength<TItem>(array: TItem[], begin: number, length: number) {
  return array.slice(begin, begin + length)
}

/**
 * Leaves out the falsy items of `array`
 */
export function compact<TItem>(array: TItem[]) {
  return array.filter((item): item is Exclude<TItem, false | 0 | '' | null | undefined> => Boolean(item))
}

/**
 * Joins `parts` with commas and the last one with `and`, such as `1 h, 2 m and 3 s`
 */
export function joinSentence(parts: string[]) {
  const last = parts.length > 1 ? ` and ${parts.pop()}` : ''

  return parts.join(', ') + last
}

/**
 * Formats a duration in milliseconds from weeks down to milliseconds, such as `1 h, 2 m and 3 s`, with at most `limit` units
 */
export function formatDuration(milliseconds: number, limit = 4) {
  let remaining = milliseconds

  const millisecondsPart = remaining % 1000
  const seconds = ((remaining -= millisecondsPart) / 1000) % 60
  const minutes = ((remaining -= seconds * 1000) / 60000) % 60
  const hours = ((remaining -= minutes * 60000) / 3600000) % 24
  const days = ((remaining -= hours * 3600000) / 86400000) % 7
  const weeks = (remaining -= days * 86400000) / (7 * 86400000)

  return joinSentence([weeks > 0 ? `${weeks} w` : '', days > 0 ? `${days} d` : '', hours > 0 ? `${hours} h` : '', minutes > 0 ? `${minutes} m` : '', seconds > 0 ? `${seconds} s` : '', millisecondsPart > 0 ? `${millisecondsPart} ms` : ''].filter((part) => part).slice(0, limit))
}
