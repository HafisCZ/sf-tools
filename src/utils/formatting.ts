export function formatSpacedNumber(value: number, delimiter = ' ') {
  return String(Math.trunc(value)).replace(/\B(?=(\d{3})+(?!\d))/g, delimiter)
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
