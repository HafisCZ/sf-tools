import { getCSSBackground, getCSSColor, invertColor, parseColor } from '@utils/colors'
import { formatDate } from '@utils/formatting'
import { randomHash } from '@utils/hash'
import { dig, toRecord } from '@utils/utils'
import { type GroupModel } from '~/core/models/group'
import { type PlayerModel } from '~/core/models/player'
import { ARG_FORMATTERS, callFormatter, ScriptCommands, TableType, type ScriptType, type ValueFormatter } from './commands'
import { Constants } from './constants'
import { Expression, ExpressionScope, type ExpressionEnvironment, type ExpressionFunction, type ExpressionVariable, type SegmentedArray } from './expression'
import { TABLE_EXPRESSION_CONFIG, type HeaderMapping } from './expression-config'
import { ScriptParser } from './parser'
import { type TableArray, type TableEntry } from './table'

export type ScriptEntity = PlayerModel & GroupModel

export type RuleCondition = 'db' | 'd' | 'e' | 'a' | 'b' | 'ae' | 'be'

type Rule<TOutput> = [condition: RuleCondition, referenceValue: unknown, output: TOutput, key: unknown]

export type ScriptTheme = string | { text: string; background: string }

export type ScriptEntityExpression = Expression | ((current: ScriptEntity) => unknown)

export type ScriptNameExpression = (environment: ExpressionEnvironment, container: object) => unknown

type ScriptSharedValues = {
  width: number
  formatUndefined: unknown
  colorUndefined: string
  colorBackground: string
  statisticsColor: boolean | Expression
  visible: boolean | number
  decimal: boolean | number
  grail: number
  maximum: number
  statistics: boolean | number
  differenceBrackets: string | false
  differencePosition: string
  flip: boolean | number
  hydra: number
  difference: boolean | number
  border: number
  align: string
  alignTitle: string
}

type ScriptExplicitValues = {
  [TKey in keyof ScriptSharedValues as `ex_${TKey}`]?: ScriptSharedValues[TKey]
}

export type ScriptSharedSettings = Partial<ScriptSharedValues> & {
  style?: ScriptStyle
  colorForeground?: true | Expression
  extensions?: string[]
  vars?: Record<string, string>
}

type ScriptNameValues = {
  nameOverride: unknown
  nameExpression: ScriptNameExpression
}

type ScriptDirectValues = ScriptExplicitValues & {
  columns?: number[]
  statisticsFormat?: boolean | ValueFormatter | Expression
  differenceFormat?: boolean | ValueFormatter | Expression
  format?: Expression | ValueFormatter | string
  expr?: ScriptEntityExpression
  clean?: number
  displayAfter?: Expression | ((current: ScriptEntity | undefined) => unknown)
  displayBefore?: Expression
  order?: ScriptEntityExpression
  colorExpr?: Expression
}

export type ScriptCategory = ScriptSharedSettings &
  Partial<ScriptNameValues> & {
    name: string
    headers: ScriptContainer[]
    expa?: Expression
  }

type ScriptGlobals = {
  server?: number
  name?: number
  widthPolicy?: string
  layout?: string[]
  lined?: number
  limit?: number
  scale?: number
  borderColor?: string
  indexed?: number
  customIndex?: boolean
  members?: number | boolean
  outdated?: number | boolean
  opaque?: number | boolean
  stickyHeaders?: number | boolean
  alignTitle?: number | boolean
  customLeftCategory?: boolean
  orderAllBy?: Expression
  rowHeight?: number
  font?: string
}

export type ScriptTracker = {
  str: string
  ast: Expression
  out: Expression | undefined
  hash: string
}

export type ScriptAction = {
  type: string
  args: Expression[]
}

export type ScriptStatistics = {
  name: string
  ast: Expression
}

export type ScriptScope = {
  table?: TableType | null
  timestamp?: number
  reference?: number
  entries?: SegmentedArray
}

export type ScriptColor = {
  bg: string
  fg: string | undefined
}

export class ScriptStyle {
  styles: Record<string, string> = {}
  content = ''

  add(name: string, value: string) {
    const style = new Option().style
    // Names can be camelCase or dashed, and both work as properties
    ;(style as unknown as Record<string, string>)[name] = value

    if (style.cssText) {
      this.styles[name] = style.cssText.slice(0, -1) + ' !important'
    }

    this.content = Object.values(this.styles).join(';')
  }

  has(name: string) {
    return this.styles[name] !== 'undefined'
  }

  get cssText() {
    return this.content
  }
}

export class RuleEvaluator<TOutput> {
  rules: Rule<TOutput>[] = []

  addRule(condition: RuleCondition, referenceValue: unknown, value: TOutput) {
    this.rules.push([condition, referenceValue, value, isNaN(Number(referenceValue)) ? referenceValue : null])
  }

  get(value: unknown, ignoreBase = false) {
    // Relational operators coerce script values the same way whatever their type
    const current = value as number

    for (const [condition, referenceValue, output] of this.rules) {
      const reference = referenceValue as number

      if (condition == 'db') {
        if (ignoreBase) {
          continue
        } else {
          return output
        }
      } else if (condition == 'd') {
        return output
      } else if (condition == 'e') {
        if (value == referenceValue) {
          return output
        }
      } else if (condition == 'a') {
        if (current > reference) {
          return output
        }
      } else if (condition == 'b') {
        if (current < reference) {
          return output
        }
      } else if (condition == 'ae') {
        if (current >= reference) {
          return output
        }
      } else if (condition == 'be') {
        if (current <= reference) {
          return output
        }
      }
    }

    return undefined
  }

  empty() {
    return this.rules.length === 0
  }
}

export interface ScriptContainer extends ScriptSharedSettings, ScriptDirectValues, Partial<ScriptNameValues> {
  grouped?: number
  orderDefault?: { index: number | undefined; direction: string }
  action?: string
  embedded?: boolean
  headers?: ScriptContainer[]
  eval?: { value: unknown; compare?: unknown }
  expa?: Expression
  rowHeight?: number
  font?: string
  decorators?: HeaderMapping['decorators']
  disabled?: boolean
}

export class ScriptContainer {
  colorRules = new RuleEvaluator<string>()
  formatRules = new RuleEvaluator<unknown>()

  name: string

  constructor(name: string) {
    this.name = name
  }

  getColor(current: ScriptEntity | undefined, compare: ScriptEntity | undefined, settings: ExpressionEnvironment, value: unknown, extra: unknown = undefined, ignoreBase = false, header: ScriptContainer | undefined = undefined, alternateSelf: unknown = undefined): ScriptColor {
    // Get color from expression
    const expressionColor = this.colorExpr ? this.colorExpr.eval(new ExpressionScope(settings).with(current, compare).addSelf(alternateSelf).addSelf(value).add(extra).via(header)) : undefined
    // Get color from color block
    const blockColor = this.colorRules.get(value, ignoreBase || typeof expressionColor !== 'undefined')

    // Final background color
    const backgroundColor = (typeof blockColor === 'undefined' ? getCSSBackground(expressionColor) : blockColor) || ''

    // Get color for text
    let textColor: string | undefined = undefined
    if (this.colorForeground === true) {
      textColor = invertColor(parseColor(backgroundColor) || parseColor(this.colorBackground), true)
    } else if (this.colorForeground) {
      textColor = getCSSColor(this.colorForeground.eval(new ExpressionScope(settings).with(current, compare).addSelf(alternateSelf).addSelf(value).add(extra).via(header)))
    }

    // Return color or empty string
    return {
      bg: backgroundColor,
      fg: textColor
    }
  }

  getStatisticsColor(settings: ExpressionEnvironment, value: unknown) {
    if (this.statisticsColor === true) {
      return this.getColor(undefined, undefined, settings, value, undefined, true, this, undefined).bg
    } else if (this.statisticsColor) {
      const colorValue = this.statisticsColor.eval(new ExpressionScope(settings).addSelf(value).via(this))

      if (typeof colorValue === 'undefined') {
        return ''
      } else {
        return getCSSColor(colorValue)
      }
    } else {
      return ''
    }
  }

  getValue(current: ScriptEntity | undefined, compare: ScriptEntity | undefined, settings: ExpressionEnvironment, value: unknown, extra: unknown = undefined, header: ScriptContainer | undefined = undefined, alternateSelf: unknown = undefined) {
    // Get value from value block
    let output = this.formatRules.get(value)

    // Get value from format expression
    if (typeof output == 'undefined') {
      if (this.format instanceof Expression) {
        output = this.format.eval(new ExpressionScope(settings).with(current, compare).addSelf(alternateSelf).addSelf(value).add(extra).via(header))
      } else if (typeof this.format === 'function') {
        output = callFormatter(this.format, current, value)
      } else if (typeof this.format === 'string' && ARG_FORMATTERS.hasOwnProperty(this.format)) {
        output = callFormatter(ARG_FORMATTERS[this.format], current, value)
      }
    }

    // Get value from value itself
    if (typeof output == 'undefined') {
      output = value
    }

    // Add extras
    if (typeof output != 'undefined' && (this.displayBefore || this.displayAfter)) {
      const before = this.displayBefore ? this.displayBefore.eval(new ExpressionScope(settings).with(current, compare).addSelf(alternateSelf).add(extra).via(header)) : ''

      const after = this.displayAfter instanceof Expression ? this.displayAfter.eval(new ExpressionScope(settings).with(current, compare).addSelf(alternateSelf).add(extra).via(header)) : typeof this.displayAfter === 'function' ? this.displayAfter(current) : ''

      output = String(before) + String(output) + String(after)
    }

    if (typeof output == 'undefined') {
      output = ''
    }

    // Return value
    return output
  }

  getDifferenceValue(current: ScriptEntity | undefined, compare: ScriptEntity | undefined, settings: ExpressionEnvironment, value: number, extra: unknown = undefined) {
    const nativeDifference = Number.isInteger(value) ? value : value.toFixed(2)

    if (this.differenceFormat === true) {
      if (this.format instanceof Expression) {
        return this.format.eval(new ExpressionScope(settings).with(current, compare).addSelf(value).add(extra))
      } else if (typeof this.format === 'function') {
        return callFormatter(this.format, current, value)
      } else if (typeof this.format === 'string' && ARG_FORMATTERS.hasOwnProperty(this.format)) {
        return callFormatter(ARG_FORMATTERS[this.format], current, value)
      } else {
        return nativeDifference
      }
    } else if (this.differenceFormat instanceof Expression) {
      return this.differenceFormat.eval(new ExpressionScope(settings).with(current, compare).addSelf(value).add(extra))
    } else if (typeof this.differenceFormat == 'function') {
      return callFormatter(this.differenceFormat, settings, value)
    } else {
      return nativeDifference
    }
  }

  getStatisticsValue(settings: ExpressionEnvironment, value: number) {
    const nativeFormat = Number.isInteger(value) ? value : value.toFixed(2)

    if (this.statisticsFormat === false) {
      return nativeFormat
    } else if (this.statisticsFormat) {
      return (this.statisticsFormat as Expression).eval(new ExpressionScope(settings).addSelf(value))
    } else if (this.format instanceof Expression) {
      return this.format.eval(new ExpressionScope(settings).addSelf(value))
    } else if (typeof this.format == 'function') {
      return callFormatter(this.format, undefined, value)
    } else if (typeof this.format === 'string' && ARG_FORMATTERS.hasOwnProperty(this.format)) {
      return callFormatter(ARG_FORMATTERS[this.format], undefined, value)
    } else {
      return nativeFormat
    }
  }
}

export class Script {
  static MERGEABLE_PROPERTIES_COLOR = ['colorForeground', 'colorBackground']
  static MERGEABLE_PROPERTIES_BASE = ['colorExpr', 'format', 'differenceFormat', 'statisticsFormat', 'displayBefore', 'displayAfter', 'formatUndefined', 'colorUndefined']

  code: string
  scriptType: ScriptType
  scriptScope: ScriptScope
  identifier: string
  constants: Constants
  discard: Record<'timestamp' | 'reference', Expression[]>
  functions: Record<string, ExpressionFunction>
  variables: Record<string, ExpressionVariable>
  variablesReference: Record<string, ExpressionVariable>
  trackers: Record<string, ScriptTracker>
  rowIndexes: Record<string, number>
  categories: ScriptCategory[]
  customStatistics: ScriptStatistics[]
  customRows: ScriptContainer[]
  customDefinitions: Record<string, ScriptContainer>
  actions: ScriptAction[]
  globals: ScriptGlobals
  shared: ScriptSharedSettings
  sharedCategory: ScriptSharedSettings | null
  category: ScriptCategory | null
  header: ScriptContainer | null
  definition: ScriptContainer | null
  row: ScriptContainer | null
  embed: ScriptContainer | null
  theme: ScriptTheme

  declare timestamp?: number
  declare reference?: number
  declare tableArrayCurrent?: SegmentedArray
  declare tableArrayCompare?: SegmentedArray
  declare globalArrayCurrent?: SegmentedArray
  declare globalArrayCompare?: SegmentedArray
  declare listClasses?: Record<PropertyKey, number>
  declare listJoined?: string[]
  declare listKicked?: string[]
  declare listMissing?: string[]

  constructor(string: string, scriptType: ScriptType, scriptScope: ScriptScope = {}) {
    this.code = string
    this.scriptType = scriptType
    this.scriptScope = scriptScope

    this.identifier = randomHash()

    // Constants
    this.constants = new Constants()

    // Discard rules
    this.discard = {
      timestamp: [],
      reference: []
    }

    // Variables and functions
    this.functions = Object.create(null) as Record<string, ExpressionFunction>
    this.variables = Object.create(null) as Record<string, ExpressionVariable>
    this.variablesReference = Object.create(null) as Record<string, ExpressionVariable>

    this.trackers = {}
    this.rowIndexes = {}

    // Table
    this.categories = []
    this.customStatistics = []
    this.customRows = []

    // Other things
    this.customDefinitions = {}
    this.actions = []

    // Settings
    this.globals = {}

    // Shared globals
    this.shared = {
      formatUndefined: '?',
      statisticsColor: true,
      visible: true
    }

    // Shared category
    this.sharedCategory = null

    // Temporary objects
    this.category = null
    this.header = null
    this.definition = null
    this.row = null
    this.embed = null

    this.theme = 'light'

    // Parse settings
    for (const line of ScriptParser.handleMacros(string, this.scriptScope)) {
      const command = ScriptCommands.find((command) => !command.metadata.evalNever && command.type & scriptType && command.is(line))

      if (command) {
        command.eval(this, line)
      }
    }

    // Push last embed && category
    this.pushEmbed()
    this.pushCategory()

    if (this.scriptScope.table !== null) {
      this._prepareLeftCategory()
    }
  }

  _prepareLeftCategory() {
    if (this.globals.customLeftCategory) {
      // Can skip as category should already exist
    } else {
      const type = this.scriptScope.table
      const headers: ScriptContainer[] = []
      if (type === TableType.Player) {
        const dateHeader = new ScriptContainer('Date')

        this.merge(
          dateHeader,
          {
            expr: (p: ScriptEntity) => p.Timestamp,
            format: (p: unknown, x: number) => formatDate(x),
            width: 200,
            action: 'show'
          },
          true
        )

        headers.push(dateHeader)
      } else if (type === TableType.Group) {
        const nameHeader = new ScriptContainer('Name')

        this.merge(
          nameHeader,
          {
            expr: (p: ScriptEntity) => p.Name,
            width: this.getNameStyle(),
            action: 'show'
          },
          true
        )

        headers.push(nameHeader)
      } else if (type === TableType.Players || type === TableType.Groups) {
        const serverWidth = this.getServerStyle()
        if (serverWidth) {
          const serverHeader = new ScriptContainer('Server')

          this.merge(
            serverHeader,
            {
              expr: (p: ScriptEntity) => p.Prefix,
              width: serverWidth
            },
            true
          )

          headers.push(serverHeader)
        }

        const nameHeader = new ScriptContainer('Name')

        this.merge(
          nameHeader,
          {
            expr: (p: ScriptEntity) => p.Name,
            width: this.getNameStyle(),
            action: 'show'
          },
          true
        )

        headers.push(nameHeader)
      }

      for (const header of headers) {
        this.#injectLeftHeaderStyling(header)
      }

      this.categories.unshift({
        name: '',
        headers
      })
    }

    if (this.globals.indexed && !(this.globals.customLeftCategory && this.globals.customIndex)) {
      const indexHeader = new ScriptContainer('#')

      this.merge(
        indexHeader,
        {
          expr: () => 0,
          width: 50
        },
        true
      )

      this.#injectLeftHeaderStyling(indexHeader)

      this.categories[0].headers.unshift(indexHeader)
    }
  }

  #injectLeftHeaderStyling(header: ScriptContainer) {
    header.visible = true

    header.colorForeground = this.shared.colorForeground
    header.colorBackground = this.shared.colorBackground

    if (header.colorBackground) {
      header.colorRules.addRule('db', 0, header.colorBackground)
    }
  }

  mergeRules(target: ScriptContainer, source: ScriptContainer) {
    if (target.colorRules.empty()) {
      target.colorRules.rules = source.colorRules.rules
    }

    if (target.formatRules.empty()) {
      target.formatRules.rules = source.formatRules.rules
    }
  }

  mergeProperties(target: object, source: object, list: string[]) {
    const targetValues = target as Record<string, unknown>
    const sourceValues = source as Record<string, unknown>

    for (const type of list) {
      if (typeof targetValues[type] === 'undefined' && typeof sourceValues[type] !== 'undefined') {
        targetValues[type] = sourceValues[type]
      }
    }
  }

  // Merge definition to object
  mergeDefinition(target: ScriptContainer, name: string) {
    const source = this.customDefinitions[name]
    if (source) {
      this.mergeProperties(target, source, Object.keys(source))
      this.mergeProperties(target, source, Script.MERGEABLE_PROPERTIES_BASE)
      this.mergeRules(target, source)
      this.mergeStyles(target, source)
      this.mergeVariables(target, source)
    }
  }

  addTracker(name: string, str: string, ast: Expression, out?: Expression) {
    this.trackers[name] = {
      str: str,
      ast: ast,
      out: out,
      hash: ast.rstr + (out ? out.rstr : '0000000000000000')
    }
  }

  addActionEntry(type: string, ...args: Expression[]) {
    this.actions.push({
      type,
      args
    })
  }

  // A null source throws like the legacy code did
  merge(target: ScriptSharedSettings, source: object | null, permitObjects = false) {
    const targetValues = target as Record<string, unknown>
    const sourceValues = source as Record<string, unknown>

    // Merge all non-objects
    for (const key of Object.keys(sourceValues)) {
      if (typeof targetValues[key] === 'undefined' && (permitObjects || typeof sourceValues[key] !== 'object') && typeof sourceValues[key] !== 'undefined') {
        targetValues[key] = sourceValues[key]
      }
    }

    this.mergeStyles(target, source as ScriptSharedSettings)
    this.mergeVariables(target, source as ScriptSharedSettings)
    this.mergeProperties(target, sourceValues, Script.MERGEABLE_PROPERTIES_COLOR)
  }

  mergeStyles(target: ScriptSharedSettings, source: ScriptSharedSettings) {
    if (source.style) {
      if (target.style) {
        // Rewrite styles
        for (const [name, value] of Object.entries(source.style.styles)) {
          if (target.style.has(name) == false) {
            target.style.add(name, value)
          }
        }
      } else {
        // Add whole style class
        target.style = source.style
      }
    }
  }

  mergeVariables(target: ScriptSharedSettings, source: ScriptSharedSettings) {
    if (source.vars) {
      if (target.vars) {
        // Add vars
        for (const name of Object.keys(source.vars)) {
          if (typeof (target as Record<string, unknown>)[name] === 'undefined') {
            target.vars[name] = source.vars[name]
          }
        }
      } else {
        // Add whole list
        target.vars = source.vars
      }
    }
  }

  // Push all settings
  push() {
    // Push definition
    const definition = this.definition
    if (definition) {
      this.customDefinitions[definition.name] = definition
      this.definition = null
    }

    // Push row
    const row = this.row
    if (row) {
      // Merge definitions
      for (const definitionName of row.extensions || []) {
        this.mergeDefinition(row, definitionName)
      }

      // Merge shared
      this.merge(row, this.shared)

      if (row.colorBackground) {
        row.colorRules.addRule('db', 0, row.colorBackground)
      }

      // Push
      if (row.expr) {
        this.customRows.push(row)
      }

      this.row = null
    }

    // Push header
    const header = this.header
    if (header && (this.embed || this.category)) {
      const name = header.name

      // Get mapping if exists
      const config = TABLE_EXPRESSION_CONFIG.find(name, 'header')
      const mapping = config && !config.data.disabled ? config.data : undefined

      // Merge definitions
      for (const definitionName of header.extensions || []) {
        this.mergeDefinition(header, definitionName)
      }

      // Add decorators
      if (mapping && mapping.decorators && header.clean != 2) {
        for (const entry of mapping.decorators) {
          if (entry.condition(header)) {
            entry.apply(header)
          }
        }
      }

      // Add mapping or expression
      if (mapping && !header.expr) {
        if (header.clean == 2) {
          header.expr = mapping.expr
        } else {
          this.merge(header, mapping, true)
        }
      }

      // Push header if possible
      if (header.expr) {
        if (!header.clean) {
          if (this.category) {
            this.merge(header, this.sharedCategory)
          }

          this.merge(header, this.shared)
        } else {
          this.merge(header, {
            visible: true,
            formatUndefined: '?',
            statisticsColor: true
          })
        }

        if (header.colorBackground) {
          header.colorRules.addRule('db', 0, header.colorBackground)
        }

        // Push
        ;((this.embed || this.category) as { headers: ScriptContainer[] }).headers.push(header)
      }

      this.header = null
    }
  }

  // Push category
  pushCategory() {
    this.push()

    // Push category
    const category = this.category
    if (category) {
      this.merge(category, this.sharedCategory)

      this.categories.push(category)
      this.category = null
    }
  }

  // Create new header
  addHeader(name: string) {
    this.push()
    this.header = new ScriptContainer(name)
  }

  addHeaderLocal<TKey extends keyof ScriptContainer>(name: TKey, value: ScriptContainer[TKey]) {
    const object = this.header
    if (object) {
      object[name] = value
    }
  }

  // Create new category
  addCategory(name: string) {
    this.pushCategory()

    // Category
    this.category = {
      name,
      headers: []
    }

    // Category shared
    this.sharedCategory = {}
  }

  // Create row
  addRow(name: string) {
    this.push()
    this.row = new ScriptContainer(name)
  }

  // Create definition
  addDefinition(name: string) {
    this.push()
    this.definition = new ScriptContainer(name)
  }

  // Create statistic
  addStatistics(name: string, expression: Expression) {
    this.customStatistics.push({
      name: name,
      ast: expression
    })
  }

  addNameValue<TKey extends keyof ScriptNameValues>(field: TKey, name: ScriptNameValues[TKey]) {
    const object: Partial<ScriptNameValues> | null = this.row || this.definition || this.header || this.embed || this.category
    if (object) {
      object[field] = name
    }
  }

  // Add custom style
  addStyle(name: string, value: string) {
    const object: ScriptSharedSettings | null = this.row || this.definition || this.header || this.embed || this.sharedCategory || this.shared
    if (object) {
      if (!object.style) {
        object.style = new ScriptStyle()
      }

      object.style.add(name, value)
    }
  }

  addTextColorExpression(expression: true | Expression) {
    const object: ScriptSharedSettings | null = this.row || this.definition || this.header || this.embed || this.sharedCategory || this.shared
    if (object) {
      object.colorForeground = expression
    }
  }

  addAliasExpression(expression: Expression) {
    const object: { expa?: Expression } | null = this.row || this.definition || this.header || this.embed || this.category
    if (object) {
      object.expa = expression
    }
  }

  addSuperDirectValue<TKey extends keyof ScriptContainer>(field: TKey, value: ScriptContainer[TKey]) {
    const target = this.header || this.embed
    if (target) target[field] = value
  }

  // Can be added only to row, definition, header or embed
  addDirectValue<TKey extends keyof ScriptDirectValues>(field: TKey, value: ScriptDirectValues[TKey]) {
    const target: ScriptDirectValues | null = this.row || this.definition || this.header || this.embed
    if (target) target[field] = value
  }

  // Add color rule to the header
  addColorRule(condition: RuleCondition, referenceValue: unknown, value: string) {
    const object = this.row || this.definition || this.header || this.embed
    if (object) {
      object.colorRules.addRule(condition, referenceValue, value)
    }
  }

  // Add value rule to the header
  addValueRule(condition: RuleCondition, referenceValue: unknown, value: unknown) {
    const object = this.row || this.definition || this.header || this.embed
    if (object) {
      object.formatRules.addRule(condition, referenceValue, value)
    }
  }

  // Add new variable
  addVariable(name: string, expression: Expression, type: string) {
    this.variables[name] = {
      ast: expression,
      type
    }
  }

  // Add new function
  addFunction(name: string, expression: Expression, args: string[]) {
    this.functions[name] = {
      ast: expression,
      args: args
    }
  }

  // Add global
  addGlobal<TKey extends keyof ScriptGlobals>(name: TKey, value: ScriptGlobals[TKey]) {
    this.globals[name] = value
  }

  addGlobalEmbedable<TKey extends 'rowHeight' | 'font'>(name: TKey, value: ScriptGlobals[TKey]) {
    const target: Pick<ScriptGlobals, 'rowHeight' | 'font'> = this.embed || this.definition || this.globals
    target[name] = value
  }

  // Add shared variable
  addShared<TKey extends keyof ScriptSharedValues>(name: TKey, value: ScriptSharedValues[TKey]) {
    const object: ScriptSharedSettings | null = this.row || this.definition || this.header || this.embed || this.sharedCategory || this.shared
    if (object) {
      object[name] = value
    }

    const target = this.row || this.definition || this.header || this.embed
    if (target) Object.assign(target, { [`ex_${name}`]: value })
  }

  // Add extension
  addExtension(...names: string[]) {
    const object: ScriptSharedSettings | null = this.row || this.definition || this.header || this.embed || this.sharedCategory || this.shared
    if (object) {
      if (!object.extensions) {
        object.extensions = []
      }

      object.extensions.push(...names)
    }
  }

  // Add action
  addAction(value: string) {
    const object = this.header || this.embed
    if (object) {
      object['action'] = value
    }
  }

  addHeaderVariable(name: string, value: string) {
    const object: ScriptSharedSettings | null = this.row || this.definition || this.header || this.embed || this.sharedCategory || this.shared
    if (object) {
      if (!object.vars) {
        object.vars = {}
      }

      object.vars[name] = value
    }
  }

  embedBlock(name: string) {
    this.push()
    this.embed = new ScriptContainer(name)
    this.embed.embedded = true
    this.embed.headers = []
  }

  pushEmbed() {
    const embed = this.embed
    if (embed && this.category) {
      this.push()

      for (const definitionName of embed.extensions || []) {
        this.mergeDefinition(embed, definitionName)
      }

      if (!embed.clean) {
        this.merge(embed, this.sharedCategory)
        this.merge(embed, this.shared)
      } else {
        this.merge(embed, {
          visible: true,
          formatUndefined: '?',
          statisticsColor: true
        })
      }

      if (embed.colorBackground) {
        embed.colorRules.addRule('db', 0, embed.colorBackground)
      }

      if (this.category) {
        this.category.headers.push(embed)
        this.embed = null
      }
    }
  }

  // Add discard rule
  addDiscardRule(type: 'timestamp' | 'reference', rule: Expression) {
    this.discard[type].push(rule)
  }

  // Get compare environment
  getCompareEnvironment(): ExpressionEnvironment {
    return {
      theme: this.theme,
      functions: this.functions,
      variables: this.variablesReference,
      tableArrayCurrent: this.tableArrayCompare,
      globalArrayCurrent: this.globalArrayCompare,
      constants: this.constants,
      rowIndexes: this.rowIndexes,
      timestamp: this.reference,
      reference: this.reference,
      identifier: this.identifier
    }
  }

  getServerStyle() {
    return this.globals.server == undefined ? 100 : this.globals.server
  }

  getTheme() {
    return this.theme
  }

  setTheme(theme: ScriptTheme) {
    this.theme = theme
  }

  getOutdatedStyle() {
    return this.globals.outdated
  }

  getLayout(hasStatistics: unknown, hasRows: unknown, hasMembers: unknown) {
    if (typeof this.globals.layout != 'undefined') {
      return this.globals.layout
    } else {
      if (this.scriptScope.table == TableType.Players || this.scriptScope.table == TableType.Groups) {
        return [...(hasStatistics ? ['statistics', hasRows ? '|' : '_'] : []), ...(hasRows ? (hasStatistics ? ['rows', '_'] : ['rows', '|', '_']) : []), 'table']
      } else if (this.scriptScope.table == TableType.Group) {
        return ['table', 'missing', ...(hasStatistics || hasRows || hasMembers ? ['_'] : []), ...(hasStatistics ? ['statistics'] : []), ...(hasRows ? ['|', 'rows'] : []), ...(hasMembers ? ['|', 'members'] : [])]
      } else {
        return [...(hasRows ? ['rows', '|', '_'] : []), 'table']
      }
    }
  }

  getEntryLimit() {
    return this.globals.limit
  }

  getOpaqueStyle() {
    return this.globals.opaque ? 'css-entry-opaque' : ''
  }

  getLinedStyle() {
    return this.globals.lined || 0
  }

  getRowHeight() {
    return this.globals.rowHeight || 0
  }

  getFontStyle() {
    return this.globals.font ? `font: ${this.globals.font};` : ''
  }

  getBorderColor() {
    return this.globals.borderColor ? `--table-border: ${this.globals.borderColor};` : ''
  }

  getTitleAlign() {
    return this.globals.alignTitle
  }

  getNameStyle() {
    return Math.max(100, this.globals.name == undefined ? 250 : this.globals.name)
  }

  isStrictWidthPolicy() {
    return (this.globals.widthPolicy || 'relaxed') === 'strict'
  }

  isStickyHeaders() {
    return this.globals.stickyHeaders
  }

  evalRowIndexes(array: TableEntry[]) {
    for (let i = 0; i < array.length; i++) {
      const current = array[i].current

      this.rowIndexes[`${current.LinkId}_${current.Timestamp}`] = i
    }
  }

  evalRules() {
    // For each category
    for (const category of this.categories) {
      // For each header
      for (const header of category.headers) {
        // For each rule block
        const ruleBlocks: Rule<unknown>[][] = [header.colorRules.rules, header.formatRules.rules]
        for (const rules of ruleBlocks) {
          // For each entry
          for (let i = 0; i < rules.length; i++) {
            const rule = rules[i]
            const key = rule[3] as string
            // Check if key exists
            if (key && key in this.variables) {
              // If variable with that name exists then set it
              if (this.variables[key].value != 'undefined') {
                // Set value
                rule[1] = Number(this.variables[key].value)
              } else {
                // Remove the rule
                rules.splice(i--, 1)
              }
            }
          }
        }
      }
    }
  }

  static createSegmentedArray<TEntry>(array: TEntry[], mapper: (entry: TEntry, index: number, array: TEntry[]) => SegmentedArray) {
    const segmentedArray: SegmentedArray = array.map((entry, index, arr) => {
      const obj = mapper(entry, index, arr)
      obj.segmented = true
      return obj
    })

    segmentedArray.segmented = true

    return segmentedArray
  }

  evalBefore(array: TableArray) {
    this.timestamp = array.timestamp
    this.reference = array.reference
  }

  evalPlayer(tableArray: TableArray, globalArray: TableArray) {
    // Evaluate row indexes
    this.evalRowIndexes(tableArray)

    // Purify array
    const tableEntries = ([] as TableEntry[]).concat(tableArray)
    const globalEntries = ([] as TableEntry[]).concat(globalArray)

    // Get shared scope
    this.tableArrayCurrent = Script.createSegmentedArray(tableEntries, (entry) => [entry.current, entry.compare])
    this.tableArrayCompare = Script.createSegmentedArray(tableEntries, (entry) => [entry.compare, entry.compare])
    this.globalArrayCurrent = Script.createSegmentedArray(globalEntries, (entry) => [entry.current, entry.compare])
    this.globalArrayCompare = Script.createSegmentedArray(globalEntries, (entry) => [entry.compare, entry.compare])

    // Iterate over all variables
    for (const [name, variable] of Object.entries(this.variables)) {
      // Copy over to reference variables
      this.variablesReference[name] = {
        ast: variable.ast,
        type: variable.type
      }

      // Run only if it is a table variable
      if (variable.type !== 'local') {
        // Get value
        const value = variable.ast.eval(new ExpressionScope(this).addSelf(variable.type == 'global' ? this.globalArrayCurrent : this.tableArrayCurrent))

        // Set value if valid
        if (!isNaN(Number(value)) || typeof value === 'object' || typeof value === 'string') {
          variable.value = value
        } else {
          delete variable.value
        }
      }
    }

    // Evaluate custom rows
    for (const row of this.customRows) {
      const currentValue = (row.expr as Expression).eval(new ExpressionScope(this).with(tableEntries[0]).addSelf(tableEntries))

      row.eval = {
        value: currentValue
      }
    }

    // Evaluate array constants
    this.evalRules()
  }

  evalGroups(tableArray: TableArray, globalArray: TableArray) {
    // Evaluate row indexes
    this.evalRowIndexes(tableArray)

    // Variables
    const sameTimestamp = tableArray.timestamp == tableArray.reference

    // Purify array
    const tableEntries = ([] as TableEntry[]).concat(tableArray)
    const globalEntries = ([] as TableEntry[]).concat(globalArray)

    // Get segmented lists
    this.tableArrayCurrent = Script.createSegmentedArray(tableEntries, (entry) => [entry.current, entry.compare])
    this.tableArrayCompare = Script.createSegmentedArray(tableEntries, (entry) => [entry.compare, entry.compare])
    this.globalArrayCurrent = Script.createSegmentedArray(globalEntries, (entry) => [entry.current, entry.compare])
    this.globalArrayCompare = Script.createSegmentedArray(globalEntries, (entry) => [entry.compare, entry.compare])

    // Get compare env
    const compareEnvironment = this.getCompareEnvironment()

    // Evaluate variables
    for (const [name, variable] of Object.entries(this.variables)) {
      // Copy over to reference variables
      this.variablesReference[name] = {
        ast: variable.ast,
        type: variable.type
      }

      if (variable.type !== 'local') {
        // Calculate values of table variable
        const currentValue = variable.ast.eval(new ExpressionScope(this).addSelf(variable.type === 'global' ? this.globalArrayCurrent : this.tableArrayCurrent))
        const compareValue = sameTimestamp ? currentValue : variable.ast.eval(new ExpressionScope(this).addSelf(variable.type === 'global' ? this.globalArrayCompare : this.tableArrayCompare))

        // Set values if valid
        if (!isNaN(Number(currentValue)) || typeof currentValue == 'object' || typeof currentValue == 'string') {
          variable.value = currentValue
        } else {
          delete variable.value
        }

        if (!isNaN(Number(compareValue)) || typeof compareValue == 'object' || typeof compareValue == 'string') {
          this.variablesReference[name].value = compareValue
        } else {
          delete this.variablesReference[name].value
        }
      }
    }

    // Evaluate custom rows
    for (const row of this.customRows) {
      const expression = row.expr as Expression
      const currentValue = expression.eval(new ExpressionScope(this).addSelf(this.tableArrayCurrent))
      const compareValue = sameTimestamp ? currentValue : expression.eval(new ExpressionScope(compareEnvironment).addSelf(this.tableArrayCompare))

      row.eval = {
        value: currentValue,
        compare: compareValue
      }
    }

    // Evaluate array constants
    this.evalRules()
  }

  evalPlayers(tableArray: TableArray, globalArray: TableArray) {
    // Evaluate row indexes
    this.evalRowIndexes(tableArray)

    // Variables
    const sameTimestamp = tableArray.timestamp == tableArray.reference

    // Set lists
    this.listClasses = tableArray.reduce(
      (c, { current }) => {
        c[current.Class]++
        return c
      },
      toRecord(CONFIG.ids(), (id) => [id, 0])
    )

    // Purify array
    const tableEntries = ([] as TableEntry[]).concat(tableArray)
    const globalEntries = ([] as TableEntry[]).concat(globalArray)

    // Get segmented lists
    this.tableArrayCurrent = Script.createSegmentedArray(tableEntries, (entry) => [entry.current, entry.compare])
    this.tableArrayCompare = Script.createSegmentedArray(tableEntries, (entry) => [entry.compare, entry.compare])
    this.globalArrayCurrent = Script.createSegmentedArray(globalEntries, (entry) => [entry.current, entry.compare])
    this.globalArrayCompare = Script.createSegmentedArray(globalEntries, (entry) => [entry.compare, entry.compare])

    // Get compare env
    const compareEnvironment = this.getCompareEnvironment()

    // Evaluate variables
    for (const [name, variable] of Object.entries(this.variables)) {
      // Copy over to reference variables
      this.variablesReference[name] = {
        ast: variable.ast,
        type: variable.type
      }

      if (variable.type !== 'local') {
        // Calculate values of table variable
        const currentValue = variable.ast.eval(new ExpressionScope(this).addSelf(variable.type === 'global' ? this.globalArrayCurrent : this.tableArrayCurrent))
        const compareValue = sameTimestamp ? currentValue : variable.ast.eval(new ExpressionScope(this).addSelf(variable.type === 'global' ? this.globalArrayCompare : this.tableArrayCompare))

        // Set values if valid
        if (!isNaN(Number(currentValue)) || typeof currentValue == 'object' || typeof currentValue == 'string') {
          variable.value = currentValue
        } else {
          delete variable.value
        }

        if (!isNaN(Number(compareValue)) || typeof compareValue == 'object' || typeof compareValue == 'string') {
          this.variablesReference[name].value = compareValue
        } else {
          delete this.variablesReference[name].value
        }
      }
    }

    // Evaluate custom rows
    for (const row of this.customRows) {
      const expression = row.expr as Expression
      const currentValue = expression.eval(new ExpressionScope(this).addSelf(this.tableArrayCurrent))
      const compareValue = sameTimestamp ? currentValue : expression.eval(new ExpressionScope(compareEnvironment).addSelf(this.tableArrayCompare))

      row.eval = {
        value: currentValue,
        compare: compareValue
      }
    }

    // Evaluate array constants
    this.evalRules()
  }

  evalGroup(tableArray: TableArray, globalArray: TableArray) {
    // Evaluate row indexes
    this.evalRowIndexes(tableArray)

    // Variables
    const sameTimestamp = tableArray.timestamp == tableArray.reference

    // Set lists
    this.listClasses = tableArray.reduce(
      (c, { current }) => {
        c[current.Class]++
        return c
      },
      toRecord(CONFIG.ids(), (id) => [id, 0])
    )

    this.listJoined = tableArray.joined
    this.listKicked = tableArray.kicked
    this.listMissing = tableArray.missing

    // Purify array
    const tableEntries = ([] as TableEntry[]).concat(tableArray)
    const globalEntries = ([] as TableEntry[]).concat(globalArray)

    // Get segmented lists
    this.tableArrayCurrent = Script.createSegmentedArray(tableEntries, (entry) => [entry.current, entry.compare])
    this.tableArrayCompare = Script.createSegmentedArray(tableEntries, (entry) => [entry.compare, entry.compare])
    this.globalArrayCurrent = Script.createSegmentedArray(globalEntries, (entry) => [entry.current, entry.compare])
    this.globalArrayCompare = Script.createSegmentedArray(globalEntries, (entry) => [entry.compare, entry.compare])

    // Get compare env
    const compareEnvironment = this.getCompareEnvironment()

    // Get own player
    const ownEntry = tableEntries.find((entry) => entry.current.Own) || tableEntries[0]
    const ownPlayer = dig(ownEntry, 'current')
    const ownCompare = dig(ownEntry, 'compare')

    // Evaluate variables
    for (const [name, variable] of Object.entries(this.variables)) {
      // Copy over to reference variables
      this.variablesReference[name] = {
        ast: variable.ast,
        type: variable.type
      }

      if (variable.type !== 'local') {
        // Calculate values of table variable
        const currentValue = variable.ast.eval(new ExpressionScope(this).addSelf(variable.type === 'global' ? this.globalArrayCurrent : this.tableArrayCurrent))
        const compareValue = sameTimestamp ? currentValue : variable.ast.eval(new ExpressionScope(this).addSelf(variable.type === 'global' ? this.globalArrayCompare : this.tableArrayCompare))

        // Set values if valid
        if (!isNaN(Number(currentValue)) || typeof currentValue == 'object' || typeof currentValue == 'string') {
          variable.value = currentValue
        } else {
          delete variable.value
        }

        if (!isNaN(Number(compareValue)) || typeof compareValue == 'object' || typeof compareValue == 'string') {
          this.variablesReference[name].value = compareValue
        } else {
          delete this.variablesReference[name].value
        }
      }
    }

    // Evaluate custom rows
    for (const row of this.customRows) {
      const expression = row.expr as Expression
      const currentValue = expression.eval(new ExpressionScope(this).with(ownPlayer, ownCompare).addSelf(this.tableArrayCurrent))
      const compareValue = sameTimestamp ? currentValue : expression.eval(new ExpressionScope(compareEnvironment).with(ownCompare, ownCompare).addSelf(this.tableArrayCompare))

      row.eval = {
        value: currentValue,
        compare: compareValue
      }
    }

    this.evalRules()
  }
}
