// Globals declared by the legacy classic scripts that a page loads in its HTML (<script vite-ignore>).
// Only what the Vue code uses is typed here.

// js/core/core.js

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

// Every option is a property that saves itself to the store when set. Arrays have to be set again after changing them.
declare const OptionsHandler: new <TOptions extends Record<string, unknown>>(key: string, defaults: TOptions) => TOptions & { keys(): (keyof TOptions & string)[] }

declare class Logger {
  static log(type: string, text: string): void
  static error(error: unknown, text: string): void
}

declare const MODULE_VERSION: string
declare const MODULE_VERSION_MAJOR: string

declare class Exporter {
  // Current date and time for file names, such as 2025_01_31_12_30_00_000
  static readonly time: string
  // Downloads `content` as a `<name>.json` file
  static json(content: unknown, name?: string): void
  // Downloads `content` under the name, which carries its own extension
  static download(name: string, content: Blob): void
}

// BroadcastChannel between tabs, messages are `{ type, data }`
declare class Broadcast {
  // Opens a channel with a random token when none is given
  constructor(token?: string)
  readonly token: string
  on(type: string, callback: (data: unknown) => void): void
  send(type: string, data: unknown): void
  close(): void
}

// Filters which saved players and groups DatabaseManager.load reads
type DatabaseProfile = Record<string, unknown>

declare const SELF_PROFILE: DatabaseProfile
declare const SELF_PROFILE_WITH_GROUP: DatabaseProfile
declare const HYDRA_PROFILE: DatabaseProfile
declare const FIGHT_SIMULATOR_PROFILE: DatabaseProfile

// js/util.js

// Runs simulations in web workers built from js/sim/base.js and js/sim/<type>.js, with the loader showing progress
declare class WorkerBatch<TResult> {
  constructor(type: string)
  add(callback: (data: TResult) => void, params: object): void
  // Resolves with the duration in milliseconds
  run(instances: number): Promise<number>
}

// js/core/util.js

declare function _formatDate(date: number, showDate?: boolean, showTime?: boolean): string
declare function _formatPrefix(prefix: string): string
declare function _timestampOffset(date?: Date): number

// js/core/database.js and js/core/models.js

// Latest saved state of a player or a group
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

type PlayerEntry = DatabaseEntry & {
  Level: number
  Class: CharacterClass
  Pets?: {
    Levels: number[]
    Dungeons: number[]
  }
  // Arena Manager, by building in the order of the game
  Idle?: {
    Runes: number
    Buildings?: number[]
    Upgrades: {
      Money: number[]
      Speed: number[]
    }
  }
}

// Player loaded with all of its data, such as from DatabaseManager.getPlayer with a timestamp
type PlayerData = PlayerEntry & Record<MainAttribute | 'Constitution' | 'Luck', { Total: number }>

type GroupEntry = DatabaseEntry & {
  Members: string[]
  MembersTotal: number
  MembersPresent: number
  Hydra?: number
}

// Every saved state of one player or group, by timestamp
type DatabaseHistory<TEntry> = Record<number, TEntry> & {
  Latest: TEntry
  // Every saved state, newest first
  List: TEntry[]
}

declare class PlayaResponse {
  // Players and groups found in a HAR file saved from the game
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

// js/core/models.js

type BlacksmithResources = {
  Metal: number
  Crystal: number
}

declare class ItemModel {
  static empty(): ItemModel
  // Clears the rune value when the rune is not a damage rune
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
  // Copy with the `from` attribute type replaced by `to`, only for equipment unless `force` is set
  morph(from: number, to: number, force?: boolean): ItemModel
}

type Attribute = MainAttribute | 'Constitution' | 'Luck'

type PlayerAttribute = {
  Base: number
  Total: number
  // Pre-calculated bonus, evaluateCommon calculates it again when it is missing
  Bonus?: number
}

// Only the fields the Vue code uses. A model created without data has none of them.
declare class PlayerModel {
  static ATTRIBUTES: Attribute[]
  static ATTRIBUTE_TO_TYPE: Record<Attribute, number>
  // Main attribute of a class first, then its two side attributes
  static ATTRIBUTE_ORDER_BY_ATTRIBUTE: Record<MainAttribute, MainAttribute[]>
  // Reads raw player data from the game
  constructor(data?: unknown)
  Name: string
  // Server the player was saved from, only set for a player that comes from the database
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
  // Calculates the values that depend on class, items, pets and potions. A companion takes them from the player it belongs to.
  evaluateCommon(player?: PlayerModel): void
}

declare class ModelUtils {
  // Player in the shape the simulator pages copy and paste
  static toSimulatorData(model: PlayerModel | PlayerData): PlayerModel
  // The player followed by its three companions, when it has them
  static toSimulatorData(model: PlayerModel | PlayerData, includeCompanions: boolean): PlayerModel | PlayerModel[]
}

// js/sim/base.js

// From WARRIOR (1) to PLAGUEDOCTOR (12)
type CharacterClass = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

type MainAttribute = 'Strength' | 'Dexterity' | 'Intelligence'

declare const WARRIOR: 1
declare const ASSASSIN: 4

declare const RUNE_FIRE_DAMAGE: 40
declare const RUNE_COLD_DAMAGE: 41
declare const RUNE_LIGHTNING_DAMAGE: 42
// The damage rune the simulator picks against each enemy
declare const RUNE_AUTO_DAMAGE: 999

type ClassConfig = {
  ID: CharacterClass
  Attribute: MainAttribute
  MaximumDamageReduction: number
  WeaponMultiplier: number
  // Chance from 0 to 1 to block or evade an attack
  SkipChance: number
}

declare const CONFIG: {
  // Every enabled class, ordered by ID
  classes(): ClassConfig[]
  // IDs of every enabled class
  ids(): CharacterClass[]
  // Index 0 is the general config, so a class ID reads that class
  fromID(index: number): ClassConfig
}

// Fight bonuses of every snack by its key, such as `1` or `1_legendary`
declare const SNACKS: Record<string, Record<string, number>>

// js/sim/data/base.js

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

// js/playa/calculations.js

// Only the values the attributes page reads, the rest of the class is still untyped
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

// js/playa/monsters.js

// Name of an underworld unit by its kind: goblin, troll and keeper
declare const NAME_UNIT_UNDERWORLD: Record<number, string>

// js/playa/pets.js

type Pet = {
  location: number
  // When the pet can be found next, or now: start and end
  next: [Date, Date]
  time: 'any' | 'day' | 'night' | 'witch'
  // True, or a check whether the player can find the pet at all
  condition: true | ((player: PlayerEntry) => boolean)
}

declare const PetData: Pet[]

// js/playa/servers.js

declare class Playa {
  static getServerUrlById(id: number): string | undefined
  static getClientVersion(): string
}

// vendor/js/html2canvas.min.js

// Draws an element onto a canvas. Version 1.1.4 only understands plain colours, not `oklch()` or `color-mix()`.
declare function html2canvas(element: HTMLElement, options?: { logging?: boolean; backgroundColor?: string | null }): Promise<HTMLCanvasElement>

// js/changelog.js

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
