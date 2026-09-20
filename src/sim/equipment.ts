import { type ItemModel } from '~/core/models/item'
import { CompanionModel, PlayerModel, type AnyEquipmentSlot, type PetHabitat } from '~/core/models/player'
import { ModelUtils } from '~/core/models/utils'
import { ASSASSIN } from './base'

export type EquipmentPool = 'backpack' | 'chest' | 'shop' | 'dummy'

export type EquipmentCandidate = {
  id: string
  pool: EquipmentPool
  item: ItemModel
}

export type ItemEdit = {
  id?: string
  takeOver?: boolean
  upgrades?: number
  rune?: { type: number; value: number }
  gem?: { type: number; value: number }
  enchantment?: boolean
}

export type EquipmentSwaps = Partial<Record<AnyEquipmentSlot, ItemEdit>>

export type CharacterPotion = {
  type: number
  size: number
}

export type CharacterState = {
  pets: Record<PetHabitat, number>
  potions: CharacterPotion[]
}

export const EQUIPMENT_SLOTS: AnyEquipmentSlot[] = ['Head', 'Body', 'Hand', 'Feet', 'Neck', 'Belt', 'Ring', 'Misc', 'Wpn1', 'Wpn2']

export const PET_HABITATS: PetHabitat[] = ['Shadow', 'Light', 'Earth', 'Fire', 'Water']

export const POTION_SLOTS = 3

export const POTION_SIZES = [10, 15, 25]

export const POTION_TYPES = [1, 2, 3, 4, 5, 6]

export const LIFE_POTION_TYPE = 6

export const LIFE_POTION_SIZE = 25

export const MAXIMUM_UPGRADES = 20

// Everything evaluateCommon caps a rune at
export const RUNE_LIMITS: Record<number, number> = {
  31: 50,
  32: 50,
  33: 5,
  34: 10,
  35: 15,
  36: 75,
  37: 75,
  38: 75,
  39: 75,
  40: 60,
  41: 60,
  42: 60
}

export const GEM_TYPES = [1, 2, 3, 4, 5, 6, 7]

export function createCharacterState(character: PlayerModel): CharacterState {
  const potions = (character.Potions ?? []).filter((potion) => potion.Type > 0).map((potion) => ({ type: potion.Type, size: potion.Size }))

  return {
    pets: Object.fromEntries(PET_HABITATS.map((habitat) => [habitat, character.Pets?.[habitat] ?? 0])) as Record<PetHabitat, number>,
    potions: Array.from({ length: POTION_SLOTS }, (_, index) => potions[index] ?? { type: 0, size: 25 })
  }
}

const SLOT_TYPES: Record<AnyEquipmentSlot, number> = {
  Head: 6,
  Body: 3,
  Hand: 5,
  Feet: 4,
  Neck: 8,
  Belt: 7,
  Ring: 9,
  Misc: 10,
  Wpn1: 1,
  Wpn2: 2
}

const LIST_POOLS: Record<'backpack' | 'chest' | 'shop', 'Backpack' | 'Chest' | 'Shop'> = {
  backpack: 'Backpack',
  chest: 'Chest',
  shop: 'Shop'
}

const COMPANION_KEYS = ['Bert', 'Mark', 'Kunigunde'] as const

export function listEquipmentCandidates(source: PlayerModel, slot: AnyEquipmentSlot, character: PlayerModel) {
  const { type, itemClass } = getSlotTarget(character, slot)
  const candidates: EquipmentCandidate[] = []

  if (!source.Inventory) return candidates

  const fits = (item: ItemModel) => item.Type === type && (itemClass === undefined || item.Class === itemClass)

  for (const [pool, key] of Object.entries(LIST_POOLS) as [EquipmentPool, 'Backpack' | 'Chest' | 'Shop'][]) {
    source.Inventory[key].forEach((item, index) => {
      if (fits(item)) {
        candidates.push({ id: `${pool}:${index}`, pool, item })
      }
    })
  }

  for (const [key, item] of Object.entries(source.Inventory.Dummy) as [AnyEquipmentSlot, ItemModel][]) {
    if (fits(item)) {
      candidates.push({ id: `dummy:${key}`, pool: 'dummy', item })
    }
  }

  return candidates
}

// A character wears one item class per slot, the one it already has there, which is also the one its
// attributes are morphed from. An empty slot says nothing, so another item of the same kind answers for it.
function getSlotTarget(character: PlayerModel, slot: AnyEquipmentSlot) {
  const current = character.Items[slot]

  if (current && current.Type > 0) {
    return { type: current.Type, itemClass: current.Class }
  }

  const type = slot === 'Wpn2' && character.Class === ASSASSIN ? SLOT_TYPES.Wpn1 : SLOT_TYPES[slot]

  // Amulets, rings and talismans are the same for every class
  if (type >= 8) {
    return { type, itemClass: 1 }
  }

  const relative = Object.values(character.Items).find((item?: ItemModel) => item && item.Type > 0 && isSameItemKind(type, item.Type))

  return { type, itemClass: relative?.Class }
}

function isSameItemKind(type: number, other: number) {
  return type === 1 ? other === 1 : other > 1 && other < 8
}

export function listEquipmentCharacters(player: PlayerModel) {
  const companions = player.Companions

  return companions ? [player, ...COMPANION_KEYS.map((key) => companions[key])] : [player]
}

export function applyEquipmentSwaps(source: PlayerModel, swaps: EquipmentSwaps[], character?: CharacterState) {
  const player = new PlayerModel(source.Data)
  const characters = listEquipmentCharacters(player)

  const imported = characters.map(readAttributeTotals)

  evaluateCharacters(player, characters)

  const evaluated = characters.map(readAttributeTotals)

  if (character) {
    applyCharacterState(player, characters, character)
  }

  characters.forEach((model, index) => {
    for (const [slot, edit] of Object.entries(swaps[index] ?? {}) as [AnyEquipmentSlot, ItemEdit][]) {
      const current = model.Items[slot]

      if (!current) continue

      const replacement = buildEditedItem(source, player.Class, index, current, edit)

      if (!replacement) continue

      model.Armor += getArmorValue(replacement) - getArmorValue(current)
      model.Items[slot] = replacement
    }
  })

  evaluateCharacters(player, characters)

  characters.forEach((model, index) => {
    PlayerModel.ATTRIBUTES.forEach((attribute, position) => {
      model[attribute].Total = imported[index][position] + (model[attribute].Total - evaluated[index][position])
    })
  })

  return player
}

function applyCharacterState(player: PlayerModel, characters: PlayerModel[], state: CharacterState) {
  const potions = state.potions.filter((potion) => potion.type > 0)

  for (const model of characters) {
    model.Pets = { ...model.Pets, ...state.pets }

    model.Potions = Object.assign(
      potions.map((potion) => ({ Type: potion.type, Size: potion.size })),
      { Life: potions.find((potion) => potion.type === LIFE_POTION_TYPE)?.size ?? 0 }
    )
  }

  // Companions share the player's pets and potions, so the models above must not drift apart
  player.Pets = { ...player.Pets, ...state.pets }
}

function editItem(item: ItemModel, edit: ItemEdit) {
  if (edit.upgrades !== undefined) {
    item.upgradeTo(edit.upgrades)
  }

  if (edit.rune) {
    const value = Math.min(edit.rune.value, RUNE_LIMITS[edit.rune.type] ?? 0)

    item.AttributeTypes[2] = edit.rune.type > 0 ? edit.rune.type : 0
    item.Attributes[2] = edit.rune.type > 0 ? value : 0
    item.HasRune = edit.rune.type > 30
    item.RuneType = Math.max(0, edit.rune.type - 30)
    item.RuneValue = item.HasRune ? value : 0
  }

  if (edit.gem) {
    item.GemType = edit.gem.type
    item.GemValue = edit.gem.type > 0 ? edit.gem.value : 0
    item.HasGem = edit.gem.type > 0
    item.HasSocket = edit.gem.type > 0 || item.HasSocket
  }

  if (edit.enchantment !== undefined) {
    item.HasEnchantment = edit.enchantment
    item.Enchantment = edit.enchantment ? item.Enchantment || 1 : 0
  }
}

export function buildEditedItem(source: PlayerModel, playerClass: CharacterClass, index: number, current: ItemModel, edit: ItemEdit) {
  const candidate = edit.id ? findEquipmentCandidate(source, edit.id) : undefined

  if (edit.id && !candidate) return undefined

  const morphed = candidate ? ModelUtils.morphItemForCharacter(playerClass, index, candidate.clone()) : current.clone()
  const item = candidate && edit.takeOver ? takeOverItem(morphed, current) : morphed

  editItem(item, edit)

  return item
}

function findEquipmentCandidate(source: PlayerModel, id: string) {
  const [pool, key] = id.split(':')

  if (!source.Inventory) return undefined

  if (pool === 'dummy') {
    return source.Inventory.Dummy[key as AnyEquipmentSlot]
  }

  return source.Inventory[LIST_POOLS[pool as 'backpack' | 'chest' | 'shop']]?.[Number(key)]
}

function getArmorValue(item: ItemModel) {
  return item.Type > 1 && item.Type < 8 ? item.Armor : 0
}

function takeOverItem(item: ItemModel, current: ItemModel) {
  item.upgradeTo(current.Upgrades)

  item.GemType = current.GemType
  item.GemValue = current.GemValue
  item.HasGem = current.HasGem
  item.HasSocket = current.HasSocket

  item.Enchantment = current.Enchantment
  item.HasEnchantment = current.HasEnchantment

  item.AttributeTypes[2] = current.AttributeTypes[2]
  item.Attributes[2] = current.Attributes[2]
  item.HasRune = current.HasRune
  item.RuneType = current.RuneType
  item.RuneValue = current.RuneValue

  return item
}

function readAttributeTotals(character: PlayerModel) {
  return PlayerModel.ATTRIBUTES.map((attribute) => character[attribute].Total)
}

function evaluateCharacters(player: PlayerModel, characters: PlayerModel[]) {
  for (const character of characters) {
    for (const attribute of PlayerModel.ATTRIBUTES) {
      character[attribute].Bonus = undefined
    }

    if (character instanceof CompanionModel) {
      character.evaluateCommon(player)
    } else {
      character.evaluateCommon()
    }
  }
}
