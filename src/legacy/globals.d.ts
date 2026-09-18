type SiteMetadata = {
  name: string
  type?: string
  requires?: string[]
}

type SiteOptions = {
  locale: string
  terms_accepted: number | boolean
  version_accepted: string | boolean
  announcement_accepted: number
  announcements_viewed: string[]
  endpoint_terms_accepted: number
  has_storage_access: boolean
}

declare class Site {
  static options: SiteOptions
  static ready(metadata: SiteMetadata, callback: (params: URLSearchParams) => unknown): void
  static run(): void
  static is(name: string): boolean
  static isEvent(type: 'april_fools_day' | 'winter' | 'halloween'): boolean
}

declare class SiteAPI {
  static post(endpoint: string, data: unknown): Promise<unknown>
}

declare class StoreWrapper {
  static isAvailable(): boolean
  get<TValue>(key: string, defaultData: TValue, rawData?: boolean): TValue
  set(key: string, data: unknown, rawData?: boolean): void
  isPermanent(): boolean
}

declare const Store: StoreWrapper & {
  shared: StoreWrapper
  session: StoreWrapper
}

// Only setting an option saves it, so an array has to be set again after changing it
declare const OptionsHandler: new <TOptions extends Record<string, unknown>>(key: string, defaults: TOptions) => TOptions & { keys(): (keyof TOptions & string)[] }

declare class Logger {
  static log(type: string, text: string): void
  static error(error: unknown, text: string): void
}

declare const MODULE_VERSION: string
declare const MODULE_VERSION_MAJOR: string

declare class Exporter {
  static readonly time: string
  static json(content: unknown, name?: string): void
  static download(name: string, content: Blob): void
}

declare class Broadcast {
  constructor(token?: string)
  readonly token: string
  on(type: string, callback: (data: unknown) => void): void
  send(type: string, data: unknown): void
  close(): void
}

type DatabaseProfile = Record<string, unknown>

declare const SELF_PROFILE: DatabaseProfile
declare const SELF_PROFILE_WITH_GROUP: DatabaseProfile
declare const HYDRA_PROFILE: DatabaseProfile
declare const FIGHT_SIMULATOR_PROFILE: DatabaseProfile

declare class WorkerBatch<TResult> {
  constructor(type: string)
  add(callback: (data: TResult) => void, params: object): void
  run(instances: number): Promise<number>
}

declare function _formatDate(date: number, showDate?: boolean, showTime?: boolean): string
declare function _formatPrefix(prefix: string): string
declare function _timestampOffset(date?: Date): number

type DatabaseEntry = {
  LinkId: string
  Name: string
  Prefix: string
  Timestamp: number
  Own: boolean
  Data: {
    name: string
    prefix: string
  }
}

type PetHabitat = 'Shadow' | 'Light' | 'Earth' | 'Fire' | 'Water'

type PlayerEntry = DatabaseEntry & {
  Level: number
  Class: CharacterClass
  Pets?: {
    Levels: number[]
    // 20 once the dungeon is finished
    Dungeons: number[]
    TotalLevel: number
  } & Record<`${PetHabitat}Count`, number> &
    Record<`${PetHabitat}Levels`, number[]>
  Fortress?: {
    Gladiator: number
  }
  Idle?: {
    Runes: number
    Buildings?: number[]
    Upgrades: {
      Money: number[]
      Speed: number[]
    }
  }
}

type PlayerData = PlayerEntry & Record<MainAttribute | 'Constitution' | 'Luck', { Total: number }>

type GroupEntry = DatabaseEntry & {
  Members: string[]
  MembersTotal: number
  MembersPresent: number
  Hydra?: number
}

type DatabaseHistory<TEntry> = Record<number, TEntry> & {
  Latest: TEntry
  List: TEntry[]
}

declare class PlayaResponse {
  static importData(json: unknown, timestamp?: number, offset?: number): { players: unknown[]; groups: unknown[] }
}

declare class DatabaseManager {
  static Groups: Record<string, DatabaseHistory<GroupEntry>>
  static load(profile: DatabaseProfile): Promise<void>
  static import(text: string, timestamp: number, timestampOffset?: number, flags?: { temporary?: boolean }): Promise<void>
  static getLatestPlayers(onlyOwn?: boolean): PlayerEntry[]
  static isPlayer(identifier: string): boolean
  static getPlayer(identifier: string): DatabaseHistory<PlayerEntry> | undefined
  static getPlayer(identifier: string, timestamp: number): PlayerData | undefined
  static getGroup(identifier: string): DatabaseHistory<DatabaseEntry> | undefined
}

type BlacksmithResources = {
  Metal: number
  Crystal: number
}

declare class ItemModel {
  static empty(): ItemModel
  static forceCorrectRune(item: ItemModel | undefined): void
  Type: number
  PicIndex: number
  DamageMin: number
  DamageMax: number
  HasEnchantment: boolean
  Attributes: number[]
  AttributeTypes: number[]
  readonly SellPrice: {
    Gold: number
  }
  upgradeTo(upgrades: number): void
  getBlacksmithPrice(): BlacksmithResources
  getBlacksmithUpgradePrice(): BlacksmithResources
  morph(from: number, to: number, force?: boolean): ItemModel
}

type Attribute = MainAttribute | 'Constitution' | 'Luck'

type PlayerAttribute = {
  Base: number
  Total: number
  Bonus?: number
}

declare class PlayerModel {
  static ATTRIBUTES: Attribute[]
  static ATTRIBUTE_TO_TYPE: Record<Attribute, number>
  static ATTRIBUTE_ORDER_BY_ATTRIBUTE: Record<MainAttribute, MainAttribute[]>
  constructor(data?: unknown)
  Name: string
  Prefix?: string
  Class: CharacterClass
  Level: number
  Armor: number
  BlockChance?: number
  Strength: PlayerAttribute
  Dexterity: PlayerAttribute
  Intelligence: PlayerAttribute
  Constitution: PlayerAttribute
  Luck: PlayerAttribute
  Items: Record<string, ItemModel> & {
    Wpn1: ItemModel
    Wpn2: ItemModel
  }
  Runes: Record<string, number>
  Pets: Record<string, number>
  Potions: { Type: number; Size: number }[] & { Life?: number }
  Companions?: Record<string, PlayerModel>
  evaluateCommon(player?: PlayerModel): void
}

declare class ModelUtils {
  static estimatePower(model: SimulatorPlayer): number
  static toSimulatorData(model: PlayerModel | PlayerData): PlayerModel
  static toSimulatorData(model: PlayerModel | PlayerData, includeCompanions: boolean): PlayerModel | PlayerModel[]
}

type CharacterClass = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

type MainAttribute = 'Strength' | 'Dexterity' | 'Intelligence'

declare const WARRIOR: 1
declare const ASSASSIN: 4

declare const RUNE_FIRE_DAMAGE: 40
declare const RUNE_COLD_DAMAGE: 41
declare const RUNE_LIGHTNING_DAMAGE: 42
declare const RUNE_AUTO_DAMAGE: 999

type ClassConfig = {
  ID: CharacterClass
  Attribute: MainAttribute
  MaximumDamageReduction: number
  WeaponMultiplier: number
  SkipChance: number
}

declare const CONFIG: {
  General: {
    CritGladiatorBonus: number
  }
  set(config: unknown): void
  classes(): ClassConfig[]
  ids(): CharacterClass[]
  fromID(index: number): ClassConfig
}

declare const SNACKS: Record<string, Record<string, number>>

type SimulatorPlayer = Record<Attribute, { Total: number }> & {
  Class: CharacterClass
  Level: number
}

type SimulatorModelState = {
  SkipChance: number
  CriticalChance: number
  CriticalMultiplier: number
  Weapon1: {
    Min: number
    Max: number
  }
}

declare class SimulatorModel {
  static normalize(player: SimulatorPlayer): SimulatorPlayer
  Player: SimulatorPlayer
  Config: ClassConfig
  TotalHealth: number
  Data: SimulatorModelState | null
  initialize(target: SimulatorModel): void
}

type SimulatorPet = {
  Name?: string
  Type: number
  // Within its habitat, 0 to 19
  Pet: number
  Boss: number
  Level: number
  Pack: number
  At100: number
  At150: number
  At200: number
  Gladiator: number
}

declare class PetModel {
  static getPlayer(pet: SimulatorPet): SimulatorPlayer
  static getModel(pet: SimulatorPet, index?: number): SimulatorModel
}

type Monster = {
  Level: number
  Class: CharacterClass
  Items: {
    Wpn1: {
      AttributeTypes: Record<number, number>
    }
  }
}

declare class MonsterGenerator {
  static MONSTER_NORMAL: symbol
  static MONSTER_RAID: symbol
  static create(type: symbol, level: number, classId: CharacterClass, runeType?: number, runeValue?: number): Monster
}

declare class Calculations {
  static experienceNextLevel(level: number): number
  static experienceQuestMin(level: number, book: number, guildInstructor: number, runes: number): number
  static experienceQuestMax(level: number, book: number, guildInstructor: number, runes: number): number
  static experienceExpedition(level: number, book: number, guildInstructor: number, runes: number, scroll: boolean, stars: number, mount: number): number
  static experienceSecretMission(level: number, hydra: number): number
  static experienceArena(level: number): number
  static experienceWheelBooks(level: number): number
  static experienceWheelBook(level: number): number
  static experienceCalendar(level: number, book: number): number
  static experiencePetHabitat(level: number): number
  static experienceTwisterEnemy(level: number): number
  static experienceAcademyHourly(level: number, academy: number): number
  static experienceAcademyCapacity(level: number, academy: number): number
  static souls(level: number, gate: number, torture: number): number
  static gold(level: number): number
  static goldEnvironmentalReward(level: number): number
  static goldAttributeCost(attribute: number): number
  static goldAttributeTotalCost(attribute: number): number
  static goldTowerEnemy(level: number): number
  static goldTwisterEnemy(level: number): number
  static goldArena(level: number): number
  static goldDice(level: number, dices: number): number
  static goldGuardDuty(level: number, tower: number, guildTreasure: number): number
  static goldGem(level: number, mine: number, gemSize: number): number
  static goldWitchScroll(level: number): number
  static goldFortressReroll(level: number): number
  static goldWitchPotion(level: number): number
  static goldPotionCost(level: number, runes: number, potionSize: number): number
  static goldLifePotionCost(level: number, runes: number): number
  static goldLifePotionShroomlessCost(level: number, runes: number): number
  static goldCalendarBar(level: number): number
  static goldCalendarBars(level: number): number
  static goldHourglassCost(level: number, runes: number): number
  static goldHourglassPackCost(level: number, runes: number): number
  static goldPitHourly(level: number, pit: number): number
  static goldPitCapacity(level: number, pit: number): number
  static goldQuestMin(level: number, tower: number, guildTreasure: number, runes: number): number
  static goldQuestMax(level: number, tower: number, guildTreasure: number, runes: number): number
  static goldExpedition(level: number, tower: number, guildTreasure: number, runes: number, scroll: boolean, mount: number): number
}

declare const NAME_UNIT_UNDERWORLD: Record<number, string>

type Pet = {
  location: number
  next: [Date, Date]
  time: 'any' | 'day' | 'night' | 'witch'
  condition: true | ((player: PlayerEntry) => boolean)
}

declare const PetData: Pet[]

declare class Playa {
  static getServerUrlById(id: number): string | undefined
  static getClientVersion(): string
}

// Version 1.1.4 can't read oklch(), oklab() or color-mix() colours
declare function html2canvas(element: HTMLElement, options?: { logging?: boolean; backgroundColor?: string | null }): Promise<HTMLCanvasElement>

type ChangelogRelease = string[] | Record<string, string[]>

declare const CHANGELOG: Record<string, ChangelogRelease>

type Announcement = {
  id: string
  title: string
  content: string
  for?: string[]
  disabled?: boolean
}

declare const ANNOUNCEMENTS: Announcement[]
