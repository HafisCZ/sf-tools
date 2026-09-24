import { formatPrefix } from '@utils/formatting'
import { globalLocalize } from '@utils/localization'
import { chunk, countWhere, isBetween, isEmpty, sliceLength, sortDescending, sum } from '@utils/utils'
import { ComplexDataType } from '~/data/complex-data-type'
import { DungeonHelper, type LegacyDungeons, type PlayerDungeons } from '~/data/dungeon-helper'
import { PlayaResponse } from '~/data/playa-response'
import { type RawPlayer } from '~/data/types'
import { Calculations, RUNE_VALUE } from '~/playa/calculations'
import { ASSASSIN, BARD, BATTLEMAGE, BERSERKER, CONFIG, DEMONHUNTER, DRUID, MAGE, PLAGUEDOCTOR, SCOUT, WARRIOR } from '~/sim/base'
import { type ClassConfig } from '~/sim/types'
import { type GroupMemberActions, type GroupModel } from './group'
import { ItemModel } from './item'

export type AttributeName = 'Strength' | 'Dexterity' | 'Intelligence' | 'Constitution' | 'Luck'

export type PlayerAttribute = {
  Type: number
  Base: number
  Bonus?: number
  Purchased?: number
  Items: number
  Gems: number
  Upgrades: number
  Equipment: number
  ItemsBase: number
  Class: number
  Potion: number
  Pet: number
  PotionIndex: number
  PetBonus: number
  NextCost: number
  TotalCost: number
  PotionSize: number
  Total: number
}

export type EquipmentSlot = 'Head' | 'Body' | 'Hand' | 'Feet' | 'Neck' | 'Belt' | 'Ring' | 'Misc' | 'Wpn1'

export type PlayerItems = Record<EquipmentSlot, ItemModel> & {
  Wpn2?: ItemModel
}

export type AnyEquipmentSlot = keyof PlayerItems

export type PlayerInventory = {
  Backpack: ItemModel[]
  Chest: ItemModel[]
  Shop: ItemModel[]
  Dummy: Partial<PlayerItems>
  Bert: Partial<PlayerItems>
  Mark: Partial<PlayerItems>
  Kunigunde: Partial<PlayerItems>
}

export type PlayerPotion = {
  Type: number
  Size: number
  Expire?: number
}

export type PlayerPotions = PlayerPotion[] & {
  Life?: number
  LifeIndex?: number
}

export type PlayerDamage = {
  Min: number
  Max: number
  Avg: number
}

export type PlayerAction = {
  Status: number
  Index: number
  Finish: number
  Start?: number
}

export type PlayerUpgrade = {
  Building: number
  Finish: number
  Start: number
}

export type PlayerFortress = {
  Fortress: number
  LaborerQuarters: number
  WoodcutterGuild: number
  Quarry: number
  GemMine: number
  Academy: number
  ArcheryGuild: number
  Barracks: number
  MageTower: number
  Treasury: number
  Smithy: number
  Fortifications: number
  Upgrades?: number
  Rank?: number
  Honor?: number
  Upgrade: PlayerUpgrade
  Knights?: number
  Gladiator?: number
  Wood?: number
  Stone?: number
  SecretWood?: number
  SecretStone?: number
  SecretWoodLimit?: number
  SecretStoneLimit?: number
  RaidWood?: number
  RaidStone?: number
  WoodcutterMax?: number
  QuarryMax?: number
  AcademyMax?: number
  MaxWood?: number
  MaxStone?: number
  RaidHonor: number
  Wall?: number
  Warriors?: number
  Mages?: number
  Archers?: number
}

export type PlayerUnderworld = {
  TimeMachineMushrooms: number
  Upgrade: PlayerUpgrade
  GoblinUpgrades?: number
  TrollUpgrades?: number
  KeeperUpgrades?: number
  Heart?: number
  Gate?: number
  GoldPit?: number
  Extractor?: number
  GoblinPit?: number
  Torture?: number
  TrollBlock?: number
  TimeMachine?: number
  Keeper?: number
  Souls?: number
  ExtractorSouls?: number
  ExtractorMax?: number
  MaxSouls?: number
  ExtractorHourly?: number
  GoldPitGold?: number
  GoldPitMax?: number
  GoldPitHourly?: number
  TimeMachineThirst?: number
  TimeMachineMax?: number
  TimeMachineDaily?: number
}

export type PetHabitat = 'Shadow' | 'Light' | 'Earth' | 'Fire' | 'Water'

export type PlayerPets = Record<PetHabitat, number> &
  Partial<Record<`${PetHabitat}Levels`, number[]> & Record<`${PetHabitat}Count` | `${PetHabitat}Level` | `${PetHabitat}Food`, number>> & {
    Levels?: number[]
    TotalCount?: number
    Dungeons?: number[]
    Rank?: number
    Honor?: number
    TotalLevel?: number
  }

export type PlayerRunes = {
  Gold: number
  Chance: number
  Quality: number
  XP: number
  Health: number
  ResistanceFire: number
  ResistanceCold: number
  ResistanceLightning: number
  Damage: number
  DamageFire: number
  DamageCold: number
  DamageLightning: number
  Damage2?: number
  Damage2Fire?: number
  Damage2Cold?: number
  Damage2Lightning?: number
  Resistance: number
  Runes?: number
  Achievements?: number
}

export type PlayerAchievements = { Owned: boolean; Progress: number }[] & {
  Owned: number
  PetLover: boolean
  Dehydration: boolean
  Grail: boolean
}

export type PlayerFlags = {
  GroupTournamentBackground: number
  GoldFrame: boolean
  OfficialCreator: boolean
  OfficialDiscord: boolean
  TwitchFrame: boolean
  FriendlyFireFrame: boolean
  GoldFrameDisabled?: boolean
  InvitesDisabled?: boolean
}

export type PlayerFace = {
  Mouth: number
  Hair: { Type: number; Color: number }
  Brows: { Type: number; Color: number }
  Eyes: number
  Beard: { Type: number; Color: number }
  Nose: number
  Ears: number
  Special: number
  Special2: number
  Portrait: number
}

export type PlayerGroup = {
  ID: number
  Name?: string
  Joined?: number
  Identifier?: string | null
  LinkId?: string
  Group?: GroupModel
  Role?: number
  Index?: number
  Rank?: number
  Actions?: GroupMemberActions
  ReadyAttack?: boolean
  ReadyDefense?: boolean
  Own?: boolean
  Pet?: number
  Treasure?: number
  Instructor?: number
  Raid?: number
}

export type PlayerMushrooms = {
  Current: number
  Total?: number
  Paid?: number
  Free?: number
}

export type WitchScroll = {
  Date: number | undefined
  Type: number | undefined
  Owned: boolean
}

export type PlayerWitch = {
  Stage?: number
  Items?: number
  ItemsNext?: number
  Item?: number
  Finish?: number
  Scrolls?: WitchScroll[]
}

export type TaskReward = {
  Collected: boolean
  Points: number
  ResourceType: number
  ResourceAmount: number
}

export type PlayerIdle = {
  Sacrifices: number
  Buildings: number[]
  Money: number
  ReadyRunes: number
  Runes: number
  Upgrades: {
    Speed: number[]
    Money: number[]
    Total?: number
  }
}

export type PlayerResources = {
  Mushrooms: number
  Gold: number
  Coins: number
  Hourglass: number
  Wood: number
  SecretWood: number
  Stone: number
  SecretStone: number
  Metal: number
  Crystals: number
  Souls: number
  ShadowFood: number
  LightFood: number
  EarthFood: number
  FireFood: number
  WaterFood: number
}

type CompanionData = {
  Level: number
  Armor: number
  Damage: PlayerDamage
} & Record<AttributeName, PlayerAttribute>

export class PlayerModel {
  static ACHIEVEMENTS_COUNT = 141
  static SCRAPBOOK_COUNT = 2484

  static SCROLL_MAP: Record<number, number> = {
    11: 0,
    31: 1,
    41: 2,
    51: 3,
    61: 4,
    71: 5,
    81: 6,
    91: 7,
    101: 8
  }

  static MOUNT_MAP: (number | '')[] = ['', 10, 20, 30, 50, 50]

  static ATTRIBUTES: AttributeName[] = ['Strength', 'Dexterity', 'Intelligence', 'Constitution', 'Luck']

  static ATTRIBUTE_TO_TYPE: Record<AttributeName, number> = {
    Strength: 1,
    Dexterity: 2,
    Intelligence: 3,
    Constitution: 4,
    Luck: 5
  }

  static ATTRIBUTE_ORDER: MainAttribute[][] = [
    ['Strength', 'Dexterity', 'Intelligence'],
    ['Dexterity', 'Strength', 'Intelligence'],
    ['Intelligence', 'Strength', 'Dexterity']
  ]

  static ATTRIBUTE_ORDER_BY_ATTRIBUTE = (['Strength', 'Dexterity', 'Intelligence'] as MainAttribute[]).reduce(
    (memo, attribute, index) => {
      memo[attribute] = this.ATTRIBUTE_ORDER[index]
      return memo
    },
    Object.create(null) as Record<MainAttribute, MainAttribute[]>
  )

  static CALENDAR_REWARDS = {
    None: 0,
    Gold: 1,
    Mushrooms: 2,
    XP: 3,
    Wood: 4,
    Stone: 5,
    Souls: 6,
    Arcane: 7,
    Runes: 8,
    Item: 9,
    AttributeStrength: 11,
    AttributeDexterity: 12,
    AttributeIntelligence: 13,
    AttributeConstitution: 14,
    AttributeLuck: 15,
    FruitType1: 16,
    FruitType2: 17,
    FruitType3: 18,
    FruitType4: 19,
    FruitType5: 20,
    LevelUp: 21,
    LifePotion: 22,
    Hourglass: 23,
    StrengthPotion: 24,
    DexterityPotion: 25,
    IntelligencePotion: 26,
    ConstitutionPotion: 27,
    LuckPotion: 28
  }

  static CALENDAR_INFER_MAP = [
    // Index, position to check, reward to expect
    [1, 19, this.CALENDAR_REWARDS.ConstitutionPotion],
    [2, 2, this.CALENDAR_REWARDS.Hourglass],
    [3, 3, this.CALENDAR_REWARDS.AttributeIntelligence],
    [4, 3, this.CALENDAR_REWARDS.AttributeLuck],
    [5, 3, this.CALENDAR_REWARDS.XP],
    [6, 3, this.CALENDAR_REWARDS.LifePotion],
    [7, 3, this.CALENDAR_REWARDS.LuckPotion],
    [8, 6, this.CALENDAR_REWARDS.AttributeLuck],
    [9, 19, this.CALENDAR_REWARDS.LifePotion],
    [10, 6, this.CALENDAR_REWARDS.LuckPotion],
    [11, 14, this.CALENDAR_REWARDS.LuckPotion],
    [12, 10, this.CALENDAR_REWARDS.Hourglass]
  ]

  declare Data: RawPlayer
  declare Own: boolean | number
  declare Timestamp: number
  declare LinkId: string
  declare IsProxy?: true
  declare Toilet: { Aura?: number; Fill?: number; Capacity?: number }
  declare Witch: PlayerWitch
  declare Achievements: PlayerAchievements
  declare GroupTournament?: { Tokens?: number; Floor?: number; FloorMax?: number }
  declare Description: string | undefined
  declare DataVersion: number | undefined
  declare Inventory: PlayerInventory
  declare Action: PlayerAction
  declare OriginalAction: PlayerAction
  declare Fortress: PlayerFortress
  declare ID: number
  declare Name: string
  declare Prefix: string
  declare Identifier: string
  declare Level: number
  declare XP: number
  declare XPNext: number
  declare XPTotal: number
  declare Honor: number
  declare Rank: number
  declare Face: PlayerFace
  declare Race: number
  declare Gender: number
  declare Mirror: number
  declare MirrorPieces: number
  declare ServerId: number
  declare OriginalServerId?: number
  declare Class: CharacterClass
  declare Mount: number
  declare MountValue: number | ''
  declare MountExpire: number
  declare Flags: PlayerFlags
  declare Armor: number
  declare Damage: PlayerDamage
  declare Damage2?: PlayerDamage
  declare Strength: PlayerAttribute
  declare Dexterity: PlayerAttribute
  declare Intelligence: PlayerAttribute
  declare Constitution: PlayerAttribute
  declare Luck: PlayerAttribute
  declare Primary: PlayerAttribute
  declare Group: PlayerGroup
  declare Book: number
  declare BookPercentage: number
  declare LastOnline?: number
  declare Registered?: number
  declare DevilPercent?: number
  declare Mushrooms?: PlayerMushrooms
  declare Items: PlayerItems
  declare ItemsArray: ItemModel[]
  declare ThirstReroll?: number
  declare ThirstLeft?: number
  declare UsedBeers?: number
  declare Potions: PlayerPotions
  declare Hourglass?: number
  declare Coins?: number
  declare CalendarDay?: number
  declare CalendarType?: number
  declare Underworld?: PlayerUnderworld
  declare LegendaryDungeonTries?: number
  declare UsedAdventureTime?: number
  declare ClientVersion?: number
  declare AdventureSkips?: number
  declare Summer?: { Missions: { Type: number; Current: number; Target: number; Points: number }[]; TotalPoints: number }
  declare BeerMax?: number
  declare AdventurePoints?: number
  declare BeerUsed?: number
  declare WheelType?: number
  declare WheelUsed?: number
  declare DiceUsed?: number
  declare Idle?: PlayerIdle
  declare Pets: PlayerPets
  declare Metal?: number
  declare Crystals?: number
  declare Dungeons: PlayerDungeons
  declare Companions?: { Bert: CompanionModel; Mark: CompanionModel; Kunigunde: CompanionModel }
  declare Scrapbook?: boolean[]
  declare ScrapbookLegendary?: boolean[]
  declare WebshopID?: string
  declare Gold?: number
  declare DailyTasks?: { Rewards: TaskReward[] }
  declare EventTasks?: { Rewards: TaskReward[] }
  declare Config: ClassConfig
  declare ClassBonus: boolean
  declare Runes: PlayerRunes
  declare BlockChance?: number
  declare Health: number

  constructor(data?: RawPlayer | null) {
    if (data) {
      this.#initShared(data)

      if (data.own) {
        this.#initOwn(data)
      } else {
        this.#initOther(data)
      }
    }
  }

  static getResources(data: number[] | undefined): PlayerResources {
    const resourcesData = new ComplexDataType(data)
    resourcesData.skip(1)

    return {
      Mushrooms: resourcesData.long(),
      Gold: resourcesData.long(),
      Coins: resourcesData.long(),
      Hourglass: resourcesData.long(),
      Wood: resourcesData.long(),
      SecretWood: resourcesData.long(),
      Stone: resourcesData.long(),
      SecretStone: resourcesData.long(),
      Metal: resourcesData.long(),
      Crystals: resourcesData.long(),
      Souls: resourcesData.long(),
      ShadowFood: resourcesData.long(),
      LightFood: resourcesData.long(),
      EarthFood: resourcesData.long(),
      FireFood: resourcesData.long(),
      WaterFood: resourcesData.long()
    }
  }

  #initCharacterSave(data: RawPlayer, legacyDungeons: LegacyDungeons) {
    const dataType = new ComplexDataType(data.save)

    // Weird ID
    dataType.skip(1)

    // Player ID
    this.ID = dataType.long()

    // Lock?
    dataType.skip(1)

    // Level
    this.Level = dataType.short()
    dataType.clear()

    // XP
    this.XP = dataType.long()

    // XP required
    this.XPNext = dataType.long()

    // Honor
    this.Honor = dataType.long()

    // Rank
    this.Rank = dataType.long()

    // Face data
    this.Face = {
      Mouth: dataType.long(),
      Hair: {
        Type: dataType.long() % 100,
        Color: Math.trunc(dataType.back(1).long() / 100)
      },
      Brows: {
        Type: dataType.long() % 100,
        Color: Math.trunc(dataType.back(1).long() / 100)
      },
      Eyes: dataType.long(),
      Beard: {
        Type: dataType.long() % 100,
        Color: Math.trunc(dataType.back(1).long() / 100)
      },
      Nose: dataType.long(),
      Ears: dataType.long(),
      Special: dataType.long(),
      Special2: dataType.long(),
      Portrait: dataType.long()
    }

    // Race + Dungeon refresh
    this.Race = dataType.short()
    dataType.clear() // skip

    // Gender (unsure whether mirror even applies still)
    this.Gender = dataType.byte()
    this.Mirror = dataType.byte()
    this.MirrorPieces = PlayerModel.getMirrorPieces((this.ServerId = dataType.short()))

    // Class + Dungeon day
    this.Class = dataType.short() as CharacterClass
    dataType.clear() // skip

    // Mount + tower
    this.Mount = dataType.short()
    legacyDungeons.Tower = dataType.short()

    this.MountValue = PlayerModel.getMount(this.Mount)

    // Flags
    this.Flags = PlayerModel.getFlags(dataType.long())

    // Armor
    this.Armor = dataType.long()

    // Damage
    this.Damage = {
      Min: dataType.long(),
      Max: dataType.long()
    } as PlayerDamage

    this.Damage.Avg = (this.Damage.Min + this.Damage.Max) / 2

    // Group bonus (partial - possibly unsafe)
    legacyDungeons.Group = dataType.long()

    // Unsure what this is
    dataType.skip(1)

    // Player bonus (partial - possibly unsafe)
    legacyDungeons.Player = dataType.long()

    // Mount duration
    this.MountExpire = dataType.long() * 1000 + data.offset

    // Attributes (normal, bonus, purchased)
    PlayerModel.loadAttributes(this, dataType, false)

    // Lock duration
    dataType.skip(1)

    // Valid
    dataType.skip(1)

    // Lock reason
    dataType.skip(1)

    // Vote
    dataType.skip(1)

    // Has holy grail
    dataType.skip(1)

    // Runes
    dataType.skip(13)

    // SFA
    dataType.skip(1)

    // Active frame
    dataType.skip(1)

    // Group ID
    this.Group = {
      ID: dataType.long(),
      Name: data.groupname,
      Joined: data.groupMetadata ? data.groupMetadata[5] * 1000 + data.offset : undefined
    }

    // Scrapbook
    this.Book = Math.max(0, dataType.long() - 10000)

    // Invitations
    dataType.skip(1)

    // Origin server ID
    this.OriginalServerId = dataType.long()

    // Gladiator
    this.Fortress.Gladiator = dataType.long()
  }

  #initPotionSave(data: RawPlayer) {
    const dataType = new ComplexDataType(data.potions)

    // PID
    dataType.skip(1)

    this.Potions = [
      {
        Type: PlayerModel.getPotionType(dataType.long()),
        Expire: dataType.skip(2).long() * 1000 + data.offset,
        Size: dataType.skip(2).long()
      },
      {
        Type: PlayerModel.getPotionType(dataType.back(6).long()),
        Expire: dataType.skip(2).long() * 1000 + data.offset,
        Size: dataType.skip(2).long()
      },
      {
        Type: PlayerModel.getPotionType(dataType.back(6).long()),
        Expire: dataType.skip(2).long() * 1000 + data.offset,
        Size: dataType.skip(2).long()
      }
    ]

    sortDescending(this.Potions, (potion) => potion.Size)
  }

  #initFortressSave(data: RawPlayer) {
    // Fortress
    const dataType = new ComplexDataType(data.fortress)

    // Levels
    Object.assign(this.Fortress, {
      Fortress: dataType.long(),
      LaborerQuarters: dataType.long(),
      WoodcutterGuild: dataType.long(),
      Quarry: dataType.long(),
      GemMine: dataType.long(),
      Academy: dataType.long(),
      ArcheryGuild: dataType.long(),
      Barracks: dataType.long(),
      MageTower: dataType.long(),
      Treasury: dataType.long(),
      Smithy: dataType.long(),
      Fortifications: dataType.long(),
      Upgrades: undefined,
      Rank: data.fortressrank,
      Honor: undefined,
      Upgrade: {
        Building: 0,
        Finish: -1,
        Start: -1
      }
    })

    if (data.own) {
      // Build index, end time, start time
      this.Fortress.Upgrade = {
        Building: dataType.long() - 1,
        Finish: dataType.long() * 1000 + data.offset,
        Start: dataType.long() * 1000 + data.offset
      }

      // Level
      this.Fortress.Upgrades = dataType.long()

      // Honor
      this.Fortress.Honor = dataType.long()

      // Rank
      this.Fortress.Rank = dataType.long()

      // Next date, next id
      dataType.skip(2)

      // Protection timer full, half
      dataType.skip(2)

      // Gemstone index, end time, start time
      dataType.skip(3)

      // Group bonus
      this.Fortress.Knights = dataType.long()

      // Last enemy ID
      dataType.skip(1)
    }
  }

  #initStatusSave(data: RawPlayer, resources: PlayerResources) {
    const dataType = new ComplexDataType(data.status)

    // Login count
    dataType.skip(1)

    // Action status, index, end time, start time
    this.Action = {
      Status: dataType.long(),
      Index: dataType.long(),
      Finish: dataType.long() * 1000 + data.offset,
      Start: dataType.long() * 1000 + data.offset
    }

    // Max beer
    this.BeerMax = dataType.long()

    // Adventure points
    this.AdventurePoints = dataType.long()

    // Beer bought
    this.BeerUsed = dataType.long()

    // Nordic gods + calendar
    dataType.byte()
    dataType.byte()
    this.CalendarDay = dataType.short()

    if (data.calendar) {
      for (const [type, day, expectedReward] of PlayerModel.CALENDAR_INFER_MAP) {
        if (data.calendar[(day - 1) * 2] === expectedReward) {
          this.CalendarType = type

          break
        }
      }
    }

    // Next calendar date
    dataType.skip(1)

    // Skip weapon store
    dataType.skip(1)

    // Skip magic store
    dataType.skip(1)

    // Message count
    dataType.skip(1)

    // Mushrooms paid
    this.Mushrooms = {
      Current: resources.Mushrooms,
      Paid: dataType.long()
    }

    // Mushrooms paid ??
    dataType.skip(1)

    // Mushrooms gained
    this.Mushrooms.Free = dataType.long()
    this.Mushrooms.Total = this.Mushrooms.Free + (this.Mushrooms.Paid as number)

    dataType.skip(3)

    // Mushrooms TM
    this.Underworld = {
      TimeMachineMushrooms: dataType.long(),
      Upgrade: {
        Building: 0,
        Finish: -1,
        Start: -1
      }
    }

    dataType.skip(13)
  }

  #initToiletSave(data: RawPlayer) {
    const dataType = new ComplexDataType(data.toilet)

    this.Toilet = {
      Aura: dataType.long(),
      Fill: dataType.long()
    }

    dataType.skip(1)

    this.Toilet.Capacity = dataType.long()
  }

  #initResources(resources: PlayerResources) {
    this.Hourglass = resources.Hourglass
    this.Fortress.Wood = resources.Wood
    this.Fortress.Stone = resources.Stone
    this.Coins = resources.Coins
    this.Fortress.SecretWood = resources.SecretWood
    this.Fortress.SecretStone = resources.SecretStone
  }

  #initWheel(data: RawPlayer) {
    const dataType = new ComplexDataType(data.wheel)

    this.WheelType = dataType.long()

    this.WheelUsed = dataType.long()

    // Next free
    dataType.skip(1)
  }

  #initDice(data: RawPlayer) {
    const dataType = new ComplexDataType(data.dice)

    dataType.skip(1)

    this.DiceUsed = dataType.long()
  }

  #initOwn(data: RawPlayer) {
    const legacyDungeons = DungeonHelper.template()
    const resources = PlayerModel.getResources(data.resources)

    let dataType: ComplexDataType

    if (data.saveVersion === 2) {
      this.#initCharacterSave(data, legacyDungeons)
      this.#initPotionSave(data)
      this.#initStatusSave(data, resources)
      this.#initFortressSave(data)
      this.#initToiletSave(data)
      this.#initResources(resources)
      this.#initWheel(data)
      this.#initDice(data)
    } else {
      dataType = new ComplexDataType(data.save)
      dataType.assert(650)

      dataType.skip(1) // skip
      this.ID = dataType.long()
      this.LastOnline = dataType.long() * 1000 + data.offset
      this.Registered = dataType.long() * 1000 + data.offset
      dataType.skip(3) // skip
      this.Level = dataType.short()
      dataType.clear()
      this.XP = dataType.long()
      this.XPNext = dataType.long()
      this.Honor = dataType.long()
      this.Rank = dataType.long()
      dataType.short()
      this.DevilPercent = dataType.short()
      dataType.skip(1) // skip
      const mushroomsCurrent = dataType.long()
      this.Mushrooms = {
        Current: resources.Mushrooms || mushroomsCurrent,
        Total: dataType.long()
      }
      dataType.skip(1)
      this.Face = {
        Mouth: dataType.long(),
        Hair: {
          Type: dataType.long() % 100,
          Color: Math.trunc(dataType.back(1).long() / 100)
        },
        Brows: {
          Type: dataType.long() % 100,
          Color: Math.trunc(dataType.back(1).long() / 100)
        },
        Eyes: dataType.long(),
        Beard: {
          Type: dataType.long() % 100,
          Color: Math.trunc(dataType.back(1).long() / 100)
        },
        Nose: dataType.long(),
        Ears: dataType.long(),
        Special: dataType.long(),
        Special2: dataType.long(),
        Portrait: dataType.long()
      }
      this.Race = dataType.short()
      dataType.clear() // skip
      this.Gender = dataType.byte()
      this.Mirror = dataType.byte()
      this.MirrorPieces = PlayerModel.getMirrorPieces((this.ServerId = dataType.short()))
      this.Class = dataType.short() as CharacterClass
      dataType.clear() // skip
      PlayerModel.loadAttributes(this, dataType, false)
      this.Action = {
        Status: dataType.short()
      } as PlayerAction
      dataType.short() // Skip
      this.Action.Index = dataType.short()
      dataType.short() // Skip
      this.Action.Finish = dataType.long() * 1000 + data.offset
      this.Items = PlayerModel.loadLegacyEquipment(dataType, 1, this.Class)
      this.Inventory = {
        Backpack: [],
        Chest: [],
        Shop: [],
        Dummy: {},
        Bert: {},
        Mark: {},
        Kunigunde: {}
      }
      for (let i = 0; i < 5; i++) {
        const item = new ItemModel(ItemModel.LEGACY, dataType.sub(12), 6, i + 1)
        if (item.Type > 0) {
          this.Inventory.Backpack.push(item)
        }
      }
      dataType.skip(58) // skip
      this.Mount = dataType.short()
      this.MountValue = PlayerModel.getMount(this.Mount)

      legacyDungeons.Tower = dataType.short()

      dataType.skip(1)
      for (let i = 0; i < 6; i++) {
        const item = new ItemModel(ItemModel.LEGACY, dataType.sub(12), 7, i + 1)
        if (item.Type > 0) {
          this.Inventory.Shop.push(item)
        }
      }
      dataType.skip(1)
      for (let i = 0; i < 6; i++) {
        const item = new ItemModel(ItemModel.LEGACY, dataType.sub(12), 8, i + 1)
        if (item.Type > 0) {
          this.Inventory.Shop.push(item)
        }
      }

      legacyDungeons.Raid = dataType.short()

      dataType.short()
      dataType.skip(1) // skip
      this.Group = {
        ID: dataType.long(),
        Name: data.groupname
      }
      dataType.skip(1) // skip
      this.Mushrooms.Paid = dataType.long()
      this.Mushrooms.Free = (this.Mushrooms.Total as number) - this.Mushrooms.Paid
      this.Book = Math.max(0, dataType.long() - 10000)
      dataType.skip(2) // skip

      legacyDungeons.Normal[10] = dataType.long()
      legacyDungeons.Normal[11] = dataType.long()

      this.Group.Joined = dataType.long() * 1000 + data.offset
      this.Flags = PlayerModel.getFlags(dataType.long())
      dataType.short() // skip

      legacyDungeons.Group = dataType.byte()
      legacyDungeons.Player = dataType.byte()

      dataType.skip(1) // skip
      this.Armor = dataType.long()
      this.Damage = {
        Min: dataType.long(),
        Max: dataType.long()
      } as PlayerDamage
      this.Damage.Avg = (this.Damage.Min + this.Damage.Max) / 2
      dataType.skip(1) // skip
      this.MountExpire = dataType.long() * 1000 + data.offset
      dataType.skip(3)
      this.ThirstReroll = dataType.long() * 1000 + data.offset
      this.ThirstLeft = dataType.long()
      this.UsedBeers = dataType.long()
      dataType.skip(22) // skip

      legacyDungeons.Normal[0] = dataType.long()
      legacyDungeons.Normal[1] = dataType.long()
      legacyDungeons.Normal[2] = dataType.long()
      legacyDungeons.Normal[3] = dataType.long()
      legacyDungeons.Normal[4] = dataType.long()
      legacyDungeons.Normal[5] = dataType.long()
      legacyDungeons.Normal[6] = dataType.long()
      legacyDungeons.Normal[7] = dataType.long()
      legacyDungeons.Normal[8] = dataType.long()
      legacyDungeons.Normal[9] = dataType.long()
      legacyDungeons.Normal[12] = dataType.long() - 120

      this.Toilet = {
        Aura: dataType.long(),
        Fill: dataType.long()
      }
      this.Potions = [
        {
          Type: PlayerModel.getPotionType(dataType.long()),
          Expire: dataType.skip(2).long() * 1000 + data.offset,
          Size: dataType.skip(2).long()
        },
        {
          Type: PlayerModel.getPotionType(dataType.back(6).long()),
          Expire: dataType.skip(2).long() * 1000 + data.offset,
          Size: dataType.skip(2).long()
        },
        {
          Type: PlayerModel.getPotionType(dataType.back(6).long()),
          Expire: dataType.skip(2).long() * 1000 + data.offset,
          Size: dataType.skip(2).long()
        }
      ]
      sortDescending(this.Potions, (potion) => potion.Size)
      this.Potions.Life = dataType.long()
      dataType.skip(12) // skip
      this.Toilet.Capacity = dataType.long()
      dataType.skip(1) // skip
      this.Flags.GoldFrameDisabled = !!dataType.long()
      dataType.skip(3) //skip
      this.Flags.InvitesDisabled = !!dataType.long()
      dataType.skip(2) // skip
      this.Fortress = {
        Rank: data.fortressrank,
        Fortress: dataType.long(),
        LaborerQuarters: dataType.long(),
        WoodcutterGuild: dataType.long(),
        Quarry: dataType.long(),
        GemMine: dataType.long(),
        Academy: dataType.long(),
        ArcheryGuild: dataType.long(),
        Barracks: dataType.long(),
        MageTower: dataType.long(),
        Treasury: dataType.long(),
        Smithy: dataType.long(),
        Fortifications: dataType.long()
      } as PlayerFortress
      dataType.skip(6)
      this.Hourglass = dataType.long() || resources.Hourglass
      dataType.skip(1)
      this.Fortress.Wood = dataType.long() || resources.Wood
      this.Fortress.Stone = dataType.long() || resources.Stone

      legacyDungeons.Normal[13] = dataType.long()

      dataType.skip(11) // skip

      legacyDungeons.Twister = dataType.long()

      dataType.skip(3) // skip
      this.Fortress.RaidWood = Math.trunc(dataType.long() / 2)
      this.Fortress.RaidStone = Math.trunc(dataType.long() / 2)
      dataType.skip(1) // skip
      this.Fortress.WoodcutterMax = dataType.long()
      this.Fortress.QuarryMax = dataType.long()
      this.Fortress.AcademyMax = dataType.long()
      this.Fortress.MaxWood = dataType.long()
      this.Fortress.MaxStone = dataType.long()
      dataType.skip(1) // skip
      this.Fortress.Upgrade = {
        Building: dataType.long() - 1,
        Finish: dataType.long() * 1000 + data.offset,
        Start: dataType.long() * 1000 + data.offset
      }
      dataType.skip(4)
      this.Coins = dataType.long() || resources.Coins
      dataType.skip(2)
      this.Fortress.Upgrades = dataType.long()
      this.Fortress.Honor = dataType.long()
      this.Fortress.Rank = dataType.long()
      dataType.skip(8) // skip
      if (dataType.long() * 1000 + data.offset < data.timestamp) {
        this.Fortress.RaidWood += Math.trunc(this.Fortress.Wood / 10)
        this.Fortress.RaidStone += Math.trunc(this.Fortress.Stone / 10)
      }
      dataType.skip(5) // skip
      this.Fortress.Knights = dataType.long()
      dataType.skip(5) // skip

      legacyDungeons.Shadow = dataType.byteArray(14)

      dataType.clear() // skip
      dataType.skip(12) // skip
      legacyDungeons.Normal[15] = dataType.long()
      legacyDungeons.Shadow[15] = dataType.long()
      dataType.skip(1) // skip
      this.Group.Treasure = dataType.long()
      this.Group.Instructor = dataType.long()
      dataType.skip(4) // skip
      this.Group.Pet = dataType.long()
      dataType.skip(1)

      legacyDungeons.Youtube = dataType.long()

      dataType.skip(16)

      legacyDungeons.Normal[16] = dataType.byte()
      legacyDungeons.Shadow[16] = dataType.byte()

      this.CalendarDay = dataType.short()
      dataType.skip(5)

      legacyDungeons.Normal[17] = dataType.short()
      legacyDungeons.Shadow[17] = dataType.short()

      dataType.skip(2)
      // Normalize calendar type in order to align it with S&F Tavern's calendar indexing
      this.CalendarType = 1 + ((dataType.long() + 10) % 12)
      this.Underworld = {
        TimeMachineMushrooms: dataType.long(),
        Upgrade: {
          Building: 0,
          Finish: -1,
          Start: -1
        }
      }
      dataType.skip(3)
      this.LegendaryDungeonTries = dataType.long()
      dataType.skip(2)
      this.UsedAdventureTime = dataType.long()
      dataType.skip(5)
      this.ClientVersion = dataType.long()
      this.AdventureSkips = dataType.long()
      this.Summer = {
        Missions: [
          {
            Type: dataType.long(),
            Current: dataType.skip(2).long(),
            Target: dataType.skip(2).long(),
            Points: dataType.skip(2).long()
          },
          {
            Type: dataType.back(9).long(),
            Current: dataType.skip(2).long(),
            Target: dataType.skip(2).long(),
            Points: dataType.skip(2).long()
          },
          {
            Type: dataType.back(9).long(),
            Current: dataType.skip(2).long(),
            Target: dataType.skip(2).long(),
            Points: dataType.skip(2).long()
          }
        ],
        TotalPoints: dataType.long()
      }
      dataType.skip(3)

      legacyDungeons.Normal[18] = dataType.short()
      legacyDungeons.Shadow[18] = dataType.short()

      dataType.skip(7)
      this.Fortress.SecretWood = dataType.long() || resources.SecretWood
      this.Fortress.SecretWoodLimit = dataType.long()
      this.Fortress.SecretStone = dataType.long() || resources.SecretStone
      this.Fortress.SecretStoneLimit = dataType.long()
      dataType.skip(1)
    }

    if (data.idle) {
      this.Idle = {
        Sacrifices: data.idle[2],
        Buildings: sliceLength(data.idle, 3, 10),
        Money: data.idle[73],
        ReadyRunes: data.idle[75],
        Runes: data.idle[76],
        Upgrades: {
          Speed: sliceLength(data.idle, 43, 10),
          Money: sliceLength(data.idle, 53, 10)
        }
      }

      if (data.idle[77]) {
        for (let i = 0; i < 10; i++) {
          this.Idle.Upgrades.Money[i]++
        }
      }

      this.Idle.Upgrades.Total = sum(this.Idle.Upgrades.Speed) + sum(this.Idle.Upgrades.Money)
    }

    dataType = new ComplexDataType(data.pets)
    dataType.skip(2)

    const petLevels = dataType.sub(100)

    let shadowCount = 0
    let lightCount = 0
    let earthCount = 0
    let fireCount = 0
    let waterCount = 0
    let shadowLevel = 0
    let lightLevel = 0
    let earthLevel = 0
    let fireLevel = 0
    let waterLevel = 0

    if (petLevels.length) {
      for (let i = 0; i < 20; i++) {
        shadowCount += petLevels[i] > 0 ? 1 : 0
        shadowLevel += petLevels[i]
      }

      for (let i = 0; i < 20; i++) {
        lightCount += petLevels[i + 20] > 0 ? 1 : 0
        lightLevel += petLevels[i + 20]
      }

      for (let i = 0; i < 20; i++) {
        earthCount += petLevels[i + 40] > 0 ? 1 : 0
        earthLevel += petLevels[i + 40]
      }

      for (let i = 0; i < 20; i++) {
        fireCount += petLevels[i + 60] > 0 ? 1 : 0
        fireLevel += petLevels[i + 60]
      }

      for (let i = 0; i < 20; i++) {
        waterCount += petLevels[i + 80] > 0 ? 1 : 0
        waterLevel += petLevels[i + 80]
      }
    }

    dataType.skip(1)
    this.Pets = {
      Levels: petLevels,
      ShadowLevels: petLevels.slice(0, 20),
      LightLevels: petLevels.slice(20, 40),
      EarthLevels: petLevels.slice(40, 60),
      FireLevels: petLevels.slice(60, 80),
      WaterLevels: petLevels.slice(80, 100),
      ShadowCount: shadowCount,
      LightCount: lightCount,
      EarthCount: earthCount,
      FireCount: fireCount,
      WaterCount: waterCount,
      ShadowLevel: shadowLevel,
      LightLevel: lightLevel,
      EarthLevel: earthLevel,
      FireLevel: fireLevel,
      WaterLevel: waterLevel,
      TotalCount: dataType.long(),
      Shadow: dataType.long(),
      Light: dataType.long(),
      Earth: dataType.long(),
      Fire: dataType.long(),
      Water: dataType.long()
    }
    dataType.skip(101)
    this.Pets.Dungeons = dataType.sub(5)
    dataType.skip(18)
    this.Pets.Rank = dataType.long()
    this.Pets.Honor = dataType.long()
    dataType.skip(20)
    this.Metal = dataType.long() || resources.Metal
    this.Crystals = dataType.long() || resources.Crystals
    dataType.skip(2)
    this.Pets.ShadowFood = dataType.long() || resources.ShadowFood
    this.Pets.LightFood = dataType.long() || resources.LightFood
    this.Pets.EarthFood = dataType.long() || resources.EarthFood
    this.Pets.FireFood = dataType.long() || resources.FireFood
    this.Pets.WaterFood = dataType.long() || resources.WaterFood
    this.Pets.TotalLevel = shadowLevel + lightLevel + fireLevel + earthLevel + waterLevel

    this.Name = data.name
    this.Prefix = formatPrefix(data.prefix)
    this.Identifier = data.prefix + '_p' + this.ID

    this.Group.Identifier = this.Group.Name ? `${data.prefix}_g${this.Group.ID}` : null

    if (data.tower) {
      legacyDungeons.Normal[14] = data.tower[150]
      legacyDungeons.Shadow[14] = data.tower[298]
    } else {
      legacyDungeons.Normal[14] = 0
      legacyDungeons.Shadow[14] = 0
    }

    this.Dungeons = DungeonHelper.fromData(legacyDungeons, data.dungeons)

    if (data.equippedItems) {
      // Override items with equipped items if present (modern implementation)
      this.Items = PlayerModel.loadModernEquipment(new ComplexDataType(data.equippedItems), 1, this.Class)
    }

    this.evaluateCommon()

    if (data.backpackItems) {
      dataType = new ComplexDataType(data.backpackItems)

      this.Inventory.Chest = []
      this.Inventory.Backpack = []

      for (let i = 0; dataType.atLeast(19); i++) {
        const item = new ItemModel(ItemModel.MODERN, dataType.sub(19), 6, i)
        if (item.Type > 0) {
          if (i >= 20) {
            this.Inventory.Chest.push(item)
          } else {
            this.Inventory.Backpack.push(item)
          }
        }
      }
    } else if (data.chest) {
      dataType = new ComplexDataType(data.chest)
      for (let i = 0; i < 45 && dataType.atLeast(12); i++) {
        const item = new ItemModel(ItemModel.LEGACY, dataType.sub(12), 6, i + 6)
        if (item.Type > 0) {
          if (i >= 15) {
            this.Inventory.Chest.push(item)
          } else {
            this.Inventory.Backpack.push(item)
          }
        }
      }
    }

    if (data.dummyItems) {
      // Override items with dummy items if present (modern implementation)
      this.Inventory.Dummy = PlayerModel.loadModernEquipment(new ComplexDataType(data.dummyItems), 5, this.Class)
    } else if (data.dummy) {
      // Otherwise load from old dummy field
      this.Inventory.Dummy = PlayerModel.loadLegacyEquipment(new ComplexDataType(data.dummy), 5, this.Class)
    }

    // Override items with new shop items
    if (data.shakesItems || data.fidgetItems) {
      this.Inventory.Shop = []

      dataType = new ComplexDataType(data.shakesItems)
      for (let i = 0; i < 6; i++) {
        const item = new ItemModel(ItemModel.MODERN, dataType.sub(19), 7, i + 1)
        if (item.Type > 0) {
          this.Inventory.Shop.push(item)
        }
      }

      dataType = new ComplexDataType(data.fidgetItems)
      for (let i = 0; i < 6; i++) {
        const item = new ItemModel(ItemModel.MODERN, dataType.sub(19), 8, i + 1)
        if (item.Type > 0) {
          this.Inventory.Shop.push(item)
        }
      }
    }

    dataType = new ComplexDataType(data.witch)
    this.Witch.Stage = dataType.long()
    this.Witch.Items = dataType.long()
    this.Witch.ItemsNext = Math.max(0, dataType.long())
    this.Witch.Item = dataType.long()
    this.Witch.Items = Math.min(this.Witch.Items, this.Witch.ItemsNext)

    dataType.skip(2)

    this.Witch.Finish = dataType.long() * 1000 + data.offset
    if (this.Witch.Finish < this.Timestamp) {
      this.Witch.Finish = 0
    }

    dataType.skip(1)

    this.Witch.Scrolls = Array.from({ length: 9 }, () => ({
      Date: undefined,
      Type: undefined,
      Owned: false
    }))

    for (let i = 0; i < 9; i++) {
      dataType.skip(1)

      const picIndex = dataType.long()
      const date = dataType.long() * 1000 + data.offset
      const type = picIndex % 1000

      this.Witch.Scrolls[PlayerModel.getScroll(type)] = {
        Date: date,
        Type: type,
        Owned: isBetween(date, 0, this.Timestamp)
      }
    }

    this.Witch.Stage = countWhere(this.Witch.Scrolls, (scroll) => scroll.Owned)

    if (data.tower) {
      const underworld = this.Underworld as PlayerUnderworld

      underworld.GoblinUpgrades = data.tower[146]
      underworld.TrollUpgrades = data.tower[294]
      underworld.KeeperUpgrades = data.tower[442]

      dataType = new ComplexDataType(data.tower.slice(448))
      underworld.Heart = dataType.long()
      underworld.Gate = dataType.long()
      underworld.GoldPit = dataType.long()
      underworld.Extractor = dataType.long()
      underworld.GoblinPit = dataType.long()
      underworld.Torture = dataType.long()
      this.Fortress.Gladiator = dataType.long()
      underworld.TrollBlock = dataType.long()
      underworld.TimeMachine = dataType.long()
      underworld.Keeper = dataType.long()
      underworld.Souls = dataType.long() || resources.Souls
      underworld.ExtractorSouls = dataType.long()
      underworld.ExtractorMax = dataType.long()
      underworld.MaxSouls = dataType.long()
      dataType.skip(1)
      underworld.ExtractorHourly = dataType.long()
      underworld.GoldPitGold = dataType.long() / 100
      underworld.GoldPitMax = dataType.long() / 100
      underworld.GoldPitHourly = dataType.long() / 100
      dataType.skip(1)
      underworld.Upgrade = {
        Building: dataType.long() - 1,
        Finish: dataType.long() * 1000 + data.offset,
        Start: dataType.long() * 1000 + data.offset
      }
      dataType.skip(2)
      underworld.TimeMachineThirst = dataType.long()
      underworld.TimeMachineMax = dataType.long()
      underworld.TimeMachineDaily = dataType.long()
    }

    if (!isEmpty(data.tower)) {
      dataType = new ComplexDataType(data.tower)

      dataType.skip(3)
      const bert = CompanionModel.fromTower(dataType)
      this.Inventory.Bert = PlayerModel.loadLegacyEquipment(dataType, 2, WARRIOR)

      dataType.skip(6)
      const mark = CompanionModel.fromTower(dataType)
      this.Inventory.Mark = PlayerModel.loadLegacyEquipment(dataType, 3, MAGE)

      dataType.skip(6)
      const kuni = CompanionModel.fromTower(dataType)
      this.Inventory.Kunigunde = PlayerModel.loadLegacyEquipment(dataType, 4, SCOUT)

      if (!isEmpty(data.companionItems)) {
        dataType = new ComplexDataType(data.companionItems)

        this.Inventory.Bert = PlayerModel.loadModernEquipment(dataType, 2, WARRIOR)
        this.Inventory.Mark = PlayerModel.loadModernEquipment(dataType, 3, MAGE)
        this.Inventory.Kunigunde = PlayerModel.loadModernEquipment(dataType, 4, SCOUT)
      }

      this.Companions = {
        Bert: new CompanionModel(this, bert, this.Inventory.Bert as PlayerItems, WARRIOR),
        Mark: new CompanionModel(this, mark, this.Inventory.Mark as PlayerItems, MAGE),
        Kunigunde: new CompanionModel(this, kuni, this.Inventory.Kunigunde as PlayerItems, SCOUT)
      }
    }

    this.Scrapbook = PlayerModel.decodeScrapbook(data.scrapbook)
    this.ScrapbookLegendary = PlayerModel.decodeScrapbook(data.scrapbook_legendary)

    this.WebshopID = PlayaResponse.unescape(data.webshopid)

    this.Gold = (resources.Gold || 0) / 100

    if (!isEmpty(data.dailyTasksRewards)) {
      const rewards: TaskReward[] = []

      for (const [collected, required, , resourceType, resourceAmount] of chunk(data.dailyTasksRewards as number[], 5)) {
        rewards.push({
          Collected: !!collected,
          Points: required,
          ResourceType: resourceType,
          ResourceAmount: resourceAmount
        })
      }

      this.DailyTasks = {
        Rewards: rewards
      }
    }

    if (!isEmpty(data.eventTasksRewards)) {
      const rewards: TaskReward[] = []

      for (const [collected, required, , resourceType, resourceAmount] of chunk(data.eventTasksRewards as number[], 5)) {
        rewards.push({
          Collected: !!collected,
          Points: required,
          ResourceType: resourceType,
          ResourceAmount: resourceAmount
        })
      }

      this.EventTasks = {
        Rewards: rewards
      }
    }
  }

  #initOther(data: RawPlayer) {
    const legacyDungeons = DungeonHelper.template()

    let dataType: ComplexDataType

    if (data.saveVersion === 2) {
      this.#initCharacterSave(data, legacyDungeons)
      this.#initPotionSave(data)
      this.#initFortressSave(data)
    } else {
      dataType = new ComplexDataType(data.save)
      dataType.assert(256)

      this.ID = dataType.long()
      this.LastOnline = dataType.long() * 1000 + data.offset
      this.Level = dataType.short()
      dataType.clear() // skip
      this.XP = dataType.long()
      this.XPNext = dataType.long()
      this.Honor = dataType.long()
      this.Rank = dataType.long()
      dataType.short()
      this.DevilPercent = dataType.short()
      this.Face = {
        Mouth: dataType.long(),
        Hair: {
          Type: dataType.long() % 100,
          Color: Math.trunc(dataType.back(1).long() / 100)
        },
        Brows: {
          Type: dataType.long() % 100,
          Color: Math.trunc(dataType.back(1).long() / 100)
        },
        Eyes: dataType.long(),
        Beard: {
          Type: dataType.long() % 100,
          Color: Math.trunc(dataType.back(1).long() / 100)
        },
        Nose: dataType.long(),
        Ears: dataType.long(),
        Special: dataType.long(),
        Special2: dataType.long(),
        Portrait: dataType.long()
      }
      this.Race = dataType.short()
      dataType.clear() // skip
      this.Gender = dataType.byte()
      this.Mirror = dataType.byte()
      this.MirrorPieces = PlayerModel.getMirrorPieces((this.ServerId = dataType.short()))
      this.Class = dataType.short() as CharacterClass
      dataType.clear() // skip
      PlayerModel.loadAttributes(this, dataType)
      this.Action = {
        Status: dataType.short()
      } as PlayerAction
      dataType.short() // Skip
      this.Action.Index = dataType.short()
      dataType.short() // Skip
      this.Action.Finish = dataType.long() * 1000 + data.offset
      this.Items = PlayerModel.loadLegacyEquipment(dataType, 1, this.Class)
      this.Mount = dataType.short()
      this.MountValue = PlayerModel.getMount(this.Mount)

      legacyDungeons.Tower = dataType.short()
      legacyDungeons.Raid = dataType.short()

      dataType.short()
      this.Group = {
        ID: dataType.long(),
        Name: data.groupname
      }
      dataType.skip(1) // skip
      this.Book = Math.max(0, dataType.long() - 10000)

      legacyDungeons.Normal[10] = dataType.long()
      legacyDungeons.Normal[11] = dataType.long()

      this.Group.Joined = dataType.long() * 1000 + data.offset
      this.Flags = PlayerModel.getFlags(dataType.long())
      this.Armor = dataType.long()
      this.Damage = {
        Min: dataType.long(),
        Max: dataType.long()
      } as PlayerDamage
      this.Damage.Avg = (this.Damage.Min + this.Damage.Max) / 2
      dataType.skip(12) // skip

      legacyDungeons.Normal[0] = dataType.long()
      legacyDungeons.Normal[1] = dataType.long()
      legacyDungeons.Normal[2] = dataType.long()
      legacyDungeons.Normal[3] = dataType.long()
      legacyDungeons.Normal[4] = dataType.long()
      legacyDungeons.Normal[5] = dataType.long()
      legacyDungeons.Normal[6] = dataType.long()
      legacyDungeons.Normal[7] = dataType.long()
      legacyDungeons.Normal[8] = dataType.long()
      legacyDungeons.Normal[9] = dataType.long()
      legacyDungeons.Normal[12] = dataType.long() - 120

      this.Potions = [
        {
          Type: PlayerModel.getPotionType(dataType.long()),
          Size: dataType.skip(5).long()
        },
        {
          Type: PlayerModel.getPotionType(dataType.back(6).long()),
          Size: dataType.skip(5).long()
        },
        {
          Type: PlayerModel.getPotionType(dataType.back(6).long()),
          Size: dataType.skip(5).long()
        }
      ]
      sortDescending(this.Potions, (potion) => potion.Size)
      this.Potions.Life = dataType.long()
      this.Flags.GoldFrameDisabled = !!dataType.long()
      this.Flags.InvitesDisabled = !!dataType.long()
      dataType.skip(2) // skip
      this.Fortress = {
        Rank: data.fortressrank,
        Fortress: dataType.long(),
        LaborerQuarters: dataType.long(),
        WoodcutterGuild: dataType.long(),
        Quarry: dataType.long(),
        GemMine: dataType.long(),
        Academy: dataType.long(),
        ArcheryGuild: dataType.long(),
        Barracks: dataType.long(),
        MageTower: dataType.long(),
        Treasury: dataType.long(),
        Smithy: dataType.long(),
        Fortifications: dataType.long(),
        RaidWood: dataType.skip(8).long(),
        RaidStone: dataType.long()
      } as PlayerFortress
      dataType.skip(14) // skip
      this.Fortress.Upgrade = {
        Building: dataType.long() - 1,
        Finish: dataType.long() * 1000 + data.offset,
        Start: dataType.long() * 1000 + data.offset
      }
      this.Fortress.Upgrades = dataType.long()
      this.Fortress.Honor = dataType.long()
      dataType.skip(3) // skip
      dataType.short() // skip

      legacyDungeons.Group = dataType.byte()
      legacyDungeons.Player = dataType.byte()
      legacyDungeons.Normal[13] = dataType.long()
      legacyDungeons.Shadow = dataType.byteArray(14)

      dataType.skip(2)

      this.Fortress.Gladiator = dataType.long()
    }

    dataType = new ComplexDataType(data.pets)
    dataType.skip(1) // skip
    this.Pets = {
      Shadow: dataType.long(),
      Light: dataType.long(),
      Earth: dataType.long(),
      Fire: dataType.long(),
      Water: dataType.long()
    }

    if (data.equippedItems) {
      // Override items with equipped items if present (modern implementation)
      this.Items = PlayerModel.loadModernEquipment(new ComplexDataType(data.equippedItems), 1, this.Class)
    }

    this.Name = data.name
    this.Prefix = formatPrefix(data.prefix)
    this.Identifier = data.prefix + '_p' + this.ID

    this.Group.Identifier = this.Group.Name ? `${data.prefix}_g${this.Group.ID}` : null

    this.Dungeons = DungeonHelper.fromData(legacyDungeons, null)
    this.evaluateCommon()
  }

  #initShared(data: RawPlayer) {
    this.Data = data
    this.Own = data.own
    this.Timestamp = data.timestamp
    this.Toilet = {}
    this.Witch = {}

    this.Achievements = [] as unknown as PlayerAchievements
    this.Achievements.Owned = 0

    const achievements = data.achievements || []
    const half = Math.trunc(achievements.length / 2)
    for (let i = 0; i < PlayerModel.ACHIEVEMENTS_COUNT; i++) {
      if (i >= half) {
        this.Achievements.push({
          Owned: false,
          Progress: 0
        })
      } else {
        this.Achievements.push({
          Owned: achievements[i] == 1,
          Progress: achievements[i + half] || 0
        })

        if (achievements[i] == 1) {
          this.Achievements.Owned++
        }
      }
    }

    this.Achievements.PetLover = this.Achievements[36].Owned
    this.Achievements.Dehydration = this.Achievements[63].Owned
    this.Achievements.Grail = this.Achievements[76].Owned

    if (data.gtsave) {
      this.GroupTournament = {
        Tokens: data.gtsave.tokens,
        Floor: data.gtsave.floor,
        FloorMax: data.gtsave.floor_max
      }
    }

    this.Description = PlayaResponse.unescape(data.description)

    this.DataVersion = data.saveVersion

    this.Inventory = {
      Backpack: [],
      Chest: [],
      Shop: [],
      Dummy: {},
      Bert: {},
      Mark: {},
      Kunigunde: {}
    }

    this.Action = {
      Status: -1,
      Index: -1,
      Finish: data.offset,
      Start: data.offset
    }

    this.Fortress = {
      Rank: 0,
      Fortress: 0,
      LaborerQuarters: 0,
      WoodcutterGuild: 0,
      Quarry: 0,
      GemMine: 0,
      Academy: 0,
      ArcheryGuild: 0,
      Barracks: 0,
      MageTower: 0,
      Treasury: 0,
      Smithy: 0,
      Fortifications: 0,
      Upgrade: {
        Building: -1,
        Finish: 1000 + data.offset,
        Start: 1000 + data.offset
      },
      Upgrades: 0,
      Honor: 0,
      Knights: 0
    } as PlayerFortress
  }

  hasGuild() {
    return this.Group.Identifier != null
  }

  getPrimaryAttribute() {
    return this[this.Config.Attribute]
  }

  getHealth() {
    if (typeof this.Config === 'undefined') {
      // Ensure config exists, needed due to simulators
      this.Config = CONFIG.fromID(this.Class)
    }

    const ma = this.Config.HealthMultiplier
    const mb = (100 + this.Dungeons.Player) / 100
    const mc = this.Potions.Life ? 1.25 : 1
    const md = (100 + this.Runes.Health) / 100

    return Math.trunc(Math.floor(Math.floor(this.Constitution.Total * ma * (this.Level + 1) * mb) * mc) * md)
  }

  getEquipmentBonus(attribute: PlayerAttribute) {
    let bonus = 0
    for (const item of this.ItemsArray) {
      for (let i = 0; i < 3; i++) {
        if (item.AttributeTypes[i] == attribute.Type || item.AttributeTypes[i] == 6 || item.AttributeTypes[i] == attribute.Type + 20 || (attribute.Type > 3 && item.AttributeTypes[i] >= 21 && item.AttributeTypes[i] <= 23)) {
          bonus += item.Attributes[i]
        }
      }

      if (item.HasGem && (item.GemType == attribute.Type || item.GemType == 6 || (item.GemType == 7 && (attribute.Type == this.Primary.Type || attribute.Type == 4)))) {
        bonus += item.GemValue * (item.Type == 1 && this.Class != ASSASSIN ? 2 : 1)
      }
    }

    return bonus
  }

  getEquipmentItemBonus(attribute: PlayerAttribute) {
    let bonus = 0
    for (const item of this.ItemsArray) {
      for (let i = 0; i < 3; i++) {
        if (item.AttributeTypes[i] == attribute.Type || item.AttributeTypes[i] == 6 || item.AttributeTypes[i] == attribute.Type + 20 || (attribute.Type > 3 && item.AttributeTypes[i] >= 21 && item.AttributeTypes[i] <= 23)) {
          bonus += item.Attributes[i]
        }
      }
    }

    return bonus
  }

  getEquipmentUpgradeBonus(attribute: PlayerAttribute) {
    let bonus = 0
    for (const item of this.ItemsArray) {
      if (item.Upgrades > 0) {
        for (let i = 0; i < 3; i++) {
          if (item.AttributeTypes[i] == attribute.Type || item.AttributeTypes[i] == 6 || item.AttributeTypes[i] == attribute.Type + 20 || (attribute.Type > 3 && item.AttributeTypes[i] >= 21 && item.AttributeTypes[i] <= 23)) {
            bonus += item.Attributes[i] - Math.floor(item.Attributes[i] / item.UpgradeMultiplier)
          }
        }
      }
    }

    return bonus
  }

  getEquipmentGemBonus(attribute: PlayerAttribute) {
    let bonus = 0
    for (const item of this.ItemsArray) {
      if (item.HasGem && (item.GemType == attribute.Type || item.GemType == 6 || (item.GemType == 7 && (attribute.Type == this.Primary.Type || attribute.Type == 4)))) {
        bonus += item.GemValue * (item.Type == 1 && this.Class != 4 ? 2 : 1)
      }
    }

    return bonus
  }

  getClassBonus(attribute: PlayerAttribute) {
    if (this.Class == BATTLEMAGE || this.Class == BERSERKER) {
      return Math.ceil(((this.Class == BATTLEMAGE ? attribute.Equipment : attribute.Items) * 11) / 100)
    } else {
      return 0
    }
  }

  getPotionSize(attribute: PlayerAttribute) {
    for (const potion of this.Potions) {
      if (potion.Type == attribute.Type) {
        return potion.Size
      }
    }

    return 0
  }

  getPotionIndex(attribute: PlayerAttribute) {
    for (let i = 0; i < this.Potions.length; i++) {
      if (this.Potions[i].Type == attribute.Type) {
        return i
      }
    }

    return -1
  }

  getPotionBonus(attribute: PlayerAttribute) {
    for (const potion of this.Potions) {
      if (potion.Type == attribute.Type) {
        return Math.ceil(((attribute.Base + attribute.Class + attribute.Equipment) * potion.Size) / 100)
      }
    }

    return 0
  }

  getPetBonus(attribute: PlayerAttribute, pet: number) {
    return Math.ceil(((attribute.Base + attribute.Equipment + attribute.Class + attribute.Potion) * pet) / 100)
  }

  addCalculatedAttributes(attribute: PlayerAttribute, pet: number) {
    attribute.Items = this.getEquipmentItemBonus(attribute)
    attribute.Gems = this.getEquipmentGemBonus(attribute)
    attribute.Upgrades = this.getEquipmentUpgradeBonus(attribute)
    attribute.Equipment = attribute.Items + attribute.Gems
    attribute.ItemsBase = attribute.Items - attribute.Upgrades
    attribute.Class = this.getClassBonus(attribute)
    attribute.Potion = this.getPotionBonus(attribute)
    attribute.Pet = this.getPetBonus(attribute, pet)
    attribute.PotionIndex = this.getPotionIndex(attribute)
    attribute.PetBonus = pet
    attribute.NextCost = Calculations.goldAttributeCost(attribute.Purchased ? attribute.Purchased : attribute.Base - this.Achievements.Owned * 5)
    attribute.TotalCost = Calculations.goldAttributeTotalCost(attribute.Purchased ? attribute.Purchased : attribute.Base - this.Achievements.Owned * 5)
    attribute.PotionSize = this.getPotionSize(attribute)

    if (!attribute.Bonus) {
      attribute.Total = attribute.Base + attribute.Pet + attribute.Potion + attribute.Class + attribute.Equipment
    } else {
      attribute.Total = attribute.Base + attribute.Bonus
    }
  }

  evaluateCommon() {
    this.Config = CONFIG.fromID(this.Class)
    this.ItemsArray = Object.values(this.Items)

    this.Primary = this.getPrimaryAttribute()
    this.ClassBonus = this.Class == BATTLEMAGE || this.Class == BERSERKER

    this.addCalculatedAttributes(this.Strength, this.Pets.Water)
    this.addCalculatedAttributes(this.Dexterity, this.Pets.Light)
    this.addCalculatedAttributes(this.Intelligence, this.Pets.Earth)
    this.addCalculatedAttributes(this.Constitution, this.Pets.Shadow)
    this.addCalculatedAttributes(this.Luck, this.Pets.Fire)

    const runes = {
      Gold: 0,
      Chance: 0,
      Quality: 0,
      XP: 0,
      Health: 0,
      ResistanceFire: 0,
      ResistanceCold: 0,
      ResistanceLightning: 0,
      Damage: 0,
      DamageFire: 0,
      DamageCold: 0,
      DamageLightning: 0,
      Damage2: 0,
      Damage2Fire: 0,
      Damage2Cold: 0,
      Damage2Lightning: 0,
      Resistance: 0,
      Runes: 0,
      Achievements: 0
    }

    this.Runes = runes

    if (this.Achievements[74].Owned) {
      runes.Runes = 33
      runes.Achievements = 33
    } else if (this.Achievements[73].Owned) {
      runes.Runes = 24
      runes.Achievements = 24
    } else if (this.Achievements[72].Owned) {
      runes.Runes = 18
      runes.Achievements = 18
    } else if (this.Achievements[71].Owned) {
      runes.Runes = 12
      runes.Achievements = 12
    } else if (this.Achievements[70].Owned) {
      runes.Runes = 6
      runes.Achievements = 6
    }

    let partCold = 0
    let partFire = 0
    let partLightning = 0

    for (const item of this.ItemsArray) {
      if (item.HasRune && item.Type != 1) {
        const rune = item.AttributeTypes[2]
        const value = item.Attributes[2]

        if (rune == 31) {
          runes.Gold += value
          if (RUNE_VALUE.GOLD(value) > runes.Runes) {
            runes.Runes = RUNE_VALUE.GOLD(value)
          }
        } else if (rune == 32) {
          runes.Chance += value
          if (RUNE_VALUE.EPIC_FIND(value) > runes.Runes) {
            runes.Runes = RUNE_VALUE.EPIC_FIND(value)
          }
        } else if (rune == 33) {
          runes.Quality += value
          if (RUNE_VALUE.ITEM_QUALITY(value) > runes.Runes) {
            runes.Runes = RUNE_VALUE.ITEM_QUALITY(value)
          }
        } else if (rune == 34) {
          runes.XP += value
          if (RUNE_VALUE.XP(value) > runes.Runes) {
            runes.Runes = RUNE_VALUE.XP(value)
          }
        } else if (rune == 35) {
          runes.Health += value
          if (RUNE_VALUE.HEALTH(value) > runes.Runes) {
            runes.Runes = RUNE_VALUE.HEALTH(value)
          }
        } else if (rune == 36) {
          runes.ResistanceFire += value
          partFire += value
          if (RUNE_VALUE.SINGLE_RESISTANCE(value) > runes.Runes) {
            runes.Runes = RUNE_VALUE.SINGLE_RESISTANCE(value)
          }
        } else if (rune == 37) {
          runes.ResistanceCold += value
          partCold += value
          if (RUNE_VALUE.SINGLE_RESISTANCE(value) > runes.Runes) {
            runes.Runes = RUNE_VALUE.SINGLE_RESISTANCE(value)
          }
        } else if (rune == 38) {
          runes.ResistanceLightning += value
          partLightning += value
          if (RUNE_VALUE.SINGLE_RESISTANCE(value) > runes.Runes) {
            runes.Runes = RUNE_VALUE.SINGLE_RESISTANCE(value)
          }
        } else if (rune == 39) {
          runes.ResistanceFire += value
          runes.ResistanceCold += value
          runes.ResistanceLightning += value
          runes.Resistance += value
          if (RUNE_VALUE.TOTAL_RESISTANCE(value) > runes.Runes) {
            runes.Runes = RUNE_VALUE.TOTAL_RESISTANCE(value)
          }
        }
      }
    }

    if (this.Items.Wpn1.AttributeTypes[2] >= 40) {
      const rune = this.Items.Wpn1.AttributeTypes[2]
      const value = this.Items.Wpn1.Attributes[2]

      runes.Damage += value
      if (RUNE_VALUE.ELEMENTAL_DAMAGE(value) > runes.Runes) {
        runes.Runes = RUNE_VALUE.ELEMENTAL_DAMAGE(value)
      }

      if (rune == 40) {
        runes.DamageFire = value
      } else if (rune == 41) {
        runes.DamageCold = value
      } else if (rune == 42) {
        runes.DamageLightning = value
      }
    }

    const secondWeapon = this.Items.Wpn2 as ItemModel

    if (this.Class == ASSASSIN && secondWeapon.AttributeTypes[2] >= 40) {
      const rune = secondWeapon.AttributeTypes[2]
      const value = secondWeapon.Attributes[2]

      runes.Damage2 += value
      if (RUNE_VALUE.ELEMENTAL_DAMAGE(value) > runes.Runes) {
        runes.Runes = RUNE_VALUE.ELEMENTAL_DAMAGE(value)
      }

      if (rune == 40) {
        runes.Damage2Fire = value
      } else if (rune == 41) {
        runes.Damage2Cold = value
      } else if (rune == 42) {
        runes.Damage2Lightning = value
      }
    }

    if (this.Class === ASSASSIN) {
      this.Damage2 = {
        Min: secondWeapon.DamageMin,
        Max: secondWeapon.DamageMax
      } as PlayerDamage
      this.Damage2.Avg = (this.Damage2.Min + this.Damage2.Max) / 2
    }

    runes.Gold = Math.min(50, runes.Gold)
    runes.Chance = Math.min(50, runes.Chance)
    runes.Quality = Math.min(5, runes.Quality)
    runes.XP = Math.min(10, runes.XP)
    runes.Health = Math.min(15, runes.Health)

    runes.Resistance += Math.min(25, Math.trunc(partFire / 3))
    runes.Resistance += Math.min(25, Math.trunc(partCold / 3))
    runes.Resistance += Math.min(25, Math.trunc(partLightning / 3))
    runes.Resistance = Math.min(75, runes.Resistance)

    runes.ResistanceFire = Math.min(75, runes.ResistanceFire)
    runes.ResistanceCold = Math.min(75, runes.ResistanceCold)
    runes.ResistanceLightning = Math.min(75, runes.ResistanceLightning)

    runes.Damage = Math.min(60, runes.Damage)
    runes.DamageFire = Math.min(60, runes.DamageFire)
    runes.DamageCold = Math.min(60, runes.DamageCold)
    runes.DamageLightning = Math.min(60, runes.DamageLightning)

    runes.Damage2 = Math.min(60, runes.Damage2)
    runes.Damage2Fire = Math.min(60, runes.Damage2Fire)
    runes.Damage2Cold = Math.min(60, runes.Damage2Cold)
    runes.Damage2Lightning = Math.min(60, runes.Damage2Lightning)

    this.OriginalAction = {
      Status: this.Action.Status,
      Finish: this.Action.Finish,
      Index: this.Action.Index
    }

    if (this.Action.Status < 0) {
      this.Action.Status += 256
    }

    if (this.Action.Status == 0) {
      this.Action.Index = 0
      this.Action.Finish = 0
    }

    this.Potions.LifeIndex = this.Potions.findIndex((x) => x.Type == 6)
    if (this.DataVersion === 2) {
      // Fill in Life potion potency for v2
      this.Potions.Life = this.Potions.LifeIndex !== -1 ? 25 : 0
    }

    this.XPTotal = this.XP + Calculations.experienceTotalLevel(this.Level)

    this.BookPercentage = this.Book / PlayerModel.SCRAPBOOK_COUNT

    this.Fortress.RaidHonor =
      Number(this.Fortress.Honor) -
      10 *
        (this.Fortress.Fortress +
          this.Fortress.LaborerQuarters +
          this.Fortress.WoodcutterGuild +
          this.Fortress.Quarry +
          this.Fortress.GemMine +
          this.Fortress.Academy +
          this.Fortress.ArcheryGuild +
          this.Fortress.Barracks +
          this.Fortress.MageTower +
          this.Fortress.Treasury +
          this.Fortress.Smithy +
          this.Fortress.Fortifications)

    if (this.Data.units) {
      this.Fortress.Wall = this.Data.units[0]
      this.Fortress.Warriors = this.Data.units[1]
      this.Fortress.Mages = this.Data.units[2]
      this.Fortress.Archers = this.Data.units[3]
    }

    if (this.Class === WARRIOR) {
      this.BlockChance = secondWeapon.DamageMin
    }

    this.Health = this.getHealth()
  }

  injectGroup(group: GroupModel | undefined) {
    if (group) {
      // Find index of player in the group
      const gi = group.Members.findIndex((identifier) => identifier == this.Identifier)
      if (gi === -1) {
        return
      }

      // Add guild information
      this.Group.Group = group
      this.Group.Role = group.Roles[gi]
      this.Group.Index = gi
      this.Group.Rank = group.Rank
      this.Group.Actions = group.MemberActions[gi]

      this.Group.ReadyAttack = this.Group.Actions.Attack || this.Group.Actions.Raid
      this.Group.ReadyDefense = this.Group.Actions.Defense

      if (typeof this.LastOnline === 'undefined' || this.LastOnline < 6e11) {
        this.LastOnline = group.LastActives[gi]
      }

      if (group.Own) {
        this.Group.Own = true
        this.Group.Pet = group.Pets[gi]
        this.Group.Treasure = group.Treasures[gi]
        this.Group.Instructor = group.Instructors[gi]
        this.Group.Raid = group.Raid

        if (!this.Fortress.Knights && group.Knights) {
          this.Fortress.Knights = group.Knights[gi]
        }
      } else {
        this.Group.Pet = group.Pets[gi]
      }
    }
  }

  static loadLegacyEquipment(dataType: ComplexDataType, inventoryType: number, characterClass: CharacterClass) {
    const items: PlayerItems = {
      Head: new ItemModel(ItemModel.LEGACY, dataType.sub(12), inventoryType, 1),
      Body: new ItemModel(ItemModel.LEGACY, dataType.sub(12), inventoryType, 2),
      Hand: new ItemModel(ItemModel.LEGACY, dataType.sub(12), inventoryType, 3),
      Feet: new ItemModel(ItemModel.LEGACY, dataType.sub(12), inventoryType, 4),
      Neck: new ItemModel(ItemModel.LEGACY, dataType.sub(12), inventoryType, 5),
      Belt: new ItemModel(ItemModel.LEGACY, dataType.sub(12), inventoryType, 6),
      Ring: new ItemModel(ItemModel.LEGACY, dataType.sub(12), inventoryType, 7),
      Misc: new ItemModel(ItemModel.LEGACY, dataType.sub(12), inventoryType, 8),
      Wpn1: new ItemModel(ItemModel.LEGACY, dataType.sub(12), inventoryType, 9)
    }

    if (characterClass === WARRIOR || characterClass === ASSASSIN) {
      items.Wpn2 = new ItemModel(ItemModel.LEGACY, dataType.sub(12), inventoryType, 10)
    } else {
      dataType.sub(12)
    }

    return items
  }

  static loadModernEquipment(dataType: ComplexDataType, inventoryType: number, characterClass: CharacterClass) {
    const items: PlayerItems = {
      Head: new ItemModel(ItemModel.MODERN, dataType.sub(19), inventoryType, 1),
      Body: new ItemModel(ItemModel.MODERN, dataType.sub(19), inventoryType, 2),
      Hand: new ItemModel(ItemModel.MODERN, dataType.sub(19), inventoryType, 3),
      Feet: new ItemModel(ItemModel.MODERN, dataType.sub(19), inventoryType, 4),
      Neck: new ItemModel(ItemModel.MODERN, dataType.sub(19), inventoryType, 5),
      Belt: new ItemModel(ItemModel.MODERN, dataType.sub(19), inventoryType, 6),
      Ring: new ItemModel(ItemModel.MODERN, dataType.sub(19), inventoryType, 7),
      Misc: new ItemModel(ItemModel.MODERN, dataType.sub(19), inventoryType, 8),
      Wpn1: new ItemModel(ItemModel.MODERN, dataType.sub(19), inventoryType, 9)
    }

    if (characterClass === WARRIOR || characterClass === ASSASSIN) {
      items.Wpn2 = new ItemModel(ItemModel.MODERN, dataType.sub(19), inventoryType, 10)
    } else {
      dataType.sub(19)
    }

    return items
  }

  static decodeScrapbook(data: string | undefined) {
    if (data) {
      const baseString = atob(data.replace(/-/g, '+').replace(/_/g, '/'))
      const output = new Array<boolean>(baseString.length * 8)

      for (let i = 0; i < baseString.length; i++) {
        const char = baseString.charCodeAt(i)

        for (let j = 0; j < 8; j++) {
          output[i * 8 + j] = (char & (1 << (7 - j))) > 0
        }
      }

      return output
    } else {
      return []
    }
  }

  static getScroll(value: number) {
    return this.SCROLL_MAP[value]
  }

  static getMount(value: number) {
    return this.MOUNT_MAP[value]
  }

  static getFlags(value: number): PlayerFlags {
    let background = 0
    for (let i = 2; i >= 0; i--) {
      if ((value & (1 << (6 + i))) != 0) {
        background = i + 1
      }
    }

    return {
      GroupTournamentBackground: background,
      GoldFrame: (value & (1 << 5)) != 0,
      OfficialCreator: (value & (1 << 9)) != 0,
      OfficialDiscord: (value & (1 << 10)) != 0,
      TwitchFrame: (value & (1 << 11)) != 0,
      FriendlyFireFrame: (value & (1 << 12)) != 0
    }
  }

  static getPotionType(type: number) {
    return type == 16 ? 6 : type == 0 ? 0 : 1 + ((type - 1) % 5)
  }

  static getMirrorPieces(value: number) {
    let p = 0

    for (let i = 0; i < 15; i++) {
      if ((value >> i) & 1) p++
    }

    return p
  }

  static loadAttributes(player: Record<AttributeName, PlayerAttribute>, dataType: ComplexDataType, skipPurchased = true) {
    player.Strength = {
      Type: 1,
      Base: dataType.long(),
      Bonus: dataType.skip(4).long()
    } as PlayerAttribute

    player.Dexterity = {
      Type: 2,
      Base: dataType.back(5).long(),
      Bonus: dataType.skip(4).long()
    } as PlayerAttribute

    player.Intelligence = {
      Type: 3,
      Base: dataType.back(5).long(),
      Bonus: dataType.skip(4).long()
    } as PlayerAttribute

    player.Constitution = {
      Type: 4,
      Base: dataType.back(5).long(),
      Bonus: dataType.skip(4).long()
    } as PlayerAttribute

    player.Luck = {
      Type: 5,
      Base: dataType.back(5).long(),
      Bonus: dataType.skip(4).long()
    } as PlayerAttribute

    // Skip purchased attributes
    if (skipPurchased) {
      dataType.skip(5)
    } else {
      player.Strength.Purchased = dataType.long()
      player.Dexterity.Purchased = dataType.long()
      player.Intelligence.Purchased = dataType.long()
      player.Constitution.Purchased = dataType.long()
      player.Luck.Purchased = dataType.long()
    }
  }
}

export class CompanionModel extends PlayerModel {
  constructor(player: PlayerModel, comp: CompanionData, items: PlayerItems, pclass: CharacterClass) {
    super(null)

    this.ID = -390 - pclass
    this.Name = globalLocalize(`general.companion${pclass}_full`, { player: player.Name })
    this.Level = comp.Level
    this.Class = pclass
    this.Armor = comp.Armor
    this.Damage = comp.Damage
    this.Potions = player.Potions
    this.Pets = player.Pets
    this.Dungeons = player.Dungeons
    this.Achievements = player.Achievements
    this.Fortress = player.Fortress
    this.Underworld = player.Underworld

    this.Items = items
    for (const [key, item] of Object.entries(this.Items) as [keyof PlayerItems, ItemModel][]) {
      if (player.Class == BATTLEMAGE && this.Class == MAGE && item.Class == MAGE && item.Type > 1) {
        // When player is BattleMage and it's Mage equipment -> Strength into Intelligence
        this.Items[key] = item.morph(1, 3)
      } else if (player.Class == ASSASSIN && this.Class == WARRIOR && item.Class == WARRIOR && item.Type == 1) {
        // When player is Assassin and it's Warrior weapon -> Dexterity into Strength
        this.Items[key] = item.morph(2, 1)
      } else if (player.Class == DEMONHUNTER && this.Class == WARRIOR && item.Class == WARRIOR && item.Type > 1) {
        // When player is DemonHunter and it's Warrior equipment -> Dexterity into Strength
        this.Items[key] = item.morph(2, 1)
      } else if (player.Class == DRUID && this.Class == SCOUT && item.Class == SCOUT && item.Type > 1) {
        // When player is Druid and it's Scout equipment -> Intelligence into Dexterity
        this.Items[key] = item.morph(3, 2)
      } else if (player.Class == BARD && this.Class == SCOUT && item.Class == SCOUT && item.Type > 1) {
        // When player is Bard and it's Scout equipment -> Intelligence into Dexterity
        this.Items[key] = item.morph(3, 2)
      } else if (player.Class == PLAGUEDOCTOR && this.Class == WARRIOR && item.Class == WARRIOR && item.Type == 1) {
        // When player is Plague Doctor and it's Warrior equipment -> Dexterity into Strength
        this.Items[key] = item.morph(2, 1)
      } else if (player.Class == PLAGUEDOCTOR && this.Class == MAGE && item.Class == MAGE && item.Type > 1) {
        // When player is Plague Doctor and it's Mage equipment -> Dexterity into Intelligence
        this.Items[key] = item.morph(2, 3)
      }
    }

    this.Strength = comp.Strength
    this.Dexterity = comp.Dexterity
    this.Intelligence = comp.Intelligence
    this.Constitution = comp.Constitution
    this.Luck = comp.Luck

    this.evaluateCommon(player)
  }

  evaluateCommon(companionPlayer?: PlayerModel) {
    const player = companionPlayer as PlayerModel

    this.Config = CONFIG.fromID(this.Class)
    this.ItemsArray = Object.values(this.Items)

    this.Primary = this.getPrimaryAttribute()

    this.addCalculatedAttributes(this.Strength, player.Pets.Water)
    this.addCalculatedAttributes(this.Dexterity, player.Pets.Light)
    this.addCalculatedAttributes(this.Intelligence, player.Pets.Earth)
    this.addCalculatedAttributes(this.Constitution, player.Pets.Shadow)
    this.addCalculatedAttributes(this.Luck, player.Pets.Fire)

    const runes: PlayerRunes = {
      Gold: 0,
      Chance: 0,
      Quality: 0,
      XP: 0,
      Health: 0,
      ResistanceFire: 0,
      ResistanceCold: 0,
      ResistanceLightning: 0,
      Damage: 0,
      DamageFire: 0,
      DamageCold: 0,
      DamageLightning: 0,
      Resistance: 0
    }

    this.Runes = runes

    // runes.Runes is never set here, so every comparison below is false like in the legacy code
    for (const item of this.ItemsArray) {
      if (item.HasRune) {
        const rune = item.AttributeTypes[2]
        const value = item.Attributes[2]

        if (rune == 31) {
          runes.Gold += value
          if (RUNE_VALUE.GOLD(value) > Number(runes.Runes)) {
            runes.Runes = RUNE_VALUE.GOLD(value)
          }
        } else if (rune == 32) {
          runes.Chance += value
          if (RUNE_VALUE.EPIC_FIND(value) > Number(runes.Runes)) {
            runes.Runes = RUNE_VALUE.EPIC_FIND(value)
          }
        } else if (rune == 33) {
          runes.Quality += value
          if (RUNE_VALUE.ITEM_QUALITY(value) > Number(runes.Runes)) {
            runes.Runes = RUNE_VALUE.ITEM_QUALITY(value)
          }
        } else if (rune == 34) {
          runes.XP += value
          if (RUNE_VALUE.XP(value) > Number(runes.Runes)) {
            runes.Runes = RUNE_VALUE.XP(value)
          }
        } else if (rune == 35) {
          runes.Health += value
          if (RUNE_VALUE.HEALTH(value) > Number(runes.Runes)) {
            runes.Runes = RUNE_VALUE.HEALTH(value)
          }
        } else if (rune == 36) {
          runes.ResistanceFire += value
          runes.Resistance += Math.trunc(value / 3)
          if (RUNE_VALUE.SINGLE_RESISTANCE(value) > Number(runes.Runes)) {
            runes.Runes = RUNE_VALUE.SINGLE_RESISTANCE(value)
          }
        } else if (rune == 37) {
          runes.ResistanceCold += value
          runes.Resistance += Math.trunc(value / 3)
          if (RUNE_VALUE.SINGLE_RESISTANCE(value) > Number(runes.Runes)) {
            runes.Runes = RUNE_VALUE.SINGLE_RESISTANCE(value)
          }
        } else if (rune == 38) {
          runes.ResistanceLightning += value
          runes.Resistance += Math.trunc(value / 3)
          if (RUNE_VALUE.SINGLE_RESISTANCE(value) > Number(runes.Runes)) {
            runes.Runes = RUNE_VALUE.SINGLE_RESISTANCE(value)
          }
        } else if (rune == 39) {
          runes.ResistanceFire += value
          runes.ResistanceCold += value
          runes.ResistanceLightning += value
          runes.Resistance += value
          if (RUNE_VALUE.TOTAL_RESISTANCE(value) > Number(runes.Runes)) {
            runes.Runes = RUNE_VALUE.TOTAL_RESISTANCE(value)
          }
        } else if (rune == 40) {
          runes.DamageFire += value
          runes.Damage += value
          if (RUNE_VALUE.ELEMENTAL_DAMAGE(value) > Number(runes.Runes)) {
            runes.Runes = RUNE_VALUE.ELEMENTAL_DAMAGE(value)
          }
        } else if (rune == 41) {
          runes.DamageCold += value
          runes.Damage += value
          if (RUNE_VALUE.ELEMENTAL_DAMAGE(value) > Number(runes.Runes)) {
            runes.Runes = RUNE_VALUE.ELEMENTAL_DAMAGE(value)
          }
        } else if (rune == 42) {
          runes.DamageLightning += value
          runes.Damage += value
          if (RUNE_VALUE.ELEMENTAL_DAMAGE(value) > Number(runes.Runes)) {
            runes.Runes = RUNE_VALUE.ELEMENTAL_DAMAGE(value)
          }
        }
      }
    }

    runes.Gold = Math.min(50, runes.Gold)
    runes.Chance = Math.min(50, runes.Chance)
    runes.Quality = Math.min(5, runes.Quality)
    runes.XP = Math.min(10, runes.XP)
    runes.Health = Math.min(15, runes.Health)
    runes.Resistance = Math.min(75, runes.Resistance)
    runes.ResistanceFire = Math.min(75, runes.ResistanceFire)
    runes.ResistanceCold = Math.min(75, runes.ResistanceCold)
    runes.ResistanceLightning = Math.min(75, runes.ResistanceLightning)
    runes.Damage = Math.min(60, runes.Damage)
    runes.DamageFire = Math.min(60, runes.DamageFire)
    runes.DamageCold = Math.min(60, runes.DamageCold)
    runes.DamageLightning = Math.min(60, runes.DamageLightning)
  }

  // Override to disable gem doubling
  getEquipmentGemBonus(attribute: PlayerAttribute) {
    let bonus = 0
    for (const item of this.ItemsArray) {
      if (item.HasGem && (item.GemType == attribute.Type || item.GemType == 6 || (item.GemType == 7 && (attribute.Type == this.Primary.Type || attribute.Type == 4)))) {
        bonus += item.GemValue
      }
    }

    return bonus
  }

  static fromTower(dataType: ComplexDataType) {
    const data = {
      Level: dataType.long()
    } as CompanionData
    dataType.skip(3)
    PlayerModel.loadAttributes(data, dataType)

    data.Armor = dataType.long()
    data.Damage = {
      Min: dataType.long(),
      Max: dataType.long()
    } as PlayerDamage
    data.Damage.Avg = Math.trunc((data.Damage.Min + data.Damage.Max) / 2)

    return data
  }
}
