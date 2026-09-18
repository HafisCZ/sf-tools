import { clamp } from './utils'

export const COLOR_MAP = new Map(
  Object.entries({
    aliceblue: '#f0f8ff',
    antiquewhite: '#faebd7',
    aqua: '#00ffff',
    aquamarine: '#7fffd4',
    azure: '#f0ffff',
    beige: '#f5f5dc',
    bisque: '#ffe4c4',
    black: '#000000',
    blanchedalmond: '#ffebcd',
    blue: '#0000ff',
    blueviolet: '#8a2be2',
    brown: '#a52a2a',
    burlywood: '#deb887',
    cadetblue: '#5f9ea0',
    chartreuse: '#7fff00',
    chocolate: '#d2691e',
    coral: '#ff7f50',
    cornflowerblue: '#6495ed',
    cornsilk: '#fff8dc',
    crimson: '#dc143c',
    cyan: '#00ffff',
    darkblue: '#00008b',
    darkcyan: '#008b8b',
    darkgoldenrod: '#b8860b',
    darkgray: '#a9a9a9',
    darkgreen: '#006400',
    darkkhaki: '#bdb76b',
    darkmagenta: '#8b008b',
    darkolivegreen: '#556b2f',
    darkorange: '#ff8c00',
    darkorchid: '#9932cc',
    darkred: '#8b0000',
    darksalmon: '#e9967a',
    darkseagreen: '#8fbc8f',
    darkslateblue: '#483d8b',
    darkslategray: '#2f4f4f',
    darkturquoise: '#00ced1',
    darkviolet: '#9400d3',
    deeppink: '#ff1493',
    deepskyblue: '#00bfff',
    dimgray: '#696969',
    dodgerblue: '#1e90ff',
    firebrick: '#b22222',
    floralwhite: '#fffaf0',
    forestgreen: '#228b22',
    fuchsia: '#ff00ff',
    gainsboro: '#dcdcdc',
    ghostwhite: '#f8f8ff',
    gold: '#ffd700',
    goldenrod: '#daa520',
    gray: '#808080',
    green: '#008000',
    greenyellow: '#adff2f',
    honeydew: '#f0fff0',
    hotpink: '#ff69b4',
    'indianred ': '#cd5c5c',
    indigo: '#4b0082',
    ivory: '#fffff0',
    khaki: '#f0e68c',
    lavender: '#e6e6fa',
    lavenderblush: '#fff0f5',
    lawngreen: '#7cfc00',
    lemonchiffon: '#fffacd',
    lightblue: '#add8e6',
    lightcoral: '#f08080',
    lightcyan: '#e0ffff',
    lightgoldenrodyellow: '#fafad2',
    lightgrey: '#d3d3d3',
    lightgreen: '#90ee90',
    lightpink: '#ffb6c1',
    lightsalmon: '#ffa07a',
    lightseagreen: '#20b2aa',
    lightskyblue: '#87cefa',
    lightslategray: '#778899',
    lightsteelblue: '#b0c4de',
    lightyellow: '#ffffe0',
    lime: '#00ff00',
    limegreen: '#32cd32',
    linen: '#faf0e6',
    magenta: '#ff00ff',
    maroon: '#800000',
    mediumaquamarine: '#66cdaa',
    mediumblue: '#0000cd',
    mediumorchid: '#ba55d3',
    mediumpurple: '#9370d8',
    mediumseagreen: '#3cb371',
    mediumslateblue: '#7b68ee',
    mediumspringgreen: '#00fa9a',
    mediumturquoise: '#48d1cc',
    mediumvioletred: '#c71585',
    midnightblue: '#191970',
    mintcream: '#f5fffa',
    mistyrose: '#ffe4e1',
    moccasin: '#ffe4b5',
    navajowhite: '#ffdead',
    navy: '#000080',
    oldlace: '#fdf5e6',
    olive: '#808000',
    olivedrab: '#6b8e23',
    orange: '#ffa500',
    orangered: '#ff4500',
    orchid: '#da70d6',
    palegoldenrod: '#eee8aa',
    palegreen: '#98fb98',
    paleturquoise: '#afeeee',
    palevioletred: '#d87093',
    papayawhip: '#ffefd5',
    peachpuff: '#ffdab9',
    peru: '#cd853f',
    pink: '#ffc0cb',
    plum: '#dda0dd',
    powderblue: '#b0e0e6',
    purple: '#800080',
    rebeccapurple: '#663399',
    red: '#ff0000',
    rosybrown: '#bc8f8f',
    royalblue: '#4169e1',
    saddlebrown: '#8b4513',
    salmon: '#fa8072',
    sandybrown: '#f4a460',
    seagreen: '#2e8b57',
    seashell: '#fff5ee',
    sienna: '#a0522d',
    silver: '#c0c0c0',
    skyblue: '#87ceeb',
    slateblue: '#6a5acd',
    slategray: '#708090',
    snow: '#fffafa',
    springgreen: '#00ff7f',
    steelblue: '#4682b4',
    tan: '#d2b48c',
    teal: '#008080',
    thistle: '#d8bfd8',
    tomato: '#ff6347',
    turquoise: '#40e0d0',
    violet: '#ee82ee',
    wheat: '#f5deb3',
    white: '#ffffff',
    whitesmoke: '#f5f5f5',
    yellow: '#ffff00',
    yellowgreen: '#9acd32'
  })
)

const PARSE_COLOR_CACHE = new Map<string | undefined, string>()
const COLOR_FROM_NAME_CACHE = new Map<unknown, string>()
const CSS_COLOR_CACHE = new Map<unknown, string>()
const CSS_BACKGROUND_CACHE = new Map<unknown, string>()
const CSS_COLOR_FROM_BACKGROUND_CACHE = new Map<string, string>()

export function rgbaToHex(rgba: string[]) {
  return `#${rgba.map((channel) => Number(channel).toString(16).padStart(2, '0')).join('')}`
}

export function parseColor(name: string | undefined) {
  const cached = PARSE_COLOR_CACHE.get(name)
  if (cached !== undefined) return cached

  const style = new Option().style
  style.color = String(name)

  let color = style.color
  if (color.startsWith('rgba')) {
    color = rgbaToHex(color.slice(5, -1).split(','))
  } else if (color.startsWith('rgb')) {
    color = rgbaToHex(color.slice(4, -1).split(','))
  } else {
    color = COLOR_MAP.get(color) ?? ''
  }

  PARSE_COLOR_CACHE.set(name, color)

  return color
}

export function invertColor(value: string, mono = false) {
  let color = value.indexOf('#') === 0 ? value.slice(1) : value

  if (color.length === 3 || color.length === 4) {
    color = `${color[0]}${color[0]}${color[1]}${color[1]}${color[2]}${color[2]}${color[3] || ''}${color[3] || ''}`
  }

  let alpha = ''
  if (color.length === 8) {
    alpha = color.slice(6, 8)
    color = color.slice(0, 6)
  }

  if (color.length === 6) {
    const r = parseInt(color.slice(0, 2), 16)
    const g = parseInt(color.slice(2, 4), 16)
    const b = parseInt(color.slice(4, 6), 16)

    if (mono) {
      return `${r * 0.299 + g * 0.587 + b * 0.114 > 186 ? '#000000' : '#FFFFFF'}${alpha}`
    } else {
      return `#${(255 - r).toString(16).padStart(2, '0')}${(255 - g).toString(16).padStart(2, '0')}${(255 - b).toString(16).padStart(2, '0')}${alpha}`
    }
  } else {
    return ''
  }
}

export function getColorFromRGBA(r: unknown, g: unknown, b: unknown, a?: unknown) {
  const hr = Math.trunc(clamp(Number(r), 0, 255)).toString(16)
  const hg = Math.trunc(clamp(Number(g), 0, 255)).toString(16)
  const hb = Math.trunc(clamp(Number(b), 0, 255)).toString(16)
  const ha = isNaN(Number(a)) ? 'ff' : Math.trunc(clamp(Number(a), 0, 1) * 255).toString(16)

  // repeat() throws on a NaN channel, like the legacy code did
  return `#${'0'.repeat(2 - hr.length)}${hr}${'0'.repeat(2 - hg.length)}${hg}${'0'.repeat(2 - hb.length)}${hb}${'0'.repeat(2 - ha.length)}${ha}`
}

export function getColorFromHSLA(h: unknown, s: unknown, l: unknown, a?: unknown) {
  let r: number
  let g: number
  let b: number

  const hue = clamp(parseInt(String(h)), 0, 360) / 360
  const saturation = clamp(parseInt(String(s)), 0, 100) / 100
  const lightness = clamp(parseInt(String(l)), 0, 100) / 100

  if (saturation == 0) {
    r = g = b = lightness
  } else {
    const hueToRgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation
    const p = 2 * lightness - q
    r = hueToRgb(p, q, hue + 1 / 3)
    g = hueToRgb(p, q, hue)
    b = hueToRgb(p, q, hue - 1 / 3)
  }

  return getColorFromRGBA(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), a)
}

export function toCSSColor(color: string) {
  const style = new Option().style
  style.color = color
  return style.color
}

function computeCSSColor(color: unknown) {
  const mapped = typeof color === 'string' ? COLOR_MAP.get(color) : undefined
  const text = String(color)

  if (mapped !== undefined) {
    return toCSSColor(mapped)
  } else if (/^#([\da-fA-F]{8}|[\da-fA-F]{6}|[\da-fA-F]{3,4})$/.test(text)) {
    return toCSSColor(text)
  } else if (/^[\\]+?#([\da-fA-F]{8}|[\da-fA-F]{6}|[\da-fA-F]{3,4})$/.test(text)) {
    return toCSSColor(text.substring(text.lastIndexOf('#')))
  } else if (/^([\da-fA-F]{8}|[\da-fA-F]{6}|[\da-fA-F]{3,4})$/.test(text)) {
    return toCSSColor(`#${text}`)
  } else if (/^rgba?\(\d{1,3}(, \d{1,3}){2,3}\)$/.test(text)) {
    const [r, g, b, a] = text
      .slice(text.indexOf('(') + 1, text.lastIndexOf(')'))
      .split(',')
      .map((part) => part.trim())

    return getColorFromRGBA(r, g, b, a)
  } else {
    return ''
  }
}

export function getCSSColor(name: unknown) {
  const cached = CSS_COLOR_CACHE.get(name)
  if (cached !== undefined) return cached

  const color = computeCSSColor(name)

  CSS_COLOR_CACHE.set(name, color)

  return color
}

function computeColorFromName(name: unknown) {
  const mapped = typeof name === 'string' ? COLOR_MAP.get(name) : undefined

  if (mapped !== undefined) {
    return mapped
  }

  const css = getCSSColor(name)
  if (css == '') {
    return '#00000000'
  } else if (css.startsWith('rgba')) {
    const parts = css.split(/^rgba\((.*), (.*), (.*), (.*)\)$/g)

    return getColorFromRGBA(Number(parts[1]), Number(parts[2]), Number(parts[3]), Number(parts[4]))
  } else if (css.startsWith('rgb')) {
    const parts = css.split(/^rgb\((.*), (.*), (.*)\)$/g)

    return getColorFromRGBA(Number(parts[1]), Number(parts[2]), Number(parts[3]), 1)
  } else {
    return String(name)
  }
}

export function getColorFromName(name: unknown) {
  const cached = COLOR_FROM_NAME_CACHE.get(name)
  if (cached !== undefined) return cached

  const color = computeColorFromName(name)

  COLOR_FROM_NAME_CACHE.set(name, color)

  return color
}

export function getColorFromGradient(from: unknown, to: unknown, value: unknown) {
  const a = getColorFromName(from)
  const b = getColorFromName(to)

  let color = '#'

  const offsetA = a.startsWith('#') ? 1 : 0
  const offsetB = b.startsWith('#') ? 1 : 0

  let sample = Number(value)
  if (isNaN(sample) || sample > 1) sample = 1.0
  else if (sample < 0) sample = 0.0

  const colorA = a.length < 8 ? `${a}ff` : a
  const colorB = b.length < 8 ? `${b}ff` : b

  for (let i = 0; i < 7; i += 2) {
    const sampleA = parseInt(colorA.substring(i + offsetA, i + offsetA + 2), 16)
    const sampleB = parseInt(colorB.substring(i + offsetB, i + offsetB + 2), 16)
    const mixed = Math.floor(sampleA * (1 - sample) + sampleB * sample).toString(16)

    color += '0'.repeat(2 - mixed.length) + mixed
  }

  return color
}

export function getColorFromGradientObject(object: object, value: unknown) {
  const stops: [number, unknown][] = Object.entries(object).map(([position, color]: [string, unknown]) => [Number(position), color])
  stops.sort((a, b) => a[0] - b[0])

  let sample = Number(value)
  if (sample < stops[0][0]) sample = stops[0][0]
  else if (sample > stops[stops.length - 1][0]) sample = stops[stops.length - 1][0]

  for (let i = 0; i < stops.length - 1; i++) {
    if (sample <= stops[i + 1][0]) {
      return getColorFromGradient(stops[i][1], stops[i + 1][1], (sample - stops[i][0]) / (stops[i + 1][0] - stops[i][0]))
    }
  }

  return ''
}

function computeCSSBackground(color: unknown) {
  const css = getCSSColor(color)

  if (css) {
    return css
  } else if (color != undefined) {
    const style = new Option().style
    style.background = String(color)
    return style.background
  } else {
    return ''
  }
}

export function getCSSBackground(name: unknown) {
  const cached = CSS_BACKGROUND_CACHE.get(name)
  if (cached !== undefined) return cached

  const color = computeCSSBackground(name)

  CSS_BACKGROUND_CACHE.set(name, color)

  return color
}

export function getCSSColorFromBackground(name: string) {
  const cached = CSS_COLOR_FROM_BACKGROUND_CACHE.get(name)
  if (cached !== undefined) return cached

  const style = new Option().style
  style.background = name

  const color = style.backgroundColor

  CSS_COLOR_FROM_BACKGROUND_CACHE.set(name, color)

  return color
}

export function getCSSFont(value: string) {
  const style = new Option().style
  style.font = value
  if (style.font == '') {
    style.font = `${value} Roboto`
  }

  return style.font
}

function hashCode(text: string) {
  let hash = 0

  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash
  }

  return hash
}

export function stringToColor(text: string) {
  return `hsl(${(hashCode(text) * 113) % 360}, 100%, 30%)`
}
