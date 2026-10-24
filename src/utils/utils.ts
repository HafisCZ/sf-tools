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

export function getClassImageUrl(classId: CharacterClass): `/${string}` {
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

export function copyText(text: string) {
  return navigator.clipboard.writeText(text)
}

export function clamp(value: number, min: number, max: number) {
  return value <= min ? min : value >= max ? max : value
}

export function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

// Falsy values give an empty array
export function toArray<TItem>(value: TItem | TItem[] | null | undefined): TItem[] {
  if (value) {
    return Array.isArray(value) ? value : [value]
  } else {
    return []
  }
}

export function pushUnique<TItem>(array: TItem[], item: TItem) {
  if (array.indexOf(item) === -1) {
    array.push(item)
  }
}

export function removeItem<TItem>(array: TItem[] | undefined, item: TItem) {
  if (array) {
    const index = array.indexOf(item)

    if (index > -1) {
      array.splice(index, 1)
    }
  }
}

export function filterInPlace<TItem>(array: TItem[], predicate: (item: TItem) => boolean) {
  let readIndex = 0
  let writeIndex = 0

  while (readIndex < array.length) {
    if (predicate(array[readIndex])) {
      array[writeIndex] = array[readIndex]
      writeIndex++
    }

    readIndex++
  }

  array.length = writeIndex
}

export function countWhere<TItem>(items: Iterable<TItem>, predicate: (item: TItem) => boolean) {
  let count = 0

  for (const item of items) {
    if (predicate(item)) count++
  }

  return count
}

export function isBetween(value: number, min: number, max: number) {
  return value > min && value < max
}

export function getTimestampOffset(date = new Date()) {
  return date.getTimezoneOffset() * 60 * 1000
}

export function unique<TItem>(items: Iterable<TItem>) {
  return Array.from(new Set(items))
}

export function toRecord<TItem, TValue>(items: TItem[], processor: (item: TItem, index: number) => [PropertyKey, TValue], base: Record<PropertyKey, TValue> = {}) {
  return items.reduce((record, item, index) => {
    const [key, value] = processor(item, index)
    record[key] = value
    return record
  }, base)
}

export function invertRecord(record: Record<string, string>, integerKeys = false) {
  return Object.entries(record).reduce<Record<string, string | number>>((inverted, [key, value]) => {
    inverted[value] = integerKeys ? parseInt(key) : key
    return inverted
  }, {})
}

// Null throws like the legacy helper did
export function isEmpty(value: unknown) {
  if (value instanceof Set) {
    return value.size == 0
  } else if (value instanceof Array) {
    return value.length == 0
  } else if (typeof value === 'string') {
    return value.length == 0
  } else if (typeof value === 'undefined') {
    return true
  } else {
    return Object.keys(value as object).length == 0
  }
}

export function fixedSlice<TItem, TDefault>(array: TItem[], length: number, defaultValue: TDefault) {
  const slice = Array.from<TItem | TDefault>({ length }).fill(defaultValue)

  for (let i = 0; i < Math.min(length, array.length); i++) {
    slice[i] = array[i]
  }

  return slice
}

export function joinMapped<TItem>(array: TItem[], mapper: (item: TItem, index: number, array: TItem[]) => string) {
  let text = ''

  for (let i = 0; i < array.length; i++) {
    text += mapper(array[i], i, array)
  }

  return text
}

export function maximum(values: number[]) {
  let result = values[0]

  for (const value of values) {
    if (value > result) result = value
  }

  return result
}

export function minimum(values: number[]) {
  let result = values[0]

  for (const value of values) {
    if (value < result) result = value
  }

  return result
}

export function average(values: number[]) {
  let total = 0

  for (const value of values) {
    total += value
  }

  return total / values.length
}

export function pick<TObject extends object, TKey extends keyof TObject>(object: TObject, fields: TKey[]) {
  const value = Object.create(null) as Pick<TObject, TKey>

  for (const field of fields) {
    if (field in object) {
      value[field] = object[field]
    }
  }

  return value
}

export function truncate(text: string, length: number, ellipsis = '...') {
  if (text.length > length) {
    return text.slice(0, length - ellipsis.length) + ellipsis
  } else {
    return text
  }
}

export function arrayFromIndexes<TValue>(indexes: number[], processor: (index: number, position: number) => TValue, base: TValue[] = []) {
  return indexes.reduce((array, index, position) => {
    array[index] = processor(index, position)
    return array
  }, base)
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
