import { formatDate, formatDigitGroups, formatDurationClock, formatNamedNumber } from '@utils/formatting'
import { getCSSBackground, getCSSColor, getCSSFont } from '@utils/colors'
import { globalLocalize } from '@utils/localization'
import { Actions } from './actions'
import { Expression, ExpressionScope } from './expression'
import { TABLE_EXPRESSION_CONFIG } from './expression-config'
import { wrapFields } from './fields'
import { Highlighter } from './highlighter'
import { type ScriptValidator } from './parser'
import { type RuleCondition, type Script } from './script'

export const TableType = {
  Player: 0,
  Players: 2,
  Group: 1,
  Groups: 3
} as const

export type TableType = (typeof TableType)[keyof typeof TableType]

export const ScriptType = {
  Table: 0x1,
  Action: 0x2
} as const

export type ScriptType = (typeof ScriptType)[keyof typeof ScriptType]

const ARGUMENT_MAP_ON_OFF: Record<string, number> = {
  off: 0,
  on: 1
}

const ARGUMENT_MAP_BORDER: Record<string, number> = {
  none: 0,
  left: 1,
  right: 2,
  both: 3,
  top: 4,
  bottom: 5
}

const ARGUMENT_MAP_LINED: Record<string, number> = {
  off: 0,
  on: 1,
  thick: 2,
  thin: 1
}

const ARGUMENT_MAP_RULE: Record<string, RuleCondition> = {
  'above or equal': 'ae',
  'below or equal': 'be',
  'equal or above': 'ae',
  'equal or below': 'be',
  above: 'a',
  below: 'b',
  equal: 'e',
  default: 'd'
}

// The value type depends on the header, so each formatter declares its own
export type ValueFormatter = (current: unknown, value: never) => unknown

export function callFormatter(formatter: ValueFormatter, current: unknown, value: unknown) {
  return (formatter as (current: unknown, value: unknown) => unknown)(current, value)
}

export const ARG_FORMATTERS: Record<string, ValueFormatter> = {
  number: (p, x: number) => (isNaN(x) ? undefined : Number.isInteger(x) ? x : x.toFixed(2)),
  fnumber: (p, x: number) => (isNaN(x) ? undefined : formatDigitGroups(x)),
  spaced_number: (p, x: number) => (isNaN(x) ? undefined : formatDigitGroups(x)),
  nnumber: (p, x: number) => (isNaN(x) ? undefined : formatNamedNumber(x)),
  exponential_number: (p, x: number) => (isNaN(x) ? undefined : x.toExponential(3)),
  date: (p, x: number) => (isNaN(x) ? '' : formatDate(x, true, false)),
  bool: (p, x: unknown) => (x ? globalLocalize('general.yes') : globalLocalize('general.no')),
  boolean: (p, x: unknown) => (x ? globalLocalize('general.yes') : globalLocalize('general.no')),
  datetime: (p, x: number) => (isNaN(x) || x <= 0 ? '' : formatDate(x)),
  time: (p, x: number) => (isNaN(x) ? '' : formatDate(x, false, true)),
  duration: (p, x: number) => (isNaN(x) ? '' : formatDurationClock(x)),
  default: (p, x: string | number) => (typeof x == 'string' ? x : isNaN(x) ? undefined : Number.isInteger(x) ? x : x.toFixed(2))
}

export const FilterTypes: Record<string, TableType> = {
  Guild: TableType.Group,
  Guilds: TableType.Groups,
  Player: TableType.Player,
  Players: TableType.Players
}

type CommandEvaluate = (root: Script, ...params: string[]) => void
type CommandFormat = (root: Script, ...params: string[]) => typeof Highlighter
type CommandValidate = (validator: ScriptValidator, line: number, root: Script, ...params: string[]) => void

type CommandMetadata = {
  evalNever?: boolean
  evalOnRender?: boolean
  isDeprecated?: string
}

export class ScriptCommand {
  #internalEvaluate: CommandEvaluate | null
  #internalFormat: CommandFormat
  #internalValidator: CommandValidate | null = null

  key: string
  type: number
  syntax: {
    text: string
    encodedText: string
    fieldText: string
  }
  regexp: RegExp
  metadata: CommandMetadata

  constructor(key: string, type: number, syntax: string, regexp: RegExp, evaluate: CommandEvaluate | null, format: CommandFormat, metadata: CommandMetadata = {}) {
    this.key = key
    this.type = type
    this.syntax = {
      text: syntax,
      encodedText: syntax.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      fieldText: wrapFields(syntax, true)
    }
    this.regexp = regexp
    this.#internalEvaluate = evaluate
    this.#internalFormat = format
    this.metadata = metadata
  }

  is(string: string) {
    return this.regexp.test(string)
  }

  eval(root: Script, string: string) {
    ;(this.#internalEvaluate as CommandEvaluate)(root, ...this.parseParams(string))
  }

  parseParams(string: string) {
    return (string.match(this.regexp) as RegExpMatchArray).slice(1)
  }

  format(root: Script, string: string) {
    return this.#internalFormat(root, ...this.parseParams(string))
  }

  validate(validator: ScriptValidator, root: Script, line: number, string: string) {
    this.#internalValidator?.(validator, line, root, ...this.parseParams(string))
  }

  withValidation(validator: CommandValidate) {
    this.#internalValidator = validator
  }
}

export class ScriptCommands {
  static #keys: string[] = []
  static #commands: ScriptCommand[] = []
  static #commandsByKey: Record<string, ScriptCommand> = {}

  static register(key: string, type: number, syntax: string, regexp: RegExp, parse: CommandEvaluate | null, format: CommandFormat, metadata?: CommandMetadata) {
    const command = new ScriptCommand(key, type, syntax, regexp, parse, format, metadata)

    this.#commandsByKey[key] = command

    this.#keys.push(key)
    this.#commands.push(command)

    return command
  }

  static get(key: string) {
    return this.#commandsByKey[key]
  }

  static find(predicate: (command: ScriptCommand) => unknown) {
    return this.#commands.find(predicate)
  }

  static keys() {
    return this.#keys
  }

  static commands() {
    return this.#commands
  }

  static pick(text: string, keys: string[]) {
    return keys.map((key) => this.#commandsByKey[key]).find((command) => command && command.is(text))
  }
}

/*
    Command registrations
*/
ScriptCommands.register(
  'MACRO_IFNOT',
  ScriptType.Table,
  'if not <expression>',
  /^if not (.+)$/,
  null,
  (root, arg) => {
    const acc = Highlighter.keyword('if not ')

    if (arg in FilterTypes) {
      return acc.value(arg).asMacro()
    } else {
      return acc.expression(arg, root).asMacro()
    }
  },
  { evalNever: true }
)

ScriptCommands.register(
  'MACRO_IF',
  ScriptType.Table,
  'if <expression>',
  /^if (.+)$/,
  null,
  (root, arg) => {
    const acc = Highlighter.keyword('if ')

    if (arg in FilterTypes) {
      return acc.value(arg).asMacro()
    } else {
      return acc.expression(arg, root).asMacro()
    }
  },
  { evalNever: true }
)

ScriptCommands.register(
  'MACRO_ELSEIF',
  ScriptType.Table,
  'else if <expression>',
  /^else if (.+)$/,
  null,
  (root, arg) => {
    const acc = Highlighter.keyword('else if ')

    if (arg in FilterTypes) {
      return acc.value(arg).asMacro()
    } else {
      return acc.expression(arg, root).asMacro()
    }
  },
  { evalNever: true }
)

ScriptCommands.register('MACRO_ELSE', ScriptType.Table, 'else', /^else$/, null, () => Highlighter.keyword('else').asMacro(), { evalNever: true })

ScriptCommands.register('MACRO_LOOP', ScriptType.Table, 'loop <params> for <expression>', /^loop (\w+(?:\s*\,\s*\w+)*) for (.+)$/, null, (root, name, array) => Highlighter.keyword('loop ').value(name).keyword(' for ').expression(array, root).asMacro(), { evalNever: true })

ScriptCommands.register('MACRO_END', ScriptType.Table, 'end', /^end$/, null, () => Highlighter.keyword('end').asMacro(), { evalNever: true })

ScriptCommands.register(
  'MACRO_FUNCTION',
  ScriptType.Table,
  'mset <name> with <params> as <expression>',
  /^mset (\w+[\w ]*) with (\w+[\w ]*(?:,\s*\w+[\w ]*)*) as (.+)$/,
  (root, name, args, expression) => {
    const ast = Expression.create(expression, root)
    if (ast) {
      root.addFunction(
        name,
        ast,
        args.split(',').map((v) => v.trim())
      )
    }
  },
  (root, name, args, expression) => Highlighter.deprecatedKeyword('mset').space().function(name).space().deprecatedKeyword('with').space().join(args.split(','), 'value').space().deprecatedKeyword('as').space().expression(expression, root).asMacro(),
  { evalNever: true, evalOnRender: true, isDeprecated: 'TABLE_FUNCTION' }
)

ScriptCommands.register(
  'MACRO_VARIABLE',
  ScriptType.Table,
  'mset <name> as <expression>',
  /^mset (\w+[\w ]*) as (.+)$/,
  (root, name, expression) => {
    const ast = Expression.create(expression, root)
    if (ast) {
      root.addVariable(name, ast, 'global')
    }
  },
  (root, name, expression) => Highlighter.deprecatedKeyword('mset').space().constant(name).space().deprecatedKeyword('as').space().expression(expression, root).asMacro(),
  { evalOnRender: true, isDeprecated: 'VARIABLE_GLOBAL' }
)

ScriptCommands.register(
  'MACRO_CONST',
  ScriptType.Table,
  'const <name> <value>',
  /^const (\w+) (.+)$/,
  (root, name, value) => root.constants.add(name, value),
  (root, name, value) => Highlighter.keyword('const ').constant(name).space(1).value(value),
  { evalOnRender: true }
)

ScriptCommands.register(
  'MACRO_CONSTEXPR',
  ScriptType.Table,
  'constexpr <name> <expression>',
  /^constexpr (\w+) (.+)$/,
  (root, name, expression) => {
    const ast = Expression.create(expression)
    if (ast) {
      root.constants.add(name, ast.eval(new ExpressionScope(root)))
    }
  },
  (root, name, expression) => Highlighter.keyword('constexpr ').constant(name).space().expression(expression, root),
  { evalOnRender: true }
)

ScriptCommands.register(
  'TABLE_SERVER',
  ScriptType.Table,
  'server <value>',
  /^server (\S+)$/,
  (root, value) => {
    if (value === 'on') {
      root.addGlobal('server', 100)
    } else if (value === 'off') {
      root.addGlobal('server', 0)
    } else {
      const val = root.constants.fetch(value)

      if (!isNaN(Number(val))) {
        root.addGlobal('server', Number(val))
      }
    }
  },
  (root, value) => {
    const acc = Highlighter.keyword('server ')

    if (value === 'on') {
      return acc.boolean(value, true)
    } else if (value === 'off') {
      return acc.boolean(value, false)
    } else if (root.constants.has(value)) {
      const val = root.constants.get(value)

      if (isNaN(Number(val))) {
        return acc.error(value)
      } else {
        return acc.constant(value)
      }
    } else if (isNaN(Number(value))) {
      return acc.error(value)
    } else {
      return acc.value(value)
    }
  }
)

ScriptCommands.register(
  'TABLE_NAME',
  ScriptType.Table,
  'name <value>',
  /^name (\S+)$/,
  (root, value) => {
    const val = root.constants.fetch(value)

    if (!isNaN(Number(val))) {
      root.addGlobal('name', Number(val))
    }
  },
  (root, value) => {
    const acc = Highlighter.keyword('name ')

    if (root.constants.has(value)) {
      const val = root.constants.get(value)

      if (isNaN(Number(val))) {
        return acc.error(value)
      } else {
        return acc.constant(value)
      }
    } else if (isNaN(Number(value))) {
      return acc.error(value)
    } else {
      return acc.value(value)
    }
  }
)

ScriptCommands.register(
  'TABLE_WIDTH_POLICY',
  ScriptType.Table,
  'width policy <strict|relaxed>',
  /^width policy (strict|relaxed)$/,
  (root, value) => root.addGlobal('widthPolicy', value),
  (root, value) =>
    Highlighter.keyword('width policy')
      .space(1)
      .boolean(value, value === 'strict')
)

ScriptCommands.register(
  'TABLE_WIDTH',
  ScriptType.Table,
  'width <value>',
  /^width (\S+)$/,
  (root, value) => {
    const val = root.constants.fetch(value)

    if (!isNaN(Number(val))) {
      root.addShared('width', Number(val))
    }
  },
  (root, value) => {
    const acc = Highlighter.keyword('width ')

    if (root.constants.has(value)) {
      const val = root.constants.get(value)

      if (isNaN(Number(val))) {
        return acc.error(value)
      } else {
        return acc.constant(value)
      }
    } else if (isNaN(Number(value))) {
      return acc.error(value)
    } else {
      return acc.value(value)
    }
  }
)

ScriptCommands.register(
  'TABLE_COLUMNS',
  ScriptType.Table,
  'columns <value>',
  /^columns (\w+[\w ]*(?:,\s*\w+[\w ]*)*)$/,
  (root, parts) => {
    const values = parts
      .split(',')
      .map((p) => root.constants.fetch(p.trim()))
      .map((v) => (isNaN(Number(v)) ? 0 : parseInt(String(v))))
    if (values.length > 0) {
      root.addDirectValue('columns', values)
    }
  },
  (root, parts) => {
    return Highlighter.keyword('columns ').join(parts.split(','), (part) => {
      const value = part.trim()

      if (root.constants.has(value)) {
        const val = root.constants.get(value)

        if (isNaN(Number(val))) {
          return 'error'
        } else {
          return 'constant'
        }
      } else if (isNaN(Number(value))) {
        return 'error'
      } else {
        return 'value'
      }
    })
  }
)

ScriptCommands.register(
  'TABLE_NOT_DEFINED_VALUE',
  ScriptType.Table,
  'not defined value <value>',
  /^not defined value (.+)$/,
  (root, value) => {
    const val = root.constants.fetch(value)

    root.addShared('formatUndefined', val)
  },
  (root, value) => {
    const acc = Highlighter.keyword('not defined value ')

    if (root.constants.has(value)) {
      return acc.constant(value)
    } else {
      return acc.value(value)
    }
  }
)

ScriptCommands.register(
  'TABLE_NOT_DEFINED_COLOR',
  ScriptType.Table,
  'not defined color <value>',
  /^not defined color (.+)$/,
  (root, value) => {
    const val = getCSSColor(root.constants.fetch(value))

    if (val) {
      root.addShared('colorUndefined', val)
    }
  },
  (root, value) => {
    const acc = Highlighter.keyword('not defined color ')
    const val = getCSSColor(root.constants.fetch(value))

    if (val) {
      if (root.constants.has(value)) {
        return acc.constant(value)
      } else {
        return acc.color(value, val)
      }
    } else {
      return acc.error(value)
    }
  }
)

ScriptCommands.register(
  'TABLE_VALUE_DEFAULT',
  ScriptType.Table,
  'value default <value>',
  /^value default (\S+[\S ]*)$/,
  (root, value) => {
    const val = root.constants.fetch(value)

    if (val != undefined) {
      root.addValueRule('d', 0, val)
    }
  },
  (root, value) => {
    const acc = Highlighter.keyword('value ').constant('default ')

    if (root.constants.has(value)) {
      return acc.constant(value)
    } else {
      return acc.value(value)
    }
  }
)

ScriptCommands.register(
  'TABLE_VALUE_RULE',
  ScriptType.Table,
  'value <operator> <reference> <value>',
  /^value (equal or above|above or equal|below or equal|equal or below|equal|above|below) (.+) (\S+[\S ]*)$/,
  (root, rule, value, value2) => {
    const ref = root.constants.fetch(value)
    const val = root.constants.fetch(value2)

    if (val != undefined && ref != undefined) {
      root.addValueRule(ARGUMENT_MAP_RULE[rule], ref, val)
    }
  },
  (root, rule, value, value2) => {
    const acc = Highlighter.keyword('value ').constant(rule).space()

    if (root.constants.has(value)) {
      acc.constant(value)
    } else {
      acc.value(value)
    }

    acc.space()

    if (root.constants.has(value2)) {
      acc.constant(value2)
    } else {
      acc.value(value2)
    }

    return acc
  }
)

ScriptCommands.register(
  'TABLE_COLOR_DEFAULT',
  ScriptType.Table,
  'color default <color>',
  /^color default (\S+[\S ]*)$/,
  (root, value) => {
    const val = getCSSColor(root.constants.fetch(value))

    if (val != undefined && val) {
      root.addColorRule('d', 0, val)
    }
  },
  (root, value) => {
    const acc = Highlighter.keyword('color ').constant('default ')
    const val = getCSSColor(root.constants.fetch(value))

    if (val) {
      if (root.constants.has(value)) {
        return acc.constant(value)
      } else {
        return acc.color(value, val)
      }
    } else {
      return acc.error(value)
    }
  }
)

ScriptCommands.register(
  'TABLE_COLOR_RULE',
  ScriptType.Table,
  'color <operator> <reference> <color>',
  /^color (equal or above|above or equal|below or equal|equal or below|equal|above|below) (.+) (\S+[\S ]*)$/,
  (root, rule, value, value2) => {
    const ref = root.constants.fetch(value)
    const val = getCSSColor(root.constants.fetch(value2))

    if (val != undefined && ref != undefined && val) {
      root.addColorRule(ARGUMENT_MAP_RULE[rule], ref, val)
    }
  },
  (root, rule, value, value2) => {
    const acc = Highlighter.keyword('color ').constant(rule).space()
    const val = getCSSColor(root.constants.fetch(value2))

    if (root.constants.has(value)) {
      acc.constant(value)
    } else {
      acc.value(value)
    }

    acc.space()

    if (val) {
      if (root.constants.has(value2)) {
        acc.constant(value2)
      } else {
        acc.color(value2, val)
      }
    } else {
      acc.error(value2)
    }

    return acc
  }
)

ScriptCommands.register(
  'TABLE_ALIAS',
  ScriptType.Table,
  'alias <value>',
  /^alias (.+)$/,
  (root, value) => {
    const val = root.constants.fetch(value)

    if (val != undefined) {
      root.addNameValue('nameOverride', val)
    }
  },
  (root, value) => {
    const acc = Highlighter.keyword('alias ')

    if (root.constants.has(value)) {
      return acc.constant(value)
    } else {
      return acc.value(value)
    }
  }
)

ScriptCommands.register(
  'TABLE_FORMAT_STATISTICS',
  ScriptType.Table,
  'format statistics <expression>',
  /^format statistics (.+)$/,
  (root, expression) => {
    if (expression === 'on' || expression === 'off') {
      root.addDirectValue('statisticsFormat', expression === 'on')
    } else if (ARG_FORMATTERS.hasOwnProperty(expression)) {
      root.addDirectValue('statisticsFormat', ARG_FORMATTERS[expression])
    } else {
      const ast = Expression.create(expression, root)
      if (ast) {
        root.addDirectValue('statisticsFormat', ast)
      }
    }
  },
  (root, expression) => {
    const acc = Highlighter.keyword('format statistics ')

    if (expression === 'on' || expression == 'off') {
      return acc.boolean(expression, expression === 'on')
    } else if (ARG_FORMATTERS.hasOwnProperty(expression)) {
      return acc.constant(expression)
    } else {
      return acc.expression(expression, root)
    }
  }
)

ScriptCommands.register(
  'TABLE_FORMAT_DIFFERENCE',
  ScriptType.Table,
  'format difference <expression>',
  /^format difference (.+)$/,
  (root, expression) => {
    if (expression == 'on') {
      root.addDirectValue('differenceFormat', true)
    } else if (expression == 'off') {
      root.addDirectValue('differenceFormat', false)
    } else if (ARG_FORMATTERS.hasOwnProperty(expression)) {
      root.addDirectValue('differenceFormat', ARG_FORMATTERS[expression])
    } else {
      const ast = Expression.create(expression, root)
      if (ast) {
        root.addDirectValue('differenceFormat', ast)
      }
    }
  },
  (root, expression) => {
    const acc = Highlighter.keyword('format difference ')

    if (expression === 'on' || expression == 'off') {
      return acc.boolean(expression, expression === 'on')
    } else if (ARG_FORMATTERS.hasOwnProperty(expression)) {
      return acc.constant(expression)
    } else {
      return acc.expression(expression, root)
    }
  }
)

ScriptCommands.register(
  'TABLE_BACKGROUND',
  ScriptType.Table,
  'background <color>',
  /^background (.+)$/,
  (root, value) => {
    const val = getCSSColor(root.constants.fetch(value))

    if (val != undefined && val) {
      root.addShared('colorBackground', val)
    }
  },
  (root, value) => {
    const acc = Highlighter.keyword('background ')
    const val = getCSSColor(root.constants.fetch(value))

    if (val) {
      if (root.constants.has(value)) {
        return acc.constant(value)
      } else {
        return acc.color(value, val)
      }
    } else {
      return acc.error(value)
    }
  }
)

ScriptCommands.register(
  'TABLE_FORMAT',
  ScriptType.Table,
  'expf <expression>',
  /^expf (.+)$/,
  (root, expression) => {
    if (ARG_FORMATTERS.hasOwnProperty(expression)) {
      root.addDirectValue('format', ARG_FORMATTERS[expression])
    } else {
      const ast = Expression.create(expression, root)
      if (ast) {
        root.addDirectValue('format', ast)
      }
    }
  },
  (root, expression) => {
    const acc = Highlighter.keyword('expf').space()

    if (ARG_FORMATTERS.hasOwnProperty(expression)) {
      return acc.constant(expression)
    } else {
      return acc.expression(expression, root)
    }
  }
)

ScriptCommands.register(
  'TABLE_FORMAT_LONG',
  ScriptType.Table,
  'format <expression>',
  /^format (.+)$/,
  (root, expression) => {
    if (ARG_FORMATTERS.hasOwnProperty(expression)) {
      root.addDirectValue('format', ARG_FORMATTERS[expression])
    } else {
      const ast = Expression.create(expression, root)
      if (ast) {
        root.addDirectValue('format', ast)
      }
    }
  },
  (root, expression) => {
    const acc = Highlighter.deprecatedKeyword('format').space()

    if (ARG_FORMATTERS.hasOwnProperty(expression)) {
      return acc.constant(expression)
    } else {
      return acc.expression(expression, root)
    }
  },
  { isDeprecated: 'TABLE_FORMAT' }
)

ScriptCommands.register(
  'TABLE_CATEGORY',
  ScriptType.Table,
  'category (name)',
  /^((?:\w+)(?:\,\w+)*:|)category(?: (.+))?$/,
  (root, extensions, name) => {
    root.addCategory(name || '')
    if (extensions) {
      root.addExtension(...extensions.slice(0, -1).split(','))
    }
  },
  (root, extensions, name) => {
    const acc = Highlighter.constant(extensions || '').keyword('category')

    if (name) {
      return acc.space().identifier(name)
    } else {
      return acc
    }
  }
)

ScriptCommands.register(
  'TABLE_HEADER_REPEAT',
  ScriptType.Table,
  'repeat <value>',
  /^repeat (\d+)$/,
  (root, count) => {
    if (Number(count) > 0) {
      root.addHeaderLocal('grouped', Number(count))
    }
  },
  (root, count) => Highlighter.keyword('repeat ').identifier(count)
)

ScriptCommands.register(
  'TABLE_GROUPED_HEADER',
  ScriptType.Table,
  'header (name) as group of <value>',
  /^((?:\w+)(?:\,\w+)*:|)header(?: (.+))? as group of (\d+)$/,
  (root, extensions, name, length) => {
    if (Number(length) > 0) {
      root.addHeader(name || '')
      root.addHeaderLocal('grouped', Number(length))
      if (extensions) {
        root.addExtension(...extensions.slice(0, -1).split(','))
      }
    }
  },
  (root, extensions, name, length) => {
    const acc = Highlighter.constant(extensions || '').deprecatedKeyword('header')

    if (name != undefined) {
      acc.space()

      const data = TABLE_EXPRESSION_CONFIG.find(name, 'header')
      if (data && !data.data.disabled) {
        acc.header(name, data.meta)
      } else {
        acc.identifier(name)
      }
    }

    return acc.space(1).deprecatedKeyword('as group of').space(1).value(length)
  },
  { isDeprecated: 'TABLE_HEADER_REPEAT' }
)

ScriptCommands.register(
  'TABLE_HEADER',
  ScriptType.Table,
  'header (name)',
  /^((?:\w+)(?:\,\w+)*:|)header(?: (.+))?$/,
  (root, extensions, name) => {
    root.addHeader(name || '')
    if (extensions) {
      root.addExtension(...extensions.slice(0, -1).split(','))
    }
  },
  (root, extensions, name) => {
    const acc = Highlighter.constant(extensions || '').keyword('header')

    if (name != undefined) {
      acc.space()

      const data = TABLE_EXPRESSION_CONFIG.find(name, 'header')
      if (data && !data.data.disabled) {
        acc.header(name, data.meta)
      } else {
        acc.identifier(name)
      }
    }

    return acc
  }
)

ScriptCommands.register(
  'TABLE_ROW_HEIGHT',
  ScriptType.Table,
  'row height <value>',
  /^row height (\d+)$/,
  (root, value) => {
    if (Number(value) > 0) {
      root.addGlobalEmbedable('rowHeight', Number(value))
    }
  },
  (root, value) => Highlighter.keyword('row height ')[Number(value) > 0 ? 'value' : 'error'](value)
)

ScriptCommands.register(
  'TABLE_ROW',
  ScriptType.Table,
  'row (name)',
  /^((?:\w+)(?:\,\w+)*:|)row(?: (.+))?$/,
  (root, extensions, name) => {
    root.addRow(name || '')

    if (extensions) {
      root.addExtension(...extensions.slice(0, -1).split(','))
    }
  },
  (root, extensions, name) => {
    const acc = Highlighter.constant(extensions || '').keyword('row')

    if (name != undefined) {
      return acc.space().identifier(name)
    } else {
      return acc
    }
  }
)

ScriptCommands.register(
  'TABLE_ROW_COMPACT',
  ScriptType.Table,
  'show <name> as <expression>',
  /^((?:\w+)(?:\,\w+)*:|)show (\S+[\S ]*) as (\S+[\S ]*)$/,
  (root, extensions, name, expression) => {
    const ast = Expression.create(expression, root)
    if (ast) {
      root.addRow(name)
      root.addDirectValue('expr', ast)

      if (extensions) {
        root.addExtension(...extensions.slice(0, -1).split(','))
      }
    }
  },
  (root, extensions, name, expression) =>
    Highlighter.constant(extensions || '')
      .deprecatedKeyword('show')
      .space(1)
      .identifier(name)
      .space(1)
      .deprecatedKeyword('as')
      .space(1)
      .expression(expression, root),
  { isDeprecated: 'TABLE_ROW' }
)

ScriptCommands.register(
  'TABLE_VAR',
  ScriptType.Table,
  'var <name> <value>',
  /^var (\w+) (.+)$/,
  (root, name, value) => root.addHeaderVariable(name, value),
  (root, name, value) => Highlighter.keyword('var ').constant(name).space().value(value)
)

ScriptCommands.register(
  'TABLE_EMBED_END',
  ScriptType.Table,
  'embed end',
  /^embed end$/,
  (root) => root.pushEmbed(),
  () => Highlighter.keyword('embed end')
)

ScriptCommands.register(
  'TABLE_EMBED',
  ScriptType.Table,
  'embed (name)',
  /^((?:\w+)(?:\,\w+)*:|)embed(?: (.+))?$/,
  (root, extensions, name) => {
    root.embedBlock(name || '')
    if (extensions) {
      root.addExtension(...extensions.slice(0, -1).split(','))
    }
  },
  (root, extensions, name) => {
    const acc = Highlighter.constant(extensions || '').keyword('embed')
    if (name) {
      return acc.space().identifier(name)
    } else {
      return acc
    }
  }
)

ScriptCommands.register(
  'TABLE_LAYOUT',
  ScriptType.Table,
  'layout <value>',
  /^layout ((\||\_|table|missing|statistics|rows|members)(\s+(\||\_|table|missing|statistics|rows|members))*)$/,
  (root, layout) =>
    root.addGlobal(
      'layout',
      layout.split(/\s+/).map((v) => v.trim())
    ),
  (root, layout) => Highlighter.keyword('layout ').constant(layout)
)

ScriptCommands.register(
  'VARIABLE_TABLE_LONG',
  ScriptType.Table,
  'set <name> with all as <expression>',
  /^set (\w+[\w ]*) with all as (.+)$/,
  (root, name, expression) => {
    const ast = Expression.create(expression, root)
    if (ast) {
      root.addVariable(name, ast, 'table')
    }
  },
  (root, name, expression) => Highlighter.deprecatedKeyword('set').space().variable(name, 'table').space().deprecatedKeyword('with all as').space().expression(expression, root),
  { evalOnRender: true, isDeprecated: 'VARIABLE_TABLE' }
)

ScriptCommands.register(
  'TABLE_FUNCTION',
  ScriptType.Table,
  'set <name> with <params> as <expression>',
  /^set (\w+[\w ]*) with (\w+[\w ]*(?:,\s*\w+[\w ]*)*) as (.+)$/,
  (root, name, args, expression) => {
    const ast = Expression.create(expression, root)
    if (ast) {
      root.addFunction(
        name,
        ast,
        args.split(',').map((v) => v.trim())
      )
    }
  },
  (root, name, args, expression) => Highlighter.keyword('set ').function(name).keyword(' with ').join(args.split(','), 'value').keyword(' as ').expression(expression, root),
  { evalOnRender: true }
)

ScriptCommands.register(
  'VARIABLE_TABLE',
  ScriptType.Table,
  'table set <name> as <expression>',
  /^table set (\w+[\w ]*) as (.+)$/,
  (root, name, expression) => {
    const ast = Expression.create(expression, root)
    if (ast) {
      root.addVariable(name, ast, 'table')
    }
  },
  (root, name, expression) => Highlighter.keyword('table set ').variable(`${name}`, 'table').keyword(' as ').expression(expression, root),
  { evalOnRender: true }
)

ScriptCommands.register(
  'VARIABLE_GLOBAL',
  ScriptType.Table,
  'global set <name> as <expression>',
  /^global set (\w+[\w ]*) as (.+)$/,
  (root, name, expression) => {
    const ast = Expression.create(expression, root)
    if (ast) {
      root.addVariable(name, ast, 'global')
    }
  },
  (root, name, expression) => Highlighter.keyword('global set ').variable(`${name}`, 'global').keyword(' as ').expression(expression, root),
  { evalOnRender: true }
)

ScriptCommands.register(
  'VARIABLE_TABLE_SHORT',
  ScriptType.Table,
  'set $<name> as <expression>',
  /^set \$(\w+[\w ]*) as (.+)$/,
  (root, name, expression) => {
    const ast = Expression.create(expression, root)
    if (ast) {
      root.addVariable(name, ast, 'table')
    }
  },
  (root, name, expression) => Highlighter.deprecatedKeyword('set').space().variable(`$${name}`, 'table').space().deprecatedKeyword('as').space().expression(expression, root),
  { evalOnRender: true, isDeprecated: 'VARIABLE_TABLE' }
)

ScriptCommands.register(
  'VARIABLE_GLOBAL_SHORT',
  ScriptType.Table,
  'set $$<name> as <expression>',
  /^set \$\$(\w+[\w ]*) as (.+)$/,
  (root, name, expression) => {
    const ast = Expression.create(expression, root)
    if (ast) {
      root.addVariable(name, ast, 'global')
    }
  },
  (root, name, expression) => Highlighter.deprecatedKeyword('set').space().variable(`$$${name}`, 'global').space().deprecatedKeyword('as').space().expression(expression, root),
  { evalOnRender: true, isDeprecated: 'VARIABLE_GLOBAL' }
)

ScriptCommands.register(
  'VARIABLE_LOCAL',
  ScriptType.Table,
  'set <name> as <expression>',
  /^set (\w+[\w ]*) as (.+)$/,
  (root, name, expression) => {
    const ast = Expression.create(expression, root)
    if (ast) {
      root.addVariable(name, ast, 'local')
    }
  },
  (root, name, expression) => Highlighter.keyword('set ').variable(name, 'local').keyword(' as ').expression(expression, root),
  { evalOnRender: true }
)

ScriptCommands.register(
  'TABLE_GLOBAL_LINED',
  ScriptType.Table,
  'lined <on|off|thin|thick>',
  /^lined( (on|off|thin|thick))?$/,
  (root, params, value) => root.addGlobal('lined', params ? ARGUMENT_MAP_LINED[value] : 1),
  (root, params, value) => {
    const acc = Highlighter.keyword('lined')
    if (params) {
      return acc.space(1).boolean(value, value !== 'off')
    } else {
      return acc
    }
  }
)

ScriptCommands.register(
  'TABLE_GLOBAL_THEME',
  ScriptType.Table,
  'theme <light|dark>',
  /^theme (light|dark)$/,
  (root, value) => root.setTheme(value),
  (root, value) => Highlighter.keyword('theme ').boolean(value, true)
)

ScriptCommands.register(
  'TABLE_GLOBAL_THEME_CUSTOM',
  ScriptType.Table,
  'theme text:<value> background:<value>',
  /^theme text:(\S+) background:(\S+)$/,
  (root, textColor, backgroundColor) => {
    root.setTheme({
      text: getCSSColor(textColor),
      background: getCSSBackground(backgroundColor)
    })
  },
  (root, textColor, backgroundColor) => Highlighter.keyword('theme ').constant('text:').color(textColor, getCSSColor(textColor)).constant(' background:').color(backgroundColor, getCSSColor(backgroundColor))
)

ScriptCommands.register(
  'TABLE_GLOBAL_LIMIT',
  ScriptType.Table,
  'limit <value>',
  /^limit (\d+)$/,
  (root, value) => {
    if (Number(value) > 0) {
      root.addGlobal('limit', Number(value))
    }
  },
  (root, value) => Highlighter.keyword('limit ')[Number(value) > 0 ? 'value' : 'error'](value)
)

ScriptCommands.register(
  'TABLE_GLOBAL_PERFORMANCE',
  ScriptType.Table,
  'performance <value>',
  /^performance (\d+)$/,
  (root, value) => {
    if (Number(value) > 0) {
      root.addGlobal('limit', Number(value))
    }
  },
  (root, value) => Highlighter.deprecatedKeyword('performance').space(1)[Number(value) > 0 ? 'value' : 'error'](value),
  { isDeprecated: 'TABLE_GLOBAL_LIMIT' }
)

ScriptCommands.register(
  'TABLE_GLOBAL_SCALE',
  ScriptType.Table,
  'scale <value>',
  /^scale (\d+)$/,
  (root, value) => {
    if (Number(value) > 0) {
      root.addGlobal('scale', Number(value))
    }
  },
  (root, value) => Highlighter.keyword('scale ')[Number(value) > 0 ? 'value' : 'error'](value)
)

ScriptCommands.register(
  'TABLE_FONT',
  ScriptType.Table,
  'font <value>',
  /^font (.+)$/,
  (root, font) => {
    const value = getCSSFont(font)
    if (value) {
      root.addGlobalEmbedable('font', value)
    }
  },
  (root, font) => Highlighter.keyword('font ')[getCSSFont(font) ? 'value' : 'error'](font)
)

ScriptCommands.register(
  'TABLE_BORDER_COLOR',
  ScriptType.Table,
  'border color <value>',
  /^border color (.+)$/,
  (root, value) => {
    const val = getCSSColor(root.constants.fetch(value))
    if (val != undefined && val) {
      root.addGlobal('borderColor', val)
    }
  },
  (root, value) => {
    const acc = Highlighter.keyword('border color ')
    const val = getCSSColor(root.constants.fetch(value))

    if (val) {
      if (root.constants.has(value)) {
        return acc.constant(value)
      } else {
        return acc.color(value, val)
      }
    } else {
      return acc.error(value)
    }
  }
)

ScriptCommands.register(
  'TABLE_SHARED_STATISTICS_COLOR',
  ScriptType.Table,
  'statistics color <value>',
  /^statistics color (.+)$/,
  (root, value) => {
    if (value === 'on' || value === 'off') {
      root.addShared('statisticsColor', value === 'on')
    } else {
      const expression = Expression.create(value, root)
      if (expression) {
        root.addShared('statisticsColor', expression)
      }
    }
  },
  (root, value) => {
    const acc = Highlighter.keyword('statistics color').space()

    if (value === 'on' || value === 'off') {
      return acc.boolean(value, value === 'on')
    } else {
      return acc.expression(value, root)
    }
  }
)

ScriptCommands.register(
  'TABLE_SHARED_BREAKLINE',
  ScriptType.Table,
  'breakline <on|off>',
  /^breakline (on|off)$/,
  (root, value) => root.addStyle('white-space', value === 'on' ? 'normal' : 'nowrap'),
  (root, value) =>
    Highlighter.deprecatedKeyword('breakline')
      .space()
      .boolean(value, value == 'on'),
  { isDeprecated: 'TABLE_STYLE' }
)

ScriptCommands.register(
  'TABLE_SHARED_VISIBLE',
  ScriptType.Table,
  'visible <on|off>',
  /^visible (on|off)$/,
  (root, value) => root.addShared('visible', ARGUMENT_MAP_ON_OFF[value]),
  (root, value) =>
    Highlighter.keyword('visible')
      .space()
      .boolean(value, value == 'on')
)

ScriptCommands.register(
  'TABLE_SHARED_DECIMAL',
  ScriptType.Table,
  'decimal <on|off>',
  /^decimal (on|off)$/,
  (root, value) => root.addShared('decimal', ARGUMENT_MAP_ON_OFF[value]),
  (root, value) =>
    Highlighter.keyword('decimal')
      .space()
      .boolean(value, value == 'on')
)

ScriptCommands.register(
  'TABLE_SHARED_GRAIL',
  ScriptType.Table,
  'grail <on|off>',
  /^grail (on|off)$/,
  (root, value) => root.addShared('grail', ARGUMENT_MAP_ON_OFF[value]),
  (root, value) =>
    Highlighter.keyword('grail')
      .space()
      .boolean(value, value == 'on')
)

ScriptCommands.register(
  'TABLE_SHARED_MAXIMUM',
  ScriptType.Table,
  'maximum <on|off>',
  /^maximum (on|off)$/,
  (root, value) => root.addShared('maximum', ARGUMENT_MAP_ON_OFF[value]),
  (root, value) =>
    Highlighter.keyword('maximum')
      .space()
      .boolean(value, value == 'on')
)

ScriptCommands.register(
  'TABLE_SHARED_STATISTICS',
  ScriptType.Table,
  'statistics <on|off>',
  /^statistics (on|off)$/,
  (root, value) => root.addShared('statistics', ARGUMENT_MAP_ON_OFF[value]),
  (root, value) =>
    Highlighter.keyword('statistics')
      .space()
      .boolean(value, value == 'on')
)

ScriptCommands.register(
  'TABLE_SHARED_BRACKETS',
  ScriptType.Table,
  'brackets <on|off>',
  /^brackets (on|off)$/,
  (root, value) => root.addShared('differenceBrackets', value === 'on' ? '()' : false),
  (root, value) =>
    Highlighter.deprecatedKeyword('brackets')
      .space()
      .boolean(value, value == 'on'),
  { isDeprecated: 'TABLE_SHARED_DIFFERENCE_BRACKETS' }
)

ScriptCommands.register(
  'TABLE_SHARED_DIFFERENCE_BRACKETS',
  ScriptType.Table,
  'difference brackets <on|off>',
  /^difference brackets (on|off|\S\S)$/,
  (root, value) => {
    if (value === 'on' || value === 'off') {
      root.addShared('differenceBrackets', value === 'on' ? '()' : false)
    } else {
      root.addShared('differenceBrackets', value)
    }
  },
  (root, value) => {
    const acc = Highlighter.keyword('difference brackets').space()

    if (value === 'on' || value === 'off') {
      return acc.boolean(value, value === 'on')
    } else {
      return acc.value(value)
    }
  }
)

ScriptCommands.register(
  'TABLE_SHARED_DIFFERENCE_POSITION',
  ScriptType.Table,
  'difference position <below>',
  /^difference position (below)$/,
  (root) => root.addShared('differencePosition', 'below'),
  (root, value) => Highlighter.keyword('difference position').space().value(value)
)

ScriptCommands.register(
  'TABLE_SHARED_FLIP',
  ScriptType.Table,
  'flip <on|off>',
  /^flip (on|off)$/,
  (root, value) => root.addShared('flip', ARGUMENT_MAP_ON_OFF[value]),
  (root, value) =>
    Highlighter.keyword('flip')
      .space()
      .boolean(value, value == 'on')
)

ScriptCommands.register(
  'TABLE_SHARED_HYDRA',
  ScriptType.Table,
  'hydra <on|off>',
  /^hydra (on|off)$/,
  (root, value) => root.addShared('hydra', ARGUMENT_MAP_ON_OFF[value]),
  (root, value) =>
    Highlighter.keyword('hydra')
      .space()
      .boolean(value, value == 'on')
)

ScriptCommands.register(
  'TABLE_SHARED_DIFFERENCE',
  ScriptType.Table,
  'difference <on|off>',
  /^difference (on|off)$/,
  (root, value) => root.addShared('difference', ARGUMENT_MAP_ON_OFF[value]),
  (root, value) =>
    Highlighter.keyword('difference')
      .space()
      .boolean(value, value == 'on')
)

ScriptCommands.register(
  'TABLE_CLEAN',
  ScriptType.Table,
  'clean (hard)',
  /^clean( hard)?$/,
  (root, params) => root.addDirectValue('clean', params ? 2 : 1),
  (root, params) => {
    const acc = Highlighter.keyword('clean')

    if (params) {
      return acc.space().constant('hard')
    } else {
      return acc
    }
  }
)

ScriptCommands.register(
  'TABLE_ACTION',
  ScriptType.Table,
  'action <none|show>',
  /^action (none|show)$/,
  (root, value) => root.addAction(value),
  (root, value) => Highlighter.keyword('action ').constant(value)
)

ScriptCommands.register(
  'TABLE_INDEXED',
  ScriptType.Table,
  'indexed (on|off|static)',
  /^indexed( (on|off|static))?$/,
  (root, params, value) => {
    if (value === 'static') {
      root.addGlobal('indexed', 2)
    } else {
      root.addGlobal('indexed', params ? ARGUMENT_MAP_ON_OFF[value] : 1)
    }
  },
  (root, params, value) => {
    const acc = Highlighter.keyword('indexed')

    if (params) {
      return acc.space().boolean(value, value != 'off')
    } else {
      return acc
    }
  }
)

ScriptCommands.register(
  'TABLE_INDEXED_CUSTOM',
  ScriptType.Table,
  'indexed custom header',
  /^indexed custom header$/,
  (root) => root.addGlobal('customIndex', true),
  () => Highlighter.keyword('indexed custom header')
)

ScriptCommands.register(
  'TABLE_GLOBAL_MEMBERS',
  ScriptType.Table,
  'members (on|off)',
  /^members( (on|off))?$/,
  (root, params, value) => root.addGlobal('members', params ? ARGUMENT_MAP_ON_OFF[value] : true),
  (root, params, value) => {
    const acc = Highlighter.keyword('members')
    if (params) {
      return acc.space(1).boolean(value, value == 'on')
    } else {
      return acc
    }
  }
)

ScriptCommands.register(
  'TABLE_GLOBAL_OUTDATED',
  ScriptType.Table,
  'outdated (on|off)',
  /^outdated( (on|off))?$/,
  (root, params, value) => root.addGlobal('outdated', params ? ARGUMENT_MAP_ON_OFF[value] : true),
  (root, params, value) => {
    const acc = Highlighter.keyword('outdated')
    if (params) {
      return acc.space(1).boolean(value, value == 'on')
    } else {
      return acc
    }
  }
)

ScriptCommands.register(
  'TABLE_GLOBAL_OPAQUE',
  ScriptType.Table,
  'opaque (on|off)',
  /^opaque( (on|off))?$/,
  (root, params, value) => root.addGlobal('opaque', params ? ARGUMENT_MAP_ON_OFF[value] : true),
  (root, params, value) => {
    const acc = Highlighter.keyword('opaque')
    if (params) {
      return acc.space(1).boolean(value, value == 'on')
    } else {
      return acc
    }
  }
)

ScriptCommands.register(
  'TABLE_GLOBAL_STICKY_HEADERS',
  ScriptType.Table,
  'sticky headers (on|off)',
  /^sticky headers( (on|off))?$/,
  (root, params, value) => root.addGlobal('stickyHeaders', params ? ARGUMENT_MAP_ON_OFF[value] : true),
  (root, params, value) => {
    const acc = Highlighter.keyword('sticky headers')
    if (params) {
      return acc.space(1).boolean(value, value == 'on')
    } else {
      return acc
    }
  }
)

ScriptCommands.register(
  'TABLE_GLOBAL_LARGE_ROWS',
  ScriptType.Table,
  'large rows (on|off)',
  /^large rows( (on|off))?$/,
  (root, params, value) => {
    if (params) {
      root.addGlobalEmbedable('rowHeight', value === 'on' ? 56.7 : 0)
    } else {
      root.addGlobalEmbedable('rowHeight', 56.7)
    }
  },
  (root, params, value) => {
    const acc = Highlighter.deprecatedKeyword('large rows')
    if (params) {
      return acc.space(1).boolean(value, value == 'on')
    } else {
      return acc
    }
  },
  { isDeprecated: 'TABLE_ROW_HEIGHT' }
)

ScriptCommands.register(
  'TABLE_GLOBAL_ALIGN_TITLE',
  ScriptType.Table,
  'align title (on|off)',
  /^align title( (on|off))?$/,
  (root, params, value) => root.addGlobal('alignTitle', params ? ARGUMENT_MAP_ON_OFF[value] : true),
  (root, params, value) => {
    const acc = Highlighter.keyword('align title')
    if (params) {
      return acc.space(1).boolean(value, value == 'on')
    } else {
      return acc
    }
  }
)

ScriptCommands.register(
  'TABLE_LEFT_CATEGORY',
  ScriptType.Table,
  'left category',
  /^((?:\w+)(?:\,\w+)*:|)left category$/,
  (root, extensions) => {
    root.addGlobal('customLeftCategory', true)
    root.addCategory('')
    if (extensions) {
      root.addExtension(...extensions.slice(0, -1).split(','))
    }
  },
  (root, extensions) => Highlighter.constant(extensions || '').keyword('left category')
)

ScriptCommands.register(
  'TABLE_STATISTICS',
  ScriptType.Table,
  'statistics <name> as <expression>',
  /^statistics (\S+[\S ]*) as (\S+[\S ]*)$/,
  (root, name, expression) => {
    const ast = Expression.create(expression, root)
    if (ast) {
      root.addStatistics(name, ast)
    }
  },
  (root, name, expression) => Highlighter.keyword('statistics ').constant(name).keyword(' as ').expression(expression, root)
)

ScriptCommands.register(
  'TABLE_EXTRA',
  ScriptType.Table,
  'extra <value>',
  /^extra (.+)$/,
  (root, value) => root.addDirectValue('displayAfter', () => value),
  (root, value) => Highlighter.deprecatedKeyword('extra').space().value(value),
  { isDeprecated: 'TABLE_DISPLAY_AFTER' }
)

ScriptCommands.register(
  'TABLE_DISPLAY_BEFORE',
  ScriptType.Table,
  'display before <expression>',
  /^display before (.+)$/,
  (root, expression) => {
    const ast = Expression.create(expression, root)
    if (ast) {
      root.addDirectValue('displayBefore', ast)
    }
  },
  (root, expression) => Highlighter.keyword('display before ').expression(expression, root)
)

ScriptCommands.register(
  'TABLE_DISPLAY_AFTER',
  ScriptType.Table,
  'display after <expression>',
  /^display after (.+)$/,
  (root, expression) => {
    const ast = Expression.create(expression, root)
    if (ast) {
      root.addDirectValue('displayAfter', ast)
    }
  },
  (root, expression) => Highlighter.keyword('display after ').expression(expression, root)
)

ScriptCommands.register(
  'TABLE_STYLE',
  ScriptType.Table,
  'style <name> <value>',
  /^style ([a-zA-Z\-]+) (.*)$/,
  (root, style, value) => root.addStyle(style, value),
  (root, style, value) => Highlighter.keyword('style ').constant(style).space().value(value)
)

ScriptCommands.register(
  'TABLE_BORDER',
  ScriptType.Table,
  'border <none|left|right|both>',
  /^border (none|left|right|both|top|bottom)$/,
  (root, value) => root.addShared('border', ARGUMENT_MAP_BORDER[value]),
  (root, value) => Highlighter.keyword('border ').constant(value)
)

ScriptCommands.register(
  'TABLE_ORDER',
  ScriptType.Table,
  'order by <expression>',
  /^order by (.+)$/,
  (root, expression) => {
    const ast = Expression.create(expression, root)
    if (ast) {
      root.addDirectValue('order', ast)
    }
  },
  (root, expression) => Highlighter.keyword('order by ').expression(expression, root)
)

ScriptCommands.register(
  'TABLE_GLOBAL_ORDER',
  ScriptType.Table,
  'glob order <asc|des>',
  /^glob order (asc|des)$/,
  (root, value) => root.addSuperDirectValue('orderDefault', { index: undefined, direction: value }),
  (root, value) => Highlighter.keyword('glob order ').constant(value)
)

ScriptCommands.register(
  'TABLE_GLOBAL_ORDER_INDEXED',
  ScriptType.Table,
  'glob order <asc|des> <value>',
  /^glob order (asc|des) (\d+)$/,
  (root, value, index) => root.addSuperDirectValue('orderDefault', { index: parseInt(index), direction: value }),
  (root, value, index) => Highlighter.keyword('glob order ').constant(value).space().constant(index)
)

ScriptCommands.register(
  'TABLE_EXPRESSION',
  ScriptType.Table,
  'expr <expression>',
  /^expr (.+)$/,
  (root, expression) => {
    const ast = Expression.create(expression, root)
    if (ast) {
      root.addDirectValue('expr', ast)
    }
  },
  (root, expression) => Highlighter.keyword('expr ').expression(expression, root)
)

ScriptCommands.register(
  'TABLE_ALIAS_EXPRESSION',
  ScriptType.Table,
  'expa <expression>',
  /^expa (.+)$/,
  (root, expression) => {
    const ast = Expression.create(expression, root)
    if (ast) {
      root.addNameValue('nameExpression', (a) => ast.eval(new ExpressionScope(a)))
    }
  },
  (root, expression) => Highlighter.keyword('expa ').expression(expression, root)
)

ScriptCommands.register(
  'TABLE_ALIGN',
  ScriptType.Table,
  'align <left|right|center>',
  /^align (left|right|center)$/,
  (root, value) => root.addShared('align', value),
  (root, value) => Highlighter.keyword('align ').constant(value)
)

ScriptCommands.register(
  'TABLE_ALIGN_LONG',
  ScriptType.Table,
  'align <left|right|center> <left|right|center>',
  /^align (left|right|center) (left|right|center)$/,
  (root, value, value2) => {
    root.addShared('align', value)
    root.addShared('alignTitle', value2)
  },
  (root, value, value2) => Highlighter.keyword('align ').constant(value).space().constant(value2)
)

ScriptCommands.register(
  'TABLE_FLAG',
  ScriptType.Table,
  'discard reference <expression>',
  /^discard reference (.+)$/,
  (root, expression) => {
    const ast = Expression.create(expression, root)
    if (ast) {
      root.addDiscardRule('reference', ast)
    }
  },
  (root, expression) => Highlighter.keyword('discard reference ').expression(expression, root)
)

ScriptCommands.register(
  'TABLE_DISCARD',
  ScriptType.Table,
  'discard <expression>',
  /^discard (.+)$/,
  (root, expression) => {
    const ast = Expression.create(expression, root)
    if (ast) {
      root.addDiscardRule('timestamp', ast)
    }
  },
  (root, expression) => Highlighter.keyword('discard ').expression(expression, root)
)

ScriptCommands.register(
  'TABLE_ORDER_ALL',
  ScriptType.Table,
  'order all by <expression>',
  /^order all by (.+)$/,
  (root, expression) => {
    const ast = Expression.create(expression, root)
    if (ast) {
      root.addGlobal('orderAllBy', ast)
    }
  },
  (root, expression) => Highlighter.keyword('order all by ').expression(expression, root)
)

ScriptCommands.register(
  'TABLE_COLOR_EXPRESSION',
  ScriptType.Table,
  'expc <expression>',
  /^expc (.+)$/,
  (root, expression) => {
    const ast = Expression.create(expression, root)
    if (ast) {
      root.addDirectValue('colorExpr', ast)
    }
  },
  (root, expression) => Highlighter.keyword('expc ').expression(expression, root)
)

ScriptCommands.register(
  'TABLE_TEXT',
  ScriptType.Table,
  'text <expression>',
  /^text (.+)$/,
  (root, value) => {
    if (value === 'auto') {
      root.addTextColorExpression(true)
    } else {
      const ast = Expression.create(value, root)
      if (ast) {
        root.addTextColorExpression(ast)
      }
    }
  },
  (root, value) => {
    const acc = Highlighter.keyword('text ')
    if (value === 'auto') {
      return acc.boolean(value, true)
    } else {
      return acc.expression(value, root)
    }
  }
)

ScriptCommands.register(
  'TABLE_PADDING',
  ScriptType.Table,
  'padding <value>',
  /^padding (.+)$/,
  (root, value) => root.addStyle('padding-left', value),
  (root, value) => Highlighter.deprecatedKeyword('padding').space().value(value),
  { isDeprecated: 'TABLE_STYLE' }
)

ScriptCommands.register(
  'TABLE_DEFINE',
  ScriptType.Table,
  'define <name>',
  /^define (\w+)$/,
  (root, name) => root.addDefinition(name),
  (root, name) => Highlighter.keyword('define').space().identifier(name)
)

ScriptCommands.register(
  'TABLE_EXTEND',
  ScriptType.Table,
  'extend <value>',
  /^extend (\w+)$/,
  (root, name) => root.addExtension(name),
  (root, name) => Highlighter.keyword('extend').space().constant(name)
)

ScriptCommands.register(
  'TABLE_PUSH',
  ScriptType.Table,
  'push',
  /^push$/,
  (root) => root.push(),
  () => Highlighter.keyword('push')
)

ScriptCommands.register(
  'ACTION_TAG_CONDITIONAL',
  ScriptType.Action,
  'tag <player|file> as <expression> if <expression>',
  /^tag (player|file) as (.+) if (.+)$/,
  (root, type, tag, expr) => {
    const ast1 = Expression.create(tag)
    const ast2 = Expression.create(expr)
    if (ast1 && ast2) {
      root.addActionEntry(`tag_${type}`, ast1, ast2)
    }
  },
  (root, type, tag, expr) => Highlighter.keyword('tag ').constant(type).keyword(' as ').expression(tag, undefined, Actions.EXPRESSION_CONFIG).keyword(' if ').expression(expr, undefined, Actions.EXPRESSION_CONFIG)
)

ScriptCommands.register(
  'ACTION_TAG',
  ScriptType.Action,
  'tag <player|group|file> as <expression>',
  /^tag (player|group|file) as (.+)$/,
  (root, type, tag) => {
    const ast1 = Expression.create(tag)
    if (ast1) {
      root.addActionEntry(`tag_${type}`, ast1)
    }
  },
  (root, type, tag) => Highlighter.keyword('tag ').constant(type).keyword(' as ').expression(tag, undefined, Actions.EXPRESSION_CONFIG)
)

ScriptCommands.register(
  'ACTION_REMOVE_PLAYER',
  ScriptType.Action,
  'remove player if <expression>',
  /^remove player if (.+)$/,
  (root, expr) => {
    const ast1 = Expression.create(expr)
    if (ast1) {
      root.addActionEntry('reject_player', ast1)
    }
  },
  (root, expr) => Highlighter.keyword('remove ').constant('player').keyword(' if ').expression(expr, undefined, Actions.EXPRESSION_CONFIG),
  { isDeprecated: 'ACTION_REJECT_IF' }
)

ScriptCommands.register(
  'ACTION_REJECT_IF',
  ScriptType.Action,
  'reject <player|group> if <expression>',
  /^reject (player|group) if (.+)$/,
  (root, target, expr) => {
    const ast1 = Expression.create(expr)
    if (ast1) {
      root.addActionEntry(`reject_${target}`, ast1)
    }
  },
  (root, target, expr) => Highlighter.keyword('reject ').constant(target).keyword(' if ').expression(expr, undefined, Actions.EXPRESSION_CONFIG)
)

ScriptCommands.register(
  'ACTION_SELECT_IF',
  ScriptType.Action,
  'select <player|group> if <expression>',
  /^select (player|group) if (.+)$/,
  (root, target, expr) => {
    const ast1 = Expression.create(expr)
    if (ast1) {
      root.addActionEntry(`select_${target}`, ast1)
    }
  },
  (root, target, expr) => Highlighter.keyword('select ').constant(target).keyword(' if ').expression(expr, undefined, Actions.EXPRESSION_CONFIG)
)

ScriptCommands.register(
  'ACTION_TRACK_MAPPED',
  ScriptType.Table | ScriptType.Action,
  'track <name> as <expression> when <expression>',
  /^(track (\w+(?:[ \w]*\w)?) as (.+) when (.+))$/,
  (root, str, name, arg1, arg2) => {
    const ast1 = Expression.create(arg1)
    const ast2 = Expression.create(arg2)
    if (ast1 && ast2) {
      root.addTracker(name, str, ast2, ast1)
    }
  },
  (root, str, name, arg1, arg2) => Highlighter.keyword('track ').constant(name).keyword(' as ').expression(arg1).keyword(' when ').expression(arg2)
)

ScriptCommands.register(
  'ACTION_TRACK',
  ScriptType.Table | ScriptType.Action,
  'track <name> when <expression>',
  /^(track (\w+(?:[ \w]*\w)?) when (.+))$/,
  (root, str, name, arg) => {
    const ast = Expression.create(arg)
    if (ast) {
      root.addTracker(name, str, ast)
    }
  },
  (root, str, name, arg) => Highlighter.keyword('track ').constant(name).keyword(' when ').expression(arg)
)
