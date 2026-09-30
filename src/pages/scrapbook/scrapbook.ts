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
  note?: string
}

export type ScrapbookGroup = {
  key: ScrapbookGroupKey
  entries: ScrapbookEntry[]
  collected: number
  total: number
}

export type ScrapbookKind = {
  key: string
  type: number
  klass?: number
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
  minimumLevel: number
  maximumLevel: number
}

// Class 0 holds the items every class shares
const CLASS_KINDS: [itemClass: number, types: number[]][] = [
  [1, [1, 2, 3, 4, 5, 6, 7]],
  [2, [1, 3, 4, 5, 6, 7]],
  [3, [1, 3, 4, 5, 6, 7]],
  [0, [8, 9, 10]]
]

// Only weapons stay per class, the other legendaries count once whichever class collected them
const LEGENDARY_KINDS: [itemClass: number, type: number][] = [
  [1, 1],
  [2, 1],
  [3, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [0, 6],
  [0, 7],
  [0, 8],
  [0, 9],
  [0, 10]
]

const COLORS = [0, 1, 2, 3, 4]

type UnlockLevels = [index: number, level: number][]

const NORMAL_LEVELS: UnlockLevels = [
  [1, 1],
  [4, 10],
  [6, 15],
  [7, 20],
  [8, 25],
  [9, 30],
  [10, 35]
]

const WARRIOR_WEAPON_LEVELS: UnlockLevels = [
  [1, 1],
  [10, 10],
  [16, 15],
  [19, 20],
  [22, 25],
  [25, 30],
  [28, 35]
]

const ACCESSORY_LEVELS: Record<number, UnlockLevels> = {
  8: [
    [1, 1],
    [11, 15],
    [14, 30],
    [17, 50]
  ],
  9: [
    [1, 1],
    [8, 15],
    [11, 30],
    [14, 50]
  ],
  10: [
    [1, 1],
    [11, 15],
    [14, 30],
    [26, 50]
  ]
}

const EPIC_LEVELS: UnlockLevels = [
  [50, 1],
  [55, 100],
  [56, 150],
  [57, 200],
  [58, 100],
  [61, 1],
  [64, 250],
  [65, 300],
  [66, 350],
  [67, 1]
]

const EPIC_NOTES: Record<number, string> = {
  58: 'toilet',
  59: 'toilet',
  60: 'toilet',
  61: 'easter',
  62: 'halloween',
  63: 'christmas',
  64: 'twister_100',
  65: 'twister_250',
  66: 'twister_500',
  67: 'birthday',
  68: 'valentines',
  69: 'football',
  70: 'twitch',
  71: 'samurai',
  72: 'bbq'
}

export const MAX_UNLOCK_LEVEL = 350

function getUnlockLevel(type: number, itemClass: number, index: number) {
  const levels = index >= 50 ? EPIC_LEVELS : type >= 8 ? ACCESSORY_LEVELS[type] : type === 1 && itemClass === 1 ? WARRIOR_WEAPON_LEVELS : NORMAL_LEVELS

  return levels.filter(([start]) => start <= index).at(-1)?.[1] ?? 1
}

function getPictures(type: number, itemClass: number, color: number) {
  return __ITEM_PICTURES__[`${type}_${color + 1}_${itemClass || 1}`] ?? []
}

function createEntry(source: ScrapbookSource, positions: number[], type: number, itemClass: number, index: number, color: number): ScrapbookEntry {
  const key = `${source.book}_${positions[0]}`
  const collected = positions.some((position) => source.bits[position])
  const pictureColor = getPictures(type, itemClass, color).includes(index) ? color : 0

  return {
    key,
    name: Loca.name(type, index, itemClass || 1),
    picture: Loca.pic(type, index, pictureColor, itemClass || 1),
    color,
    collected,
    marked: !collected && source.marked.has(key),
    note: EPIC_NOTES[index]
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
    const classes = itemClass ? [itemClass] : [1, 2, 3]

    return [
      createGroup(
        'legendary',
        indices
          .filter((index) => index >= 100)
          .map((index) =>
            createEntry(
              source,
              classes.map((entryClass) => ItemModel.getLegendaryScrapbookPosition(type, entryClass, index)),
              type,
              itemClass,
              index,
              0
            )
          )
      )
    ]
  }

  const colors = type === 10 ? [0] : COLORS

  const shownIndices = indices.filter((index) => {
    const level = getUnlockLevel(type, itemClass, index)

    return level >= source.minimumLevel && level <= source.maximumLevel
  })

  return [
    createGroup(
      'normal',
      shownIndices.filter((index) => index < 50).flatMap((index) => colors.map((color) => createEntry(source, [ItemModel.getScrapbookPosition(itemClass, type, index, color)], type, itemClass, index, color)))
    ),
    createGroup(
      'epic',
      shownIndices.filter((index) => index >= 50 && index < 100).map((index) => createEntry(source, [ItemModel.getScrapbookPosition(itemClass, type, index, 0)], type, itemClass, index, 0))
    )
  ]
}

function createKind(source: ScrapbookSource, itemClass: number, type: number): ScrapbookKind {
  const groups = createGroups(source, itemClass, type)

  return {
    key: `${itemClass}_${type}`,
    type,
    groups,
    collected: sum(groups.map((group) => group.collected)),
    total: sum(groups.map((group) => group.total))
  }
}

function createClass(itemClass: number, kinds: ScrapbookKind[]): ScrapbookClass {
  return {
    class: itemClass,
    kinds,
    collected: sum(kinds.map((kind) => kind.collected)),
    total: sum(kinds.map((kind) => kind.total))
  }
}

export function createScrapbookClasses(player: PlayerModel, book: ScrapbookBook, marked: string[], minimumLevel: number, maximumLevel: number): ScrapbookClass[] {
  const source: ScrapbookSource = {
    book,
    bits: (book === 'items' ? player.Scrapbook : player.ScrapbookLegendary) ?? [],
    marked: new Set(marked),
    minimumLevel,
    maximumLevel
  }

  if (book === 'legendaries') {
    const kinds = LEGENDARY_KINDS.map(([itemClass, type]) => ({ ...createKind(source, itemClass, type), klass: itemClass || undefined }))

    return [createClass(0, kinds)]
  }

  return CLASS_KINDS.map(([itemClass, types]) => {
    const kinds = types.map((type) => createKind(source, itemClass, type))

    return createClass(itemClass, kinds)
  })
}
