import { sum } from '@utils/utils'
import { ItemModel } from '~/core/models/item'
import { type PlayerModel } from '~/core/models/player'
import { Loca } from '~/playa/items'
import { ASSASSIN, BARD, BATTLEMAGE, BERSERKER, BLOODWEAVER, DEMONHUNTER, DRUID, MAGE, NECROMANCER, PALADIN, PLAGUEDOCTOR, SCOUT, WARRIOR } from '~/sim/base'

export type ScrapbookBook = 'items' | 'legendaries'

export type ScrapbookRarity = 'normal' | 'epic' | 'legendary'

export type ScrapbookStatus = 'missing' | 'collected' | 'marked' | 'all'

export type ScrapbookOrigin = 'regular' | 'toilet' | 'event' | 'twister'

export type ScrapbookEntry = {
  key: string
  name: string
  picture: string
  type: number
  itemClass: number
  rarity: ScrapbookRarity
  origin: ScrapbookOrigin
  unlockLevel?: number
  color: number
  collected: boolean
  marked: boolean
  note?: string
}

export type ScrapbookGroup = {
  key: ScrapbookRarity
  entries: ScrapbookEntry[]
  collected: number
  total: number
}

export type ScrapbookKind = {
  key: string
  type: number
  itemClass: number
  groups: ScrapbookGroup[]
  collected: number
  total: number
}

export type ScrapbookFilters = {
  search: string
  status: ScrapbookStatus
  wornBy: CharacterClass | null
  itemClasses: number[]
  kinds: number[]
  rarities: ScrapbookRarity[]
  origins: ScrapbookOrigin[]
  minimumLevel: number | null
  maximumLevel: number | null
}

type ScrapbookSource = {
  book: ScrapbookBook
  bits: boolean[]
  marked: Set<string>
}

type ClassItems = {
  weapon: number
  shield: boolean
  armor: number
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

const NOTE_ORIGINS: Record<string, ScrapbookOrigin> = {
  toilet: 'toilet',
  twister_100: 'twister',
  twister_250: 'twister',
  twister_500: 'twister'
}

export const MAX_UNLOCK_LEVEL = 350

export const PLAYER_CLASSES: CharacterClass[] = [WARRIOR, MAGE, SCOUT, ASSASSIN, BATTLEMAGE, BERSERKER, DEMONHUNTER, DRUID, BARD, NECROMANCER, PALADIN, PLAGUEDOCTOR, BLOODWEAVER]

const CLASS_ITEMS: Record<CharacterClass, ClassItems> = {
  [WARRIOR]: { weapon: WARRIOR, shield: true, armor: WARRIOR },
  [MAGE]: { weapon: MAGE, shield: false, armor: MAGE },
  [SCOUT]: { weapon: SCOUT, shield: false, armor: SCOUT },
  [ASSASSIN]: { weapon: WARRIOR, shield: false, armor: SCOUT },
  [BATTLEMAGE]: { weapon: WARRIOR, shield: false, armor: MAGE },
  [BERSERKER]: { weapon: WARRIOR, shield: false, armor: WARRIOR },
  [DEMONHUNTER]: { weapon: SCOUT, shield: false, armor: WARRIOR },
  [DRUID]: { weapon: MAGE, shield: false, armor: SCOUT },
  [BARD]: { weapon: MAGE, shield: false, armor: SCOUT },
  [NECROMANCER]: { weapon: MAGE, shield: false, armor: MAGE },
  [PALADIN]: { weapon: WARRIOR, shield: false, armor: WARRIOR },
  [PLAGUEDOCTOR]: { weapon: WARRIOR, shield: false, armor: MAGE },
  [BLOODWEAVER]: { weapon: WARRIOR, shield: false, armor: WARRIOR }
}

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
  const note = EPIC_NOTES[index]

  return {
    key,
    name: Loca.name(type, index, itemClass || 1),
    picture: Loca.pic(type, index, pictureColor, itemClass || 1),
    type,
    itemClass,
    rarity: index >= 100 ? 'legendary' : index >= 50 ? 'epic' : 'normal',
    origin: note ? (NOTE_ORIGINS[note] ?? 'event') : 'regular',
    unlockLevel: index < 100 ? getUnlockLevel(type, itemClass, index) : undefined,
    color,
    collected,
    marked: !collected && source.marked.has(key),
    note
  }
}

function createGroup(key: ScrapbookRarity, entries: ScrapbookEntry[]): ScrapbookGroup {
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

  return [
    createGroup(
      'normal',
      indices.filter((index) => index < 50).flatMap((index) => colors.map((color) => createEntry(source, [ItemModel.getScrapbookPosition(itemClass, type, index, color)], type, itemClass, index, color)))
    ),
    createGroup(
      'epic',
      indices.filter((index) => index >= 50 && index < 100).map((index) => createEntry(source, [ItemModel.getScrapbookPosition(itemClass, type, index, 0)], type, itemClass, index, 0))
    )
  ]
}

function createKind(source: ScrapbookSource, itemClass: number, type: number): ScrapbookKind {
  const groups = createGroups(source, itemClass, type)

  return {
    key: `${itemClass}_${type}`,
    type,
    itemClass,
    groups,
    collected: sum(groups.map((group) => group.collected)),
    total: sum(groups.map((group) => group.total))
  }
}

function canWear(playerClass: CharacterClass, type: number, itemClass: number) {
  const items = CLASS_ITEMS[playerClass]

  if (type === 1) return itemClass === items.weapon
  if (type === 2) return items.shield
  if (type <= 7) return itemClass === 0 || itemClass === items.armor

  return true
}

function matchesFilters(entry: ScrapbookEntry, filters: ScrapbookFilters) {
  const search = filters.search.trim().toLowerCase()

  if (search && !entry.name.toLowerCase().includes(search)) return false
  if (filters.wornBy && !canWear(filters.wornBy, entry.type, entry.itemClass)) return false
  if (filters.itemClasses.length > 0 && !filters.itemClasses.includes(entry.itemClass)) return false
  if (filters.kinds.length > 0 && !filters.kinds.includes(entry.type)) return false
  if (entry.rarity === 'legendary') return true
  if (filters.rarities.length > 0 && !filters.rarities.includes(entry.rarity)) return false
  if (filters.origins.length > 0 && !filters.origins.includes(entry.origin)) return false

  const level = entry.unlockLevel ?? 1

  return level >= (filters.minimumLevel ?? 1) && level <= (filters.maximumLevel ?? MAX_UNLOCK_LEVEL)
}

function matchesStatus(entry: ScrapbookEntry, status: ScrapbookStatus) {
  switch (status) {
    case 'missing':
      return !entry.collected
    case 'collected':
      return entry.collected
    case 'marked':
      return entry.marked
    case 'all':
      return true
  }
}

export function createScrapbookKinds(player: PlayerModel, book: ScrapbookBook, marked: string[]): ScrapbookKind[] {
  const source: ScrapbookSource = {
    book,
    bits: (book === 'items' ? player.Scrapbook : player.ScrapbookLegendary) ?? [],
    marked: new Set(marked)
  }

  if (book === 'legendaries') {
    return LEGENDARY_KINDS.map(([itemClass, type]) => createKind(source, itemClass, type))
  }

  return CLASS_KINDS.flatMap(([itemClass, types]) => types.map((type) => createKind(source, itemClass, type)))
}

export function filterScrapbookKinds(kinds: ScrapbookKind[], filters: ScrapbookFilters) {
  const filtered = kinds.map((kind) => {
    const groups = kind.groups.map((group) => {
      const entries = group.entries.filter((entry) => matchesFilters(entry, filters))

      return { ...createGroup(group.key, entries), entries: entries.filter((entry) => matchesStatus(entry, filters.status)) }
    })

    return {
      ...kind,
      groups: groups.filter((group) => group.entries.length > 0),
      collected: sum(groups.map((group) => group.collected)),
      total: sum(groups.map((group) => group.total))
    }
  })

  return {
    kinds: filtered.filter((kind) => kind.groups.length > 0),
    collected: sum(filtered.map((kind) => kind.collected)),
    total: sum(filtered.map((kind) => kind.total))
  }
}

export function countScrapbookItemClasses(kinds: ScrapbookKind[]) {
  const counts: Record<number, number> = {}

  for (const kind of kinds) {
    counts[kind.itemClass] = (counts[kind.itemClass] ?? 0) + sum(kind.groups.map((group) => group.entries.length))
  }

  return counts
}
