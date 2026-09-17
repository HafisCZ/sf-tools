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

// Filters which saved players and groups DatabaseManager.load reads
type DatabaseProfile = Record<string, unknown>

declare const SELF_PROFILE_WITH_GROUP: DatabaseProfile
declare const HYDRA_PROFILE: DatabaseProfile

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
  Type: number
  PicIndex: number
  Attributes: number[]
  AttributeTypes: number[]
  readonly SellPrice: {
    Gold: number
  }
  upgradeTo(upgrades: number): void
  getBlacksmithPrice(): BlacksmithResources
  getBlacksmithUpgradePrice(): BlacksmithResources
}

declare class PlayerModel {
  // Main attribute of a class first, then its two side attributes
  static ATTRIBUTE_ORDER_BY_ATTRIBUTE: Record<MainAttribute, MainAttribute[]>
}

// js/sim/base.js

// From WARRIOR (1) to PLAGUEDOCTOR (12)
type CharacterClass = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

type MainAttribute = 'Strength' | 'Dexterity' | 'Intelligence'

type ClassConfig = {
  ID: CharacterClass
  Attribute: MainAttribute
  MaximumDamageReduction: number
}

declare const CONFIG: {
  // Every enabled class, ordered by ID
  classes(): ClassConfig[]
  // Index 0 is the general config, so a class ID reads that class
  fromID(index: number): ClassConfig
}

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
