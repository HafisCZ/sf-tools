import { Expression } from './expression'
import { Highlighter } from './highlighter'

export type QueryField = 'class' | 'name' | 'guild' | 'server'

export type QueryValueKind = Exclude<QueryField, 'class'> | 'tag'

export type QueryOptionName = 'sort' | 'first' | 'latest' | 'hidden' | 'own' | 'recalculate' | 'columns' | 'template' | 'others' | 'all'

export type QueryLanguage = {
  /**
   * Field filters the query accepts and offers
   */
  fields: QueryField[]
  /**
   * Other names of the fields, such as `c` for `class`
   */
  aliases: Record<string, QueryField>
  /**
   * View options the query accepts after `@`
   */
  options: QueryOptionName[]
  /**
   * Header names usable in `eval()`, `@sort` and `@columns`
   */
  headers: string[]
  /**
   * Function names offered inside `eval()` and `@sort`
   */
  functions: string[]
  /**
   * Class names indexed by class id, the first entry is unused
   */
  classes: string[]
  /**
   * Known values offered as completions and used to warn about exact matches that find nothing
   */
  values: (kind: QueryValueKind) => string[]
}

export type QueryOptions = {
  sort?: { expression: Expression; descending: boolean }
  first?: number
  latest?: boolean
  hidden?: boolean
  own?: boolean
  recalculate?: boolean
  others?: boolean
  columns?: string[]
  template?: string
}

export type QueryTarget = {
  values: () => string[]
  field: (field: Exclude<QueryField, 'class'>) => string
  classId: () => number
  tags: () => string[]
  evaluate: (expression: Expression) => unknown
}

export type QueryPartKind = 'plain' | 'text' | 'string' | 'key' | 'value' | 'tag' | 'header' | 'number' | 'operator' | 'logic' | 'bracket' | 'option' | 'option-value' | 'error' | 'script'

export type QueryPart = {
  text: string
  kind: QueryPartKind
  className?: string
  escape?: boolean
  depth?: number
  issue?: 'error' | 'warning' | 'pending'
  match?: boolean
}

export type QuerySuggestionKind = 'field' | 'value' | 'string' | 'tag' | 'header' | 'option' | 'function' | 'logic' | 'token'

export type QuerySuggestion = {
  label: string
  insert: string
  kind: QuerySuggestionKind
  description?: string
  keepOpen: boolean
}

export type QuerySuggestions = {
  items: QuerySuggestion[]
  start: number
  end: number
}

type QueryIssue = {
  key: string
  soft?: boolean
}

type QueryTokenType = 'space' | 'open' | 'close' | 'or' | 'and' | 'not' | 'text' | 'phrase' | 'tag' | 'field' | 'expression' | 'option'

type QueryTokenPart = {
  text: string
  kind: QueryPartKind
  className?: string
  escape?: boolean
  depth?: number
  error?: boolean
}

type QueryValue = {
  value: string
  exact: boolean
}

type QueryToken = {
  type: QueryTokenType
  start: number
  end: number
  text: string
  parts: QueryTokenPart[]
  error: QueryIssue | null
  warning: QueryIssue | null
  value?: string
  field?: Exclude<QueryField, 'class'>
  values?: QueryValue[]
  classes?: number[]
  tags?: string[]
  expression?: Expression
  expressions?: Expression[]
  option?: QueryOptionName
  descending?: boolean
  count?: number
  columns?: string[]
  template?: string
}

type QueryArgument = {
  leading: string
  text: string
  trailing: string
}

type QueryArguments = {
  entries: QueryArgument[]
  closed: boolean
  rest: string
}

type QueryFieldValue = {
  parts: QueryTokenPart[]
  open: boolean
  invalid?: QueryIssue
  classId?: number
  value?: QueryValue
  missing?: boolean
}

type QueryNode = { type: 'and' | 'or'; left: QueryNode; right: QueryNode } | { type: 'not'; node: QueryNode } | { type: 'leaf'; token: QueryToken }

const FIELDS: QueryField[] = ['class', 'name', 'guild', 'server']
const OPTIONS: QueryOptionName[] = ['sort', 'first', 'latest', 'hidden', 'own', 'recalculate', 'columns', 'template', 'others', 'all']
const VALUE_OPTIONS: QueryOptionName[] = ['sort', 'first', 'columns', 'template']
const LOGIC_WORDS = ['not', 'or', 'and']
const SCRIPT_CALLS = ['eval', '@sort']

function unescape(text: string) {
  return text.replace(/\\([\s\S])/g, '$1')
}

function quote(text: string) {
  return `"${text.replace(/["\\]/g, (character) => `\\${character}`)}"`
}

function isClosedQuote(text: string) {
  return text.length > 1 && text[0] === '"' && /(^|[^\\])(\\\\)*"$/.test(text.slice(1))
}

function hasDanglingEscape(text: string) {
  return /(^|[^\\])(\\\\)*\\$/.test(text)
}

function decodeHtml(text: string) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
}

function toClassSlug(name: string) {
  return name.toLowerCase().replace(/[\s_-]/g, '')
}

function isField(name: string): name is QueryField {
  return (FIELDS as string[]).includes(name)
}

function isOption(name: string): name is QueryOptionName {
  return (OPTIONS as string[]).includes(name)
}

function findHeaderName(word: string, language: QueryLanguage) {
  const lower = word.toLowerCase()

  return language.headers.find((name) => name.toLowerCase() === lower) ?? null
}

function isHeaderNamePrefix(word: string, language: QueryLanguage) {
  const lower = word.toLowerCase()

  return language.headers.some((name) => name.toLowerCase().startsWith(lower))
}

function resolveField(name: string, language: QueryLanguage) {
  const lower = name.toLowerCase()
  const field = language.aliases[lower] ?? lower

  return isField(field) && language.fields.includes(field) ? field : null
}

function resolveClass(value: string, language: QueryLanguage) {
  const slug = toClassSlug(value)
  const id = language.classes.findIndex((name, index) => index > 0 && toClassSlug(name) === slug)

  return id > 0 ? id : null
}

function findExactClass(value: string, language: QueryLanguage) {
  const id = language.classes.findIndex((name, index) => index > 0 && name === value)

  return id > 0 ? id : null
}

function skipQuote(text: string, start: number) {
  for (let index = start + 1; index < text.length; index++) {
    if (text[index] === '\\') {
      index++
    } else if (text[index] === text[start]) {
      return index + 1
    }
  }

  return text.length
}

function skipList(text: string, start: number, script = false) {
  let depth = 0

  for (let index = start; index < text.length; index++) {
    if (text[index] === '\\') {
      index++
    } else if (text[index] === '"' || (script && text[index] === "'")) {
      index = skipQuote(text, index) - 1
    } else if (text[index] === '(') {
      depth++
    } else if (text[index] === ')' && --depth === 0) {
      return { end: index + 1, closed: true }
    }
  }

  return { end: text.length, closed: false }
}

function splitList(text: string, script = false) {
  const segments: string[] = []
  const opening = script ? '([{' : '('
  const closing = script ? ')]}' : ')'

  let start = 0
  let depth = 0

  for (let index = 0; index < text.length; index++) {
    const character = text[index]

    if (character === '\\') {
      index++
    } else if (character === '"' || (script && character === "'")) {
      index = skipQuote(text, index) - 1
    } else if (opening.includes(character)) {
      depth++
    } else if (closing.includes(character)) {
      depth = Math.max(depth - 1, 0)
    } else if (character === ',' && depth === 0) {
      segments.push(text.slice(start, index))

      start = index + 1
    }
  }

  segments.push(text.slice(start))

  return segments
}

function splitArguments(raw: string, script = false): QueryArguments {
  const list = skipList(raw, 0, script)
  const content = raw.slice(1, list.closed ? list.end - 1 : raw.length)

  return {
    closed: list.closed,
    rest: list.closed ? raw.slice(list.end) : '',
    entries: splitList(content, script).map((entry) => {
      const leading = (/^\s*/.exec(entry) as RegExpExecArray)[0]
      const trailing = (/\s*$/.exec(entry.slice(leading.length)) as RegExpExecArray)[0]

      return { leading, trailing, text: entry.slice(leading.length, entry.length - trailing.length) }
    })
  }
}

function pushArguments(token: QueryToken, call: QueryArguments, parts: QueryTokenPart[][]) {
  token.parts.push({ text: '(', kind: 'operator' })

  for (const [index, entry] of call.entries.entries()) {
    if (entry.leading) {
      token.parts.push({ text: entry.leading, kind: 'plain' })
    }

    token.parts.push(...parts[index])

    if (entry.trailing) {
      token.parts.push({ text: entry.trailing, kind: 'plain' })
    }

    if (index < call.entries.length - 1) {
      token.parts.push({ text: ',', kind: 'operator' })
    }
  }

  if (call.closed) {
    token.parts.push({ text: ')', kind: 'operator' })
  }

  if (call.rest) {
    token.parts.push({ text: call.rest, kind: 'error', error: true })
  }
}

function escapeParts(text: string, kind: QueryPartKind, error = false) {
  const parts: QueryTokenPart[] = []

  let buffer = ''

  for (let index = 0; index < text.length; index++) {
    if (text[index] === '\\') {
      if (buffer) {
        parts.push({ text: buffer, kind, error })
      }

      parts.push({ text: '\\', kind, error, escape: true })

      buffer = text[index + 1] ?? ''
      index++
    } else {
      buffer += text[index]
    }
  }

  if (buffer) {
    parts.push({ text: buffer, kind, error })
  }

  return parts
}

function scriptParts(text: string) {
  const parts: QueryTokenPart[] = []

  for (const [, className, inner, plain] of Highlighter.expression(text).text.matchAll(/<span class="([^"]*)"[^>]*>([^<]*)<\/span>|([^<]+)/g)) {
    for (const piece of decodeHtml(inner ?? plain ?? '').split(/([(){}[\]])/)) {
      if (piece) {
        parts.push({ text: piece, kind: 'script', className: className ?? '' })
      }
    }
  }

  return parts
}

function createToken(type: QueryTokenType, start: number, text: string, parts: QueryTokenPart[]): QueryToken {
  return { type, start, end: start + text.length, text, parts, error: null, warning: null }
}

function classify(text: string, start: number, language: QueryLanguage) {
  const token = createToken('text', start, text, [])
  const lower = text.toLowerCase()
  const call = /^([A-Za-z_]\w*)(\([\s\S]*)$/.exec(text)

  if (lower === 'or' || lower === 'and' || lower === 'not') {
    token.type = lower
    token.parts.push({ text, kind: 'logic' })
  } else if (text[0] === '@') {
    classifyOption(token, language)
  } else if (text[0] === '"') {
    classifyPhrase(token, language)
  } else if (call) {
    classifyCall(token, call[1], call[2], language)
  } else {
    token.value = unescape(text).toLowerCase()
    token.parts.push(...escapeParts(text, 'text'))

    if (hasDanglingEscape(text)) {
      token.error = { key: 'escape', soft: true }
    }
  }

  return token
}

function classifyPhrase(token: QueryToken, language: QueryLanguage) {
  const closed = isClosedQuote(token.text)

  token.type = 'phrase'
  token.value = unescape(token.text.slice(1, closed ? -1 : undefined))
  token.parts.push(...escapeParts(token.text, 'string'))

  if (!closed) {
    token.error = { key: 'missing_quote', soft: true }
  } else if (!token.value) {
    token.error = { key: 'empty_quote', soft: true }
  } else if (![...language.classes.slice(1), ...language.fields.flatMap((field) => (field === 'class' ? [] : language.values(field)))].includes(token.value)) {
    token.warning = { key: 'exact_missing' }
  }
}

function classifyCall(token: QueryToken, name: string, raw: string, language: QueryLanguage) {
  const field = resolveField(name, language)

  if (name.toLowerCase() === 'tag') {
    readTags(token, name, raw, language)
  } else if (name.toLowerCase() === 'eval') {
    readEval(token, name, raw)
  } else if (field) {
    readField(token, field, name, raw, language)
  } else {
    token.type = 'field'
    token.parts.push({ text: name, kind: 'error', error: true }, { text: raw, kind: 'value' })
    token.error = { key: 'filter_unknown' }
  }
}

function readFieldValue(text: string, field: QueryField, language: QueryLanguage): QueryFieldValue {
  const quoted = text[0] === '"'
  const closed = quoted && isClosedQuote(text)
  const value = unescape(quoted ? text.slice(1, closed ? -1 : undefined) : text)
  const open = quoted && !closed

  if (!value) {
    return { parts: escapeParts(text, 'string'), open }
  }

  if (field === 'class') {
    const classId = quoted ? findExactClass(value, language) : resolveClass(value, language)

    if (classId === null) {
      const soft = !quoted && language.classes.slice(1).some((name) => toClassSlug(name).startsWith(toClassSlug(value)))

      return { parts: escapeParts(text, 'error', true), open, invalid: { key: quoted ? 'class_exact' : 'class_unknown', soft } }
    }

    return { parts: escapeParts(text, quoted ? 'string' : 'value'), open, classId }
  }

  return {
    parts: escapeParts(text, quoted ? 'string' : 'value'),
    open,
    value: { value: quoted ? value : value.toLowerCase(), exact: quoted },
    missing: closed && !language.values(field).includes(value)
  }
}

function readField(token: QueryToken, field: QueryField, name: string, raw: string, language: QueryLanguage) {
  const call = splitArguments(raw)
  const results = call.entries.map((entry) => readFieldValue(entry.text, field, language))
  const invalid = results.find((result) => result.invalid)?.invalid

  token.type = 'field'
  token.parts.push({ text: name, kind: 'key' })

  pushArguments(
    token,
    call,
    results.map((result) => result.parts)
  )

  if (field === 'class') {
    token.classes = results.flatMap((result) => (result.classId === undefined ? [] : [result.classId]))
  } else {
    token.field = field
    token.values = results.flatMap((result) => (result.value ? [result.value] : []))
  }

  if (call.rest) {
    token.error = { key: 'list_extra' }
  } else if (invalid) {
    token.error = invalid
  } else if (!token.classes?.length && !token.values?.length) {
    token.error = { key: 'value_missing', soft: true }
  } else if (results.some((result) => result.open)) {
    token.error = { key: 'missing_quote', soft: true }
  } else if (results.some((result) => result.missing)) {
    token.warning = { key: 'exact_missing' }
  }
}

function readTags(token: QueryToken, name: string, raw: string, language: QueryLanguage) {
  const call = splitArguments(raw)
  const known = language.values('tag')
  const results = call.entries.map((entry) => {
    const quoted = entry.text[0] === '"'
    const closed = quoted && isClosedQuote(entry.text)

    return { value: unescape(quoted ? entry.text.slice(1, closed ? -1 : undefined) : entry.text), open: quoted && !closed }
  })

  token.type = 'tag'
  token.tags = results.map((result) => result.value).filter(Boolean)
  token.parts.push({ text: name, kind: 'key' })

  pushArguments(
    token,
    call,
    call.entries.map((entry) => escapeParts(entry.text, 'tag'))
  )

  if (call.rest) {
    token.error = { key: 'list_extra' }
  } else if (!token.tags.length) {
    token.error = { key: 'value_missing', soft: true }
  } else if (results.some((result) => result.open)) {
    token.error = { key: 'missing_quote', soft: true }
  } else if (token.tags.some((tag) => !known.includes(tag))) {
    token.warning = { key: 'tag_unknown' }
  }
}

function readEval(token: QueryToken, name: string, raw: string) {
  const call = splitArguments(raw, true)
  const expressions = call.entries.map((entry) => (entry.text ? Expression.create(entry.text) : null))
  const invalid = call.entries.findIndex((entry, index) => entry.text && !expressions[index])

  token.type = 'expression'
  token.expressions = expressions.filter((expression): expression is Expression => expression !== null)
  token.parts.push({ text: name, kind: 'key' })

  pushArguments(
    token,
    call,
    call.entries.map((entry) => scriptParts(entry.text))
  )

  if (call.rest) {
    token.error = { key: 'list_extra' }
  } else if (invalid >= 0) {
    token.error = { key: 'expression_invalid', soft: !call.closed && invalid === call.entries.length - 1 }
  } else if (!token.expressions.length) {
    token.error = { key: 'value_missing', soft: true }
  }
}

function classifyOption(token: QueryToken, language: QueryLanguage) {
  const [, rawName, rest] = /^@(\w*)([\s\S]*)$/.exec(token.text) as RegExpExecArray
  const name = rawName.toLowerCase()
  const option = isOption(name) && language.options.includes(name) ? name : null

  token.type = 'option'
  token.parts.push({ text: `@${rawName}`, kind: option || !rawName ? 'option' : 'error', error: !option && !!rawName })

  if (!option) {
    if (rest) {
      token.parts.push({ text: rest, kind: 'error', error: true })
    }

    token.error = { key: rawName ? 'option_unknown' : 'option_missing', soft: !rest && language.options.some((item) => item.startsWith(name)) }

    return
  }

  token.option = option

  if (!rest) {
    if (option === 'first') {
      token.count = 1
    } else if (VALUE_OPTIONS.includes(option)) {
      token.error = { key: 'option_value_missing', soft: true }
    }
  } else if (rest[0] !== '(' || !VALUE_OPTIONS.includes(option)) {
    token.parts.push({ text: rest, kind: 'error', error: true })
    token.error = { key: 'option_unexpected' }
  } else if (option === 'first') {
    readFirst(token, rest)
  } else if (option === 'sort') {
    readSort(token, rest, language)
  } else if (option === 'columns') {
    readColumns(token, rest, language)
  } else {
    readTemplate(token, rest)
  }
}

function readFirst(token: QueryToken, raw: string) {
  const call = splitArguments(raw)
  const [first] = call.entries
  const valid = call.entries.length === 1 && /^\d+$/.test(first.text) && Number(first.text) > 0

  pushArguments(
    token,
    call,
    call.entries.map((entry): QueryTokenPart[] => (entry.text ? [{ text: entry.text, kind: valid ? 'number' : 'error', error: !valid }] : []))
  )

  if (call.rest) {
    token.error = { key: 'list_extra' }
  } else if (call.entries.length === 1 && !first.text) {
    token.error = { key: 'option_value_missing', soft: true }
  } else if (!valid) {
    token.error = { key: 'first_invalid' }
  } else {
    token.count = Number(first.text)
  }
}

function readSort(token: QueryToken, raw: string, language: QueryLanguage) {
  const call = splitArguments(raw, true)
  const [first, ...others] = call.entries
  const sign = first.text[0] === '-' || first.text[0] === '+' ? first.text[0] : ''
  const body = first.text.slice(sign.length)
  const header = findHeaderName(body, language)
  const expression = body.trim() ? Expression.create(header ?? body) : null
  const parts: QueryTokenPart[] = sign ? [{ text: sign, kind: 'operator' }] : []

  if (header) {
    parts.push({ text: body, kind: 'header' })
  } else {
    parts.push(...scriptParts(body))
  }

  token.descending = sign === '-'

  pushArguments(token, call, [parts, ...others.map((entry): QueryTokenPart[] => (entry.text ? [{ text: entry.text, kind: 'error', error: true }] : []))])

  if (call.rest) {
    token.error = { key: 'list_extra' }
  } else if (others.length) {
    token.error = { key: 'sort_many' }
  } else if (!body.trim()) {
    token.error = { key: 'sort_missing', soft: true }
  } else if (!expression) {
    token.error = { key: 'expression_invalid', soft: !call.closed }
  } else {
    token.expression = expression
  }
}

function readColumns(token: QueryToken, raw: string, language: QueryLanguage) {
  const call = splitArguments(raw)
  const headers = call.entries.map((entry) => findHeaderName(entry.text, language))
  const unknown = call.entries.findIndex((entry, index) => entry.text && !headers[index])

  pushArguments(
    token,
    call,
    call.entries.map((entry, index): QueryTokenPart[] => (entry.text ? [{ text: entry.text, kind: headers[index] ? 'header' : 'error', error: !headers[index] }] : []))
  )

  token.columns = headers.filter((header): header is string => header !== null)

  if (call.rest) {
    token.error = { key: 'list_extra' }
  } else if (unknown >= 0) {
    token.error = { key: 'header_unknown', soft: unknown === call.entries.length - 1 && isHeaderNamePrefix(call.entries[unknown].text, language) }
  } else if (!token.columns.length) {
    token.error = { key: 'columns_empty', soft: true }
  }
}

function readTemplate(token: QueryToken, raw: string) {
  const call = splitArguments(raw)
  const [first] = call.entries

  pushArguments(
    token,
    call,
    call.entries.map((entry, index): QueryTokenPart[] => (entry.text ? [{ text: entry.text, kind: index === 0 ? 'option-value' : 'error', error: index > 0 }] : []))
  )

  if (call.rest) {
    token.error = { key: 'list_extra' }
  } else if (call.entries.length > 1) {
    token.error = { key: 'template_many' }
  } else if (!first.text) {
    token.error = { key: 'option_value_missing', soft: true }
  } else {
    token.template = first.text
  }
}

function lex(text: string, language: QueryLanguage) {
  const tokens: QueryToken[] = []

  let index = 0
  let depth = 0

  while (index < text.length) {
    const character = text[index]

    if (/\s/.test(character)) {
      let end = index + 1

      while (end < text.length && /\s/.test(text[end])) {
        end++
      }

      const space = text.slice(index, end)

      tokens.push(createToken('space', index, space, [{ text: space, kind: 'plain' }]))

      index = end
    } else if (character === '(' || character === ')') {
      if (character === ')') {
        depth = Math.max(depth - 1, 0)
      }

      tokens.push(createToken(character === '(' ? 'open' : 'close', index, character, [{ text: character, kind: 'bracket', depth: depth % 3 }]))

      if (character === '(') {
        depth++
      }

      index++
    } else {
      let end = index

      while (end < text.length) {
        const word = text.slice(index, end)

        if (text[end] === '(' && /^@?[A-Za-z_]\w*$/.test(word) && !LOGIC_WORDS.includes(word.toLowerCase())) {
          end = skipList(text, end, SCRIPT_CALLS.includes(word.toLowerCase())).end
        } else if (/[\s()]/.test(text[end])) {
          break
        } else if (text[end] === '\\') {
          end = Math.min(end + 2, text.length)
        } else if (text[end] === '"') {
          end = skipQuote(text, end)
        } else {
          end++
        }
      }

      tokens.push(classify(text.slice(index, end), index, language))

      index = end
    }
  }

  return tokens
}

function applyOption(options: QueryOptions, token: QueryToken) {
  switch (token.option) {
    case 'sort':
      if (token.expression) {
        options.sort = { expression: token.expression, descending: token.descending ?? false }
      }
      break
    case 'first':
      options.first = token.count
      break
    case 'columns':
      options.columns = token.columns
      break
    case 'template':
      options.template = token.template
      break
    case 'latest':
    case 'hidden':
    case 'own':
    case 'recalculate':
    case 'others':
      options[token.option] = true
      break
    case 'all':
      options.hidden = true
      options.others = true
      break
  }
}

export function parseQuery(text: string, language: QueryLanguage) {
  const tokens = lex(text, language)
  const options: QueryOptions = {}
  const seen = new Set<QueryOptionName>()
  const terms: QueryToken[] = []

  for (const token of tokens) {
    if (token.type === 'option') {
      if (!token.error && token.option) {
        if (seen.has(token.option)) {
          token.warning = { key: 'option_twice' }
        }

        seen.add(token.option)

        applyOption(options, token)
      }
    } else if (token.type !== 'space') {
      terms.push(token)
    }
  }

  let position = 0

  const peek = () => terms.at(position)
  const stops = (token: QueryToken | undefined) => !token || token.type === 'or' || token.type === 'close'

  function readOr(): QueryNode | null {
    let left = readAnd()

    while (peek()?.type === 'or') {
      const operator = terms[position++]
      const right = readAnd()

      if (!right) {
        if (!operator.error && stops(peek())) {
          operator.error = { key: 'logic_missing', soft: true }
        }
      } else {
        left = left ? { type: 'or', left, right } : right
      }
    }

    return left
  }

  function readAnd() {
    let left: QueryNode | null = null

    for (let token = peek(); token && !stops(token); token = peek()) {
      if (token.type === 'and') {
        position++
      } else {
        const node = readNot()

        if (node) {
          left = left ? { type: 'and', left, right: node } : node
        }
      }
    }

    return left
  }

  function readNot(): QueryNode | null {
    const token = terms[position]

    if (token.type !== 'not') {
      return readPrimary()
    }

    position++

    const next = peek()
    const node = next && !stops(next) && next.type !== 'and' ? readNot() : null

    if (node) {
      return { type: 'not', node }
    }

    if (!token.error && (!next || stops(next) || next.type === 'and')) {
      token.error = { key: 'not_missing', soft: true }
    }

    return null
  }

  function readPrimary(): QueryNode | null {
    const token = terms[position++]

    if (token.type === 'open') {
      const node = readOr()

      if (peek()?.type === 'close') {
        position++
      } else if (!token.error) {
        token.error = { key: 'bracket_missing', soft: true }
      }

      return node
    }

    return token.error ? null : { type: 'leaf', token }
  }

  let root = readOr()

  while (position < terms.length) {
    const token = terms[position++]

    if (token.type === 'close') {
      token.error = { key: 'bracket_extra' }
    }

    const node = readOr()

    if (node) {
      root = root ? { type: 'and', left: root, right: node } : node
    }
  }

  return { tokens, root, options }
}

function matchesToken(token: QueryToken, target: QueryTarget) {
  const value = token.value ?? ''

  switch (token.type) {
    case 'text':
      return target.values().some((item) => item.toLowerCase().includes(value))
    case 'phrase':
      return target.values().includes(value)
    case 'tag':
      return (token.tags ?? []).some((tag) => target.tags().includes(tag))
    case 'field': {
      if (token.classes) {
        return token.classes.includes(target.classId())
      }

      const field = token.field ? target.field(token.field) : ''

      return (token.values ?? []).some((item) => (item.exact ? field === item.value : field.toLowerCase().includes(item.value)))
    }
    case 'expression':
      return (token.expressions ?? []).some((expression) => Boolean(target.evaluate(expression)))
    default:
      return true
  }
}

export function matchesQuery(node: QueryNode | null, target: QueryTarget): boolean {
  if (!node) {
    return true
  }

  switch (node.type) {
    case 'and':
      return matchesQuery(node.left, target) && matchesQuery(node.right, target)
    case 'or':
      return matchesQuery(node.left, target) || matchesQuery(node.right, target)
    case 'not':
      return !matchesQuery(node.node, target)
    default:
      return matchesToken(node.token, target)
  }
}

function findBracketPairs(tokens: QueryToken[]) {
  const pairs = new Map<number, number>()
  const stack: number[] = []

  for (const { text, start } of tokens) {
    const script = SCRIPT_CALLS.some((name) => text.toLowerCase().startsWith(`${name}(`))

    for (let index = 0; index < text.length; index++) {
      const character = text[index]

      if (character === '\\') {
        index++
      } else if (character === '"' || (script && character === "'")) {
        index = skipQuote(text, index) - 1
      } else if (character === '(') {
        stack.push(start + index)
      } else if (character === ')' && stack.length) {
        const opening = stack.pop() as number

        pairs.set(opening, start + index)
        pairs.set(start + index, opening)
      }
    }
  }

  return pairs
}

export function highlightQuery(tokens: QueryToken[], caret?: number) {
  const parts: QueryPart[] = []

  let match: [number, number] | null = null

  if (caret !== undefined) {
    const pairs = findBracketPairs(tokens)
    const position = [caret - 1, caret].find((index) => pairs.has(index))

    if (position !== undefined) {
      match = [position, pairs.get(position) as number]
    }
  }

  let offset = 0

  for (const token of tokens) {
    const marked = token.parts.some((part) => part.error)

    for (const { error, ...part } of token.parts) {
      const result: QueryPart = { ...part, kind: part.kind === 'error' && token.error?.soft ? 'text' : part.kind }

      if (token.error && (error || !marked)) {
        result.issue = token.error.soft ? 'pending' : 'error'
      } else if (token.warning) {
        result.issue = 'warning'
      }

      if (match && part.text.length === 1 && (offset === match[0] || offset === match[1])) {
        result.match = true
      }

      parts.push(result)

      offset += part.text.length
    }
  }

  return parts
}

export function suggestQuery(text: string, caret: number, language: QueryLanguage, general: boolean): QuerySuggestions {
  const tokens = lex(text, language)
  const result: QuerySuggestions = { items: [], start: caret, end: caret }

  let token = tokens.find((item) => item.type !== 'space' && item.start < caret && caret <= item.end) ?? null

  const add = (label: string, insert: string, kind: QuerySuggestionKind, keepOpen = false, description?: string) => {
    result.items.push({ label, insert, kind, keepOpen, description })
  }

  const done = () => {
    const current = text.slice(result.start, caret)
    const seen = new Set<string>()

    result.items = result.items.filter((item) => {
      if (seen.has(item.insert) || item.insert === current) {
        return false
      }

      seen.add(item.insert)

      return true
    })

    return result
  }

  const addOption = (name: QueryOptionName) => {
    const insert = VALUE_OPTIONS.includes(name) ? `@${name}(` : `@${name}`

    add(insert, insert, 'option', VALUE_OPTIONS.includes(name), name)
  }

  const addFilters = (withOptions: boolean, withNot: boolean) => {
    for (const field of language.fields) {
      add(`${field}(`, `${field}(`, 'field', true, field)
    }

    add('tag(', 'tag(', 'field', true, 'tag')
    add('eval(', 'eval(', 'field', true, 'eval')

    if (withNot) {
      add('not', 'not', 'logic')
    }

    add('(', '(', 'logic', true)

    if (withOptions) {
      language.options.forEach(addOption)
    }

    return done()
  }

  if (token?.type === 'open') {
    token = null
  }

  if (token && ['or', 'and', 'not', 'close'].includes(token.type)) {
    return done()
  }

  const previous = tokens.filter((item) => item.type !== 'space' && item.end <= (token ? token.start : caret)).at(-1)

  if (!token) {
    if (previous && ['not', 'and', 'or', 'open'].includes(previous.type)) {
      return addFilters(false, previous.type !== 'not')
    }

    return general ? addFilters(true, true) : done()
  }

  result.start = token.start
  result.end = token.end

  const word = text.slice(token.start, caret)
  const lower = word.toLowerCase()
  const call = /^(@?[A-Za-z_]\w*)\(/.exec(word)

  if (call) {
    const name = call[1].toLowerCase()
    const script = SCRIPT_CALLS.includes(name)
    const list = skipList(text, token.start + call[0].length - 1, script)

    if (list.closed && caret >= list.end) {
      return done()
    }

    const segments = splitList(word.slice(call[0].length), script)
    const current = segments[segments.length - 1]
    const leading = (/^\s*/.exec(current) as RegExpExecArray)[0]
    const head = word.slice(0, word.length - current.length) + leading
    const prefix = current.slice(leading.length).replace(/^"/, '').toLowerCase()
    const field = resolveField(call[1], language)

    let end = caret

    while (end < token.end && text[end] !== ',' && text[end] !== ')') {
      end++
    }

    result.end = end

    if (script && !(name === '@sort' && segments.length === 1 && /^[-+]?([a-z][\w ]*)?$/.test(prefix))) {
      const identifier = /[A-Za-z_][\w ]*$/.exec(current)
      const typed = identifier ? identifier[0].toLowerCase() : ''

      if (!identifier && current.trim()) {
        return done()
      }

      result.start = caret - typed.length
      result.end = caret

      while (result.end < text.length && /\w/.test(text[result.end])) {
        result.end++
      }

      for (const header of language.headers) {
        if (header.toLowerCase().startsWith(typed)) {
          add(header, header, 'header')
        }
      }

      for (const functionName of language.functions) {
        if (functionName.toLowerCase().startsWith(typed)) {
          add(`${functionName}(`, `${functionName}(`, 'function', true)
        }
      }
    } else if (name === '@sort' && segments.length === 1) {
      const sign = prefix[0] === '-' || prefix[0] === '+' ? prefix[0] : ''

      if (text[end] === ')') {
        result.end++
      }

      for (const header of language.headers) {
        if (header.toLowerCase().startsWith(prefix.slice(sign.length))) {
          for (const direction of sign ? [sign] : ['-', '']) {
            add(`${direction}${header}`, `${head}${direction}${header})`, 'header')
          }
        }
      }
    } else if (name === '@columns') {
      const used = segments.slice(0, -1).map((item) => item.trim().toLowerCase())

      for (const header of language.headers) {
        if (!used.includes(header.toLowerCase()) && header.toLowerCase().startsWith(prefix)) {
          add(header, head + header, 'header', true)
        }
      }
    } else if (name === 'tag') {
      for (const tag of language.values('tag')) {
        if (tag.toLowerCase().includes(prefix)) {
          add(tag, head + (/[\s,()"\\]/.test(tag) ? quote(tag) : tag), 'tag', true)
        }
      }
    } else if (field === 'class') {
      language.classes.forEach((className, id) => {
        if (id > 0 && (toClassSlug(className).startsWith(toClassSlug(prefix)) || className.toLowerCase().startsWith(prefix))) {
          add(className.toLowerCase(), head + className.toLowerCase(), 'value', true)
        }
      })
    } else if (field) {
      for (const value of language.values(field)) {
        if (value.toLowerCase().includes(prefix)) {
          add(quote(value), head + quote(value), 'string', true)
        }
      }
    }

    return done()
  }

  if (word[0] === '@') {
    language.options.filter((name) => name.startsWith(lower.slice(1))).forEach(addOption)

    return done()
  }

  const afterTerm = !!previous && !['not', 'and', 'or', 'open'].includes(previous.type)

  for (const logic of LOGIC_WORDS) {
    if (logic.startsWith(lower) && (logic === 'not' ? previous?.type !== 'not' : afterTerm)) {
      add(logic, logic, 'logic')
    }
  }

  for (const field of [...language.fields, 'tag', 'eval']) {
    if (field.startsWith(lower)) {
      add(`${field}(`, `${field}(`, 'field', true, field)
    }
  }

  if (language.fields.includes('class')) {
    language.classes.forEach((name, id) => {
      if (id > 0 && (toClassSlug(name).startsWith(toClassSlug(lower)) || name.toLowerCase().startsWith(lower))) {
        add(`class(${name.toLowerCase()})`, `class(${name.toLowerCase()})`, 'token')
      }
    })
  }

  return done()
}
