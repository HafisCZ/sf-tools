import { getCSSColorFromBackground } from '@utils/colors'
import { randomHash, sha1 } from '@utils/hash'
import { globalLocalize } from '@utils/localization'
import { SignalSource } from '@utils/signals'
import { average, escapeHtml, fixedSlice, joinMapped, maximum, minimum, sortDescending, sum } from '@utils/utils'
import { DatabaseManager } from '~/data/database-manager'
import { type GroupModel } from '~/data/group-model'
import { type PlayerModel } from '~/data/player-model'
import { Logger } from '~/site/logger'
import { Site } from '~/site/site'
import { Actions } from './actions'
import { ScriptType, TableType } from './commands'
import { Expression, ExpressionCache, ExpressionScope, type ExpressionEnvironment } from './expression'
import { Script, type ScriptCategory, type ScriptColor, type ScriptContainer, type ScriptEntity, type ScriptEntityExpression } from './script'

type TableEntity = PlayerModel | GroupModel

export type TableEntry = {
  current: ScriptEntity
  compare: ScriptEntity
  index: number
  latest?: boolean
  hidden?: boolean
}

type TableArrayData = {
  timestamp?: number
  reference?: number
  entryLimit?: number
  externalSort?: (current: ScriptEntity, compare: ScriptEntity) => number
  suppressUpdate?: boolean
  joined?: string[]
  kicked?: string[]
  missing?: string[]
}

type StatisticsOperation = (values: unknown[]) => unknown

type HeaderGenerators = {
  cell: (current: ScriptEntity, compare: ScriptEntity) => string
  statistics?: (currentList: TableEntry[], operation: StatisticsOperation) => string
}

type HeaderSort = (current: ScriptEntity, compare: ScriptEntity) => unknown

type TableHeader = ScriptContainer & {
  name: string
  generators: HeaderGenerators
  sort: HeaderSort | null
  sortKey: string
  span: number
  bordered: boolean
  width: number
}

type TableSorting = {
  key: string
  flip: boolean | number | undefined
  order: number
}

type TableStatistics = {
  name: string
  ast?: Expression
  expression?: StatisticsOperation
}

type TableRowElement = HTMLTableRowElement & { injectCalled?: boolean }

// Category
class HeaderGroup {
  name: string
  index: number
  sortKey: string
  width: number
  length: number
  headers: TableHeader[]

  constructor(name: string, settings: ScriptCategory, i: number) {
    this.name = name
    this.index = i

    this.sortKey = `${settings.name}.${i}`

    this.width = 0
    this.length = 0
    this.headers = []
  }

  add(name: string, settings: ScriptContainer, generators: HeaderGenerators, sort: HeaderSort | null, bordered: boolean, span = 1) {
    const header = Object.assign(settings, {
      name,
      generators,
      sort,
      sortKey: sha1(`${this.sortKey}.${settings.name}.${this.headers.length}`),
      span,
      bordered
    }) as TableHeader

    // Set approximate sizes
    if (typeof header.width == 'undefined') {
      header.width = Math.max(100, header.name.length * 12)
    } else if (header.width && header.grouped) {
      header.width = header.grouped * header.width
    }

    // Sum width and push the header
    this.width += header.width
    this.length += span

    this.headers.push(header)
  }
}

export class TableArray extends Array<TableEntry> {
  declare timestamp?: number
  declare reference?: number
  declare entryLimit?: number
  declare externalSort?: (current: ScriptEntity, compare: ScriptEntity) => number
  declare suppressUpdate?: boolean
  declare joined?: string[]
  declare kicked?: string[]
  declare missing?: string[]

  constructor(data?: TableArrayData) {
    super()

    if (data) {
      Object.assign(this, data)
    }
  }
}

// entryLimit, externalSort, suppressUpdate, timestamp, reference
export class BrowseTableArray extends TableArray {
  add(current: TableEntity, compare: TableEntity | undefined, latest: boolean, hidden: boolean) {
    super.push({
      current: current as ScriptEntity,
      compare: (compare || current) as ScriptEntity,
      index: this.length,
      latest,
      hidden: hidden
    })
  }
}

export class PlayerTableArray extends TableArray {
  add(current: TableEntity, compare?: TableEntity) {
    super.push({
      current: current as ScriptEntity,
      compare: (compare || current) as ScriptEntity,
      index: this.length
    })
  }
}

// joined, kicked, missing, timestamp, reference
export class GroupTableArray extends TableArray {
  add(current: TableEntity, compare?: TableEntity) {
    super.push({
      current: current as ScriptEntity,
      compare: (compare || current) as ScriptEntity,
      index: this.length
    })
  }
}

class TableRow {
  index: number
  current: ScriptEntity
  sorting: Record<string, unknown>
  rendered?: boolean

  #node: TableRowElement | undefined
  #build: (row: TableRow) => TableRowElement

  constructor(index: number, current: ScriptEntity, sorting: Record<string, unknown>, build: (row: TableRow) => TableRowElement) {
    this.index = index
    this.current = current
    this.sorting = sorting
    this.#build = build
  }

  get node() {
    return (this.#node ??= this.#build(this))
  }
}

// Table instance
class TableInstance {
  tableType: TableType

  declare settings: Script
  declare config: HeaderGroup[]
  declare rowsConfig: unknown[]
  declare sorting: TableSorting[]
  declare flat: TableHeader[]
  declare sortMap: Map<string | symbol, TableHeader>
  declare configLeft: HeaderGroup[]
  declare leftFlat: TableHeader[]
  declare leftFlatSpan: number
  declare leftFlatWidth: number
  declare rightFlat: TableHeader[]
  declare rightFlatWidth: number
  declare rightFlatSpan: number
  declare flatWidth: number
  declare flatSpan: number
  declare cache: Map<string, string>
  declare globalSortingKey: string
  declare globalSortingOrder: number
  declare array: TableArray
  declare entries: TableRow[]
  declare entriesLength: number

  constructor(tableType: TableType) {
    this.tableType = tableType
  }

  createTable() {
    const props = this.#sharedProperties()

    if (this.tableType === TableType.Player) {
      return Object.assign(props, this.#createPlayerTable())
    } else if (this.tableType === TableType.Group) {
      return Object.assign(props, this.#createGroupTable())
    } else {
      return Object.assign(props, this.#createBrowseTable())
    }
  }

  #addHeader(name: string, group: HeaderGroup, header: ScriptContainer, showBorder: boolean) {
    group.add(
      name,
      header,
      {
        cell: (current, compare) => {
          const val = this.#safeEval(header.expr, current, compare, this.settings, undefined, header)

          if (val == undefined) {
            return this.#getEmptyCell(header, showBorder)
          } else {
            const cmp = header.difference ? this.#safeEval(header.expr, compare, compare, this.settings.getCompareEnvironment(), undefined, header) : undefined
            return this.#getCell(header, this.#getCellDisplayValue(header, val, cmp, current, compare), this.#getCellColor(header, val, current, compare), showBorder)
          }
        },
        statistics: (currentList, operation) => {
          const values = currentList.map(({ current, compare }) => this.#safeEval(header.expr, current, compare, this.settings, undefined, header)).filter((v) => v != undefined)
          if (values.length) {
            // Get value and trunc if necessary
            let val = operation(values)
            if (!header.decimal) {
              val = Math.trunc(val as number)
            }

            // Compare value
            let cmp = undefined
            if (header.difference) {
              const compareValues = currentList.map(({ compare }) => this.#safeEval(header.expr, compare, compare, this.settings.getCompareEnvironment(), undefined, header)).filter((v) => v != undefined)
              if (compareValues.length) {
                cmp = operation(compareValues)

                if (!header.decimal) {
                  cmp = Math.trunc(cmp as number)
                }
              } else {
                cmp = undefined
              }
            }

            return CellGenerator.Cell(this.#getStatisticsDisplayValue(header, val, cmp), '', this.#getStatisticsColor(header, val))
          } else {
            return this.#getEmptyCell(header)
          }
        }
      },
      (current, compare) => this.#safeEval(header.expr, current, compare, this.settings, undefined, header),
      showBorder
    )
  }

  #addGroupedHeader(name: string, group: HeaderGroup, header: ScriptContainer, showBorder: boolean) {
    const callWidth = header.width || 100
    const grouped = header.grouped as number

    group.add(
      name,
      header,
      {
        cell: (current, compare) => {
          const vals = this.#safeEval(header.expr, current, compare, this.settings, undefined, header)

          if (!Array.isArray(vals)) {
            return this.#getEmptyCell(header, showBorder, grouped)
          } else {
            const cmps = header.difference ? this.#safeEval(header.expr, compare, compare, this.settings.getCompareEnvironment(), undefined, header) : undefined

            return joinMapped(fixedSlice(vals as unknown[], grouped, undefined), (val, index) => {
              const showEndBorder = showBorder && index == grouped - 1
              const extra = {
                index: index
              }

              if (val == undefined) {
                return this.#getEmptyCell(header, showEndBorder)
              } else {
                return this.#getCell(header, this.#getCellDisplayValue(header, val, header.difference ? (cmps as unknown[])[index] : undefined, current, compare, extra), this.#getCellColor(header, val, current, compare, extra), showEndBorder, callWidth)
              }
            })
          }
        }
      },
      (current, compare) => {
        const vals = this.#safeEval(header.expr, current, compare, this.settings, undefined, header)

        if (Array.isArray(vals)) {
          return sum(fixedSlice(vals as unknown[], grouped, undefined) as number[])
        } else {
          return vals
        }
      },
      showBorder,
      grouped
    )
  }

  #addEmbeddedHeader(name: string, group: HeaderGroup, header: ScriptContainer, showBorder: boolean) {
    if (header.columns && !header.width) {
      header.width = sum(header.columns)
    }

    const embedHeaders = header.headers as ScriptContainer[]

    group.add(
      name,
      header,
      {
        cell: (current, compare) => {
          let values: unknown[] = [null]

          if (header.expr) {
            const value = (header.expr as Expression).eval(new ExpressionScope(this.settings).with(current, compare).via(header))
            values = Array.isArray(value) ? value : [value]
          }

          const allBlank = embedHeaders.every((h) => !(h.nameExpression || (h.nameOverride ?? h.name)))
          const generators = embedHeaders.map((embedHeader) => {
            return {
              name: () => {
                let embedName = embedHeader.nameOverride ?? embedHeader.name
                if (typeof embedHeader.nameExpression !== 'undefined') {
                  const resolvedName = embedHeader.nameExpression(this.settings, embedHeader)
                  if (resolvedName != undefined) {
                    embedName = String(resolvedName)
                  }
                }

                return this.#getCell(embedHeader, embedName, { bg: '', fg: undefined }, embedHeader.border, header.columns?.[0] || Math.max(100, (embedName as string).length * 12))
              },
              get: (value: unknown, i: number) => {
                const val = this.#safeEval(embedHeader.expr, current, compare, this.settings, new ExpressionScope(this.settings).with(current, compare).addSelf(value).via(embedHeader), embedHeader)

                if (val == undefined) {
                  return this.#getEmptyCell(embedHeader, false, undefined)
                } else {
                  const cmp = embedHeader.difference ? this.#safeEval(embedHeader.expr, compare, compare, this.settings.getCompareEnvironment(), new ExpressionScope(this.settings.getCompareEnvironment()).with(compare, compare).addSelf(value).via(embedHeader), embedHeader) : undefined

                  return this.#getCell(embedHeader, this.#getCellDisplayValue(embedHeader, val, cmp, current, compare, undefined, value), this.#getCellColor(embedHeader, val, current, compare, undefined, false, value), embedHeader.border, header.columns?.[i + 1])
                }
              }
            }
          })

          const rowHeight = header.rowHeight ? ` style="height: ${header.rowHeight}px;"` : ''
          const entries = generators
            .map(({ name, get }) => {
              return `<tr${rowHeight}>${allBlank ? '' : name()}${values.map((v, i) => get(v, i)).join('')}</tr>`
            })
            .join('')

          return CellGenerator.EmbedTable(entries, this.#getCellColor(header, values, current, compare).bg, showBorder, header.font)
        }
      },
      null,
      showBorder
    )
  }

  // A missing expression throws like the legacy code did
  #safeEval(obj: ScriptEntityExpression | undefined, current: ScriptEntity, compare: ScriptEntity, settings: ExpressionEnvironment, scope?: ExpressionScope, header?: ScriptContainer) {
    if (obj instanceof Expression) {
      return obj.eval((scope || new ExpressionScope(settings)).with(current, compare).via(header))
    } else {
      return (obj as (current: ScriptEntity) => unknown)(current)
    }
  }

  setScript(script: string, entries: TableArray) {
    this.settings = new Script(script, ScriptType.Table, {
      table: this.tableType,
      timestamp: entries.timestamp,
      reference: entries.reference,
      entries: Script.createSegmentedArray(entries, (entry) => [entry.compare, entry.compare])
    })

    // Handle trackers
    Actions.updateFromScript(this.settings.trackers)

    this.config = []
    this.rowsConfig = []

    this.sorting = []

    // Loop over all categories
    this.settings.categories.forEach((category, categoryIndex, categories) => {
      // Add expression alias
      let categoryName = (category.nameOverride ?? category.name) as string
      if (typeof category.nameExpression !== 'undefined') {
        const resolvedName = category.nameExpression(this.settings, category)
        if (resolvedName != undefined) {
          categoryName = String(resolvedName)
        }
      }

      // Create header group
      const group = new HeaderGroup(categoryName, category, this.config.length)
      const lastCategory = categoryIndex == categories.length - 1

      // Loop over all headers
      category.headers.forEach((header, headerIndex, headers) => {
        const lastHeader = headerIndex == headers.length - 1
        const nextHeader = headers[headerIndex + 1]

        const showBorder = (!lastCategory && lastHeader) || (header.border as number) >= 2 || (!lastHeader && (nextHeader.border == 1 || nextHeader.border == 3))

        // Add expression alias
        let headerName = (header.nameOverride ?? header.name) as string
        if (typeof header.nameExpression !== 'undefined') {
          const resolvedName = header.nameExpression(this.settings, header)
          if (resolvedName != undefined) {
            headerName = String(resolvedName)
          }
        }

        if (header.embedded) {
          this.#addEmbeddedHeader(headerName, group, header, showBorder)
        } else if (header.grouped) {
          this.#addGroupedHeader(headerName, group, header, showBorder)
        } else {
          this.#addHeader(headerName, group, header, showBorder)
        }
      })

      if (group.length) {
        this.config.push(group)
      }
    })

    // Scale everything
    if (this.settings.globals.scale) {
      const factor = this.settings.globals.scale / 100

      for (const category of this.config) {
        category.width = Math.ceil(category.width * factor)
        for (const header of category.headers) {
          header.width = Math.ceil(header.width * factor)
        }
      }
    }

    this.flat = this.config.reduce<TableHeader[]>((array, group) => {
      array.push(...group.headers)
      return array
    }, [])

    this.sortMap = new Map()
    for (const header of this.flat) {
      this.sortMap.set(header.sortKey, header)
    }

    this.configLeft = this.config.splice(0, 1)
    this.leftFlat = this.configLeft[0].headers
    this.leftFlatSpan = this.leftFlat.reduce((a, b) => a + b.span, 0)
    this.leftFlatWidth = this.leftFlat.reduce((a, b) => a + b.width, 0)

    // Generate flat list
    this.rightFlat = this.config.reduce<TableHeader[]>((array, group) => {
      array.push(...group.headers)
      return array
    }, [])

    this.rightFlatWidth = this.config.reduce((a, b) => a + b.width, 0)
    this.rightFlatSpan = this.rightFlat.reduce((t, h) => t + h.span, 0)

    this.flatWidth = this.leftFlatWidth + this.rightFlatWidth
    this.flatSpan = this.leftFlatSpan + this.rightFlatSpan

    // Caching
    this.#createCache()
    this.#createSorting()
  }

  // Set players
  setEntries(array: TableArray) {
    this.settings.evalBefore(array)

    this.array = array
      .map((entry) => {
        let { current, compare } = entry

        current = DatabaseManager.getAny(current.LinkId, current.Timestamp) as ScriptEntity

        const discardReference = this.settings.discard.reference.some((rule) => rule.eval(new ExpressionScope(this.settings).with(compare, compare)))
        ExpressionCache.reset()

        if (discardReference) {
          compare = current
        } else {
          compare = DatabaseManager.getAny(current.LinkId, compare.Timestamp) as ScriptEntity
        }

        const discardTimestamp = this.settings.discard.timestamp.some((rule) => rule.eval(new ExpressionScope(this.settings).with(current, compare)))
        ExpressionCache.reset()

        if (discardTimestamp) {
          return null
        } else {
          entry.current = current
          entry.compare = compare

          return entry
        }
      })
      .filter((e): e is TableEntry => e !== null)

    // Copy over lost properties
    if (this.tableType === TableType.Players || this.tableType === TableType.Groups) {
      this.array.entryLimit = array.entryLimit
      this.array.timestamp = array.timestamp
      this.array.reference = array.reference
    } else if (this.tableType === TableType.Group) {
      this.array.joined = array.joined
      this.array.kicked = array.kicked
      this.array.missing = array.missing
      this.array.timestamp = array.timestamp
      this.array.reference = array.reference
    }

    // Apply sorting
    this.#applyIndexSorting(array)

    // Evaluate variables
    if (!array.suppressUpdate) {
      if (this.tableType == TableType.Player) {
        this.settings.evalPlayer(this.array, array)
      } else if (this.tableType == TableType.Players) {
        this.settings.evalPlayers(this.array, array)
      } else if (this.tableType == TableType.Group) {
        this.settings.evalGroup(this.array, array)
      } else if (this.tableType == TableType.Groups) {
        this.settings.evalGroups(this.array, array)
      }

      ExpressionCache.reset()
      this.#createCache()
    }

    this.#generateEntries()
  }

  #applyIndexSorting(array: TableArray) {
    const { externalSort } = array
    const orderAllBy = this.settings.globals.orderAllBy

    if (externalSort) {
      sortDescending(this.array, ({ current, compare }) => externalSort.call(array, current, compare))
    } else if (orderAllBy) {
      this.array.sort((a, b) => this.#compareItems(this.#safeEval(orderAllBy, a.current, a.compare, this.settings), this.#safeEval(orderAllBy, b.current, b.compare, this.settings)))
    } else if (this.flat.some((header) => header.orderDefault)) {
      const sortingList: { direction: number; flip: boolean | number | undefined; method: HeaderSort }[] = []

      for (const header of this.flat) {
        if (header.orderDefault) {
          const { direction, index } = header.orderDefault

          sortingList.splice(typeof index === 'undefined' ? sortingList.length : index, 0, {
            direction: direction === 'asc' ? 2 : 1,
            flip: header.flip,
            method: (current, compare) => {
              const { order, expr, sort } = header

              if (order) {
                const value = this.#safeEval(expr, current, compare, this.settings, undefined, header)

                return this.#safeEval(order, current, compare, this.settings, new ExpressionScope(this.settings).with(current, compare).addSelf(value))
              } else {
                // Return native sorting function
                return sort ? sort(current, compare) : 0
              }
            }
          })
        }
      }

      this.array.sort(
        (a, b) =>
          sortingList.reduce<number | undefined>((result, { method, flip, direction }) => {
            if (result) return undefined

            const valueA = method(a.current, a.compare)
            const valueB = method(b.current, b.compare)

            return valueA == undefined ? 1 : valueB == undefined ? -1 : (direction == 1 && !flip) || (direction == 2 && flip) ? this.#compareItems(valueA, valueB) : this.#compareItems(valueB, valueA)
          }, undefined) as number
      )
    }

    this.array.forEach((entry, i) => {
      entry.index = i
    })
  }

  #generateSorting(current: ScriptEntity, compare: ScriptEntity, index: number) {
    const sortMap = this.sortMap

    return new Proxy<Record<string | symbol, unknown>>(
      {
        _index: index
      },
      {
        get: (target, prop) => {
          if (target[prop]) {
            return target[prop]
          } else {
            const header = sortMap.get(prop)
            if (header) {
              const { order, expr, sort } = header

              let sortValue = undefined
              if (order) {
                const value = this.#safeEval(expr, current, compare, this.settings, undefined, header)
                sortValue = this.#safeEval(order, current, compare, this.settings, new ExpressionScope(this.settings).with(current, compare).addSelf(value))
              } else {
                // Return native sorting function
                sortValue = sort ? sort(current, compare) : 0
              }

              return (target[prop] = sortValue)
            } else {
              return index
            }
          }
        }
      }
    )
  }

  // Generate entries
  #generateEntries() {
    // Common settings
    const dividerStyle = this.#getCellDividerStyle()
    const rowHeight = this.settings.getRowHeight()

    const hidden = this.tableType === TableType.Players || this.tableType === TableType.Groups
    const outdated = hidden && this.settings.getOutdatedStyle()

    // Generate entries
    this.entries = this.array.map(
      (entry) =>
        new TableRow(entry.index, entry.current, this.#generateSorting(entry.current, entry.compare, entry.index), (row) => {
          let html = ''
          for (const header of this.flat) {
            html += this.#getCellContent(header, entry.current, entry.compare)
          }

          const node = document.createElement('tr')
          node.classList.add('css-entry')

          if (hidden && entry.hidden) {
            node.classList.add('opacity-50')
          }

          if (dividerStyle) {
            node.classList.add(dividerStyle)
          }

          if (rowHeight) {
            node.style.height = `${rowHeight}px`
          }

          node.innerHTML = html

          if (outdated && !entry.latest) {
            node.querySelectorAll('[data-id]').forEach((element) => {
              element.classList.add('!text-red')
            })
          }

          row.rendered = true

          return node
        })
    )

    // Cache length
    this.entriesLength = this.entries.length
  }

  // Remove key from sorting queue
  removeSorting(key: string | undefined) {
    const index = this.sorting.findIndex((sort) => sort.key == key)

    if (index != -1) {
      this.sorting.splice(index, 1)
      this.sort()
    }
  }

  // Add key to sorting queue
  setSorting(key: string) {
    const index = this.sorting.findIndex((sort) => sort.key == key)

    if (index == -1) {
      const obj = this.flat.find((header) => header.sortKey == key)

      this.sorting.push({
        key: key,
        flip: obj == undefined ? key == '_index' : obj.flip,
        order: 1
      })
    } else {
      this.sorting[index].order = this.sorting[index].order == 1 ? 2 : 1
    }

    this.sort()
  }

  // Clear sort
  clearSorting() {
    this.sorting = []
    this.sort()
  }

  // Execute sort
  sort() {
    this.entries.sort((a, b) => this.#sortGlobally(a, b) || this.#sortDefault(a, b))
  }

  reflowIndexes() {
    const indexedStyle = this.settings.globals.indexed

    if (indexedStyle === 1) {
      for (let i = 0; i < this.entriesLength; i++) {
        const entry = this.entries[i]
        if (entry.rendered) {
          ;(entry.node.querySelector('td') as HTMLTableCellElement).innerText = String(this.entries[i].index + 1)
        }
      }
    } else if (indexedStyle === 2) {
      for (let i = 0; i < this.entriesLength; i++) {
        const entry = this.entries[i]
        if (entry.rendered) {
          ;(entry.node.querySelector('td') as HTMLTableCellElement).innerText = String(i + 1)
        }
      }
    }
  }

  #compareItems(a: unknown, b: unknown) {
    if (typeof a == 'string' && typeof b == 'string') {
      if (a == '') return 1
      else if (b == '') return -1
      else return a.localeCompare(b)
    } else if (a == undefined) {
      return 1
    } else if (b == undefined) {
      return -1
    } else {
      return (b as number) - (a as number)
    }
  }

  #sortGlobally(a: TableRow, b: TableRow) {
    if (this.sorting) {
      return this.sorting.reduce<number | undefined>(
        (result, { key, flip, order }) => result || (a.sorting[key] == undefined ? 1 : b.sorting[key] == undefined ? -1 : (order == 1 && !flip) || (order == 2 && flip) ? this.#compareItems(a.sorting[key], b.sorting[key]) : this.#compareItems(b.sorting[key], a.sorting[key])),
        undefined
      )
    } else {
      return undefined
    }
  }

  #sortDefault(a: TableRow, b: TableRow) {
    return this.globalSortingOrder * ((a.sorting[this.globalSortingKey] as number) - (b.sorting[this.globalSortingKey] as number))
  }

  #createCache() {
    this.cache = new Map()
    this.cache.set('spacer', this.#getSpacer())
    this.cache.set('divider', this.#getDivider())
  }

  #createSorting() {
    this.globalSortingKey = '_index'
    this.globalSortingOrder = 1
  }

  #getCellDividerStyle() {
    const lineType = this.settings.getLinedStyle()
    if (lineType == 2) {
      // Thick
      return 'border-bottom-thick'
    } else if (lineType == 1) {
      // Thin
      return 'border-bottom-thin'
    } else {
      // None
      return ''
    }
  }

  #getCell(header: ScriptContainer, value: unknown, color: ScriptColor, border: unknown, cellWidth?: number) {
    return CellGenerator.Cell(value, color.bg, header.visible ? color.fg : false, border, header.align, header.style ? header.style.cssText : undefined, cellWidth, header.action)
  }

  // The legacy code read an unset header.cellWidth here, so plain cells never get a width
  #getEmptyCell(header: ScriptContainer, border: unknown = undefined, span = 0) {
    if (span) {
      return CellGenerator.PlainSpan(span, header.formatUndefined, border, undefined, header.colorUndefined, header.style ? header.style.cssText : undefined)
    } else {
      return CellGenerator.Plain(header.formatUndefined, border, undefined, header.colorUndefined, header.style ? header.style.cssText : undefined, undefined)
    }
  }

  // Arithmetic on script values coerces like the legacy code did
  #getCellDisplayValue(header: ScriptContainer, val: unknown, cmp: unknown, current: ScriptEntity | undefined = undefined, compare: ScriptEntity | undefined = undefined, extra: unknown = undefined, altSelf: unknown = undefined) {
    const { difference, ex_difference, flip, differenceBrackets, differencePosition } = header
    const displayValue = header.getValue(current, compare, this.settings, val, extra, header, altSelf)

    if (!difference || isNaN(Number(cmp))) {
      return displayValue
    } else {
      const diff = (flip ? -1 : 1) * ((val as number) - (cmp as number))
      if ((Object.is(diff, NaN) && !ex_difference) || diff == 0) {
        return displayValue
      } else {
        return String(displayValue) + CellGenerator.Difference(diff, differenceBrackets, differencePosition, header.getDifferenceValue(current, compare, this.settings, diff, extra))
      }
    }
  }

  #getStatisticsDisplayValue(header: ScriptContainer, val: unknown, cmp: unknown) {
    const { difference, ex_difference, flip, differenceBrackets, differencePosition } = header
    const displayValue = header.getStatisticsValue(this.settings, val as number)

    if (!difference || isNaN(Number(cmp))) {
      return displayValue
    } else {
      const diff = (flip ? -1 : 1) * ((val as number) - (cmp as number))
      if ((Object.is(diff, NaN) && !ex_difference) || diff == 0) {
        return displayValue
      } else {
        return String(displayValue) + CellGenerator.Difference(diff, differenceBrackets, differencePosition, header.getDifferenceValue(undefined, undefined, this.settings, diff))
      }
    }
  }

  #getStatisticsColor(header: ScriptContainer, value: unknown) {
    return header.getStatisticsColor(this.settings, value)
  }

  #getCellColor(header: ScriptContainer, val: unknown, current: ScriptEntity | undefined = undefined, compare: ScriptEntity | undefined = undefined, extra: unknown = undefined, ignoreBase = false, altSelf: unknown = undefined) {
    return header.getColor(current, compare, this.settings, val, extra, ignoreBase, header, altSelf)
  }

  #getTable() {
    return `
            <tr class="headers">
                ${this.#getCategoryBlock(this.configLeft, this.config.length > 0)}
                ${this.#getCategoryBlock()}
            </tr>
            <tr class="headers">
                ${this.#getHeaderBlock(this.configLeft, this.config.length > 0)}
                ${this.#getHeaderBlock()}
            </tr>
            <tr data-entry-injector>
                <td colspan="${this.flatSpan}" style="height: 8px;"></td>
            </tr>
        `
  }

  #getDivider() {
    return `
            <tr class="border-bottom-thick"></tr>
        `
  }

  #getSpacer() {
    return `
            <tr>
                <td colspan="${this.flatSpan}"></td>
            </tr>
        `
  }

  #getRow(name: string, row: ScriptContainer, val: unknown, cmp: unknown, current: ScriptEntity | undefined = undefined) {
    return `
            <tr>
                <td class="border-right-thin" colspan="${this.leftFlatSpan}">${name}</td>
                ${CellGenerator.WideCell(this.#getCellDisplayValue(row, val, cmp, current), this.#getCellColor(row, val, current), this.flatWidth, row.align, row.style ? row.style.cssText : undefined)}
            </tr>
        `
  }

  #sharedProperties() {
    return {
      theme: this.settings.getTheme(),
      style: [this.settings.getFontStyle(), this.settings.getBorderColor()],
      class: [this.settings.getOpaqueStyle()],
      width: this.flatWidth,
      widthFixed: this.settings.isStrictWidthPolicy(),
      columnCount: this.flatSpan,
      stickyHeaders: this.settings.isStickyHeaders()
    }
  }

  #getContent() {
    this.cache.set('table', this.#getTable())

    let content = this.settings.isStrictWidthPolicy() ? this.#getSizer() : ''
    const layout = this.settings.getLayout(this.cache.get('statistics'), this.cache.get('rows'), this.cache.get('members'))

    for (const block of layout) {
      if (block == '|') {
        content += this.cache.get('divider') as string
      } else if (block == '_') {
        content += this.cache.get('spacer') as string
      } else {
        content += this.cache.get(block) || ''
      }
    }

    return content
  }

  // Renders statistics rows into cache
  #renderStatistics() {
    if (this.cache.has('statistics')) {
      return
    } else if (this.rightFlat.reduce<boolean | number | undefined>((a, { statistics }) => a || statistics, false)) {
      if (this.settings.customStatistics.length) {
        this.cache.set('statistics', this.#getStatistics(this.leftFlatSpan, this.settings.customStatistics))
      } else {
        this.cache.set(
          'statistics',
          this.#getStatistics(this.leftFlatSpan, [
            {
              name: 'Minimum',
              expression: (array) => minimum(array as number[])
            },
            {
              name: 'Average',
              expression: (array) => average(array as number[])
            },
            {
              name: 'Maximum',
              expression: (array) => maximum(array as number[])
            }
          ])
        )
      }
    } else {
      this.cache.set('statistics', '')
    }
  }

  // Renders members into cache
  #renderMembers() {
    if (this.cache.has('members')) {
      return
    } else if (this.settings.globals.members) {
      this.cache.set(
        'members',
        `
                <tr>
                    <td class="border-right-thin" colspan=${this.leftFlatSpan}>Classes</td>
                    <td colspan="${this.rightFlatSpan}">${Object.entries(this.settings.listClasses as Record<string, number>)
                      .map(([key, count]) => globalLocalize(`general.class${key}`) + ': ' + count)
                      .join(', ')}</td>
                </tr>
                <tr>
                    <td class="border-right-thin" colspan=${this.leftFlatSpan}>Joined</td>
                    <td colspan="${this.rightFlatSpan}">${(this.settings.listJoined as string[]).join(', ')}</td>
                </tr>
                <tr>
                    <td class="border-right-thin" colspan=${this.leftFlatSpan}>Left</td>
                    <td colspan="${this.rightFlatSpan}">${(this.settings.listKicked as string[]).join(', ')}</td>
                </tr>
            `
      )
    } else {
      this.cache.set('members', '')
    }
  }

  #renderMissing() {
    if (this.cache.has('missing')) {
      return
    } else if ((this.settings.listMissing as string[]).length) {
      this.cache.set(
        'missing',
        `
                <tr class="font-weight: bold;">
                    ${CellGenerator.WideCell(CellGenerator.Small(`${globalLocalize('stats.guilds.missing')}<br/>${(this.settings.listMissing as string[]).map((n, i) => `${i != 0 && i % 10 == 0 ? '<br/>' : ''}<b>${n}</b>`).join(', ')}!`), undefined, this.flatWidth, 'center')}
                </tr>
            `
      )
    } else {
      this.cache.set('missing', '')
    }
  }

  #renderRow(row: ScriptContainer, val: unknown, cmp: unknown, current?: ScriptEntity) {
    let rowName = (row.nameOverride ?? row.name) as string
    if (typeof row.nameExpression !== 'undefined') {
      const resolvedName = row.nameExpression(this.settings, row)
      if (resolvedName != undefined) {
        rowName = String(resolvedName)
      }
    }

    return this.#getRow(rowName, row, val, cmp, current)
  }

  #renderRows(includePlayer = false) {
    if (this.cache.has('rows')) {
      return
    } else if (this.settings.customRows.length) {
      if (includePlayer) {
        this.cache.set(
          'rows',
          joinMapped(this.settings.customRows, (row) => this.#renderRow(row, row.eval?.value, undefined, this.array[0]?.current))
        )
      } else {
        this.cache.set(
          'rows',
          joinMapped(this.settings.customRows, (row) => this.#renderRow(row, row.eval?.value, row.eval?.compare))
        )
      }
    } else {
      this.cache.set('rows', '')
    }
  }

  #createPlayerTable() {
    this.#renderRows(true)
    this.#renderStatistics()

    const forcedLimit = this.settings.getEntryLimit()

    // Create table Content
    return {
      entries: forcedLimit ? this.entries.slice(0, forcedLimit) : this.entries,
      content: this.#getContent()
    }
  }

  // Create players table
  #createBrowseTable() {
    this.#renderRows()
    this.#renderStatistics()

    const forcedLimit = this.array.entryLimit || this.settings.getEntryLimit()

    return {
      entries: forcedLimit ? this.entries.slice(0, forcedLimit) : this.entries,
      content: this.#getContent()
    }
  }

  // Create guilds table
  #createGroupTable() {
    this.#renderRows()
    this.#renderMissing()
    this.#renderStatistics()
    this.#renderMembers()

    return {
      entries: this.entries,
      content: this.#getContent()
    }
  }

  #getCellContent({ action, generators: { cell } }: TableHeader, current: ScriptEntity, compare: ScriptEntity) {
    if (action == 'show') {
      return cell(current, compare).replace('{__ACTION__}', `data-id="${current.LinkId}" data-ts="${current.Timestamp}"`).replace('{__ACTION_OP__}', `<span class="css-op-select-el"></span>`)
    } else {
      return cell(current, compare)
    }
  }

  #getStatistics(leftSpan: number, entries: TableStatistics[]) {
    return `
            <tr>
                <td class="border-right-thin" colspan="${leftSpan}"></td>
                ${joinMapped(this.rightFlat, ({ span, statistics, generators, name }) => `<td colspan="${span}">${statistics && generators.statistics ? name : ''}</td>`)}
            </tr>
            ${this.cache.get('divider')}
            ${joinMapped(
              entries,
              ({ name, ast, expression }) => `
                <tr>
                    <td class="border-right-thin" colspan="${leftSpan}">${name}</td>
                    ${joinMapped(this.rightFlat, ({ span, statistics, generators }) => (statistics && generators.statistics ? generators.statistics(this.array, expression ? expression : (array) => (ast as Expression).eval(new ExpressionScope(this.settings).addSelf(array))) : `<td colspan="${span}"></td>`))}
                </tr>
            `
            )}
        `
  }

  #getCategoryBlock(config = this.config, alwaysRightBorder = false) {
    const aligned = this.settings.getTitleAlign()

    return joinMapped(config, ({ headers, length, name: categoryName }, categoryIndex, categoryArray) => {
      const notLastCategory = alwaysRightBorder || categoryIndex != categoryArray.length - 1
      const emptyCategoryName = categoryName.length === 0

      if (emptyCategoryName && !aligned) {
        return joinMapped(headers, ({ width, span, sortKey, name: headerName, alignTitle }, headerIndex, headerArray) => {
          const lastHeader = notLastCategory && headerIndex == headerArray.length - 1

          return `<td rowspan="2" colspan="${span}" style="width: ${width}px; max-width: ${width}px;" class="border-bottom-thick ${alignTitle ? alignTitle : ''} ${lastHeader ? 'border-right-thin' : ''} cursor-pointer" ${this.#getSortingTag(sortKey)}>${headerName}</td>`
        })
      } else {
        return `<td colspan="${length}" class="${notLastCategory ? 'border-right-thin' : ''}">${aligned && emptyCategoryName ? '' : categoryName}</td>`
      }
    })
  }

  #getHeaderBlock(config = this.config, alwaysRightBorder = false) {
    const aligned = this.settings.getTitleAlign()

    return joinMapped(config, ({ headers, name: categoryName }, categoryIndex, categoryArray) => {
      const notLastCategory = alwaysRightBorder || categoryIndex != categoryArray.length - 1
      const emptyCategoryName = categoryName.length === 0

      if (emptyCategoryName && !aligned) {
        return ''
      } else {
        return joinMapped(headers, ({ width, span, name, sortKey, alignTitle }, headerIndex, headerArray) => {
          const lastHeader = notLastCategory && headerIndex == headerArray.length - 1

          return `<td colspan="${span}" style="width: ${width}px; max-width: ${width}px;" class="border-bottom-thick ${alignTitle ? alignTitle : ''} ${lastHeader ? 'border-right-thin' : ''} cursor-pointer" ${this.#getSortingTag(sortKey)}>${name}</td>`
        })
      }
    })
  }

  #getSizer() {
    const content = joinMapped(this.flat, ({ span, width, grouped }) => {
      if (grouped) {
        const sliceWidth = Math.trunc(width / grouped)

        return `<td style="width: ${sliceWidth}px; max-width: ${sliceWidth}px;"></td>`.repeat(grouped)
      } else {
        return `<td colspan="${span}" style="width: ${width}px; max-width: ${width}px;"></td>`
      }
    })

    return `<tr class="headers" style="visibility: collapse;">${content}</tr>`
  }

  #getSortingTag(key: string) {
    const index = this.sorting.findIndex((s) => s.key == key)
    return `data-sortable-key="${key}" data-sortable="${this.sorting[index] ? this.sorting[index].order : 0}" data-sortable-index="${this.sorting.length == 1 ? '' : index + 1}"`
  }
}

type TableControllerEvents = {
  inject: [node: TableRowElement]
  change: []
}

export class TableController extends SignalSource<TableControllerEvents> {
  headElement: HTMLTableSectionElement
  bodyElement: HTMLTableSectionElement
  element: HTMLTableElement
  tableType: TableType
  table: TableInstance
  scriptChanged: boolean
  entriesChanged: boolean

  declare resetSorting?: boolean
  declare script?: string
  declare entries?: TableArray
  declare injectorObserver?: IntersectionObserver
  declare injectorEntries?: TableRow[]
  declare injectorBlockSize?: number
  declare injectorCounter?: number
  declare injectorElement?: HTMLTableRowElement | null
  declare injectCount?: number

  constructor(element: HTMLTableElement, tableType: TableType) {
    super()

    this.headElement = document.createElement('thead')
    this.bodyElement = document.createElement('tbody')

    this.element = element
    this.element.replaceChildren(this.headElement, this.bodyElement)

    this.tableType = tableType
    this.table = new TableInstance(this.tableType)

    // Changed by default
    this.scriptChanged = true
    this.entriesChanged = true
  }

  async toImage(cloneCallback?: (table: HTMLTableElement) => void) {
    // html2canvas copies pseudo-element styles from the live page, so the icons are swapped there during the capture
    const icons = await this.#replaceIconMasks()

    // html2canvas measures text baselines with an inline image, which Tailwind preflight turns into a block
    const metricsStyle = document.createElement('style')
    metricsStyle.textContent = 'body > div > img { display: inline; vertical-align: baseline; }'
    document.head.append(metricsStyle)

    try {
      const canvas = await html2canvas(this.element, {
        logging: false,
        allowTaint: true,
        useCORS: true,
        onclone: (document) => {
          if (cloneCallback) {
            cloneCallback(document.querySelector(`table[data-uuid="${this.element.dataset.uuid}"]`) as HTMLTableElement)
          }
        }
      })

      return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve))
    } finally {
      metricsStyle.remove()

      this.element.classList.remove('sftools-table-canvas')

      for (const element of icons) {
        element.style.removeProperty('--sftools-table-icon')
      }
    }
  }

  async #replaceIconMasks() {
    const icons = Array.from(this.element.querySelectorAll<HTMLElement>('[data-sortable="1"], [data-sortable="2"], .css-op-select > .css-op-select-el'))
    const images = new Map<string, Promise<string>>()

    for (const element of icons) {
      const style = getComputedStyle(element, '::before')
      const match = style.maskImage.match(/^url\("data:image\/svg\+xml,(.*)"\)$/)

      if (match) {
        const svg = decodeURIComponent(match[1]).replace('<path ', `<path fill='${style.backgroundColor}' `)

        if (!images.has(svg)) {
          images.set(svg, this.#rasterizeIcon(svg))
        }

        element.style.setProperty('--sftools-table-icon', `url("${await images.get(svg)}")`)
      }
    }

    this.element.classList.add('sftools-table-canvas')

    return icons
  }

  // html2canvas 1.1.4 does not draw SVG backgrounds
  async #rasterizeIcon(svg: string) {
    const [, width, height] = (svg.match(/viewBox='0 0 (\d+) (\d+)'/) ?? ['', '1', '1']).map(Number)

    const image = new Image()
    image.src = `data:image/svg+xml,${encodeURIComponent(svg)}`

    await image.decode()

    const canvas = document.createElement('canvas')
    canvas.height = 64
    canvas.width = Math.round((64 * width) / height)
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)

    return canvas.toDataURL()
  }

  toCSV() {
    return new Promise<string>((resolve) => {
      const headers = this.table.flat.map((header) => header.name)
      const headersLength = headers.length

      const data = [JSON.stringify(headers).slice(1, -1)]

      for (const entry of this.table.entries) {
        const stack = Array<string>(headersLength)
        const node = entry.node.cloneNode(true) as HTMLTableRowElement

        for (const diff of node.querySelectorAll('[data-difference]')) {
          diff.remove()
        }

        const children = node.childNodes
        for (let i = 0; i < headersLength; i++) {
          stack[i] = (children[i] as HTMLElement).innerText.replace(/[\s]/m, ' ')
        }

        data.push(JSON.stringify(stack).slice(1, -1))
      }

      resolve(data.join('\n'))
    })
  }

  setScript(code: string) {
    // If settings have changed
    if (this.script != code) {
      this.script = code
      this.scriptChanged = true

      // Clear sorting when settings have changed
      this.clearSorting()
    }
  }

  getEntryLimit() {
    return this.table ? this.table.settings.getEntryLimit() : 0
  }

  setEntries(entries: TableArray) {
    this.entries = entries
    this.entriesChanged = true
  }

  getArray() {
    return this.table ? this.table.array : []
  }

  getInternalEntries() {
    return this.table ? this.table.entries : []
  }

  clearSorting() {
    this.resetSorting = true
  }

  prepareInjector(entries: TableRow[]) {
    if (this.injectorObserver) {
      this.injectorObserver.disconnect()
    }

    this.injectorEntries = entries
    this.injectorBlockSize = Math.trunc((Site.options.load_rows || Site.options.default('load_rows')) / 2)
    this.injectorCounter = 0

    this.injectorObserver = new IntersectionObserver(() => this.inject(), { threshold: 0.75 })
    this.injectorObserver.observe(this.injectorElement as HTMLTableRowElement)
  }

  forceInject() {
    if (this.injectorEntries && this.injectorEntries.length > 0) {
      this.inject(10000)
    }
  }

  resetInjector() {
    this.injectCount = 0
  }

  // Only runs after prepareInjector() filled the injector fields
  inject(size = this.injectorBlockSize as number) {
    const injectorEntries = this.injectorEntries as TableRow[]
    const injectorElement = this.injectorElement as HTMLTableRowElement

    const injectorCounter = this.injectorCounter as number
    this.injectorCounter = injectorCounter + 1

    if (injectorCounter > 0) {
      const timestamp = Date.now()

      const blockSize = Math.min(injectorEntries.length, size)
      this.injectCount = (this.injectCount as number) + blockSize

      const entriesSlice = injectorEntries.splice(0, size)
      const fragment = new DocumentFragment()

      for (const entry of entriesSlice) {
        fragment.append(entry.node)
      }

      ;(injectorElement.parentElement as HTMLElement).insertBefore(fragment, injectorElement)

      for (const entry of entriesSlice) {
        const node = entry.node

        if (!node.injectCalled) {
          node.injectCalled = true

          this.emit('inject', node)
        }
      }

      this.table.reflowIndexes()

      if (injectorEntries.length == 0) {
        ;(this.injectorObserver as IntersectionObserver).disconnect()
      }

      Logger.log('TAB_GEN', `Block of size ${blockSize} injected in ${Date.now() - timestamp}ms!`)
    }
  }

  refresh() {
    // Log some console stuff for fun
    const scriptChanged = this.scriptChanged || false
    const entriesChanged = this.entriesChanged || false
    const resetSorting = this.resetSorting || false

    const timestamp = Date.now()

    // Save sorting if needed
    const sorting = this.resetSorting ? null : this.table.sorting

    // Create table
    if (this.entriesChanged || this.scriptChanged) {
      const tableEntries = this.entries as TableArray

      tableEntries.suppressUpdate = false

      this.table.setScript(this.script as string, tableEntries)

      this.resetSorting = false
      this.resetInjector()

      this.table.setEntries(tableEntries)
      this.table.sort()
    }

    // Reset sorting
    if (sorting != null) {
      this.table.sorting = sorting
      this.table.sort()
    }

    // Reset sorting if ignored
    if (this.resetSorting) {
      this.table.clearSorting()
    }

    // Clear flag
    this.resetSorting = false
    this.scriptChanged = false
    this.entriesChanged = false

    // Get table content
    const { content, entries: tableEntries, style, class: klass, theme, width, widthFixed, columnCount, stickyHeaders } = this.table.createTable()

    const entries = ([] as TableRow[]).concat(tableEntries)

    let themeClass = ''
    let themeStyle = ''
    if (typeof theme === 'string') {
      themeClass = `theme-${theme}`
    } else if (typeof theme === 'object') {
      const { text, background } = theme
      themeStyle = `--table-foreground: ${text}; --table-background: ${background}`
    }

    if (widthFixed) {
      this.element.classList.add('sftools-table-fixed')
    } else {
      this.element.classList.remove('sftools-table-fixed')
    }

    this.element.dataset.uuid = randomHash()
    this.element.dataset.columnCount = String(columnCount)

    this.bodyElement.setAttribute('style', `${themeStyle} ${style.join(' ')}`)
    this.bodyElement.setAttribute('class', `${themeClass} ${klass.join(' ')}`)
    this.bodyElement.innerHTML = content

    this.injectCount = this.injectCount || Site.options.load_rows || Site.options.default('load_rows')
    this.injectorElement = this.bodyElement.querySelector<HTMLTableRowElement>('[data-entry-injector]')

    if (this.injectorElement) {
      const entriesSlice = entries.splice(0, this.injectCount)
      const fragment = new DocumentFragment()

      for (const entry of entriesSlice) {
        fragment.append(entry.node)
      }

      ;(this.injectorElement.parentElement as HTMLElement).insertBefore(fragment, this.injectorElement)

      for (const entry of entriesSlice) {
        const node = entry.node

        if (!node.injectCalled) {
          node.injectCalled = true

          this.emit('inject', node)
        }
      }

      this.table.reflowIndexes()
    }

    this.element.style.width = `${width}px`
    this.element.style.left = `max(0px, calc(50vw - 9px - ${width / 2}px))`

    if (stickyHeaders === undefined ? Site.options.table_sticky_header : stickyHeaders) {
      let offset = 0

      for (const header of this.element.querySelectorAll<HTMLTableRowElement>('tr.headers')) {
        header.classList.add('sticky-header')
        header.style.setProperty('--top-offset', `${offset}px`)

        offset += header.getBoundingClientRect().height
      }
    }

    if (this.injectorElement) {
      if (entries.length > 0) {
        this.prepareInjector(entries)
      } else {
        this.injectorElement.remove()
      }
    }

    // Bind sorting
    const sortables = Array.from(this.bodyElement.querySelectorAll<HTMLElement>('[data-sortable]'))
    for (const sortable of sortables) {
      sortable.addEventListener('click', (event) => {
        const sortKey = (event.target as HTMLElement).dataset.sortableKey as string
        if (event.ctrlKey) {
          // Remove all sorting except current key if CTRL is held down
          this.table.sorting = this.table.sorting.filter((s) => s.key == sortKey)
        }

        // Sort by key
        this.table.setSorting(sortKey)

        // Redraw table
        this.refresh()
      })

      sortable.addEventListener('contextmenu', (event) => {
        event.preventDefault()

        if (this.table.sorting && this.table.sorting.length) {
          // Do only if any sorting exists
          if (event.ctrlKey) {
            // Clear sorting if CTRL is held down
            this.table.clearSorting()
          } else {
            // Remove current key
            this.table.removeSorting((event.target as HTMLElement).dataset.sortableKey)
          }

          // Redraw table
          this.refresh()
        }
      })

      sortable.addEventListener('mousedown', (event) => {
        event.preventDefault()
      })
    }

    // Log stuff to console
    if (scriptChanged || entriesChanged || resetSorting) {
      Logger.log('TAB_GEN', `Table generated in ${Date.now() - timestamp}ms! Instance: ${scriptChanged}, Entries: ${entriesChanged}, Unsorted: ${resetSorting}`)
    } else {
      Logger.log('TAB_GEN', `Table generated in ${Date.now() - timestamp}ms!`)
    }

    // Call callback when finished
    this.emit('change')
  }
}

function getCSSBorderClass(border: unknown) {
  if (typeof border === 'number') {
    switch (border) {
      case 4:
        return 'border-top-thin'
      case 5:
        return 'border-bottom-thin'
      default:
        return ''
    }
  } else if (border) {
    return 'border-right-thin'
  } else {
    return ''
  }
}

// Cell generators
export const CellGenerator = {
  // Simple cell
  Cell: function (c: unknown, b: string, color: string | false | undefined, bo: unknown = undefined, al: string | undefined = undefined, style: string | undefined = undefined, cellWidth: number | undefined = undefined, hasAction: string | undefined = undefined) {
    const border = getCSSBorderClass(bo)
    if (color === false) {
      color = getCSSColorFromBackground(b)
    }

    return `<td class="${border} ${al ? al : ''} ${hasAction ? 'cursor-pointer' : ''}" ${hasAction ? '{__ACTION__}' : ''} style="${cellWidth ? `width: ${cellWidth}px;` : ''} ${color ? `color:${color};` : ''}${b ? `background:${escapeHtml(b)};` : ''}${style || ''}">${hasAction ? '{__ACTION_OP__}' : ''}${String(c)}</td>`
  },
  // Wide cell
  WideCell: function (text: unknown, color: ScriptColor | undefined, colSpan: number, alignClass: string | undefined, style: string | undefined = undefined) {
    const { fg, bg }: Partial<ScriptColor> = typeof color === 'object' ? color : {}
    return `
            <td class="${alignClass || ''}" colspan="${colSpan}" style="${fg ? `color: ${fg};` : ''}${bg ? `background:${escapeHtml(bg)};` : ''}${style || ''}">${String(text)}</td>
        `
  },
  // Plain cell
  Plain: function (c: unknown, bo: unknown, al: string | undefined, bg: string | undefined, style: string | undefined, cellWidth: number | undefined) {
    const border = getCSSBorderClass(bo)

    return `<td class="${border} ${al ? al : ''}" style="${cellWidth ? `width: ${cellWidth}px;` : ''} ${bg ? `background: ${escapeHtml(bg)};` : ''}${style || ''}">${String(c)}</td>`
  },
  // Plain cell
  PlainSpan: function (s: number, c: unknown, bo: unknown, al: string | undefined, bg: string | undefined, style: string | undefined) {
    const border = getCSSBorderClass(bo)

    return `<td class="${border} ${al ? al : ''}" colspan="${s}"  style="${bg ? `background: ${escapeHtml(bg)};` : ''}${style || ''}">${String(c)}</td>`
  },
  // Difference
  Difference: function (d: number, showBrackets: string | false | undefined, position: string | undefined, c: unknown) {
    return `${position === 'below' ? '<br>' : ' '}<span data-difference>${showBrackets ? showBrackets[0] : ''}${d > 0 ? '+' : ''}${c == null ? d : String(c)}${showBrackets ? showBrackets[1] : ''}</span>`
  },
  // Empty cell
  Empty: function (b: unknown) {
    return `<td ${b ? 'class="border-right-thin"' : ''}></td>`
  },
  // Small text,
  Small: function (c: unknown) {
    return `<span>${String(c)}</span>`
  },
  // Embed table
  EmbedTable: function (c: string, b: string, bo: boolean, f: string | undefined) {
    const bg = b ? `background:${escapeHtml(b)};` : ''
    const fr = f ? `font: ${f};` : ''
    return `<td style="padding: 0; vertical-align: top; ${bg}" class="${bo ? 'border-right-thin' : ''}">
            <table style="width: 100%; border-spacing: 0; border-collapse: collapse; ${bg} ${fr}">
                ${c}
            </table>
        </td>`
  }
}
