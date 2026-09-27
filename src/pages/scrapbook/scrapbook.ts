import { sum } from '@utils/utils'
import { ItemModel } from '~/core/models/item'
import { type PlayerModel } from '~/core/models/player'
import { Loca } from '~/playa/items'

export type ScrapbookBook = 'items' | 'legendaries'

export type ScrapbookGroupKey = 'normal' | 'epic' | 'legendary'

export type ScrapbookEntry = {
  key: string
  name: string
  picture: string
  color: number
  collected: boolean
  marked: boolean
}

export type ScrapbookGroup = {
  key: ScrapbookGroupKey
  entries: ScrapbookEntry[]
  collected: number
  total: number
}

export type ScrapbookKind = {
  type: number
  groups: ScrapbookGroup[]
  collected: number
  total: number
}

export type ScrapbookClass = {
  class: number
  kinds: ScrapbookKind[]
  collected: number
  total: number
}

type ScrapbookSource = {
  book: ScrapbookBook
  bits: boolean[]
  marked: Set<string>
}

// Class 0 holds the items every class shares
const CLASS_KINDS: [itemClass: number, types: number[]][] = [
  [1, [1, 2, 3, 4, 5, 6, 7]],
  [2, [1, 3, 4, 5, 6, 7]],
  [3, [1, 3, 4, 5, 6, 7]],
  [0, [8, 9, 10]]
]

const COLORS = [0, 1, 2, 3, 4]

function getPictures(type: number, itemClass: number, color: number) {
  return __ITEM_PICTURES__[`${type}_${color + 1}_${itemClass || 1}`] ?? []
}

function createEntry(source: ScrapbookSource, position: number, type: number, itemClass: number, index: number, color: number): ScrapbookEntry {
  const key = `${source.book}_${position}`
  const collected = source.bits[position] ?? false
  const pictureColor = getPictures(type, itemClass, color).includes(index) ? color : 0

  return {
    key,
    name: Loca.name(type, index, itemClass || 1),
    picture: Loca.pic(type, index, pictureColor, itemClass || 1),
    color,
    collected,
    marked: !collected && source.marked.has(key)
  }
}

function createGroup(key: ScrapbookGroupKey, entries: ScrapbookEntry[]): ScrapbookGroup {
  return {
    key,
    entries,
    collected: entries.filter((entry) => entry.collected || entry.marked).length,
    total: entries.length
  }
}

function createGroups(source: ScrapbookSource, itemClass: number, type: number): ScrapbookGroup[] {
  const indices = getPictures(type, itemClass, 0)

  if (source.book === 'legendaries') {
    return [
      createGroup(
        'legendary',
        indices.filter((index) => index >= 100).map((index) => createEntry(source, ItemModel.getLegendaryScrapbookPosition(type, itemClass || 1, index), type, itemClass, index, 0))
      )
    ]
  }

  const colors = type === 10 ? [0] : COLORS

  return [
    createGroup(
      'normal',
      indices.filter((index) => index < 50).flatMap((index) => colors.map((color) => createEntry(source, ItemModel.getScrapbookPosition(itemClass, type, index, color), type, itemClass, index, color)))
    ),
    createGroup(
      'epic',
      indices.filter((index) => index >= 50 && index < 100).map((index) => createEntry(source, ItemModel.getScrapbookPosition(itemClass, type, index, 0), type, itemClass, index, 0))
    )
  ]
}

export function createScrapbookClasses(player: PlayerModel, book: ScrapbookBook, marked: string[]): ScrapbookClass[] {
  const source: ScrapbookSource = {
    book,
    bits: (book === 'items' ? player.Scrapbook : player.ScrapbookLegendary) ?? [],
    marked: new Set(marked)
  }

  return CLASS_KINDS.map(([itemClass, types]) => {
    const kinds = types.map((type): ScrapbookKind => {
      const groups = createGroups(source, itemClass, type)

      return {
        type,
        groups,
        collected: sum(groups.map((group) => group.collected)),
        total: sum(groups.map((group) => group.total))
      }
    })

    return {
      class: itemClass,
      kinds,
      collected: sum(kinds.map((kind) => kind.collected)),
      total: sum(kinds.map((kind) => kind.total))
    }
  })
}
