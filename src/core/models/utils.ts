import { type RawGroup, type RawPlayer } from '~/data/types'
import { ASSASSIN, BARD, BATTLEMAGE, CONFIG, DEMONHUNTER, DRUID, MAGE, PLAGUEDOCTOR, SCOUT, WARRIOR } from '~/sim/base'
import { type ItemModel } from './item'
import { type PlayerModel } from './player'

type PowerEstimateModel = Record<MainAttribute | 'Constitution', { Total: number }> & {
  Class: CharacterClass
  Level: number
  Damage?: { Min: number; Max: number }
  Damage2?: { Min: number; Max: number }
  Items: {
    Wpn1: { DamageMin: number; DamageMax: number }
    Wpn2?: { DamageMin: number; DamageMax: number }
  }
}

type SimulatorWeaponData = {
  AttributeTypes: { 2: number }
  Attributes: { 2: number }
  DamageMax: number
  DamageMin: number
  HasEnchantment: boolean
}

export type SimulatorData = {
  Armor: number
  Class: CharacterClass
  Name: string
  Level: number
  Identifier: string
  Prefix: string
  BlockChance: number | undefined
  Constitution: { Total: number }
  Dexterity: { Total: number }
  Dungeons: { Player: number; Group: number }
  Fortress: { Gladiator: number }
  Intelligence: { Total: number }
  Strength: { Total: number }
  Potions: { Life: number }
  Luck: { Total: number }
  Runes: {
    Health: number
    ResistanceCold: number
    ResistanceFire: number
    ResistanceLightning: number
  }
  Items: {
    Hand: { HasEnchantment: boolean }
    Wpn1: SimulatorWeaponData
    Wpn2: SimulatorWeaponData
  }
}

const CONVERT_OTHER_GROUP_FIELDS = ['prefix', 'timestamp', 'offset', 'name', 'rank', 'names', 'identifier', 'group', 'save'] as const
const CONVERT_OTHER_PLAYER_FIELDS = ['prefix', 'timestamp', 'offset', 'name', 'identifier', 'class', 'groupname', 'units', 'fortressrank', 'group', 'version', 'equippedItems', 'potions', 'saveVersion'] as const

const OTHER_PLAYER_SAVE_LENGTH = 261
const CONVERT_PLAYER_SAVE = [
  1,
  2,
  7,
  8,
  9,
  10,
  11,
  null,
  // Face data
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
  // Class data
  27,
  28,
  29,
  // Attributes
  30,
  31,
  32,
  33,
  34,
  35,
  36,
  37,
  38,
  39,
  null,
  null,
  null,
  null,
  null,
  // Actions
  null,
  null,
  null,
  // Items
  48,
  49,
  50,
  51,
  52,
  53,
  54,
  55,
  56,
  57,
  58,
  59,
  60,
  61,
  62,
  63,
  64,
  65,
  66,
  67,
  68,
  69,
  70,
  71,
  72,
  73,
  74,
  75,
  76,
  77,
  78,
  79,
  80,
  81,
  82,
  83,
  84,
  85,
  86,
  87,
  88,
  89,
  90,
  91,
  92,
  93,
  94,
  95,
  96,
  97,
  98,
  99,
  100,
  101,
  102,
  103,
  104,
  105,
  106,
  107,
  108,
  109,
  110,
  111,
  112,
  113,
  114,
  115,
  116,
  117,
  118,
  119,
  120,
  121,
  122,
  123,
  124,
  125,
  126,
  127,
  128,
  129,
  130,
  131,
  132,
  133,
  134,
  135,
  136,
  137,
  138,
  139,
  140,
  141,
  142,
  143,
  144,
  145,
  146,
  147,
  148,
  149,
  150,
  151,
  152,
  153,
  154,
  155,
  156,
  157,
  158,
  159,
  160,
  161,
  162,
  163,
  164,
  165,
  166,
  167,
  // Mount & Tower & Raids & Group
  286,
  433,
  435,
  null,
  // Scrapbook
  438,
  // Dungeons
  null,
  null,
  // Group
  443,
  // Special flags
  444,
  // Armor & Damage
  447,
  448,
  449,
  // Skips
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  // Skips - dungeons
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  // Potions
  493,
  494,
  495,
  null,
  null,
  null,
  499,
  500,
  501,
  502,
  // Flags
  517,
  521,
  null,
  null,
  // Fortress
  524,
  525,
  526,
  527,
  528,
  529,
  530,
  531,
  532,
  533,
  534,
  535,
  // Skip
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  // Upgrades & Honor
  581,
  582,
  null,
  null,
  null,
  // Group & Player dungeons
  445
]

export class ModelUtils {
  static estimatePower(model: PowerEstimateModel) {
    const config = CONFIG.fromID(model.Class)
    const base = (model[config.Attribute].Total * model.Constitution.Total * model.Level) / config.WeaponMultiplier

    if (model.Class === ASSASSIN) {
      return (base * (Math.max(model.Damage?.Min || 0, model.Items.Wpn1.DamageMin) + Math.max(model.Damage?.Max || 0, model.Items.Wpn1.DamageMax) + Math.max(model.Damage2?.Min || 0, model.Items.Wpn2?.DamageMin || 0) + Math.max(model.Damage2?.Max || 0, model.Items.Wpn2?.DamageMax || 0))) / 4
    } else {
      return (base * (Math.max(model.Damage?.Min || 0, model.Items.Wpn1.DamageMin) + Math.max(model.Damage?.Max || 0, model.Items.Wpn1.DamageMax))) / 2
    }
  }

  static toSimulatorData(model: PlayerModel | SimulatorData): SimulatorData
  static toSimulatorData(model: PlayerModel, includeCompanions: boolean): SimulatorData | SimulatorData[]
  static toSimulatorData(model: PlayerModel | SimulatorData, includeCompanions = false) {
    if (includeCompanions && 'Companions' in model && typeof model.Companions !== 'undefined') {
      return [this.#toSimulatorData(model), this.#toSimulatorData(model.Companions.Bert), this.#toSimulatorData(model.Companions.Mark), this.#toSimulatorData(model.Companions.Kunigunde)]
    } else {
      return this.#toSimulatorData(model)
    }
  }

  static toOtherGroup(group: RawGroup) {
    const copy: Record<string, unknown> = {
      own: 0
    }

    for (const field of CONVERT_OTHER_GROUP_FIELDS) {
      copy[field] = group[field]
    }

    return copy as RawGroup
  }

  static toOtherPlayer(player: RawPlayer) {
    const copy: Record<string, unknown> = {
      own: 0
    }

    for (const field of CONVERT_OTHER_PLAYER_FIELDS) {
      copy[field] = player[field]
    }

    if (player.pets) {
      copy.pets = [0, ...player.pets.slice(104, 109)]
    }

    if (player.saveVersion === 2) {
      copy.save = [...player.save]
    } else {
      copy.save = CONVERT_PLAYER_SAVE.reduce<number[]>(
        (memo, sourceIndex, targetIndex) => {
          if (sourceIndex !== null) {
            memo[targetIndex] = player.save[sourceIndex]
          }

          return memo
        },
        Array.from<number>({ length: OTHER_PLAYER_SAVE_LENGTH }).fill(0)
      )
    }

    copy.fortressrank = copy.fortressrank || player.save[583]

    return copy as RawPlayer
  }

  static morphItemForCharacter(playerClass: CharacterClass, index: number, item: ItemModel) {
    if (index === 1) {
      if (playerClass === ASSASSIN && item.Class === WARRIOR && item.Type === 1) {
        // Assassin weapons -> Dexterity into Strength
        return item.morph(2, 1)
      } else if (playerClass === DEMONHUNTER && item.Class === WARRIOR && item.Type > 1) {
        // DemonHunter equipment -> Dexterity into Strenght
        return item.morph(2, 1)
      } else if (playerClass === PLAGUEDOCTOR && item.Class === WARRIOR && item.Type === 1) {
        // When player is Plague Doctor and it's Warrior equipment -> Dexterity into Strength
        return item.morph(2, 1)
      }
    } else if (index === 2) {
      if (playerClass === BATTLEMAGE && item.Class === MAGE && item.Type > 1) {
        // BattleMage equipment -> Strength into Intelligence
        return item.morph(1, 3)
      } else if (playerClass === PLAGUEDOCTOR && item.Class === MAGE && item.Type > 1) {
        // When player is Plague Doctor and it's Mage equipment -> Dexterity into Intelligence
        return item.morph(2, 3)
      }
    } else if (index === 3) {
      if (playerClass === DRUID && item.Class === SCOUT && item.Type > 1) {
        // Druid equipment -> Intelligence into Dexterity
        return item.morph(3, 2)
      } else if (playerClass === BARD && item.Class === SCOUT && item.Type > 1) {
        // Bard equipment -> Intelligence into Dexterity
        return item.morph(3, 2)
      }
    } else if (playerClass === BATTLEMAGE && item.Class === MAGE && item.Type > 1) {
      // BattleMage equipment -> Intelligence to Strength
      return item.morph(3, 1)
    } else if (playerClass === ASSASSIN && item.Class === WARRIOR && item.Type === 1) {
      // Assassin weapons -> Strength to Dexterity
      return item.morph(1, 2)
    } else if (playerClass === DEMONHUNTER && item.Class === WARRIOR && item.Type > 1) {
      // DemonHunter equipment -> Strength to Dexterity
      return item.morph(1, 2)
    } else if (playerClass === DRUID && item.Class === SCOUT && item.Type > 1) {
      // Druid equipment -> Dexterity to Intelligence
      return item.morph(2, 3)
    } else if (playerClass === BARD && item.Class === SCOUT && item.Type > 1) {
      // Bard equipment -> Dexterity to Intelligence
      return item.morph(2, 3)
    }

    return item
  }

  static #toSimulatorData(model: PlayerModel | SimulatorData): SimulatorData {
    return {
      Armor: model.Armor,
      Class: model.Class,
      Name: model.Name,
      Level: model.Level,
      Identifier: model.Identifier,
      Prefix: model.Prefix,
      BlockChance: model.BlockChance,
      Constitution: {
        Total: model.Constitution?.Total ?? 0
      },
      Dexterity: {
        Total: model.Dexterity?.Total ?? 0
      },
      Dungeons: {
        Player: model.Dungeons?.Player ?? 0,
        Group: model.Dungeons?.Group ?? 0
      },
      Fortress: {
        Gladiator: model.Fortress?.Gladiator ?? 0
      },
      Intelligence: {
        Total: model.Intelligence?.Total ?? 0
      },
      Strength: {
        Total: model.Strength?.Total ?? 0
      },
      Potions: {
        Life: model.Potions?.Life ?? 0
      },
      Luck: {
        Total: model.Luck?.Total ?? 0
      },
      Runes: {
        Health: model.Runes?.Health ?? 0,
        ResistanceCold: model.Runes?.ResistanceCold ?? 0,
        ResistanceFire: model.Runes?.ResistanceFire ?? 0,
        ResistanceLightning: model.Runes?.ResistanceLightning ?? 0
      },
      Items: {
        Hand: {
          HasEnchantment: model.Items?.Hand?.HasEnchantment ?? false
        },
        Wpn1: {
          AttributeTypes: {
            2: model.Items?.Wpn1?.AttributeTypes?.[2] ?? 0
          },
          Attributes: {
            2: model.Items?.Wpn1?.Attributes?.[2] ?? 0
          },
          DamageMax: model.Items?.Wpn1?.DamageMax ?? 0,
          DamageMin: model.Items?.Wpn1?.DamageMin ?? 0,
          HasEnchantment: model.Items?.Wpn1?.HasEnchantment ?? false
        },
        Wpn2: {
          AttributeTypes: {
            2: model.Items?.Wpn2?.AttributeTypes?.[2] ?? 0
          },
          Attributes: {
            2: model.Items?.Wpn2?.Attributes?.[2] ?? 0
          },
          DamageMax: model.Items?.Wpn2?.DamageMax ?? 0,
          DamageMin: model.Items?.Wpn2?.DamageMin ?? 0,
          HasEnchantment: model.Items?.Wpn2?.HasEnchantment ?? false
        }
      }
    }
  }
}
