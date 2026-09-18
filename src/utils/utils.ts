import { ref } from 'vue'
import { type ToastParams } from './components'
import { globalLocalize } from './localization'
import { useErrorToast } from './toasts'

type ErrorToastText = Pick<ToastParams, 'title' | 'message'>

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  } else if (typeof error === 'object' && error !== null && 'error' in error && typeof error.error === 'string') {
    return error.error
  } else {
    return String(error)
  }
}

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

// Sorts `array` in place
export function sortDescending<TItem>(array: TItem[], map: (item: TItem) => number) {
  return array.sort((a, b) => map(b) - map(a))
}

export function getClassImageUrl(classId: CharacterClass) {
  return `/res/class${classId}.png`
}

export function dig(value: unknown, ...path: string[]) {
  let current = value

  for (let i = 0; current && i < path.length; i++) {
    current = (current as Record<string, unknown>)[path[i]]
  }

  return current
}

export function sum(values: number[], base = 0) {
  return values.reduce((total, value) => total + value, base)
}

export function sliceLength<TItem>(array: TItem[], begin: number, length: number) {
  return array.slice(begin, begin + length)
}

// Drops the last chunk when it is shorter than `size`
export function chunk<TItem>(array: TItem[], size: number) {
  return sequence(Math.floor(array.length / size)).map((index) => sliceLength(array, index * size, size))
}

export function flattenObject(object: object, path: string[] = []): Record<string, unknown> {
  return Object.fromEntries(Object.entries(object).flatMap(([key, value]: [string, unknown]) => (typeof value === 'object' && value !== null ? Object.entries(flattenObject(value, [...path, key])) : [[[...path, key].join('.'), value]])))
}

export function compact<TItem>(array: TItem[]) {
  return array.filter((item): item is Exclude<TItem, false | 0 | '' | null | undefined> => Boolean(item))
}

export function joinSentence(parts: string[]) {
  const last = parts.length > 1 ? ` and ${parts.pop()}` : ''

  return parts.join(', ') + last
}

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

export function getValueAtPath(object: unknown, path: string) {
  if (!object) return undefined

  let current: unknown = object

  for (const key of path.split('.')) {
    current = (current as Record<string, unknown>)[key]

    if (current === undefined || current === null) {
      return undefined
    }
  }

  return current
}

export function setValueAtPath(object: object, path: string, value: unknown) {
  const keys = path.split('.')
  const lastKey = keys.pop() ?? ''

  let current = object as Record<string, unknown>

  for (const key of keys) {
    let next = current[key]

    if (next === undefined || next === null) {
      next = {}

      current[key] = next
    }

    // Boxed so a path through a primitive is dropped instead of throwing
    current = Object(next) as Record<string, unknown>
  }

  current[lastKey] = value
}

export function scaleValue(value: number, from: number, to: number) {
  return Math.ceil((value / from) * to)
}

export function sequence(length: number, base = 0) {
  return Array.from({ length }, (_, index) => index + base)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function mergeDeep(target: Record<string, unknown>, source: unknown) {
  const output = { ...target }

  if (isPlainObject(source)) {
    for (const [key, value] of Object.entries(source)) {
      if (isPlainObject(value)) {
        const targetValue = target[key]

        output[key] = mergeDeep(isPlainObject(targetValue) ? targetValue : {}, value)
      } else {
        output[key] = value
      }
    }
  }

  return output
}

export function copyJson(value: unknown) {
  return navigator.clipboard.writeText(JSON.stringify(value))
}

export function copyElement(element: Node) {
  const range = document.createRange()
  range.selectNode(element)

  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)

  document.execCommand('copy')

  selection?.removeAllRanges()
}
