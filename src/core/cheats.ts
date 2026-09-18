import { compact, scaleValue } from '@utils/utils'
import { ItemModel } from './models/item'
import { CompanionModel, PlayerModel, type EquipmentSlot } from './models/player'

export type Cheats = {
  enchantments: boolean
  runes: boolean
  pets: boolean
  strength: boolean
  dexterity: boolean
  intelligence: boolean
  constitution: boolean
  luck: boolean
  life: boolean
  // 0 keeps the original class
  class: CharacterClass | 0
}

// Index + 1 is the potion type
const POTIONS = ['strength', 'dexterity', 'intelligence', 'constitution', 'luck', 'life'] as const

function forEachModel(player: PlayerModel, callback: (model: PlayerModel) => void) {
  const models = [player]

  if (player.Companions) {
    models.push(...Object.values(player.Companions))
  }

  models.forEach(callback)
}

export function changePlayerClass(player: PlayerModel, newClass: CharacterClass) {
  const oldDefinition = CONFIG.fromID(player.Class)
  const newDefinition = CONFIG.fromID(newClass)

  const oldAttributes = PlayerModel.ATTRIBUTE_ORDER_BY_ATTRIBUTE[oldDefinition.Attribute].map((attribute) => ({ Base: player[attribute].Base, Total: player[attribute].Total }))
  const newAttributes = PlayerModel.ATTRIBUTE_ORDER_BY_ATTRIBUTE[newDefinition.Attribute]

  newAttributes.forEach((attribute, index) => {
    player[attribute].Base = oldAttributes[index].Base
    player[attribute].Total = oldAttributes[index].Total
  })

  player.Armor = scaleValue(player.Armor, oldDefinition.MaximumDamageReduction, newDefinition.MaximumDamageReduction)
  player.Items.Wpn1.DamageMin = scaleValue(player.Items.Wpn1.DamageMin, oldDefinition.WeaponMultiplier, newDefinition.WeaponMultiplier)
  player.Items.Wpn1.DamageMax = scaleValue(player.Items.Wpn1.DamageMax, oldDefinition.WeaponMultiplier, newDefinition.WeaponMultiplier)

  if (newClass === WARRIOR) {
    player.Items.Wpn2 = ItemModel.empty()
    player.Items.Wpn2.DamageMin = newDefinition.SkipChance * 100
    player.BlockChance = newDefinition.SkipChance * 100
  } else if (newClass === ASSASSIN) {
    player.Items.Wpn2 = player.Items.Wpn1
  }

  player.Class = newClass
}

export function applyCheats(player: PlayerModel, cheats: Cheats) {
  if (cheats.pets) {
    forEachModel(player, (model) => {
      model.Pets = {
        Water: 40,
        Light: 40,
        Earth: 40,
        Shadow: 40,
        Fire: 40
      }
    })
  }

  if (cheats.enchantments) {
    forEachModel(player, (model) => {
      for (const item of Object.values(model.Items)) {
        item.HasEnchantment = true
      }
    })
  }

  // A player can only drink 3 potions
  const potions = compact(POTIONS.map((type, index) => (cheats[type] ? index + 1 : null)))

  if (potions.length > 0) {
    forEachModel(player, (model) => {
      const potionGroup = potions.slice(0, 3)

      model.Potions = Object.assign(
        potionGroup.map((type) => ({ Type: type, Size: 25 })),
        { Life: potionGroup.includes(6) ? 25 : 0 }
      )
    })
  }

  if (cheats.class) {
    const oldType = PlayerModel.ATTRIBUTE_TO_TYPE[CONFIG.fromID(player.Class).Attribute]
    const newType = PlayerModel.ATTRIBUTE_TO_TYPE[CONFIG.fromID(cheats.class).Attribute]

    for (const [slot, item] of Object.entries(player.Items)) {
      player.Items[slot as EquipmentSlot] = item.morph(oldType, newType, true)
    }

    changePlayerClass(player, cheats.class)
  }

  if (potions.length > 0 || cheats.pets || cheats.class) {
    forEachModel(player, (model) => {
      // Makes evaluateCommon calculate the bonus again
      for (const attribute of PlayerModel.ATTRIBUTES) {
        model[attribute].Bonus = undefined
      }

      if (model instanceof CompanionModel) {
        model.evaluateCommon(player)
      } else {
        model.evaluateCommon()
      }
    })
  }

  if (cheats.runes) {
    forEachModel(player, (model) => {
      model.Runes.Health = 15
      model.Runes.ResistanceFire = 75
      model.Runes.ResistanceCold = 75
      model.Runes.ResistanceLightning = 75
      model.Items.Wpn1.Attributes[2] = 60

      if (model.Items.Wpn2) {
        model.Items.Wpn2.Attributes[2] = 60
      }
    })
  }

  return player
}
