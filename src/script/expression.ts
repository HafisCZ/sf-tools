import { sha1, randomHash } from '@utils/hash'
import { invertRecord } from '@utils/utils'
import { Constants } from './constants'
import { TABLE_EXPRESSION_CONFIG, type ExpressionConfig, type HeaderMapping } from './expression-config'
import { type Highlighter } from './highlighter'
import { type ScriptContainer, type ScriptEntity } from './script'

export type ExpressionNodeObject = {
  op: string
  args: unknown
}

export type ExpressionNode = number | string | undefined | null | ExpressionNodeObject

export type ExpressionFunction = {
  ast: Expression
  args: string[]
}

export type ExpressionVariable = {
  ast: Expression
  type: string
  value?: unknown
}

export type ExpressionEnvironment = {
  theme?: unknown
  functions: Record<string, ExpressionFunction>
  variables: Record<string, ExpressionVariable>
  constants: Constants
  identifier?: string
  tableArrayCurrent?: unknown
  globalArrayCurrent?: unknown
  rowIndexes?: Record<string, number>
  timestamp?: number
  reference?: number
  listJoined?: unknown
  listMissing?: unknown
  listKicked?: unknown
  listClasses?: unknown
}

export type ExpressionRoot = {
  constants: Constants
  functions?: Record<string, unknown>
  variables?: Record<string, { type?: string }>
}

export type SegmentedArray = unknown[] & { segmented?: boolean }

type ScopeFunction = (self: Expression, scope: ExpressionScope, node: ExpressionNodeObject) => unknown
type ValueFunction = (...args: unknown[]) => unknown

const EXPRESSION_REGEXP = (function () {
  try {
    return new RegExp('(\\\'[^\\\']*\\\'|\\"[^\\"]*\\"|\\~\\d+|\\~|\\`[^\\`]*\\`|\\;|\\$\\$|\\$\\!|\\$|\\{|\\}|\\|\\||\\%|\\^|\\!\\=|\\!|\\&\\&|\\>\\=|\\<\\=|\\=\\=|\\(|\\)|\\+|\\-|\\/\\/|\\/|\\*|\\>|\\<|\\?|\\:|\\.+this|(?<!\\.)\\d+(?:.\\d+)?e\\d+|(?<!\\.)\\d+\\.\\d+|\\.|\\[|\\]|\\,)')
  } catch {
    return new RegExp('(\\\'[^\\\']*\\\'|\\"[^\\"]*\\"|\\~\\d+|\\~|\\`[^\\`]*\\`|\\;|\\$\\$|\\$\\!|\\$|\\{|\\}|\\|\\||\\%|\\^|\\!\\=|\\!|\\&\\&|\\>\\=|\\<\\=|\\=\\=|\\(|\\)|\\+|\\-|\\/\\/|\\/|\\*|\\>|\\<|\\?|\\:|\\.+this|\\d+(?:.\\d+)?e\\d+|\\d+\\.\\d+|\\.|\\[|\\]|\\,)')
  }
})()

export class ExpressionCache {
  static #cache = new Map<string | undefined, Map<string, unknown>>()

  static reset() {
    this.#cache = new Map()
  }

  static set(scope: string | undefined, node: unknown, value: unknown) {
    if (!scope) {
      return
    }

    const block = this.#cache.get(scope) || new Map<string, unknown>()

    this.#cache.set(scope, block)

    block.set(String(node), value)
  }

  static get(scope: string | undefined, node: unknown) {
    const block = this.#cache.get(scope)

    if (typeof block !== 'undefined') {
      return block.get(String(node))
    } else {
      return undefined
    }
  }

  static has(scope: string | undefined, node: unknown) {
    if (typeof scope === 'undefined') {
      return false
    }

    const block = this.#cache.get(scope)
    if (block) {
      return block.has(String(node))
    } else {
      return false
    }
  }
}

export class ExpressionScope {
  static #default: ExpressionScope | undefined

  self: unknown[]
  indirect: unknown[]
  env: ExpressionEnvironment
  current?: ScriptEntity
  compare?: ScriptEntity
  header?: ScriptContainer
  token?: string

  clone() {
    const copy = new ExpressionScope(this.env)
    copy.self = [...this.self]
    copy.indirect = [...this.indirect]
    copy.current = this.current
    copy.compare = this.compare
    copy.header = this.header

    return copy
  }

  empty() {
    return !(this.self.length + this.indirect.length)
  }

  alwaysEval() {
    return !this.empty() || !this.current || !this.compare
  }

  constructor(env?: ExpressionEnvironment | null) {
    this.self = []
    this.indirect = []
    this.env = env || { theme: 'light', functions: Object.create(null) as Record<string, ExpressionFunction>, variables: Object.create(null) as Record<string, ExpressionVariable>, constants: Constants.DEFAULT, identifier: randomHash() }
  }

  addSelf(obj: unknown) {
    this.self.unshift(obj)
    return this
  }

  with(current?: unknown, compare?: unknown) {
    this.current = current as ScriptEntity | undefined
    this.compare = compare as ScriptEntity | undefined

    if (this.current && this.compare) {
      this.token = `${this.env.identifier}.${this.current.LinkId}.${this.current.Timestamp}.${this.compare.Timestamp}`
    }

    return this
  }

  environment(env: ExpressionEnvironment) {
    this.env = env
    return this
  }

  via(header?: ScriptContainer) {
    this.header = header
    return this
  }

  add(obj: unknown) {
    if (obj != undefined) {
      this.indirect.unshift(obj)
    }
    return this
  }

  getSelf(offset = 0) {
    return this.self[offset]
  }

  has(key: string) {
    if (this.self.length && typeof this.self[0] === 'object' && this.self[0] !== null && key in this.self[0]) {
      return true
    }

    for (let i = 0; i < this.indirect.length; i++) {
      const value = this.indirect[i]

      if (typeof value === 'object' && value !== null && key in value) {
        return true
      }
    }

    return false
  }

  get(key: string) {
    const self = this.self[0]

    if (this.self.length && typeof self === 'object' && self !== null && key in self) {
      return (self as Record<string, unknown>)[key]
    }

    for (let i = 0; i < this.indirect.length; i++) {
      const value = this.indirect[i]

      // Checks the first entry for null, not the current one, like the legacy code did
      if (typeof value === 'object' && this.indirect[0] !== null && key in (value as object)) {
        return (value as Record<string, unknown>)[key]
      }
    }

    return undefined
  }

  static get DEFAULT() {
    return (this.#default ??= new this())
  }
}

export class ExpressionRenderer {
  static render(highlighter: typeof Highlighter, string: string, root: ExpressionRoot = { constants: Constants.DEFAULT }, config: ExpressionConfig = TABLE_EXPRESSION_CONFIG) {
    const tokens = string.replace(/\\"/g, '‣').replace(/\\'/g, '⁃').split(EXPRESSION_REGEXP)
    let nextName = false
    const bracketStack: string[] = []

    // Go through all tokens
    for (let i = 0; i < tokens.length; i++) {
      let token = tokens[i]
      if (/\S/.test(token)) {
        // Prepare token
        const [, prefix, rawToken, suffix] = token.match(/(\s*)(.*\S)(\s*)/) as RegExpMatchArray
        token = rawToken.replace(/‣/g, '\\"').replace(/⁃/g, "\\'")

        // Format token
        if (token == undefined) {
          continue
        }

        highlighter.normal(prefix)

        if (token.length > 1 && ["'", '"'].includes(token[0]) && ["'", '"'].includes(token[token.length - 1])) {
          highlighter.comment(token)
        } else if (token.length > 1 && token[0] == '`' && token[token.length - 1] == '`') {
          highlighter.string('`')
          highlighter.join(token.slice(1, token.length - 1).split(/(\{\d+\})/g), (item) => (/(\{\d+\})/.test(item) ? 'function' : 'string'), '')
          highlighter.string('`')
        } else if (config.has(token)) {
          const data = config.get(token)

          switch (data?.type) {
            case 'function': {
              highlighter.function(token)
              break
            }
            case 'variable': {
              highlighter.constant(token)
              break
            }
            case 'header': {
              highlighter.header(token, data.meta)
              break
            }
            case 'accessor': {
              highlighter.header(token, 'scoped')
              break
            }
            case 'enumeration': {
              highlighter.enum(token)
              break
            }
          }
        } else if (Expression.TOKENS[token]) {
          highlighter.operator(token)
        } else if (root.functions && root.functions[token]) {
          highlighter.function(token)
        } else if (token === 'true' || token === 'false') {
          highlighter.boolean(token, token === 'true')
        } else if (['undefined', 'null', 'loop_index', 'loop_array'].includes(token)) {
          highlighter.constant(token)
        } else if (root.variables && root.variables[token]) {
          if (root.variables[token].type === 'global') {
            highlighter.variable(token, 'global')
          } else if (root.variables[token].type === 'table') {
            highlighter.variable(token, 'table')
          } else {
            highlighter.variable(token, 'local')
          }
        } else if (/^(\.*)this$/.test(token)) {
          highlighter.constant(token)
        } else if (root.constants.has(token)) {
          highlighter.constant(token)
        } else if (/~\d+/.test(token)) {
          highlighter.enum(token)
        } else if (token == '$' || token == '$!' || token == '$$') {
          highlighter.keyword(token)
          nextName = true
        } else if (Expression.TERMINATORS[token]) {
          bracketStack.unshift(Expression.TERMINATORS[token])

          highlighter.normal(token)

          nextName = false
        } else if (Expression.TERMINATORS_INVERTED[token]) {
          if (bracketStack[0] === token) {
            bracketStack.shift()

            highlighter.normal(token)
          } else {
            highlighter.error(token, true)
          }
        } else if (nextName) {
          nextName = false
          if (/[a-zA-Z0-9\-_]+/.test(token)) {
            highlighter.constant(token)
          } else {
            highlighter.normal(token)
          }
        } else {
          highlighter.normal(token)
        }

        highlighter.normal(suffix)
      } else {
        highlighter.normal(token)
      }
    }

    if (bracketStack.length > 0) {
      highlighter.floatError(' '.repeat(bracketStack.length))
    }
  }
}

type Token = string | number

type EmbeddedVariable = {
  start: number
  length: number
  name: string | null
  type: string
}

export class Expression {
  config: ExpressionConfig
  tokens: Token[]
  root: ExpressionNode | false
  empty?: boolean
  rstr = ''
  cacheable = false
  resolved?: boolean
  subexpressions: (ExpressionNode | false)[] = []
  subexpressions_cache_indexes: number[] = []
  subexpressions_cache: unknown[] = []

  static create(string: string, settings: { variables?: Record<string, ExpressionVariable> } | null = null, config: ExpressionConfig = TABLE_EXPRESSION_CONFIG) {
    const expression = new Expression(string, settings, config)

    if (expression.isValid()) {
      return expression
    } else {
      return null
    }
  }

  constructor(string: string, settings: { variables?: Record<string, ExpressionVariable> } | null = null, config: ExpressionConfig = TABLE_EXPRESSION_CONFIG) {
    this.config = config
    this.tokens = string
      .replace(/\\"/g, '‣')
      .replace(/\\'/g, '⁃')
      .split(EXPRESSION_REGEXP)
      .map((token) => token.trim())
      .filter((token) => token.length)
    this.root = false

    if (this.tokens.length == 0) {
      this.empty = true
    } else {
      let count = 0
      for (const token of this.tokens) {
        if (token == '(') {
          count++
        } else if (token == ')') {
          count--
        }
      }

      if (count == 0) {
        this.rstr = sha1(this.tokens.join(''))

        this.cacheable = true
        this.subexpressions = []

        // Get settings variable array
        const variables = (settings ? settings.variables : undefined) || (Object.create(null) as Record<string, ExpressionVariable>)
        this.#parseEmbeddedVariables(variables)

        // Generate tree
        this.root = this.#getExpression()
        while (this.tokens[0] == ';') {
          const subRoot = this.#postProcess(variables, this.root)
          this.cacheable = this.cacheable && this.#checkCacheableNode(subRoot)
          this.subexpressions.push(subRoot)

          this.tokens.shift()
          while (this.tokens[0] == ';') {
            this.subexpressions.push(undefined)
            this.tokens.shift()
          }

          this.root = this.#getExpression()
        }

        // Clean tree
        this.root = this.#postProcess(variables, this.root)

        // Check if tree is cacheable or not
        this.cacheable = this.cacheable && this.#checkCacheableNode(this.root)

        // Check if expression was resolved by post process and unwrap string if necessary
        if (typeof this.root === 'number') {
          this.resolved = true
        } else if (typeof this.root === 'object' && this.root !== null && this.root.op === '__value') {
          this.resolved = true
          this.root = this.root.args as ExpressionNode
        }
      } else {
        this.empty = true
      }
    }
  }

  // Outside eval function (always call this from outside of the Expression class)
  eval(scope: ExpressionScope = ExpressionScope.DEFAULT) {
    this.subexpressions_cache_indexes = []
    this.subexpressions_cache = []

    let value: unknown = undefined
    if (this.resolved) {
      value = this.root
    } else if (scope.alwaysEval() || !this.cacheable) {
      value = this.evalInternal(scope, this.root)
    } else if (ExpressionCache.has(scope.token, this.rstr)) {
      value = ExpressionCache.get(scope.token, this.rstr)
    } else {
      value = this.evalInternal(scope, this.root)
      ExpressionCache.set(scope.token, this.rstr, value)
    }

    return typeof value === 'number' && isNaN(value) ? undefined : value
  }

  // Check if the expression is valid (no tokens left)
  isValid() {
    return this.tokens.length == 0 && !this.empty
  }

  // Eval embedded variables
  #parseEmbeddedVariables(variables: Record<string, ExpressionVariable>) {
    // All variables in the token string
    const embeddedVariables: EmbeddedVariable[] = []

    // Current variable
    let brackets = 0
    let index: number | null = null
    let manualName: string | null = null
    let type = 'table'

    // Iterate over all tokens
    for (let i = 0; i < this.tokens.length; i++) {
      // Current token
      const token = this.tokens[i]

      // Start new variable if current token matches ${
      if (token == '$') {
        if (this.tokens[i + 1] == '{') {
          // Save current index and skip next bracket
          index = i++
          brackets++
          type = 'table'
        } else if (this.tokens[i + 2] == '{') {
          // Save current index and skip next bracket
          index = i++
          brackets++
          manualName = this.tokens[i++] as string
          type = 'table'
        }
      } else if (token == '$$') {
        if (this.tokens[i + 1] == '{') {
          // Save current index and skip next bracket
          index = i++
          brackets++
          type = 'global'
        } else if (this.tokens[i + 2] == '{') {
          // Save current index and skip next bracket
          index = i++
          brackets++
          manualName = this.tokens[i++] as string
          type = 'global'
        }
      } else if (token == '$!') {
        if (this.tokens[i + 1] == '{') {
          index = i++
          brackets++
          type = 'local'
        } else if (this.tokens[i + 2] == '{') {
          // Save current index and skip next bracket
          index = i++
          brackets++
          manualName = this.tokens[i++] as string
          type = 'local'
        }
      } else if (index != null) {
        // If there is a variable
        if (token == '{') {
          // Increment bracket counter
          brackets++
        } else if (token == '}') {
          // Decrement bracket counter
          brackets--
          if (brackets == 0) {
            // Push new variable if brackets are 0
            embeddedVariables.push({
              start: index,
              length: i - index + 1,
              name: manualName,
              type: type
            })

            // Reset temporary vars
            index = null
            manualName = null
            brackets = 0
            type = 'table'
          }
        }
      }
    }

    // Replace variables with placeholders and save expression
    for (let i = embeddedVariables.length - 1; i >= 0; i--) {
      const variable = embeddedVariables[i]

      // Get tokens and strip first 2 and last 1 token (control characters)
      let tokens = this.tokens.splice(variable.start, variable.length)
      tokens = tokens.slice(2 + (variable.name ? 1 : 0), tokens.length - 1)

      // Get expression from tokens
      const expression = new Expression(tokens.join(''))

      // Get placeholder name, the legacy code appended an undefined field, so it always ends with __undefined
      const name = variable.name || `__${expression.rstr}__undefined`

      // Add variable name to the token list
      this.tokens.splice(variable.start, 0, isNaN(Number(expression.root)) ? name : (expression.root as number))

      // Add variable to settings
      variables[name] = {
        ast: expression,
        type: variable.type
      }
    }
  }

  // Peek at next token
  #peek(i = 0) {
    return this.tokens[i]
  }

  // Get next token
  #get() {
    const v = this.tokens.shift()
    return isNaN(Number(v)) ? v : Number(v)
  }

  // Is token a string
  #isString(token: unknown) {
    if (token == undefined) {
      return false
    } else {
      const text = token as string

      return (text[0] === "'" && text[text.length - 1] === "'") || (text[0] === '"' && text[text.length - 1] === '"')
    }
  }

  // Get next token as string
  #getString(cast = false): ExpressionNode {
    const token = this.#get()

    if (this.#isString(token)) {
      const text = token as string

      return this.#wrapValue(
        text
          .slice(1, text.length - 1)
          .replace(/‣/g, '"')
          .replace(/⁃/g, "'")
      )
    } else {
      return cast ? this.#wrapValue(token) : token
    }
  }

  #wrapValue(value: unknown): ExpressionNodeObject {
    return {
      op: '__value',
      args: value
    }
  }

  // Get next token as unary operator
  #getUnaryOperator(): ExpressionNode {
    return {
      op: Expression.#TOKEN_UNARY[this.#get() as string],
      args: [this.#getVal()]
    }
  }

  #getExpressionGroup<TArgument>(evalToken: (index: number) => TArgument, evalBlank: ((index: number) => TArgument) | false) {
    const args: TArgument[] = []

    const terminator = Expression.TERMINATORS[this.#get() as string]

    if (this.#peek() == terminator) {
      this.#get()
      return args
    }

    do {
      const pk = this.#peek()
      if (pk === ',' || pk === terminator) {
        if (evalBlank) {
          args.push(evalBlank(args.length))
        }
      } else {
        args.push(evalToken(args.length))
      }
    } while (this.#get() === ',')

    return args
  }

  // Get global function
  #getFunction(): ExpressionNode {
    return {
      op: this.#get() as string,
      args: this.#getExpressionGroup(
        () => this.#getExpression(),
        () => this.#wrapValue(undefined)
      )
    }
  }

  #getTemplate(): ExpressionNode {
    const val = this.#get() as string

    return {
      op: 'format',
      args: [
        this.#wrapValue(val.slice(1, val.length - 1)),
        ...this.#getExpressionGroup(
          () => this.#getExpression(),
          () => this.#wrapValue(undefined)
        )
      ]
    }
  }

  // Get array
  #getArray(): ExpressionNode {
    return {
      op: '__array',
      args: this.#getExpressionGroup(
        (key) => {
          return {
            key,
            val: this.#getExpression()
          }
        },
        (key) => {
          return {
            key,
            val: this.#wrapValue(undefined)
          }
        }
      )
    }
  }

  #getObjectItem() {
    const key = this.#peek(1) === ':' ? this.#getString() : this.#getExpression()
    this.#get()

    return {
      key: key,
      val: this.#getExpression()
    }
  }

  // Get array
  #getObject(): ExpressionNode {
    return {
      op: '__object',
      args: this.#getExpressionGroup(() => this.#getObjectItem(), false)
    }
  }

  // Get object access
  #getObjectAccess(node: ExpressionNode): ExpressionNode {
    let name: ExpressionNode = undefined

    if (this.#get() === '.') {
      name = this.#getString(true)
    } else {
      name = this.#getExpression()
      this.#get()
    }

    if (this.#peek() === '(') {
      this.#get()

      const args: ExpressionNode[] = []

      if (this.#peek() === ')') {
        this.#get()
      } else {
        do {
          args.push(this.#getExpression())
        } while (this.#get() === ',')
      }

      return {
        op: '__call',
        args: [node, name, args]
      }
    } else {
      return {
        op: '__at',
        args: [node, name]
      }
    }
  }

  #getVal() {
    let node: ExpressionNode = undefined

    const token = this.#peek()
    const follow = this.#peek(1)

    if (token == undefined) {
      // Ignore undefined value
    } else if (token === '(') {
      // Get bracket
      this.#get()
      node = this.#getExpression()
      this.#get()
    } else if (this.#isString(token)) {
      // Get string
      node = this.#getString()
    } else if (/^`.*`$/.test(String(token)) && follow === '(') {
      // Get template
      node = this.#getTemplate()
    } else if (Expression.#TOKEN_UNARY[token]) {
      // Get unary operator
      node = this.#getUnaryOperator()
    } else if (/[_a-zA-Z]\w*/.test(String(token)) && follow === '(') {
      // Get function
      node = this.#getFunction()
    } else if (token === '[') {
      // Get array
      node = this.#getArray()
    } else if (token === '{') {
      // Get object
      node = this.#getObject()
    } else {
      // Get node
      node = this.#get()

      if (node === 'undefined') {
        node = this.#wrapValue(undefined)
      } else if (node === 'null') {
        node = this.#wrapValue(null)
      } else if (node === 'true') {
        node = this.#wrapValue(true)
      } else if (node === 'false') {
        node = this.#wrapValue(false)
      }
    }

    while (this.#peek() === '.' || this.#peek() === '[') {
      // Get object access
      node = this.#getObjectAccess(node)
    }

    return node
  }

  #getHighPriority() {
    let node = this.#getVal()
    while (Expression.#TOKEN_HIGH_PRIORITY[this.#peek()]) {
      node = {
        op: Expression.#TOKEN_HIGH_PRIORITY[this.#get() as string],
        args: [node, this.#getVal()]
      }
    }

    return node
  }

  #getMediumPriority() {
    let node = this.#getHighPriority()
    while (Expression.#TOKEN_MEDIUM_PRIORITY[this.#peek()]) {
      node = {
        op: Expression.#TOKEN_MEDIUM_PRIORITY[this.#get() as string],
        args: [node, this.#getHighPriority()]
      }
    }

    return node
  }

  #getLowPriority() {
    let node = this.#getMediumPriority()
    while (Expression.#TOKEN_LOW_PRIORITY[this.#peek()]) {
      node = {
        op: Expression.#TOKEN_LOW_PRIORITY[this.#get() as string],
        args: [node, this.#getMediumPriority()]
      }
    }

    return node
  }

  #getBool() {
    let node = this.#getLowPriority()
    while (Expression.#TOKEN_BOOL[this.#peek()]) {
      node = {
        op: Expression.#TOKEN_BOOL[this.#get() as string],
        args: [node, this.#getLowPriority()]
      }
    }

    return node
  }

  #getBoolMerge() {
    let node = this.#getBool()
    while (Expression.#TOKEN_BOOL_MERGE[this.#peek()]) {
      node = {
        op: Expression.#TOKEN_BOOL_MERGE[this.#get() as string],
        args: [node, this.#getBool()]
      }
    }

    return node
  }

  #getExpression(): ExpressionNode {
    let node = this.#getBoolMerge()
    if (this.#peek() == '?') {
      this.#get()

      // First argument
      const arg1 = this.#getExpression()
      this.#get()

      // Second argument
      const arg2 = this.#getExpression()

      // Create node
      node = {
        args: [node, arg1, arg2],
        op: '__condition'
      }
    }

    return node
  }

  #checkCacheableNode(node: ExpressionNode | false): boolean {
    if (typeof node === 'object' && node !== null) {
      if (this.config.has(node.op)) {
        const data = this.config.get(node.op)

        if (data?.noCache) {
          return false
        }
      }

      if (node.args && node.op !== '__value') {
        for (const arg of node.args as ExpressionNode[]) {
          if (!this.#checkCacheableNode(arg)) {
            return false
          }
        }
      }
    }

    return true
  }

  // Evaluate all simple nodes (simple string joining / math calculation with compile time results)
  #postProcess(variables: Record<string, ExpressionVariable>, node: ExpressionNode): ExpressionNode {
    if (typeof node === 'object' && node !== null) {
      if (node.op === '__value') return node
      if (node.args) {
        const args = node.args as ExpressionNode[]

        for (let i = 0; i < args.length; i++) {
          args[i] = this.#postProcess(variables, args[i])
        }
      }

      if (this.config.has(node.op)) {
        const data = this.config.get(node.op)

        if (data?.noCache) {
          return node
        } else if (data?.type === 'function' && (data.meta === 'math' || data.meta === 'value') && node.args) {
          const args = node.args as ExpressionNode[]

          if (args.filter((a) => !isNaN(Number(a)) || (a != undefined && (a as ExpressionNodeObject).op === '__value')).length == args.length) {
            const res = (data.data as ValueFunction)(...args.map((a) => ((a as ExpressionNodeObject).op === '__value' ? (a as ExpressionNodeObject).args : a)))
            return typeof res === 'string' ? this.#wrapValue(res) : (res as ExpressionNode)
          }
        }
      }
    } else if (typeof node === 'string') {
      if (node in variables && !isNaN(Number(variables[node].ast.root))) {
        return variables[node].ast.root as number
      } else if (/~\d+/.test(node)) {
        const index = parseInt(node.slice(1))
        if (index < this.subexpressions.length) {
          const subnode = this.subexpressions[index]
          if (typeof subnode === 'number' || (typeof subnode === 'object' && subnode !== null && subnode.op === '__value')) {
            return subnode
          } else if (typeof subnode === 'string' && subnode in variables && !isNaN(Number(variables[subnode].ast.root))) {
            return variables[subnode].ast.root as number
          }
        }
      }
    }

    return node
  }

  // Evaluate a node into array, used for array functions
  evalToArray(scope: ExpressionScope, node: ExpressionNode): SegmentedArray {
    const generated = this.evalInternal(scope, node)

    if (!generated || typeof generated != 'object') {
      return []
    } else {
      return Array.isArray(generated) ? (generated as unknown[]) : (Object.values(generated) as unknown[])
    }
  }

  evalMappedArray(obj: unknown, arg: ExpressionNode, loop_index: number, loop_array: unknown[], mapper: ExpressionFunction | undefined, segmented: boolean | undefined, scope: ExpressionScope) {
    if (mapper) {
      if (segmented) {
        const segment = obj as unknown[]

        return mapper.ast.eval(
          scope
            .clone()
            .with(segment[0], segment[1])
            .addSelf(segment[0])
            .add(
              mapper.args.reduce<Record<string, unknown>>(
                (c, a, i) => {
                  c[a] = segment[i]
                  return c
                },
                Object.create(null) as Record<string, unknown>
              )
            )
            .add({ loop_index, loop_array })
        )
      } else {
        return mapper.ast.eval(
          scope
            .clone()
            .addSelf(obj)
            .add(
              mapper.args.reduce<Record<string, unknown>>(
                (c, a) => {
                  c[a] = obj
                  return c
                },
                Object.create(null) as Record<string, unknown>
              )
            )
            .add({ loop_index, loop_array })
        )
      }
    } else {
      if (segmented) {
        const segment = obj as unknown[]

        return this.evalInternal(scope.clone().with(segment[0], segment[1]).addSelf(segment[0]).add({ loop_index, loop_array }), arg)
      } else {
        return this.evalInternal(scope.clone().addSelf(obj).add({ loop_index, loop_array }), arg)
      }
    }
  }

  evalInternal(scope: ExpressionScope, node: ExpressionNode | false): unknown {
    if (typeof node === 'object' && node !== null) {
      if (typeof node.op === 'string') {
        if (node.op === '__value') {
          return node.args
        } else if (scope.env.functions[node.op]) {
          const args = node.args as ExpressionNode[]
          const mapper = scope.env.functions[node.op]
          const scope2 = Object.create(null) as Record<string, unknown>
          for (let i = 0; i < mapper.args.length; i++) {
            scope2[mapper.args[i]] = this.evalInternal(scope, args[i])
          }

          return mapper.ast.eval(scope.clone().add(scope2))
        } else if (this.config.has(node.op)) {
          const data = this.config.get(node.op)

          switch (data?.type) {
            case 'function': {
              const args = node.args as ExpressionNode[]

              // Function
              if (data.meta === 'scope') {
                return (data.data as ScopeFunction)(this, scope, node)
              } else if (data.meta === 'array') {
                return (data.data as ValueFunction)(this.evalToArray(scope, args[0]), ...args.slice(1).map((arg) => this.evalInternal(scope, arg)))
              } else {
                return (data.data as ValueFunction)(...args.map((arg) => this.evalInternal(scope, arg)))
              }
            }
            case 'header': {
              const obj = this.evalInternal(scope, (node.args as ExpressionNode[])[0])
              return obj && typeof obj === 'object' ? (data.data as HeaderMapping).expr(obj as ScriptEntity) : undefined
            }
            case 'accessor': {
              const args = node.args as ExpressionNode[]

              if (args.length == 1) {
                const obj = this.evalInternal(scope, args[0])
                return obj && typeof obj === 'object' ? (data.data as ValueFunction)(obj, scope.current) : undefined
              } else {
                return undefined
              }
            }
          }
        } else {
          // Return undefined
          return undefined
        }
      } else {
        // Return node in case something does not work :(
        return node
      }
    } else if (typeof node === 'string') {
      let scopeValue: RegExpMatchArray | null = null
      if ((scopeValue = node.match(/(\.*)this/))) {
        return scope ? scope.getSelf(scopeValue[1].length) : undefined
      } else if (/~\d+/.test(node)) {
        // Return sub expressions
        const subIndex = parseInt(node.slice(1))
        if (subIndex < this.subexpressions.length) {
          if (!this.subexpressions_cache_indexes.includes(subIndex)) {
            this.subexpressions_cache_indexes.push(subIndex)
            this.subexpressions_cache[subIndex] = this.evalInternal(scope, this.subexpressions[subIndex])
          }
          return this.subexpressions_cache[subIndex]
        } else {
          return undefined
        }
      } else if (this.config.has(node)) {
        const data = this.config.get(node)

        switch (data?.type) {
          case 'variable': {
            return (data.data as (scope: ExpressionScope) => unknown)(scope)
          }
          case 'header': {
            return scope.current ? (data.data as HeaderMapping).expr(scope.current) : undefined
          }
          case 'accessor': {
            const self = scope.getSelf()
            return self && typeof self === 'object' ? (data.data as ValueFunction)(self, scope.current) : undefined
          }
          case 'function': {
            const self = scope.getSelf()
            return data.meta === 'value' ? (data.data as ValueFunction)(self) : undefined
          }
          case 'enumeration': {
            return data.data
          }
        }
      } else if (scope && scope.has(node)) {
        return scope.get(node)
      } else if (node in scope.env.variables) {
        const variable = scope.env.variables[node]
        if (typeof variable.value != 'undefined') {
          return variable.value
        } else if (ExpressionCache.has(scope.token, node)) {
          return ExpressionCache.get(scope.token, node)
        } else {
          ExpressionCache.set(scope.token, node, undefined)
          const value = variable.ast.eval(new ExpressionScope(scope.env).with(scope.current, scope.compare).via(scope.header))
          ExpressionCache.set(scope.token, node, value)
          return value
        }
      } else if (scope.env.constants.has(node)) {
        // Return constant
        return scope.env.constants.get(node)
      } else {
        return undefined
      }
    } else {
      return node
    }
  }

  static STRING_TERMINATORS = new Set(["'", '"', '`'])

  static TERMINATORS: Record<string, string> = {
    '(': ')',
    '[': ']',
    '{': '}'
  }

  static TERMINATORS_INVERTED = invertRecord(this.TERMINATORS) as Record<string, string>

  static TERMINATORS_ALL: Record<string, string> = Object.assign({}, this.TERMINATORS, this.TERMINATORS_INVERTED)

  static #TOKEN_UNARY: Record<Token, string> = {
    '-': '__negate',
    '!': '__invert'
  }

  static #TOKEN_HIGH_PRIORITY: Record<Token, string> = {
    '^': '__power'
  }

  static #TOKEN_MEDIUM_PRIORITY: Record<Token, string> = {
    '*': '__multiply',
    '/': '__divide',
    '//': '__divide_integer',
    '%': '__modulo'
  }

  static #TOKEN_LOW_PRIORITY: Record<Token, string> = {
    '+': '__add',
    '-': '__subtract'
  }

  static #TOKEN_BOOL: Record<Token, string> = {
    '>': '__greater',
    '>=': '__greater_equal',
    '<': '__lower',
    '<=': '__lower_equal',
    '==': '__equal',
    '!=': '__not_equal',
    '~': '__like'
  }

  static #TOKEN_BOOL_MERGE: Record<Token, string> = {
    '&&': '__and',
    '||': '__or'
  }

  static TOKENS: Record<string, string> = Object.assign(Object.create(null) as Record<string, string>, this.#TOKEN_UNARY, this.#TOKEN_HIGH_PRIORITY, this.#TOKEN_MEDIUM_PRIORITY, this.#TOKEN_LOW_PRIORITY, this.#TOKEN_BOOL, this.#TOKEN_BOOL_MERGE)
}
