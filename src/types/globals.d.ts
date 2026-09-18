type Attribute = MainAttribute | 'Constitution' | 'Luck'

type CharacterClass = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

type MainAttribute = 'Strength' | 'Dexterity' | 'Intelligence'

declare const WARRIOR: 1
declare const MAGE: 2
declare const SCOUT: 3
declare const ASSASSIN: 4
declare const BATTLEMAGE: 5
declare const BERSERKER: 6
declare const DEMONHUNTER: 7
declare const DRUID: 8
declare const BARD: 9
declare const NECROMANCER: 10
declare const PALADIN: 11
declare const PLAGUEDOCTOR: 12

declare const FIGHTER_STATE_NORMAL: 0
declare const FIGHTER_STATE_DRUID_RAGE: 11
declare const FIGHTER_STATE_PALADIN_DEFENSIVE: 20
declare const FIGHTER_STATE_PALADIN_OFFENSIVE: 21
declare const FIGHTER_STATE_BERSERKER_RAGE: 30

declare const ATTACK_TYPE_CATAPULT: 2
declare const ATTACK_TYPE_FIREBALL: 10
declare const ATTACK_TYPE_MINION_SUMMON: 11
declare const ATTACK_TYPE_SWOOP: 13
declare const ATTACK_TYPE_REVIVE: 14
declare const ATTACK_TYPE_SWOOP_CRITICAL: 16

declare const ATTACK_TYPES_SECONDARY: number[]
declare const ATTACK_TYPES_CRITICAL: number[]
declare const ATTACK_TYPES_SPECIAL: number[]
declare const ATTACK_TYPES_TINCTURE: number[]
declare const ATTACK_TYPES_MINION: number[]

declare const DEFENSE_TYPE_BLOCK_HEAL: 6

declare const EFFECT_TYPE_TINCTURE: 3

type SimulatorFlags = {
  Gladiator15: boolean
  MaximumDamageReduction: boolean
  NoGladiatorReduction: boolean
  NoAttributeReduction: boolean
}

declare const FLAGS: SimulatorFlags & {
  set(flags: Partial<SimulatorFlags>): void
}

declare const RUNE_FIRE_DAMAGE: 40
declare const RUNE_COLD_DAMAGE: 41
declare const RUNE_LIGHTNING_DAMAGE: 42
declare const RUNE_AUTO_DAMAGE: 999

type ClassConfig = {
  ID: CharacterClass
  Attribute: MainAttribute
  HealthMultiplier: number
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
  Items: {
    Wpn1: { DamageMin: number; DamageMax: number }
    Wpn2?: { DamageMin: number; DamageMax: number }
  }
}

type SimulatorWeaponState = {
  Min: number
  Max: number
  Base: number
}

type SimulatorModelState = {
  SkipChance: number
  CriticalChance: number
  CriticalMultiplier: number
  ReceivedDamageMultiplier: number
  Weapon1: SimulatorWeaponState
  Weapon2?: SimulatorWeaponState
}

type SimulatorModelData = SimulatorModelState & {
  RageState?: SimulatorModelState
  Stances?: SimulatorModelState[]
  Songs?: SimulatorModelState[]
  Minions?: SimulatorModelState[]
  TinctureRounds?: SimulatorModelState[]
}

type SimulatorClassConfig = ClassConfig & {
  ReviveDamage?: number
  ReviveDamageMin?: number
  ReviveDamageDecay?: number
  Stances?: { HealMultiplier?: number }[]
}

declare class SimulatorModel {
  static normalize(player: SimulatorPlayer): SimulatorPlayer
  static create(index: number | null, player: unknown): SimulatorModel
  static initializeFighters(fighterA: SimulatorModel, fighterB: SimulatorModel): void
  Player: SimulatorPlayer
  Config: SimulatorClassConfig
  TotalHealth: number
  SwoopMultiplier?: number
  Data: SimulatorModelData | null
  initialize(target: SimulatorModel): void
  getBaseDamage(secondary?: boolean): { DamageMin: number; DamageMax: number }
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

// Version 1.1.4 can't read oklch(), oklab() or color-mix() colours
declare function html2canvas(element: HTMLElement, options?: { logging?: boolean; backgroundColor?: string | null; allowTaint?: boolean; useCORS?: boolean; onclone?: (document: Document) => void }): Promise<HTMLCanvasElement>
