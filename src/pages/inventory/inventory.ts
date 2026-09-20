import { formatSpacedNumber } from '@utils/formatting'
import { globalLocalize } from '@utils/localization'
import { ItemModel } from '~/core/models/item'
import { type PlayerModel } from '~/core/models/player'
import { ModelUtils } from '~/core/models/utils'
import { type BlacksmithResources } from '~/data/types'
import { Loca } from '~/playa/items'
import { ASSASSIN, BATTLEMAGE, WARRIOR } from '~/sim/base'

export type InventoryPlayer = PlayerModel

export type CharacterIndex = 0 | 1 | 2 | 3

export type InventoryEntry = {
  id: number
  item: ItemModel
}

export type InventoryList = 'backpack' | 'chest' | 'player' | 'bert' | 'mark' | 'kunigunde' | 'shops' | 'dummy'

export type Transmog = BlacksmithResources & {
  item: ItemModel
}

export type ResourceEntry = InventoryEntry & {
  transmog: Transmog | null
}

export type ResourceList = 'storage' | 'player' | 'bert' | 'mark' | 'kunigunde' | 'dummy'

export type ItemAttributeRow = {
  type: number
  value: number
  base: number
  upgrades: number
  gem: number
}

export type ComparisonColor = 'green' | 'orange' | 'red'

export type ComparisonLine = {
  value: string
  label: string
  color: ComparisonColor
}

export type StatsLine = {
  value: number
  label: string
  warn?: boolean
}

export type CharacterStats = {
  level: number
  runes: Record<string, number>
  strength: number
  dexterity: number
  intelligence: number
  constitution: number
  luck: number
  health: number
  armor: number
  rangeMin: number
  rangeMax: number
  rangeAverage: number
  reduction: number
  critical: number
  damageMin: number
  damageMax: number
  damageAverage: number
}

type StatKey = Exclude<keyof CharacterStats, 'level' | 'runes'>

const COMPANIONS = ['Bert', 'Mark', 'Kunigunde'] as const

const ITEM_ATTRIBUTES = ['Strength', 'Dexterity', 'Intelligence', 'Constitution', 'Luck'] as const

const STAT_ATTRIBUTES = ['strength', 'dexterity', 'intelligence', 'constitution', 'luck'] as const

const PET_HABITATS = ['Water', 'Light', 'Earth', 'Shadow', 'Fire'] as const

const STAT_LABEL_KEYS: Record<StatKey, string> = {
  strength: 'general.attribute1',
  dexterity: 'general.attribute2',
  intelligence: 'general.attribute3',
  constitution: 'general.attribute4',
  luck: 'general.attribute5',
  health: 'inventory.stat.health',
  armor: 'inventory.stat.armor',
  reduction: 'inventory.stat.reduction',
  rangeMin: 'inventory.stat.range_min',
  rangeMax: 'inventory.stat.range_max',
  rangeAverage: 'inventory.stat.range_average',
  critical: 'inventory.stat.critical',
  damageMin: 'inventory.stat.damage_min',
  damageMax: 'inventory.stat.damage_max',
  damageAverage: 'inventory.stat.damage_average'
}

const COMPARISON_GROUPS: StatKey[][] = [
  ['strength', 'dexterity', 'intelligence', 'constitution', 'luck'],
  ['health', 'armor', 'reduction'],
  ['rangeMin', 'rangeMax', 'rangeAverage', 'critical'],
  ['damageMin', 'damageMax', 'damageAverage']
]

const RUNE_GROUPS: [field: string, type: number][][] = [
  [
    ['Gold', 1],
    ['XP', 4],
    ['Health', 5]
  ],
  [
    ['Chance', 2],
    ['Quality', 3]
  ],
  [
    ['ResistanceFire', 6],
    ['ResistanceCold', 7],
    ['ResistanceLightning', 8]
  ],
  [
    ['DamageFire', 10],
    ['DamageCold', 11],
    ['DamageLightning', 12]
  ]
]

export function getItemName(item: ItemModel) {
  return Loca.name(item.Type, item.Index, item.Class)
}

function isEquipment(item: ItemModel) {
  return item.Type >= 1 && item.Type <= 10
}

export function createInventoryEntries(player: InventoryPlayer): Record<InventoryList, InventoryEntry[]> {
  let id = 0

  function createEntries(items: ItemModel[] | Record<string, ItemModel>) {
    return Object.values(items)
      .filter(isEquipment)
      .map((item) => ({ id: id++, item }))
  }

  return {
    backpack: createEntries(player.Inventory.Backpack),
    chest: createEntries(player.Inventory.Chest),
    player: createEntries(player.Items),
    bert: createEntries(player.Inventory.Bert),
    mark: createEntries(player.Inventory.Mark),
    kunigunde: createEntries(player.Inventory.Kunigunde),
    shops: createEntries(player.Inventory.Shop),
    dummy: createEntries(player.Inventory.Dummy)
  }
}

export function createResourceEntries(player: InventoryPlayer): Record<ResourceList, ResourceEntry[]> {
  let id = 0

  function createEntries(...lists: (ItemModel[] | Record<string, ItemModel>)[]) {
    return lists
      .flatMap((items) => Object.values(items))
      .filter(isEquipment)
      .map((item) => ({ id: id++, item, transmog: getTransmog(item) }))
  }

  return {
    storage: createEntries(player.Inventory.Backpack, player.Inventory.Chest),
    player: createEntries(player.Items),
    bert: createEntries(player.Inventory.Bert),
    mark: createEntries(player.Inventory.Mark),
    kunigunde: createEntries(player.Inventory.Kunigunde),
    dummy: createEntries(player.Inventory.Dummy)
  }
}

function getTransmog(item: ItemModel): Transmog | null {
  if (item.Index < 50) return null

  const clone = item.clone()
  clone.upgradeTo(0)

  const price = item.getDismantlePrice()

  let bestIndex = item.Index
  let bestPrice = item.getDismantlePrice()

  clone.setPic(50)

  // A missing translation comes back as its key
  while (!getItemName(clone).startsWith('items.')) {
    const candidate = clone.getDismantlePrice()

    if (candidate.Crystal > bestPrice.Crystal) {
      bestIndex = clone.Index
      bestPrice = candidate
    }

    clone.setPic(clone.Index + 1)
  }

  if (bestPrice.Crystal === price.Crystal) return null

  clone.setPic(bestIndex)

  return {
    item: clone,
    Metal: bestPrice.Metal - price.Metal,
    Crystal: bestPrice.Crystal - price.Crystal
  }
}

export function getItemAttributes(item: ItemModel, primaryType: number): ItemAttributeRow[] {
  return ITEM_ATTRIBUTES.map((name) => item[name])
    .filter((attribute) => attribute.Value)
    .map((attribute) => {
      const base = Math.trunc(attribute.Value * Math.pow(1 / 1.03, item.Upgrades))

      return {
        type: attribute.Type,
        value: attribute.Value,
        base,
        upgrades: attribute.Value - base,
        gem: item.GemType === attribute.Type || item.GemType === 6 || (item.GemType === 7 && attribute.Type === 4) || (item.GemType === 7 && attribute.Type === primaryType) ? item.GemValue : 0
      }
    })
}

function getCharacter(player: InventoryPlayer, index: CharacterIndex): PlayerModel {
  return (index > 0 ? player.Companions?.[COMPANIONS[index - 1]] : undefined) ?? player
}

function getHealth(character: PlayerModel, index: CharacterIndex, constitution: number, healthRune: number) {
  const potionMultiplier = 1 + (character.Potions.Life ?? 0) / 100
  const dungeonMultiplier = 1 + character.Dungeons.Player / 100 + (index === 1 ? 0.33 : 0)
  const levelMultiplier = character.Level + 1

  return Math.ceil(Math.ceil(Math.ceil(Math.ceil(Math.ceil(constitution * levelMultiplier) * character.Config.HealthMultiplier) * dungeonMultiplier) * potionMultiplier) * (1 + healthRune / 100))
}

export function getCharacterStats(player: InventoryPlayer, index: CharacterIndex): CharacterStats {
  const character = getCharacter(player, index)

  const luck = character.Luck.Total
  const constitution = character.Constitution.Total

  const rangeMin = character.Damage.Min
  const rangeMax = character.Damage.Max

  const damageMultiplier = (1 + character.Primary.Total / 10) * (1 + character.Dungeons.Group / 100) * (1 + character.Runes.Damage / 100)

  const damageMin = Math.floor(rangeMin * damageMultiplier)
  const damageMax = Math.ceil(rangeMax * damageMultiplier)

  return {
    level: character.Level,
    runes: character.Runes,
    strength: character.Strength.Total,
    dexterity: character.Dexterity.Total,
    intelligence: character.Intelligence.Total,
    constitution,
    luck,
    health: getHealth(character, index, constitution, character.Runes.Health),
    armor: character.Armor,
    rangeMin,
    rangeMax,
    rangeAverage: Math.ceil((rangeMin + rangeMax) / 2),
    reduction: Math.ceil(Math.min(666, character.Armor / character.Config.MaximumDamageReduction)),
    critical: Math.ceil(Math.min(666, luck / 20)),
    damageMin,
    damageMax,
    damageAverage: Math.ceil((damageMin + damageMax) / 2)
  }
}

function getRealGemValue(character: PlayerModel, item: ItemModel, type: number) {
  if (item.GemType === type || item.GemType === 6 || (item.GemType === 7 && type === character.Primary.Type) || (item.GemType === 7 && type === 4)) {
    if (character.Class !== WARRIOR && character.Class !== ASSASSIN && item.Type === 1) {
      return item.GemValue * 2
    } else {
      return item.GemValue
    }
  } else {
    return 0
  }
}

function getComparedStats(stats: CharacterStats, player: InventoryPlayer, index: CharacterIndex, base: ItemModel, compared: ItemModel, ignoreGems: boolean, ignoreUpgrades: boolean) {
  const item = ModelUtils.morphItemForCharacter(player.Class, index, compared)
  const character = getCharacter(player, index)

  const reference = { ...stats }

  const petBonuses = PET_HABITATS.map((habitat) => character.Pets[habitat])
  const attributes = ITEM_ATTRIBUTES.map((name) => character[name])
  const itemValues = ITEM_ATTRIBUTES.map((name) => item[name].Value)
  const baseValues = ITEM_ATTRIBUTES.map((name) => base[name].Value)

  if (ignoreUpgrades) {
    const itemScale = 1 / Math.pow(1.03, item.Upgrades)
    const baseScale = 1 / Math.pow(1.03, base.Upgrades)

    for (let i = 0; i < 5; i++) {
      itemValues[i] *= itemScale
      baseValues[i] *= baseScale
    }
  }

  const attributeDifferences: number[] = []
  const gemDifferences: number[] = []

  for (let i = 0; i < 5; i++) {
    const potionMultiplier = 1 + (attributes[i].PotionSize ?? 0) / 100
    const petMultiplier = 1 + petBonuses[i] / 100
    const classMultiplier = character.ClassBonus ? 1.11 : 1
    const gemMultiplier = character.Class === BATTLEMAGE ? 1.11 : 1

    attributeDifferences[i] = Math.ceil(Math.ceil(Math.ceil(itemValues[i] * potionMultiplier) * petMultiplier) * classMultiplier) - Math.ceil(Math.ceil(Math.ceil(baseValues[i] * potionMultiplier) * petMultiplier) * classMultiplier)
    gemDifferences[i] = Math.ceil(Math.ceil(Math.ceil(getRealGemValue(character, item, i + 1) * potionMultiplier) * petMultiplier) * gemMultiplier) - Math.ceil(Math.ceil(Math.ceil(getRealGemValue(character, base, i + 1) * potionMultiplier) * petMultiplier) * gemMultiplier)
  }

  const [strength, dexterity, intelligence, constitution, luck] = STAT_ATTRIBUTES.map((key, i) => reference[key] + attributeDifferences[i] + (ignoreGems ? 0 : gemDifferences[i]))

  let rangeMin = reference.rangeMin
  let rangeMax = reference.rangeMax
  let rangeAverage = reference.rangeAverage
  let armor = character.Armor + item.Armor - base.Armor

  if (item.Type === 1) {
    rangeMin = item.DamageMin
    rangeMax = item.DamageMax
    rangeAverage = Math.ceil((item.DamageMin + item.DamageMax) / 2)
    armor = character.Armor

    const baseMultiplier = (1 + character.Primary.Total / 10) * (1 + character.Dungeons.Group / 100) * (1 + (base.getRune(10) + base.getRune(11) + base.getRune(12)) / 100)

    reference.rangeMin = base.DamageMin
    reference.rangeMax = base.DamageMax
    reference.rangeAverage = Math.ceil((base.DamageMin + base.DamageMax) / 2)
    reference.damageMin = Math.floor(base.DamageMin * baseMultiplier)
    reference.damageMax = Math.ceil(base.DamageMax * baseMultiplier)
    reference.damageAverage = Math.ceil((reference.damageMin + reference.damageMax) / 2)
  }

  const primaryIndex = character.Primary.Type - 1
  const primaryTotal = attributes[primaryIndex].Total + attributeDifferences[primaryIndex] + (ignoreGems ? 0 : gemDifferences[primaryIndex])
  const damageRune = item.Type === 1 ? item.getRune(10) + item.getRune(11) + item.getRune(12) : character.Runes.Damage
  const damageMultiplier = (1 + character.Dungeons.Group / 100) * (1 + damageRune / 100)

  const damageMin = Math.floor(rangeMin * damageMultiplier * (1 + primaryTotal / 10))
  const damageMax = Math.ceil(rangeMax * damageMultiplier * (1 + primaryTotal / 10))

  const result: CharacterStats = {
    ...reference,
    strength,
    dexterity,
    intelligence,
    constitution,
    luck,
    health: getHealth(character, index, constitution, character.Runes.Health + item.getRune(5) - base.getRune(5)),
    armor,
    rangeMin,
    rangeMax,
    rangeAverage,
    reduction: Math.ceil(Math.min(666, armor / character.Config.MaximumDamageReduction)),
    critical: Math.ceil(Math.min(666, luck / 20)),
    damageMin,
    damageMax,
    damageAverage: Math.ceil((damageMin + damageMax) / 2)
  }

  return { reference, result }
}

function getCompareLine(value: number, reference: number, label: string): ComparisonLine[] {
  const difference = value - reference

  if (Math.trunc(difference) === 0) return []

  return [
    {
      value: `${difference > 0 ? '+' : '-'} ${formatSpacedNumber(Math.abs(difference))}`,
      label,
      color: difference > 0 ? 'green' : difference / reference >= -0.025 ? 'orange' : 'red'
    }
  ]
}

function getCompareRuneLine(base: ItemModel, item: ItemModel): ComparisonLine[] {
  const label = globalLocalize(`general.rune${item.RuneType}`)

  if (base.HasRune && item.HasRune && base.RuneType === item.RuneType) {
    return [{ value: `+ ${item.RuneValue - base.RuneValue}%`, label, color: 'green' }]
  } else if (!base.HasRune && item.HasRune) {
    return [{ value: `+ ${item.RuneValue}%`, label, color: 'green' }]
  } else if (base.HasRune && item.HasRune && base.RuneType !== item.RuneType) {
    return [{ value: `+ ${item.RuneValue}%`, label, color: 'orange' }]
  } else if (base.HasRune && !item.HasRune) {
    return [{ value: '', label: globalLocalize('inventory.comparison.no_rune'), color: 'red' }]
  } else {
    return []
  }
}

function getCompareSocketLine(base: ItemModel, item: ItemModel): ComparisonLine[] {
  const label = globalLocalize(`general.gem${item.GemType}`)

  if (base.HasGem && item.HasGem && (item.GemType !== base.GemType || item.GemValue !== base.GemValue)) {
    if (item.GemType !== base.GemType) {
      return [{ value: `+ ${item.GemValue}`, label, color: 'orange' }]
    } else if (item.GemValue > base.GemValue) {
      return [{ value: `+ ${item.GemValue - base.GemValue}`, label, color: 'green' }]
    } else {
      return [{ value: `- ${Math.abs(item.GemValue - base.GemValue)}`, label, color: 'red' }]
    }
  } else if (base.HasSocket && !item.HasSocket) {
    return [{ value: '', label: globalLocalize('inventory.comparison.no_socket'), color: 'red' }]
  } else if (!base.HasSocket && item.HasSocket) {
    if (item.HasGem) {
      return [{ value: `+ ${item.GemValue}`, label, color: 'green' }]
    } else {
      return [{ value: '', label: globalLocalize('inventory.comparison.empty_socket'), color: 'green' }]
    }
  } else if (base.HasSocket && item.HasSocket) {
    return [{ value: '', label: globalLocalize('inventory.comparison.empty_socket'), color: 'orange' }]
  } else {
    return []
  }
}

export function getComparisonGroups(stats: CharacterStats, player: InventoryPlayer, index: CharacterIndex, base: ItemModel, item: ItemModel, ignoreGems: boolean, ignoreUpgrades: boolean) {
  const { reference, result } = getComparedStats(stats, player, index, base, item, ignoreGems, ignoreUpgrades)

  return [...COMPARISON_GROUPS.map((keys) => keys.flatMap((key) => getCompareLine(result[key], reference[key], globalLocalize(STAT_LABEL_KEYS[key])))), [...getCompareRuneLine(base, item), ...getCompareSocketLine(base, item)]].filter((lines) => lines.length > 0)
}

export function getStatsGroups(stats: CharacterStats): StatsLine[][] {
  const line = (key: StatKey, warn?: boolean): StatsLine => ({ value: stats[key], label: globalLocalize(STAT_LABEL_KEYS[key]), warn })

  const runeGroups = RUNE_GROUPS.map((fields) => fields.filter(([field]) => stats.runes[field]).map(([field, type]) => ({ value: stats.runes[field], label: globalLocalize(`general.rune${type}`) })))

  return [
    [{ value: stats.level, label: globalLocalize('general.level') }],
    [line('strength'), line('dexterity'), line('intelligence'), line('constitution'), line('luck')],
    [line('health'), line('armor'), line('reduction', stats.reduction < stats.level)],
    [line('rangeMin'), line('rangeMax'), line('rangeAverage'), line('critical', stats.critical < stats.level)],
    [line('damageMin'), line('damageMax'), line('damageAverage')],
    ...runeGroups.filter((lines) => lines.length > 0)
  ]
}
