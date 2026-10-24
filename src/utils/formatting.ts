import { clamp } from './utils'

export function formatSpacedNumber(value: number, delimiter = ' ') {
  return String(Math.trunc(value)).replace(/\B(?=(\d{3})+(?!\d))/g, delimiter)
}

// Unlike formatSpacedNumber this also counts the minus sign and exponent characters, table output depends on it
export function formatDigitGroups(value: number, delimiter = '&nbsp') {
  return Math.trunc(value)
    .toString()
    .split('')
    .map((character, index, characters) => ((characters.length - 1 - index) % 3 == 2 && index != 0 ? delimiter + character : character))
    .join('')
}

export function formatDate(date: unknown, showDate = true, showTime = true) {
  // Loose on purpose: 0, false and '' all give an empty text
  if (date == '' || date == undefined) {
    return ''
  }

  const value = new Date(clamp(Number(date), 0, 1e15))

  const datePart = showDate ? `${String(value.getDate()).padStart(2, '0')}.${String(value.getMonth() + 1).padStart(2, '0')}.${value.getFullYear()}${showTime ? ' ' : ''}` : ''
  const timePart = showTime ? `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}` : ''

  return datePart + timePart
}

export function parseDate(text: unknown) {
  if (typeof text === 'string') {
    const parts = text.trim().split(/^(\d{2}).(\d{2}).(\d{4}) (\d{2}):(\d{2})$/)

    if (parts.length == 7) {
      const [, day, month, year, hours, minutes] = parts.map((part) => parseInt(part))

      const date = new Date()

      date.setFullYear(year)
      date.setMonth(month - 1)
      date.setDate(day)

      date.setHours(hours)
      date.setMinutes(minutes)

      date.setSeconds(0)
      date.setMilliseconds(0)

      return date.getTime()
    }
  }

  return undefined
}

export function formatPrefix(prefix: string | undefined) {
  if (!prefix) {
    return ''
  }

  const [name, domain] = prefix.split('_')

  return `${name.charAt(0).toUpperCase() + name.slice(1)} .${domain.toUpperCase()}`
}

export function formatDurationClock(value: unknown) {
  if (value == '' || value == undefined) return ''

  const duration = Math.max(0, Number(value))
  const days = Math.trunc(duration / (1000 * 60 * 60 * 24))
  const hours = Math.trunc((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.trunc((duration % (1000 * 60 * 60)) / (1000 * 60))

  return `${String(days).padStart(Math.max(2, days.toString().length), '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

// Largest first
const NUMBER_LABELS: [value: number, label: string][] = [
  [1e123, 'Quadrag'],
  [1e120, 'Noventrig'],
  [1e117, 'Octotrig'],
  [1e114, 'Septentrig'],
  [1e111, 'Sestrig'],
  [1e108, 'Quinquatrig'],
  [1e105, 'Quattuortrig'],
  [1e102, 'Trestrig'],
  [1e99, 'Duotrig'],
  [1e96, 'Untrig'],
  [1e93, 'Trig'],
  [1e90, 'Novemvig'],
  [1e87, 'Octovig'],
  [1e84, 'Septemvig'],
  [1e81, 'Sesvig'],
  [1e78, 'Quinquavig'],
  [1e75, 'Quattuorvig'],
  [1e72, 'Tresvig'],
  [1e69, 'Duovig'],
  [1e66, 'Unvig'],
  [1e63, 'Vig'],
  [1e60, 'Novendec'],
  [1e57, 'Octodec'],
  [1e54, 'Septendec'],
  [1e51, 'Sedec'],
  [1e48, 'Quinquadec'],
  [1e45, 'Quattuordec'],
  [1e42, 'Tredec'],
  [1e39, 'Duodec'],
  [1e36, 'Undec'],
  [1e33, 'Dec'],
  [1e30, 'Non'],
  [1e27, 'Oct'],
  [1e24, 'Sept'],
  [1e21, 'Sex'],
  [1e18, 'Quint'],
  [1e15, 'Quad'],
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M']
]

export function formatNamedNumber(value: number) {
  const sign = value < 0 ? '-' : ''
  const absolute = Math.abs(value)

  if (absolute < NUMBER_LABELS[NUMBER_LABELS.length - 1][0]) {
    return (
      sign +
      absolute
        .toString()
        .split('')
        .map((character, index, characters) => ((characters.length - 1 - index) % 3 === 2 && index !== 0 ? ` ${character}` : character))
        .join('')
    )
  } else if (absolute > NUMBER_LABELS[0][0]) {
    return sign + absolute.toExponential(3).replace('+', '')
  }

  const match = NUMBER_LABELS.find(([unit]) => absolute >= unit)

  if (!match) return ''

  const scaled = absolute / match[0]
  const scaledText = scaled.toString()
  const shown = scaledText.includes('.') && scaledText.split('.')[1].length > 3 ? scaled.toFixed(3) : scaledText

  return `${sign}${shown.split('e')[0]} ${match[1]}`
}
