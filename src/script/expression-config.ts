import { getColorFromGradient, getColorFromGradientObject, getColorFromHSLA, getColorFromRGBA, getCSSColor } from '@utils/colors'
import { formatDate, formatDigitGroups, formatDurationClock, formatNamedNumber } from '@utils/formatting'
import { globalLocalize } from '@utils/localization'
import { arrayFromIndexes, getClassImageUrl, maximum, minimum, sequence, sum, toArray, truncate } from '@utils/utils'
import { type ItemModel } from '~/core/models/item'
import { PlayerModel, type PlayerPotion } from '~/core/models/player'
import { ModelUtils } from '~/core/models/utils'
import { DatabaseManager } from '~/data/database-manager'
import { Calculations } from '~/playa/calculations'
import { Playa } from '~/playa/servers'
import { type ValueFormatter } from './commands'
import { type Expression, type ExpressionNode, type ExpressionNodeObject, type ExpressionScope, type SegmentedArray } from './expression'
import { wrapFields } from './fields'
import { type ScriptContainer, type ScriptEntity } from './script'
import { CellGenerator } from './table'

type ExpressionEntryNode = {
  key: ExpressionNode
  val: ExpressionNode
}

type ScopeFunction = (self: Expression, scope: ExpressionScope, node: ExpressionNodeObject) => unknown

export type HeaderMapping = {
  expr: (p: ScriptEntity) => unknown
  format?: string | ValueFormatter
  order?: (p: ScriptEntity) => unknown
  difference?: boolean
  differenceFormat?: boolean
  statistics?: boolean
  width?: number
  flip?: boolean
  decimal?: boolean
  visible?: boolean
  grouped?: number
  nameOverride?: string
  disabled?: boolean
  decorators?: {
    condition: (header: ScriptContainer) => unknown
    apply: (header: ScriptContainer) => void
  }[]
}

type ExpressionConfigFlags = {
  syntax?: string
  isInternal?: boolean
  noCache?: boolean
  isComputed?: boolean
  isDeprecated?: string
}

export type ExpressionConfigEntry = Omit<ExpressionConfigFlags, 'syntax'> & {
  type: string
  meta: string
  data: unknown
  syntax: {
    text: string
    fieldText: string
  }
  _value?: unknown
}

export class ExpressionConfig {
  #data: Map<string, ExpressionConfigEntry>

  constructor(data?: Map<string, ExpressionConfigEntry>) {
    this.#data = new Map(data)
  }

  clone() {
    return new ExpressionConfig(this.#data)
  }

  register(type: 'header', meta: string, name: string, data: HeaderMapping, flags?: ExpressionConfigFlags): void
  register(type: 'accessor', meta: string, name: string, data: (object: never, player: ScriptEntity | undefined) => unknown, flags?: ExpressionConfigFlags): void
  register(type: 'variable', meta: string, name: string, data: (scope: ExpressionScope) => unknown, flags?: ExpressionConfigFlags): void
  register(type: 'enumeration', meta: string, name: string, data: () => unknown, flags?: ExpressionConfigFlags): void
  register(type: 'function', meta: 'scope', name: string, data: ScopeFunction, flags?: ExpressionConfigFlags): void
  register(type: 'function', meta: 'array' | 'math' | 'value', name: string, data: (...args: never[]) => unknown, flags?: ExpressionConfigFlags): void
  register(type: string, meta: string, name: string, data: unknown, flags: ExpressionConfigFlags = {}) {
    const syntax = flags.syntax || name

    const entry: ExpressionConfigEntry = Object.assign(flags, {
      type,
      meta,
      data,
      syntax: {
        text: syntax,
        fieldText: wrapFields(syntax)
      }
    })

    this.#data.set(
      name,
      new Proxy(entry, {
        get: function (target, prop: keyof ExpressionConfigEntry) {
          if (prop === 'data' && flags.isComputed) {
            return (target._value ||= (target.data as () => unknown)())
          } else {
            return target[prop]
          }
        }
      })
    )
  }

  get(name: unknown) {
    return this.#data.get(name as string)
  }

  find(name: string, type: 'header', meta?: string | true): (ExpressionConfigEntry & { data: HeaderMapping }) | undefined
  find(name: string, type: string, meta?: string | true): ExpressionConfigEntry | undefined
  find(name: string, type: string, meta: string | true = true) {
    const data = this.#data.get(name)
    if (data && data.type === type && (meta === true || data.meta === meta)) {
      return data
    }

    return undefined
  }

  has(name: unknown) {
    return this.#data.has(name as string)
  }

  all(type: string, meta: string | true = true) {
    const keys: string[] = []
    for (const [name, data] of this.#data.entries()) {
      if (data.type === type && (meta === true || data.meta === meta) && !data.isInternal) {
        keys.push(name)
      }
    }

    return keys
  }

  entries() {
    return this.#data.entries()
  }
}

export const DEFAULT_EXPRESSION_CONFIG = new ExpressionConfig()

/*
  Math functions
*/
DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'math',
  '__multiply',
  function (a: number, b: number) {
    return a * b
  },
  { isInternal: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'math',
  '__divide',
  function (a: number, b: number) {
    return b == 0 ? undefined : a / b
  },
  { isInternal: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'math',
  '__divide_integer',
  function (a: number, b: number) {
    return b == 0 ? undefined : Math.trunc(a / b)
  },
  { isInternal: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'math',
  '__add',
  function (a: number, b: number) {
    return a + b
  },
  { isInternal: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'math',
  '__subtract',
  function (a: number, b: number) {
    return a - b
  },
  { isInternal: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'math',
  '__greater',
  function (a: number, b: number) {
    return a > b
  },
  { isInternal: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'math',
  '__greater_equal',
  function (a: number, b: number) {
    return a >= b
  },
  { isInternal: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'math',
  '__lower',
  function (a: number, b: number) {
    return a < b
  },
  { isInternal: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'math',
  '__lower_equal',
  function (a: number, b: number) {
    return a <= b
  },
  { isInternal: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'math',
  '__power',
  function (a: number, b: number) {
    return Math.pow(a, b)
  },
  { isInternal: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'math',
  '__equal',
  function (a: unknown, b: unknown) {
    return a == b
  },
  { isInternal: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'math',
  '__not_equal',
  function (a: unknown, b: unknown) {
    return a != b
  },
  { isInternal: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'math',
  '__like',
  function (a: unknown, b: unknown) {
    if (typeof a !== 'string') return undefined

    try {
      return new RegExp(String(b), 'ig').test(a)
    } catch {
      return undefined
    }
  },
  { isInternal: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'math',
  '__modulo',
  function (a: number, b: number) {
    return a % b
  },
  { isInternal: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'math',
  '__negate',
  function (a: number) {
    return -a
  },
  { isInternal: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'math',
  '__invert',
  function (a: unknown) {
    return !a
  },
  { isInternal: true }
)

/*
  Scope functions
*/
DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'scope',
  '__array',
  function (self, scope, node) {
    const obj: unknown[] = []

    for (const { key, val } of node.args as ExpressionEntryNode[]) {
      obj[self.evalInternal(scope, key) as number] = self.evalInternal(scope, val)
    }

    return obj
  },
  { isInternal: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'scope',
  '__object',
  function (self, scope, node) {
    const obj = Object.create(null) as Record<PropertyKey, unknown>

    for (const { key, val } of node.args as ExpressionEntryNode[]) {
      obj[self.evalInternal(scope, key) as PropertyKey] = self.evalInternal(scope, val)
    }

    return obj
  },
  { isInternal: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'scope',
  '__condition',
  function (self, scope, node) {
    const [condition, branch1, branch2] = node.args as ExpressionNode[]

    if (self.evalInternal(scope, condition)) {
      return self.evalInternal(scope, branch1)
    } else {
      return self.evalInternal(scope, branch2)
    }
  },
  { isInternal: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'scope',
  '__or',
  function (self, scope, node) {
    const [branch1, branch2] = node.args as ExpressionNode[]

    const resolved1 = self.evalInternal(scope, branch1)
    if (resolved1) {
      return resolved1
    } else {
      return self.evalInternal(scope, branch2)
    }
  },
  { isInternal: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'scope',
  '__and',
  function (self, scope, node) {
    const [branch1, branch2] = node.args as ExpressionNode[]

    const resolved1 = self.evalInternal(scope, branch1)
    if (resolved1) {
      return self.evalInternal(scope, branch2)
    } else {
      return false
    }
  },
  { isInternal: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'scope',
  '__at',
  function (self, scope, node) {
    const args = node.args as ExpressionNode[]
    const object = self.evalInternal(scope, args[0])
    if (object) {
      return (object as Record<PropertyKey, unknown>)[self.evalInternal(scope, args[1]) as PropertyKey]
    } else {
      return undefined
    }
  },
  { isInternal: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'scope',
  '__call',
  function (self, scope, node) {
    const args = node.args as [ExpressionNode, ExpressionNode, ExpressionNode[]]
    const object = self.evalInternal(scope, args[0]) as Record<PropertyKey, unknown> | undefined
    const func = self.evalInternal(scope, args[1]) as PropertyKey

    if (object != undefined && object[func] && typeof object[func] === 'function') {
      return (object as Record<PropertyKey, (...params: unknown[]) => unknown>)[func](...args[2].map((param) => self.evalInternal(scope, param)))
    } else {
      return undefined
    }
  },
  { isInternal: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'scope',
  'difference',
  function (self, scope, node) {
    const args = node.args as ExpressionNode[]
    if (args.length !== 1) return undefined

    const a = self.evalInternal(scope, args[0]) as number
    const b = self.evalInternal(scope.clone().with(scope.compare, scope.compare), args[0]) as number

    if (isNaN(a) || isNaN(b)) {
      return undefined
    } else {
      return a - b
    }
  },
  { syntax: 'difference(<context>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'scope',
  'sort',
  function (self, scope, node) {
    const args = node.args as ExpressionNode[]
    if (args.length !== 2) return undefined

    const array = self.evalToArray(scope, args[0])
    const mapper = scope.env.functions[args[1] as string]
    const entries = new Array<{ key: number; val: unknown }>(array.length)

    for (let i = 0; i < array.length; i++) {
      entries[i] = {
        key: self.evalMappedArray(array[i], args[1], i, array, mapper, array.segmented, scope) as number,
        val: array[i]
      }
    }

    const values: SegmentedArray = entries.sort((a, b) => b.key - a.key).map((a) => a.val)
    values.segmented = array.segmented

    return values
  },
  { syntax: 'sort(<array>, <context>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'scope',
  'some',
  function (self, scope, node) {
    const args = node.args as ExpressionNode[]
    if (args.length !== 2) return undefined

    const array = self.evalToArray(scope, args[0])
    const mapper = scope.env.functions[args[1] as string]

    for (let i = 0; i < array.length; i++) {
      if (self.evalMappedArray(array[i], args[1], i, array, mapper, array.segmented, scope)) {
        return true
      }
    }

    return false
  },
  { syntax: 'some(<array>, <context>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'scope',
  'all',
  function (self, scope, node) {
    const args = node.args as ExpressionNode[]
    if (args.length !== 2) return undefined

    const array = self.evalToArray(scope, args[0])
    const mapper = scope.env.functions[args[1] as string]

    for (let i = 0; i < array.length; i++) {
      if (!self.evalMappedArray(array[i], args[1], i, array, mapper, array.segmented, scope)) {
        return false
      }
    }

    return true
  },
  { syntax: 'all(<array>, <context>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'scope',
  'format',
  function (self, scope, node) {
    const args = node.args as ExpressionNode[]
    if (args.length === 0) return undefined

    const value = self.evalInternal(scope, args[0])
    if (typeof value === 'string') {
      let str = value
      const arg = args.slice(1).map((a) => self.evalInternal(scope, a))

      for (let key = 0; key < arg.length; key++) {
        str = str.replace(new RegExp(`\\{\\s*${key}\\s*\\}`, 'gi'), arg[key] as string)
      }

      return str
    } else {
      return undefined
    }
  },
  { syntax: 'format(<string>, <arguments>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'scope',
  'array',
  function (self, scope, node) {
    const args = node.args as ExpressionNode[]
    if (args.length !== 1) return undefined

    return self.evalToArray(scope, args[0])
  },
  { syntax: 'array(<context>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'scope',
  'each',
  function (self, scope, node) {
    const args = node.args as ExpressionNode[]
    if (args.length !== 2 && args.length !== 3) return undefined

    const array = self.evalToArray(scope, args[0])
    const mapper = scope.env.functions[args[1] as string]
    const values = new Array<number>(array.length)

    for (let i = 0; i < array.length; i++) {
      values[i] = self.evalMappedArray(array[i], args[1], i, array, mapper, array.segmented, scope) as number
    }

    const def = typeof args[2] === 'undefined' ? 0 : (self.evalInternal(scope, args[2]) as number)
    return values.reduce((a, b) => a + b, def)
  },
  { syntax: 'each(<array>, <context>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'scope',
  'filter',
  function (self, scope, node) {
    const args = node.args as ExpressionNode[]
    if (args.length !== 2) return undefined

    const array = self.evalToArray(scope, args[0])
    const mapper = scope.env.functions[args[1] as string]
    const values = new Array<unknown>(array.length)

    for (let i = 0; i < array.length; i++) {
      values[i] = self.evalMappedArray(array[i], args[1], i, array, mapper, array.segmented, scope)
    }

    return array.filter((_, i) => values[i])
  },
  { syntax: 'filter(<array>, <context>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'scope',
  'map',
  function (self, scope, node) {
    const args = node.args as ExpressionNode[]
    if (args.length !== 2) return undefined

    const array = self.evalToArray(scope, args[0])
    const mapper = scope.env.functions[args[1] as string]
    const values = new Array<unknown>(array.length)

    for (let i = 0; i < array.length; i++) {
      values[i] = self.evalMappedArray(array[i], args[1], i, array, mapper, array.segmented, scope)
    }

    return values
  },
  { syntax: 'map(<array>, <context>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'scope',
  'this',
  function (self, scope, node) {
    const args = node.args as ExpressionNode[]
    if (scope) {
      if (args.length !== 1) {
        return scope.getSelf(0)
      } else {
        return scope.getSelf(self.evalInternal(scope, args[0]) as number)
      }
    } else {
      return undefined
    }
  },
  { syntax: 'this()' }
)

/*
  Array functions
*/
DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'array',
  'distinct',
  function (array: SegmentedArray) {
    const values: SegmentedArray = Array.from(new Set(array))
    values.segmented = array.segmented
    return values
  },
  { syntax: 'distinct(<array>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'array',
  'slice',
  function (array: SegmentedArray, from: number, to: number) {
    const values: SegmentedArray = array.slice(from, to)
    values.segmented = array.segmented
    return values
  },
  { syntax: 'slice(<array>, <from>, <to>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'array',
  'join',
  function (array: SegmentedArray, delim: string) {
    return array.join(delim)
  },
  { syntax: 'join(<array>, <delimiter>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'array',
  'at',
  function (array: SegmentedArray, index: number) {
    if (isNaN(index)) {
      return undefined
    } else {
      return array[Math.min(array.length, Math.max(0, index))]
    }
  },
  { syntax: 'at(<array>, <index>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'array',
  'indexof',
  function (array: SegmentedArray, obj: unknown) {
    for (let i = 0; i < array.length; i++) {
      if (array[i] == obj) {
        return i
      }
    }

    return -1
  },
  { syntax: 'indexof(<array>, <item>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'array',
  'includes',
  function (array: SegmentedArray, obj: unknown) {
    for (let i = 0; i < array.length; i++) {
      if (array[i] === obj) return true
    }
    return false
  },
  { syntax: 'includes(<array>, <item>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'array',
  'excludes',
  function (array: SegmentedArray, obj: unknown) {
    for (let i = 0; i < array.length; i++) {
      if (array[i] === obj) return false
    }
    return true
  },
  { syntax: 'indexof(<array>, <item>)' }
)

/*
  Standard functions
*/
DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'value',
  'min',
  function (...values: Array<number | number[]>) {
    return minimum(
      values.reduce<number[]>((collector, value) => {
        if (Array.isArray(value)) {
          collector.push(...value)
        } else {
          collector.push(value)
        }

        return collector
      }, [])
    )
  },
  { syntax: 'min(<values>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'value',
  'max',
  function (...values: Array<number | number[]>) {
    return maximum(
      values.reduce<number[]>((collector, value) => {
        if (Array.isArray(value)) {
          collector.push(...value)
        } else {
          collector.push(value)
        }

        return collector
      }, [])
    )
  },
  { syntax: 'max(<values>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'value',
  'sum',
  function (...values: Array<number | number[]>) {
    return values.reduce<number>((collector, value) => {
      if (Array.isArray(value)) {
        collector += value.reduce((a, b) => a + b, 0)
      } else {
        collector += value
      }

      return collector
    }, 0)
  },
  { syntax: 'sum(<values>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'value',
  'now',
  function () {
    return Date.now()
  },
  { noCache: true, syntax: 'now()' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'value',
  'random',
  function () {
    return Math.random()
  },
  { noCache: true, syntax: 'random()' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'value',
  'log',
  function (value: unknown) {
    console.log(value)

    return value
  },
  { syntax: 'log(<context>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'value',
  'stringify',
  function (value: unknown) {
    return String(value)
  },
  { syntax: 'stringify(<context>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'value',
  'range',
  function (min: number, max: number, value: number) {
    if (isNaN(min) || isNaN(max) || isNaN(value)) {
      return undefined
    } else {
      return (max - min) * value + min
    }
  },
  { syntax: 'range(<min>, <max>, <value>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'value',
  'len',
  function (value: unknown) {
    if (typeof value === 'string') {
      return value.length
    } else if (typeof value !== 'object') {
      return undefined
    } else {
      if (Array.isArray(value)) {
        return value.length
      } else {
        return Object.keys(value as object).length
      }
    }
  },
  { syntax: 'len(<value>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'value',
  'average',
  function (...values: Array<number | number[]>) {
    const { sum, len } = values.reduce(
      (collector, value) => {
        if (Array.isArray(value)) {
          collector.sum += value.reduce((a, b) => a + b, 0)
          collector.len += value.length
        } else {
          collector.sum += value
          collector.len += 1
        }

        return collector
      },
      {
        sum: 0,
        len: 0
      }
    )

    if (len) {
      return sum / len
    } else {
      return 0
    }
  },
  { syntax: 'average(<values>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'value',
  'makearray',
  function (size: number, def: unknown = 0) {
    if (!isNaN(size)) {
      return new Array<unknown>(size).fill(def)
    } else {
      return undefined
    }
  },
  { syntax: 'makearray(<length>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'value',
  'makesequence',
  function (from: number, to: number) {
    if (!isNaN(from) && !isNaN(to)) {
      if (to > from) {
        const len = to - from + 1
        return new Array<number>(len).fill(0).map((x, i) => from + i)
      } else {
        const len = from - to + 1
        return new Array<number>(len).fill(0).map((x, i) => from - i)
      }
    } else {
      return undefined
    }
  },
  { syntax: 'makesequence(<from>, <to>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'value',
  'number',
  function (value: unknown) {
    return Number(value)
  },
  { syntax: 'number(<value>)' }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function',
  'value',
  'presence',
  function (value: unknown) {
    if (value === null) {
      return false
    } else if (Array.isArray(value)) {
      return value.length > 0
    } else if (typeof value === 'object') {
      for (const _key in value) {
        return false
      }

      return true
    } else {
      return !!value
    }
  },
  { syntax: 'presence(<value>)' }
)

/*
  Enumerations
*/
DEFAULT_EXPRESSION_CONFIG.register(
  'enumeration',
  'array',
  'GoldCurve',
  function () {
    return Calculations.goldCurve()
  },
  { isComputed: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'enumeration',
  'array',
  'AchievementCount',
  function () {
    return PlayerModel.ACHIEVEMENTS_COUNT
  },
  { isComputed: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'enumeration',
  'array',
  'AchievementNames',
  function () {
    return sequence(PlayerModel.ACHIEVEMENTS_COUNT).map((i) => globalLocalize(`general.achievement_${i}`))
  },
  { isComputed: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'enumeration',
  'array',
  'ItemTypes',
  function () {
    return sequence(20).map((i) => (i > 0 ? globalLocalize(`general.item${i}`) : ''))
  },
  { isComputed: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'enumeration',
  'array',
  'GroupRoles',
  function () {
    return sequence(5).map((i) => (i > 0 ? globalLocalize(`general.rank${i}`) : ''))
  },
  { isComputed: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'enumeration',
  'array',
  'Classes',
  function () {
    return arrayFromIndexes(CONFIG.ids(), (i) => globalLocalize(`general.class${i}`), [''])
  },
  { isComputed: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'enumeration',
  'array',
  'FortressBuildings',
  function () {
    return sequence(12, 1).map((i) => globalLocalize(`general.buildings.fortress${i}`))
  },
  { isComputed: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'enumeration',
  'array',
  'PlayerActions',
  function () {
    return sequence(4).map((i) => globalLocalize(`general.action${i}`))
  },
  { isComputed: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'enumeration',
  'array',
  'PotionTypes',
  function () {
    return sequence(7).map((i) => (i > 0 ? globalLocalize(`general.potion${i}`) : ''))
  },
  { isComputed: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'enumeration',
  'array',
  'GemTypes',
  function () {
    return sequence(8).map((i) => (i > 0 ? globalLocalize(`general.gem${i}`) : ''))
  },
  { isComputed: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'enumeration',
  'array',
  'AttributeTypes',
  function () {
    return sequence(6).map((i) => (i > 0 ? globalLocalize(`general.attribute${i}`) : ''))
  },
  { isComputed: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'enumeration',
  'array',
  'RuneTypes',
  function () {
    return sequence(13).map((i) => (i > 0 ? globalLocalize(`general.rune${i}`) : ''))
  },
  { isComputed: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'enumeration',
  'array',
  'UnderworldBuildings',
  function () {
    return sequence(10, 1).map((i) => globalLocalize(`general.buildings.underworld${i}`))
  },
  { isComputed: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'enumeration',
  'array',
  'ExperienceCurve',
  function () {
    return Calculations.experienceNextLevelCurve()
  },
  { isComputed: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'enumeration',
  'array',
  'ExperienceTotal',
  function () {
    return Calculations.experienceTotalLevelCurve()
  },
  { isComputed: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'enumeration',
  'array',
  'SoulsCurve',
  function () {
    return Calculations.soulsCurve()
  },
  { isComputed: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'enumeration',
  'array',
  'ScrapbookSize',
  function () {
    return PlayerModel.SCRAPBOOK_COUNT
  },
  { isComputed: true }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'enumeration',
  'array',
  'MountSizes',
  function () {
    return ['', 10, 20, 30, 50]
  },
  { isComputed: true }
)

export const TABLE_EXPRESSION_CONFIG = DEFAULT_EXPRESSION_CONFIG.clone()

/*
  Scope variables
*/
TABLE_EXPRESSION_CONFIG.register(
  'variable',
  'scope',
  'player',
  function (scope) {
    return scope.current
  },
  { isDeprecated: 'current' }
)

TABLE_EXPRESSION_CONFIG.register('variable', 'scope', 'current', function (scope) {
  return scope.current
})

TABLE_EXPRESSION_CONFIG.register(
  'variable',
  'scope',
  'reference',
  function (scope) {
    return scope.compare
  },
  { isDeprecated: 'compare' }
)

TABLE_EXPRESSION_CONFIG.register('variable', 'scope', 'compare', function (scope) {
  return scope.compare
})

TABLE_EXPRESSION_CONFIG.register('variable', 'scope', 'database', function () {
  return DatabaseManager
})

TABLE_EXPRESSION_CONFIG.register('variable', 'scope', 'entries', function (scope) {
  if (scope.current) {
    if (DatabaseManager.isPlayer(scope.current.LinkId)) {
      return DatabaseManager.getPlayer(scope.current.LinkId)?.List
    } else {
      return DatabaseManager.getGroup(scope.current.LinkId)?.List
    }
  } else {
    return undefined
  }
})

TABLE_EXPRESSION_CONFIG.register('variable', 'scope', 'table_array', function (scope) {
  return scope.env.tableArrayCurrent
})

TABLE_EXPRESSION_CONFIG.register('variable', 'scope', 'table_array_unfiltered', function (scope) {
  return scope.env.globalArrayCurrent
})

TABLE_EXPRESSION_CONFIG.register('variable', 'scope', 'theme', function (scope) {
  return scope.env.theme
})

TABLE_EXPRESSION_CONFIG.register('variable', 'scope', 'table_timestamp', function (scope) {
  return scope.env.timestamp
})

TABLE_EXPRESSION_CONFIG.register('variable', 'scope', 'table_reference', function (scope) {
  return scope.env.reference
})

TABLE_EXPRESSION_CONFIG.register(
  'variable',
  'scope',
  'header',
  function (scope) {
    return scope.header
  },
  { noCache: true }
)

TABLE_EXPRESSION_CONFIG.register('variable', 'scope', 'row_index', function (scope) {
  return scope.env.rowIndexes && scope.current ? scope.env.rowIndexes[`${scope.current.LinkId}_${scope.current.Timestamp}`] : undefined
})

TABLE_EXPRESSION_CONFIG.register('variable', 'scope', 'joined', function (scope) {
  return scope.env.listJoined
})

TABLE_EXPRESSION_CONFIG.register('variable', 'scope', 'missing', function (scope) {
  return scope.env.listMissing
})

TABLE_EXPRESSION_CONFIG.register('variable', 'scope', 'kicked', function (scope) {
  return scope.env.listKicked
})

TABLE_EXPRESSION_CONFIG.register('variable', 'scope', 'classes', function (scope) {
  return scope.env.listClasses
})

/*
  Scope functions
*/
TABLE_EXPRESSION_CONFIG.register(
  'function',
  'scope',
  'var',
  function (self, scope, node) {
    const args = node.args as ExpressionNode[]
    if (args.length !== 1) return undefined

    if (scope.header && scope.header.vars) {
      return scope.header.vars[args[0] as string]
    } else {
      return undefined
    }
  },
  { noCache: true }
)

TABLE_EXPRESSION_CONFIG.register('function', 'scope', 'tracker', function (self, scope, node) {
  const args = node.args as ExpressionNode[]
  if (args.length !== 1) return undefined

  if (scope.current) {
    return DatabaseManager.getTracker(scope.current.LinkId, args[0] as string)
  } else {
    return undefined
  }
})

/*
  Standard functions
*/
TABLE_EXPRESSION_CONFIG.register('function', 'value', 'flatten', function (...values: unknown[]) {
  return values.flat(Infinity)
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'truncateString', function (value: string, length: number, ellipsis = '...') {
  return truncate(value, length, ellipsis)
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'trunc', function (value: number) {
  if (isNaN(value)) {
    return undefined
  } else {
    return Math.trunc(value)
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'ceil', function (value: number) {
  if (isNaN(value)) {
    return undefined
  } else {
    return Math.ceil(value)
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'floor', function (value: number) {
  if (isNaN(value)) {
    return undefined
  } else {
    return Math.floor(value)
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'round', function (value: number, div: number) {
  if (isNaN(value)) {
    return undefined
  } else {
    if (isNaN(div)) {
      return Math.round(value)
    } else {
      return Math.round(value / div) * div
    }
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'abs', function (value: number) {
  if (isNaN(value)) {
    return undefined
  } else {
    return Math.abs(value)
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'sign', function (value: number) {
  return value >= 0 ? '+' : '-'
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'pow', function (value: number, exp: number) {
  if (isNaN(value) || isNaN(exp)) {
    return undefined
  } else {
    return Math.pow(value, exp)
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'exp', function (value: number) {
  return Math.exp(value)
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'sqrt', function (value: number) {
  if (isNaN(value)) {
    return undefined
  } else {
    return Math.sqrt(value)
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'fixed', function (value: number, decimals: number) {
  if (isNaN(value)) {
    return undefined
  } else {
    if (isNaN(decimals)) {
      decimals = 0
    }

    return value.toFixed(decimals)
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'datetime', function (value: number) {
  if (isNaN(value) || value < 0) {
    return undefined
  } else {
    return formatDate(value)
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'time', function (value: number) {
  if (isNaN(value) || value < 0) {
    return undefined
  } else {
    return formatDate(value, false, true)
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'duration', function (value: number) {
  if (isNaN(value)) {
    return undefined
  } else {
    return formatDurationClock(value)
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'date', function (value: number) {
  if (isNaN(value) || value < 0) {
    return undefined
  } else {
    return formatDate(value, true, false)
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'fnumber', function (value: number, delim?: string) {
  if (isNaN(value)) {
    return undefined
  } else {
    if (delim == undefined) {
      delim = '&nbsp'
    }

    return formatDigitGroups(value, delim)
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'enumber', function (value: number, decimals: number) {
  if (isNaN(value)) {
    return undefined
  } else {
    if (isNaN(decimals)) {
      decimals = 0
    }

    return value.toExponential(decimals)
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'nnumber', function (value: number) {
  if (isNaN(value)) {
    return undefined
  } else {
    return formatNamedNumber(value)
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'small', function (value: unknown) {
  return CellGenerator.Small(value)
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'hsl', function (h: number, s: number, l: number, a?: number) {
  if (isNaN(h) || isNaN(s) || isNaN(l)) {
    return undefined
  } else {
    return getColorFromHSLA(h, s, l, a)
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'rgb', function (r: number, g: number, b: number) {
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return undefined
  } else {
    return getColorFromRGBA(r, g, b)
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'rgba', function (r: number, g: number, b: number, a: number) {
  if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) {
    return undefined
  } else {
    return getColorFromRGBA(r, g, b, a)
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'gradient', function (from: unknown, to: unknown, value: number) {
  if (typeof from == 'object' && !isNaN(Number(to))) {
    return getColorFromGradientObject(from as object, to)
  } else if (from == undefined || to == undefined || isNaN(value)) {
    return undefined
  } else {
    return getColorFromGradient(from, to, value)
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'dualcolor', function (width: number, color1: unknown, color2: unknown) {
  if (!isNaN(width) && typeof color1 == 'string' && typeof color2 == 'string') {
    width = parseInt(String(width))
    width = width > 100 ? 100 : width < 1 ? 1 : width

    return `linear-gradient(90deg, ${getCSSColor(color1)} ${width}%, ${getCSSColor(color2)} ${width}%)`
  } else {
    return undefined
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'lingradient', function (degrees: number, ...segments: unknown[]) {
  if (!isNaN(degrees) && segments.length % 2 == 0 && segments.length >= 4) {
    const colors = []

    for (let i = 0; i < segments.length; i += 2) {
      const color = getCSSColor(segments[i])
      let width = parseInt(String(segments[i + 1]))

      if (color && !isNaN(width)) {
        width = width > 100 ? 100 : width < 0 ? 0 : width
        colors.push(`${color} ${width}%`)
      } else {
        return undefined
      }
    }

    return `linear-gradient(${degrees}deg, ${colors.join(', ')})`
  } else {
    return undefined
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'statsum', function (attribute: number) {
  if (!isNaN(attribute)) {
    return Calculations.goldAttributeTotalCost(parseInt(String(attribute)))
  } else {
    return undefined
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'statcost', function (attribute: number) {
  if (!isNaN(attribute)) {
    return Calculations.goldAttributeCost(parseInt(String(attribute)))
  } else {
    return undefined
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'expneeded', function (level: number) {
  if (!isNaN(level)) {
    return Calculations.experienceTotalLevel(level)
  } else {
    return undefined
  }
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'img', function (src: string, width?: number, height?: number) {
  return `<img src="${src}"${typeof width != 'undefined' ? ` width="${width}"` : ''}${typeof height != 'undefined' ? ` height="${height}"` : ''}/>`
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'class_img', function (klass: CharacterClass, width?: number, height?: number) {
  return `<img src="${getClassImageUrl(klass)}"${typeof width != 'undefined' ? ` width="${width}"` : ''}${typeof height != 'undefined' ? ` height="${height}"` : ''}/>`
})

TABLE_EXPRESSION_CONFIG.register('function', 'value', 'get_day', function (value: number) {
  return new Date(value).getDay()
})

/*
Public headers
*/
TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Name', {
  expr: (p) => p.Name,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'ID', {
  expr: (p) => p.ID,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Identifier', {
  expr: (p) => p.Identifier,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Link Identifier', {
  expr: (p) => p.LinkId,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Prefix', {
  expr: (p) => p.Prefix,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Own', {
  expr: (p) => p.Own,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Description', {
  expr: (p) => p.Description,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Role', {
  expr: (p) => p.Group?.Role,
  flip: true,
  format: (p, x: number) => (x ? globalLocalize(`general.rank${x}`) : ''),
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Level', {
  expr: (p) => p.Level
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Server ID', {
  expr: (p) => p.ServerId
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Server', {
  expr: (p) => Playa.getServerUrlById(p.ServerId)
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Guild', {
  expr: (p) => p.Group?.Name,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Items', {
  expr: (p) => p.Items,
  disabled: true
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Strength', {
  expr: (p) => p.Strength?.Total
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Dexterity', {
  expr: (p) => p.Dexterity?.Total
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Intelligence', {
  expr: (p) => p.Intelligence?.Total
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Constitution', {
  expr: (p) => p.Constitution?.Total
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Luck', {
  expr: (p) => p.Luck?.Total
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Attribute', {
  expr: (p) => p.Primary?.Total
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Strength Size', {
  expr: (p) => p.Strength?.PotionSize
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Dexterity Size', {
  expr: (p) => p.Dexterity?.PotionSize
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Intelligence Size', {
  expr: (p) => p.Intelligence?.PotionSize
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Constitution Size', {
  expr: (p) => p.Constitution?.PotionSize
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Luck Size', {
  expr: (p) => p.Luck?.PotionSize
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Attribute Size', {
  expr: (p) => p.Primary?.PotionSize
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Strength Potion Index', {
  expr: (p) => p.Strength?.PotionIndex,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Dexterity Potion Index', {
  expr: (p) => p.Dexterity?.PotionIndex,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Intelligence Potion Index', {
  expr: (p) => p.Intelligence?.PotionIndex,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Constitution Potion Index', {
  expr: (p) => p.Constitution?.PotionIndex,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Luck Potion Index', {
  expr: (p) => p.Luck?.PotionIndex,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Attribute Potion Index', {
  expr: (p) => p.Primary?.PotionIndex,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Strength Pet', {
  expr: (p) => p.Strength?.Pet,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Dexterity Pet', {
  expr: (p) => p.Dexterity?.Pet,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Intelligence Pet', {
  expr: (p) => p.Intelligence?.Pet,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Constitution Pet', {
  expr: (p) => p.Constitution?.Pet,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Luck Pet', {
  expr: (p) => p.Luck?.Pet,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Base Cost', {
  expr: (p) => p.Primary?.NextCost,
  format: 'spaced_number'
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Strength Cost', {
  expr: (p) => p.Strength?.NextCost,
  format: 'spaced_number'
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Dexterity Cost', {
  expr: (p) => p.Dexterity?.NextCost,
  format: 'spaced_number'
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Intelligence Cost', {
  expr: (p) => p.Intelligence?.NextCost,
  format: 'spaced_number'
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Constitution Cost', {
  expr: (p) => p.Constitution?.NextCost,
  format: 'spaced_number'
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Luck Cost', {
  expr: (p) => p.Luck?.NextCost,
  format: 'spaced_number'
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Base Total Cost', {
  expr: (p) => p.Primary?.TotalCost,
  format: 'spaced_number'
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Strength Total Cost', {
  expr: (p) => p.Strength?.TotalCost,
  format: 'spaced_number'
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Dexterity Total Cost', {
  expr: (p) => p.Dexterity?.TotalCost,
  format: 'spaced_number'
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Intelligence Total Cost', {
  expr: (p) => p.Intelligence?.TotalCost,
  format: 'spaced_number'
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Constitution Total Cost', {
  expr: (p) => p.Constitution?.TotalCost,
  format: 'spaced_number'
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Luck Total Cost', {
  expr: (p) => p.Luck?.TotalCost,
  format: 'spaced_number'
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Attribute Pet', {
  expr: (p) => p.Primary?.Pet,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Strength Equipment', {
  expr: (p) => p.Strength?.Equipment,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Dexterity Equipment', {
  expr: (p) => p.Dexterity?.Equipment,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Intelligence Equipment', {
  expr: (p) => p.Intelligence?.Equipment,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Constitution Equipment', {
  expr: (p) => p.Constitution?.Equipment,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Luck Equipment', {
  expr: (p) => p.Luck?.Equipment,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Attribute Equipment', {
  expr: (p) => p.Primary?.Equipment,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Strength Items', {
  expr: (p) => p.Strength?.Items,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Dexterity Items', {
  expr: (p) => p.Dexterity?.Items,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Intelligence Items', {
  expr: (p) => p.Intelligence?.Items,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Constitution Items', {
  expr: (p) => p.Constitution?.Items,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Luck Items', {
  expr: (p) => p.Luck?.Items,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Attribute Items', {
  expr: (p) => p.Primary?.Items,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Strength Base Items', {
  expr: (p) => p.Strength?.ItemsBase,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Dexterity Base Items', {
  expr: (p) => p.Dexterity?.ItemsBase,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Intelligence Base Items', {
  expr: (p) => p.Intelligence?.ItemsBase,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Constitution Base Items', {
  expr: (p) => p.Constitution?.ItemsBase,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Luck Base Items', {
  expr: (p) => p.Luck?.ItemsBase,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Attribute Base Items', {
  expr: (p) => p.Primary?.ItemsBase,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Strength Upgrades', {
  expr: (p) => p.Strength?.Upgrades,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Dexterity Upgrades', {
  expr: (p) => p.Dexterity?.Upgrades,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Intelligence Upgrades', {
  expr: (p) => p.Intelligence?.Upgrades,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Constitution Upgrades', {
  expr: (p) => p.Constitution?.Upgrades,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Luck Upgrades', {
  expr: (p) => p.Luck?.Upgrades,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Attribute Upgrades', {
  expr: (p) => p.Primary?.Upgrades,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Strength Gems', {
  expr: (p) => p.Strength?.Gems,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Dexterity Gems', {
  expr: (p) => p.Dexterity?.Gems,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Intelligence Gems', {
  expr: (p) => p.Intelligence?.Gems,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Constitution Gems', {
  expr: (p) => p.Constitution?.Gems,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Luck Gems', {
  expr: (p) => p.Luck?.Gems,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Attribute Gems', {
  expr: (p) => p.Primary?.Gems,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Strength Potion', {
  expr: (p) => p.Strength?.Potion,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Dexterity Potion', {
  expr: (p) => p.Dexterity?.Potion,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Intelligence Potion', {
  expr: (p) => p.Intelligence?.Potion,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Constitution Potion', {
  expr: (p) => p.Constitution?.Potion,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Luck Potion', {
  expr: (p) => p.Luck?.Potion,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Attribute Potion', {
  expr: (p) => p.Primary?.Potion,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Strength Pet Bonus', {
  expr: (p) => p.Strength?.PetBonus
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Dexterity Pet Bonus', {
  expr: (p) => p.Dexterity?.PetBonus
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Intelligence Pet Bonus', {
  expr: (p) => p.Intelligence?.PetBonus
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Constitution Pet Bonus', {
  expr: (p) => p.Constitution?.PetBonus
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Luck Pet Bonus', {
  expr: (p) => p.Luck?.PetBonus
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Attribute Pet Bonus', {
  expr: (p) => p.Primary?.PetBonus
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Strength Class', {
  expr: (p) => p.Strength?.Class,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Dexterity Class', {
  expr: (p) => p.Dexterity?.Class,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Intelligence Class', {
  expr: (p) => p.Intelligence?.Class,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Constitution Class', {
  expr: (p) => p.Constitution?.Class,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Luck Class', {
  expr: (p) => p.Luck?.Class,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Attribute Class', {
  expr: (p) => p.Primary?.Class,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Attribute Type', {
  expr: (p) => p.Primary?.Type,
  width: 110
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Strength Bonus', {
  expr: (p) => p.Strength?.Bonus,
  nameOverride: 'Str Bonus'
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Dexterity Bonus', {
  expr: (p) => p.Dexterity?.Bonus,
  nameOverride: 'Dex Bonus'
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Intelligence Bonus', {
  expr: (p) => p.Intelligence?.Bonus,
  nameOverride: 'Int Bonus'
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Constitution Bonus', {
  expr: (p) => p.Constitution?.Bonus,
  nameOverride: 'Con Bonus'
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Luck Bonus', {
  expr: (p) => p.Luck?.Bonus,
  nameOverride: 'Lck Bonus'
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Bonus', {
  expr: (p) => p.Primary?.Bonus
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Base Strength', {
  expr: (p) => p.Strength?.Base
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Base Dexterity', {
  expr: (p) => p.Dexterity?.Base
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Base Intelligence', {
  expr: (p) => p.Intelligence?.Base
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Base Constitution', {
  expr: (p) => p.Constitution?.Base
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Base Luck', {
  expr: (p) => p.Luck?.Base
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Base', {
  expr: (p) => p.Primary?.Base
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Honor', {
  expr: (p) => p.Honor
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Health Multiplier', {
  expr: (p) => p.Config?.HealthMultiplier
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Weapon Damage Multiplier', {
  expr: (p) => p.Config?.WeaponMultiplier
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Maximum Damage Reduction', {
  expr: (p) => p.Config?.MaximumDamageReduction
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Life Potion', {
  expr: (p) => p.Potions?.Life == 25,
  format: 'boolean'
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Life Potion Index', {
  expr: (p) => p.Potions?.LifeIndex,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Runes', {
  expr: (p) => p.Runes?.Runes,
  format: (p, x: number) => `e${x}`,
  width: 100
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Action Index', {
  expr: (p) => p.Action?.Index,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Status', {
  expr: (p) => p.Action?.Status,
  format: (p, x: number) => globalLocalize(`general.action${x}`),
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Action Finish', {
  expr: (p) => p.Action?.Finish,
  format: 'datetime',
  width: 160,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Action Unclaimed', {
  expr: (p) => p.OriginalAction && p.OriginalAction.Status < 0,
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Health', {
  expr: (p) => p.Health,
  width: 120
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Armor', {
  expr: (p) => p.Armor
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Damage Min', {
  expr: (p) => p.Damage?.Min
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Damage Max', {
  expr: (p) => p.Damage?.Max
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Damage Avg', {
  expr: (p) => p.Damage?.Avg
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Damage Min 2', {
  expr: (p) => p.Damage2?.Min
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Damage Max 2', {
  expr: (p) => p.Damage2?.Max
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Damage Avg 2', {
  expr: (p) => p.Damage2?.Avg
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Space', {
  expr: (p) => 5 + p.Fortress?.Treasury
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Mirror', {
  expr: (p) => (p.Mirror ? 13 : p.MirrorPieces)
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Equipment', {
  expr: (p) => (p.Items ? Object.values(p.Items).reduce((c, i) => c + (i.Attributes[0] > 0 ? i.getItemLevel() : 0), 0) : undefined),
  width: 130
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Tower', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Tower) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Raids', {
  expr: (p) => p.Dungeons?.Raid
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Portal', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Player) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Guild Portal', {
  expr: (p) => p.Dungeons?.Group,
  width: 130
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Dungeon', {
  expr: (p) => p.Dungeons?.Normal?.Total
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Shadow Dungeon', {
  expr: (p) => p.Dungeons?.Shadow?.Total
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Dungeon Unlocked', {
  expr: (p) => p.Dungeons?.Normal?.Unlocked
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Shadow Unlocked', {
  expr: (p) => p.Dungeons?.Shadow?.Unlocked
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Fortress', {
  expr: (p) => p.Fortress?.Fortress
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Upgrades', {
  expr: (p) => p.Fortress?.Upgrades
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Warriors', {
  expr: (p) => p.Fortress?.Warriors
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Archers', {
  expr: (p) => p.Fortress?.Archers
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Mages', {
  expr: (p) => p.Fortress?.Mages
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Warrior Count', {
  expr: (p) => (p.Fortress ? p.Fortress.Barracks * 3 : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Archer Count', {
  expr: (p) => (p.Fortress ? p.Fortress.ArcheryGuild * 2 : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Mage Count', {
  expr: (p) => p.Fortress?.MageTower
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Upgrades', {
  expr: (p) => p.Fortress?.Upgrades
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Gem Mine', {
  expr: (p) => p.Fortress?.GemMine
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Fortress Honor', {
  expr: (p) => p.Fortress?.Honor,
  width: 150
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Raid Honor', {
  expr: (p) => p.Fortress?.RaidHonor,
  width: 120
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Wall', {
  expr: (p) => p.Fortress?.Wall
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Fortifications', {
  expr: (p) => p.Fortress?.Fortifications
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Quarters', {
  expr: (p) => p.Fortress?.LaborerQuarters
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Woodcutter', {
  expr: (p) => p.Fortress?.WoodcutterGuild
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Quarry', {
  expr: (p) => p.Fortress?.Quarry
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Academy', {
  expr: (p) => p.Fortress?.Academy
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Archery Guild', {
  expr: (p) => p.Fortress?.ArcheryGuild
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Barracks', {
  expr: (p) => p.Fortress?.Barracks
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Mage Tower', {
  expr: (p) => p.Fortress?.MageTower
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Treasury', {
  expr: (p) => p.Fortress?.Treasury
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Smithy', {
  expr: (p) => p.Fortress?.Smithy
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Raid Wood', {
  expr: (p) => p.Fortress?.RaidWood
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Raid Stone', {
  expr: (p) => p.Fortress?.RaidStone
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Shadow', {
  expr: (p) => p.Pets?.Shadow
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Light', {
  expr: (p) => p.Pets?.Light
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Earth', {
  expr: (p) => p.Pets?.Earth
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Fire', {
  expr: (p) => p.Pets?.Fire
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Water', {
  expr: (p) => p.Pets?.Water
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Rune Gold', {
  expr: (p) => p.Runes?.Gold
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Rune XP', {
  expr: (p) => p.Runes?.XP
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Rune Chance', {
  expr: (p) => p.Runes?.Chance,
  width: 130
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Rune Quality', {
  expr: (p) => p.Runes?.Quality,
  width: 130
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Rune Health', {
  expr: (p) => p.Runes?.Health,
  width: 130
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Rune Damage', {
  expr: (p) => p.Runes?.Damage,
  width: 130
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Rune Damage 2', {
  expr: (p) => p.Runes?.Damage2,
  width: 130
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Rune Resist', {
  expr: (p) => p.Runes?.Resistance,
  width: 130
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Fire Resist', {
  expr: (p) => p.Runes?.ResistanceFire,
  width: 130
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Cold Resist', {
  expr: (p) => p.Runes?.ResistanceCold,
  width: 130
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Lightning Resist', {
  expr: (p) => p.Runes?.ResistanceLightning,
  width: 160
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Fire Damage', {
  expr: (p) => p.Runes?.DamageFire,
  width: 130
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Cold Damage', {
  expr: (p) => p.Runes?.DamageCold,
  width: 130
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Lightning Damage', {
  expr: (p) => p.Runes?.DamageLightning,
  width: 160
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Fire Damage 2', {
  expr: (p) => p.Runes?.Damage2Fire,
  width: 130
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Cold Damage 2', {
  expr: (p) => p.Runes?.Damage2Cold,
  width: 130
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Lightning Damage 2', {
  expr: (p) => p.Runes?.Damage2Lightning,
  width: 160
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Class', {
  expr: (p) => p.Class,
  format: (p, x: number) => globalLocalize(`general.class${x}`),
  flip: true,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Race', {
  expr: (p) => p.Race,
  format: (p, x: number) => globalLocalize(`general.race${x}`),
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Gender', {
  expr: (p) => p.Gender,
  format: (p, x: number) => globalLocalize(`general.gender${x}`),
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Rank', {
  expr: (p) => p.Rank,
  flip: true
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Mount', {
  expr: (p) => p.Mount,
  format: (p, x: number) => (x ? `${['', 10, 20, 30, 50][x]}%` : ''),
  difference: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Awards', {
  expr: (p) => p.Achievements?.Owned,
  decorators: [
    {
      condition: (h) => h.hydra,
      apply: (h) => {
        h.displayAfter = (p) => (p && p.Achievements.Dehydration ? CellGenerator.Small(' H') : '')
      }
    }
  ]
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Album', {
  expr: (p) => (typeof p.BookPercentage === 'number' ? Math.ceil(10000 * p.BookPercentage) / 100 : undefined),
  format: (p, x: number) => x.toFixed(2) + '%',
  width: 130,
  decimal: true,
  decorators: [
    {
      condition: (h) => h.grail,
      apply: (h) => {
        h.displayAfter = (p) => (p && p.Achievements.Grail ? CellGenerator.Small(' G') : '')
      }
    }
  ]
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Album Items', {
  expr: (p) => p.Book,
  width: 130
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Fortress Rank', {
  expr: (p) => p.Fortress?.Rank,
  flip: true,
  width: 130
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Building', {
  expr: (p) => p.Fortress?.Upgrade?.Building,
  width: 180,
  format: (p, x: number) => (x >= 0 ? globalLocalize(`general.buildings.fortress${x + 1}`) : ''),
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Building Finish', {
  expr: (p) => p.Fortress?.Upgrade?.Finish,
  format: 'datetime',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Building Start', {
  expr: (p) => p.Fortress?.Upgrade?.Start,
  format: 'datetime',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Timestamp', {
  expr: (p) => p.Timestamp,
  format: 'datetime',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Guild Joined', {
  expr: (p) => p.Group?.Joined,
  format: 'datetime',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Achievements', {
  expr: (p) => p.Achievements?.Owned
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Pets Unlocked', {
  expr: (p) => p.Achievements?.PetLover,
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Grail Unlocked', {
  expr: (p) => p.Achievements?.Grail,
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Hydra Dead', {
  expr: (p) => p.Achievements?.Dehydration,
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'XP', {
  expr: (p) => p.XP,
  format: 'spaced_number',
  differenceFormat: true,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'XP Required', {
  expr: (p) => p.XPNext,
  format: 'spaced_number',
  differenceFormat: true,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'XP Total', {
  expr: (p) => p.XPTotal,
  format: 'spaced_number',
  differenceFormat: true,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Enchantments', {
  expr: (p) => Object.values(p.Items).reduce((col, i) => col + (i.HasEnchantment ? 1 : 0), 0)
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Archeological Aura', {
  expr: (p) => (p.Items?.Head?.HasEnchantment ? 1 : 0),
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Marios Beard', {
  expr: (p) => (p.Items?.Body?.HasEnchantment ? 1 : 0),
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Shadow of the Cowboy', {
  expr: (p) => (p.Items?.Hand?.HasEnchantment ? 1 : 0),
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', '36960 Feet Boots', {
  expr: (p) => (p.Items?.Feet?.HasEnchantment ? 1 : 0),
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Unholy Acquisitiveness', {
  expr: (p) => (p.Items?.Neck?.HasEnchantment ? 1 : 0),
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Thirsty Wanderer', {
  expr: (p) => (p.Items?.Belt?.HasEnchantment ? 1 : 0),
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Grave Robbers Prayer', {
  expr: (p) => (p.Items?.Ring?.HasEnchantment ? 1 : 0),
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Robber Baron Ritual', {
  expr: (p) => (p.Items?.Misc?.HasEnchantment ? 1 : 0),
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Sword of Vengeance', {
  expr: (p) => (p.Items?.Wpn1?.HasEnchantment ? 1 : 0) + (p.Items?.Wpn2?.HasEnchantment ? 1 : 0),
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Potion 1 Size', {
  expr: (p) => p.Potions[0].Size,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Potion 2 Size', {
  expr: (p) => p.Potions[1].Size,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Potion 3 Size', {
  expr: (p) => p.Potions[2].Size,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Potion 1 Type', {
  expr: (p) => p.Potions[0].Type,
  format: (p, x: number) => (x ? globalLocalize(`general.potion${x}`) : ''),
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Potion 2 Type', {
  expr: (p) => p.Potions[1].Type,
  format: (p, x: number) => (x ? globalLocalize(`general.potion${x}`) : ''),
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Potion 3 Type', {
  expr: (p) => p.Potions[2].Type,
  format: (p, x: number) => (x ? globalLocalize(`general.potion${x}`) : ''),
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Tags', {
  expr: (p) => toArray(p.Data.tag),
  format: (p, x: string[]) => x.join(', '),
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Gold Frame', {
  expr: (p) => p.Flags?.GoldFrame,
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Twitch Frame', {
  expr: (p) => p.Flags?.TwitchFrame,
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Friendly Fire Frame', {
  expr: (p) => p.Flags?.FriendlyFireFrame,
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Official Creator', {
  expr: (p) => p.Flags?.OfficialCreator,
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Official Discord', {
  expr: (p) => p.Flags?.OfficialDiscord,
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'GT Background', {
  expr: (p) => p.Flags?.GroupTournamentBackground,
  format: (p, x: number) => (x ? globalLocalize(`general.gt_background${x}`) : globalLocalize('general.none')),
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Potions', {
  expr: (p) => p.Potions,
  format: (p, i: PlayerPotion) => i.Size,
  order: (p) => sum(p.Potions.map((v) => v.Size)),
  visible: false,
  difference: false,
  width: 33,
  grouped: 3
})

/*
  Group headers
*/
function fetchPlayerGroupValue(object: ScriptEntity | undefined, ifPlayer: () => unknown, ifGroup: () => unknown) {
  if (!object) {
    return undefined
  } else if (DatabaseManager.isPlayer(object?.LinkId)) {
    return ifPlayer()
  } else {
    return ifGroup()
  }
}

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild ID', {
  expr: (obj) =>
    fetchPlayerGroupValue(
      obj,
      () => obj.Group?.ID,
      () => obj.ID
    ),
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Identifier', {
  expr: (obj) =>
    fetchPlayerGroupValue(
      obj,
      () => obj.Group?.Identifier,
      () => obj.Identifier
    ),
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Link Identifier', {
  expr: (obj) =>
    fetchPlayerGroupValue(
      obj,
      () => obj.Group?.LinkId,
      () => obj.LinkId
    ),
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Rank', {
  expr: (obj) =>
    fetchPlayerGroupValue(
      obj,
      () => obj.Group?.Rank,
      () => obj.Rank
    )
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Description', {
  expr: (obj) => obj.Description,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Raids', {
  expr: (obj) =>
    fetchPlayerGroupValue(
      obj,
      () => obj.Group?.Raid,
      () => obj.Raid
    )
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Portal Floor', {
  expr: (obj) =>
    fetchPlayerGroupValue(
      obj,
      () => obj.Group?.Group?.PortalFloor,
      () => obj.PortalFloor
    )
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Portal Life', {
  expr: (obj) =>
    fetchPlayerGroupValue(
      obj,
      () => obj.Group?.Group?.PortalLife,
      () => obj.PortalLife
    )
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Portal Percent', {
  expr: (obj) =>
    fetchPlayerGroupValue(
      obj,
      () => obj.Group?.Group?.PortalPercent,
      () => obj.PortalPercent
    )
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Honor', {
  expr: (obj) =>
    fetchPlayerGroupValue(
      obj,
      () => obj.Group?.Group?.Honor,
      () => obj.Honor
    ),
  format: 'fnumber'
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Knights', {
  expr: (obj) =>
    fetchPlayerGroupValue(
      obj,
      () => obj.Group?.Group?.TotalKnights,
      () => obj.TotalKnights
    )
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Treasure', {
  expr: (obj) =>
    fetchPlayerGroupValue(
      obj,
      () => (obj.Group?.Group?.TotalTreasure || 0) + 2 * Math.min(obj.Dungeons.Raid, 50),
      () => obj.TotalTreasure + 2 * Math.min(obj.Raid, 50)
    )
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Instructor', {
  expr: (obj) =>
    fetchPlayerGroupValue(
      obj,
      () => (obj.Group?.Group?.TotalInstructor || 0) + 2 * Math.min(obj.Dungeons.Raid, 50),
      () => obj.TotalInstructor + 2 * Math.min(obj.Raid, 50)
    )
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Hydra', {
  expr: (obj) =>
    fetchPlayerGroupValue(
      obj,
      () => obj.Group?.Group?.Hydra,
      () => obj.Hydra
    )
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Member Count', {
  expr: (obj) => obj.MembersTotal
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Attacking', {
  expr: (obj) => obj.IsAttacking,
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Attacking ID', {
  expr: (obj) => obj.IsAttackingID,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Defending', {
  expr: (obj) => obj.IsUnderAttack,
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Defending ID', {
  expr: (obj) => obj.IsUnderAttackID,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Knights 15+', {
  expr: (obj) => obj.TotalKnights15
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Pet Level', {
  expr: (obj) => obj.Pet
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Pet', {
  expr: (obj) => obj.PetID
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Pet Class', {
  expr: (obj) => obj.PetClass
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Pet Strength', {
  expr: (obj) => obj.PetStrength,
  format: 'fnumber'
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Pet Dexterity', {
  expr: (obj) => obj.PetDexterity,
  format: 'fnumber'
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Pet Intelligence', {
  expr: (obj) => obj.PetIntelligence,
  format: 'fnumber'
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Pet Constitution', {
  expr: (obj) => obj.PetConstitution,
  format: 'fnumber'
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Pet Luck', {
  expr: (obj) => obj.PetLuck,
  format: 'fnumber'
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild Members', {
  expr: (obj) => obj.Players,
  disabled: true
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild GT Rank', {
  expr: (obj) => obj.GroupTournament?.Rank
})

TABLE_EXPRESSION_CONFIG.register('header', 'group', 'Guild GT Tokens', {
  expr: (obj) => obj.GroupTournament?.Tokens,
  format: 'fnumber'
})

/*
  Protected headers
*/
TABLE_EXPRESSION_CONFIG.register('header', 'protected', 'Last Active', {
  expr: (p) => p.LastOnline,
  format: 'datetime',
  width: 160,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'protected', 'Inactive Time', {
  expr: (p) => p.Timestamp - (p.LastOnline as number),
  format: 'duration',
  flip: true,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'protected', 'Knights', {
  expr: (p) => p.Fortress?.Knights,
  decorators: [
    {
      condition: (h) => h.maximum,
      apply: (h) => {
        h.displayAfter = (p) => (p ? `/${p.Fortress.Fortress}` : '')
      }
    }
  ]
})

TABLE_EXPRESSION_CONFIG.register('header', 'protected', 'Treasure', {
  expr: (p) => p.Group?.Treasure
})

TABLE_EXPRESSION_CONFIG.register('header', 'protected', 'Instructor', {
  expr: (p) => p.Group?.Instructor,
  width: 100
})

TABLE_EXPRESSION_CONFIG.register('header', 'public', 'Power', {
  expr: (p) => ModelUtils.estimatePower(p),
  format: (p, x: number) => x.toExponential(3),
  differenceFormat: true
})

TABLE_EXPRESSION_CONFIG.register('header', 'protected', 'Pet', {
  expr: (p) => p.Group?.Pet
})

TABLE_EXPRESSION_CONFIG.register('header', 'protected', 'GT Tokens', {
  expr: (p) => p.GroupTournament?.Tokens,
  format: 'fnumber'
})

TABLE_EXPRESSION_CONFIG.register('header', 'protected', 'GT Floor', {
  expr: (p) => p.GroupTournament?.Floor
})

TABLE_EXPRESSION_CONFIG.register('header', 'protected', 'GT Maximum Floor', {
  expr: (p) => p.GroupTournament?.FloorMax
})

TABLE_EXPRESSION_CONFIG.register('header', 'protected', 'Hydra Attacked', {
  expr: (p) => p.Group?.Actions?.Hydra,
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'protected', 'Attack Joined', {
  expr: (p) => p.Group?.Actions?.Attack,
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'protected', 'Raid Joined', {
  expr: (p) => p.Group?.Actions?.Raid,
  format: 'boolean',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'protected', 'Defense Joined', {
  expr: (p) => p.Group?.Actions?.Defense,
  format: 'boolean',
  difference: false,
  statistics: false
})

/*
  Private headers
*/
TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Webshop ID', {
  expr: (p) => p.WebshopID,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Mount Expire', {
  expr: (p) => p.MountExpire,
  format: 'datetime',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Wheel Used', {
  expr: (p) => p.WheelUsed
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Dice Used', {
  expr: (p) => p.DiceUsed
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Wheel Type', {
  expr: (p) => p.WheelType
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Wood', {
  expr: (p) => p.Fortress?.Wood
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Stone', {
  expr: (p) => p.Fortress?.Stone
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Used Beers', {
  expr: (p) => p.BeerUsed,
  statistics: false,
  difference: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Max Beers', {
  expr: (p) => p.BeerMax,
  statistics: false,
  difference: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Adventure Points', {
  expr: (p) => p.AdventurePoints,
  statistics: false,
  difference: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Scrapbook Items', {
  expr: (p) => p.Scrapbook
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Scrapbook Legendaries', {
  expr: (p) => p.ScrapbookLegendary
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Aura', {
  expr: (p) => p.Toilet?.Aura,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Toilet Fill', {
  expr: (p) => p.Toilet?.Fill,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Shrooms', {
  expr: (p) => p.Mushrooms?.Current,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Coins', {
  expr: (p) => p.Coins,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Gold', {
  expr: (p) => p.Gold,
  format: 'fnumber',
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Shrooms Total', {
  expr: (p) => p.Mushrooms?.Total,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Shrooms Free', {
  expr: (p) => p.Mushrooms?.Free,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Shrooms Paid', {
  expr: (p) => p.Mushrooms?.Paid,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Hourglass', {
  expr: (p) => p.Hourglass,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Potion Expire', {
  expr: (p) => (p.Own ? (p.Potions[0].Size == 0 ? 0 : Math.min(...p.Potions.filter((pot) => pot.Size > 0).map((pot) => pot.Expire as number))) : undefined),
  format: (p, x: number | undefined) => (x == undefined ? undefined : formatDate(x)),
  width: 160,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Crystals', {
  expr: (p) => p.Crystals,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Metal', {
  expr: (p) => p.Metal,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Pet Rank', {
  expr: (p) => ((p.Pets.Rank as number) <= 0 ? undefined : p.Pets.Rank),
  flip: true
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Pet Honor', {
  expr: (p) => p.Pets?.Honor
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '1 Catacombs', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[0]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '2 Mines', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[1]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '3 Ruins', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[2]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '4 Grotto', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[3]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '5 Altar', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[4]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '6 Tree', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[5]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '7 Magma', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[6]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '8 Temple', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[7]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '9 Pyramid', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[8]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '10 Fortress', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[9]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '11 Circus', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[10]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '12 Hell', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[11]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '13 Floor', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[12]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '14 Easteros', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[13]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '15 Academy', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[14]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '16 Hemorridor', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[15]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '17 Nordic', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[16]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '18 Greek', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[17]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '19 Birthday', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[18]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '20 Dragons', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[19]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '21 Horror', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[20]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '22 Superheroes', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[21]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '23 Anime', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[22]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '24 Giant Monsters', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[23]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '25 City', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[24]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '26 Magic Express', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[25]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '27 Mountain', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[26]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '28 Playa', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[27]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '29 Arcade', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[28]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '30 Server Room', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[29]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '31 Undead Workshop', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[30]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '32 Retro TV', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[31]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', '33 Meeting Room', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Normal[32]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S1 Catacombs', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[0]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S2 Mines', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[1]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S3 Ruins', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[2]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S4 Grotto', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[3]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S5 Altar', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[4]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S6 Tree', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[5]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S7 Magma', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[6]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S8 Temple', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[7]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S9 Pyramid', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[8]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S10 Fortress', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[9]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S11 Circus', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[10]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S12 Hell', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[11]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S13 Floor', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[12]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S14 Easteros', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[13]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S15 Academy', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[14]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S16 Hemorridor', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[15]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S17 Nordic', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[16]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S18 Greek', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[17]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S19 Birthday', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[18]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S20 Dragons', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[19]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S21 Horror', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[20]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S22 Superheroes', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[21]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S23 Anime', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[22]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S24 Giant Monsters', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[23]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S25 City', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[24]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S26 Magic Express', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[25]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S27 Mountain', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[26]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S28 Playa', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[27]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S29 Arcade', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[28]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S30 Server Room', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[29]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S31 Undead Workshop', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[30]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S32 Retro TV', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[31]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'S33 Meeting Room', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Shadow[32]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'C1 Warrior', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Class[0]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'C2 Mage', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Class[1]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'C3 Scout', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Class[2]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'C4 Necromancer', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Class[3]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'C5 Aberrations', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Class[4]) : undefined)
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Youtube', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Youtube) : undefined),
  statistics: false,
  width: 120
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Sandstorm', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Sandstorm) : undefined),
  statistics: false,
  width: 120
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Twister', {
  expr: (p) => (p.Dungeons ? Math.max(0, p.Dungeons.Twister) : undefined),
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Scrolls', {
  expr: (p) => p.Witch?.Stage
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Scroll Finish', {
  expr: (p) => p.Witch?.Finish,
  format: 'datetime',
  difference: false,
  statistics: false,
  width: 160
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Witch Item', {
  expr: (p) => p.Witch?.Item,
  format: (p, x: number) => (x ? globalLocalize(`general.item${x}`) : '')
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Witch Items', {
  expr: (p) => p.Witch?.Items
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Witch Items Required', {
  expr: (p) => p.Witch?.ItemsNext
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Registered', {
  expr: (p) => p.Registered,
  format: 'datetime',
  width: 160,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Heart of Darkness', {
  expr: (p) => p.Underworld?.Heart,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Underworld Gate', {
  expr: (p) => p.Underworld?.Gate,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Gold Pit', {
  expr: (p) => p.Underworld?.GoldPit,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Extractor', {
  expr: (p) => p.Underworld?.Extractor,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Goblin Pit', {
  expr: (p) => p.Underworld?.GoblinPit,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Goblin Upgrades', {
  expr: (p) => p.Underworld?.GoblinUpgrades,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Torture Chamber', {
  expr: (p) => p.Underworld?.Torture,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Gladiator Trainer', {
  expr: (p) => p.Fortress?.Gladiator,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Gladiator', {
  expr: (p) => p.Fortress?.Gladiator,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Troll Block', {
  expr: (p) => p.Underworld?.TrollBlock,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Troll Upgrades', {
  expr: (p) => p.Underworld?.TrollUpgrades,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Time Machine', {
  expr: (p) => p.Underworld?.TimeMachine,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Time Machine Shrooms', {
  expr: (p) => p.Underworld?.TimeMachineMushrooms,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Keeper', {
  expr: (p) => p.Underworld?.Keeper,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Keeper Upgrades', {
  expr: (p) => p.Underworld?.KeeperUpgrades,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Souls', {
  expr: (p) => p.Underworld?.Souls,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Extractor Max', {
  expr: (p) => p.Underworld?.ExtractorMax,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Max Souls', {
  expr: (p) => p.Underworld?.MaxSouls,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Extractor Hourly', {
  expr: (p) => p.Underworld?.ExtractorHourly,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Gold Pit Max', {
  expr: (p) => p.Underworld?.GoldPitMax,
  format: 'spaced_number',
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Gold Pit Hourly', {
  expr: (p) => p.Underworld?.GoldPitHourly,
  format: 'spaced_number',
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Time Machine Thirst', {
  expr: (p) => p.Underworld?.TimeMachineThirst,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Time Machine Max', {
  expr: (p) => p.Underworld?.TimeMachineMax,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Time Machine Daily', {
  expr: (p) => (p.Underworld && p.Underworld.TimeMachineDaily ? Math.trunc(p.Underworld.TimeMachineDaily * 0.25) : undefined),
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Time Machine Daily Max', {
  expr: (p) => p.Underworld?.TimeMachineDaily,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Underworld Building', {
  expr: (p) => (p.Underworld ? p.Underworld.Upgrade.Building : undefined),
  width: 180,
  format: (p, x: number) => (x >= 0 ? globalLocalize(`general.buildings.underworld${x + 1}`) : ''),
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Underworld Building Finish', {
  expr: (p) => (p.Underworld ? p.Underworld.Upgrade.Finish : -1),
  format: 'datetime',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Underworld Building Start', {
  expr: (p) => (p.Underworld ? p.Underworld.Upgrade.Start : -1),
  format: 'datetime',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Woodcutter Max', {
  expr: (p) => p.Fortress?.WoodcutterMax,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Quarry Max', {
  expr: (p) => p.Fortress?.QuarryMax,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Academy Max', {
  expr: (p) => p.Fortress?.AcademyMax,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Wood Capacity', {
  expr: (p) => p.Fortress?.MaxWood,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Stone Capacity', {
  expr: (p) => p.Fortress?.MaxStone,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Stashed Wood', {
  expr: (p) => p.Fortress?.SecretWood
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Stashed Stone', {
  expr: (p) => p.Fortress?.SecretStone
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Stashed Wood Capacity', {
  expr: (p) => p.Fortress?.SecretWoodLimit
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Stashed Stone Capacity', {
  expr: (p) => p.Fortress?.SecretStoneLimit
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Sacrifices', {
  expr: (p) => p.Idle?.Sacrifices,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Money', {
  expr: (p) => p.Idle?.Money,
  format: 'exponential_number',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Calendar Type', {
  expr: (p) => p.CalendarType,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Calendar Day', {
  expr: (p) => p.CalendarDay,
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Runes Collected', {
  expr: (p) => p.Idle?.Runes,
  format: 'exponential_number',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Runes Ready', {
  expr: (p) => p.Idle?.ReadyRunes,
  format: 'exponential_number',
  difference: false,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Idle Upgrades', {
  expr: (p) => p.Idle?.Upgrades?.Total,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Speed Upgrades', {
  expr: (p) => p.Idle?.Upgrades?.Speed,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Money Upgrades', {
  expr: (p) => p.Idle?.Upgrades?.Money,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Shadow Count', {
  expr: (p) => p.Pets?.ShadowCount,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Light Count', {
  expr: (p) => p.Pets?.LightCount,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Earth Count', {
  expr: (p) => p.Pets?.EarthCount,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Fire Count', {
  expr: (p) => p.Pets?.FireCount,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Water Count', {
  expr: (p) => p.Pets?.WaterCount,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Shadow Level', {
  expr: (p) => p.Pets?.ShadowLevel,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Light Level', {
  expr: (p) => p.Pets?.LightLevel,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Earth Level', {
  expr: (p) => p.Pets?.EarthLevel,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Fire Level', {
  expr: (p) => p.Pets?.FireLevel,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Water Level', {
  expr: (p) => p.Pets?.WaterLevel,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Total Pet Level', {
  expr: (p) => p.Pets?.TotalLevel,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Shadow Food', {
  expr: (p) => p.Pets?.ShadowFood,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Light Food', {
  expr: (p) => p.Pets?.LightFood,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Earth Food', {
  expr: (p) => p.Pets?.EarthFood,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Fire Food', {
  expr: (p) => p.Pets?.FireFood,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Water Food', {
  expr: (p) => p.Pets?.WaterFood,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Summer Score', {
  expr: (p) => p.Summer?.TotalPoints,
  statistics: false
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Dummy', {
  expr: (p) => p.Inventory?.Dummy,
  disabled: true
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Backpack', {
  expr: (p) => p.Inventory?.Backpack,
  disabled: true
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Chest', {
  expr: (p) => p.Inventory?.Chest,
  disabled: true
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Bert Items', {
  expr: (p) => p.Inventory?.Bert,
  disabled: true
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Kunigunde Items', {
  expr: (p) => p.Inventory?.Kunigunde,
  disabled: true
})

TABLE_EXPRESSION_CONFIG.register('header', 'private', 'Mark Items', {
  expr: (p) => p.Inventory?.Mark,
  disabled: true
})

/*
  Accessors
*/
TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Item Strength', function (object: ItemModel) {
  return object.Strength.Value
})

TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Item Dexterity', function (object: ItemModel) {
  return object.Dexterity.Value
})

TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Item Intelligence', function (object: ItemModel) {
  return object.Intelligence.Value
})

TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Item Constitution', function (object: ItemModel) {
  return object.Constitution.Value
})

TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Item Luck', function (object: ItemModel) {
  return object.Luck.Value
})

TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Item Attribute', function (object: ItemModel, player) {
  if (player) {
    switch (player.Primary.Type) {
      case 1:
        return object.Strength.Value
      case 2:
        return object.Dexterity.Value
      case 3:
        return object.Intelligence.Value
      default:
        return 0
    }
  } else {
    return 0
  }
})

TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Item Type', function (object: ItemModel) {
  return object.Type
})

TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Item Level', function (object: ItemModel) {
  return object.ItemLevel
})

TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Item Name', function (object: ItemModel) {
  return object.Name
})

TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Item Upgrades', function (object: ItemModel) {
  return object.Upgrades
})

TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Item Rune', function (object: ItemModel) {
  return object.RuneType
})

TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Item Rune Value', function (object: ItemModel) {
  return object.RuneValue
})

TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Item Gem', function (object: ItemModel) {
  return object.GemType
})

TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Item Gem Value', function (object: ItemModel) {
  return object.GemValue
})

TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Item Gold', function (object: ItemModel) {
  return object.SellPrice.Gold
})

TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Item Sell Crystal', function (object: ItemModel) {
  return object.SellPrice.Crystal
})

TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Item Sell Metal', function (object: ItemModel) {
  return object.SellPrice.Metal
})

TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Item Dismantle Crystal', function (object: ItemModel) {
  return object.DismantlePrice.Crystal
})

TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Item Dismantle Metal', function (object: ItemModel) {
  return object.DismantlePrice.Metal
})

TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Potion Type', function (object: PlayerPotion) {
  return object.Type
})

TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Potion Size', function (object: PlayerPotion) {
  return object.Size
})

TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Inventory Kind', function (object: ItemModel) {
  return object.SlotType
})

TABLE_EXPRESSION_CONFIG.register('accessor', 'none', 'Inventory Slot', function (object: ItemModel) {
  return object.SlotIndex
})
