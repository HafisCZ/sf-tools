export type SimulatorFlags = {
  Gladiator15: boolean
  MaximumDamageReduction: boolean
  NoGladiatorReduction: boolean
  NoAttributeReduction: boolean
}

export type SimulatorWeapon = {
  AttributeTypes: Record<number, number>
  Attributes: Record<number, number>
  DamageMin: number
  DamageMax: number
  HasEnchantment: boolean
}

export type SimulatorPlayer = {
  ID?: number | string
  Name?: string
  Face?: unknown
  Race?: number
  Gender?: number
  Class: CharacterClass
  Level: number
  Armor: number
  Strength: { Total: number }
  Dexterity: { Total: number }
  Intelligence: { Total: number }
  Constitution: { Total: number }
  Luck: { Total: number }
  Dungeons: { Player: number; Group: number }
  Fortress: { Gladiator: number }
  Potions: { Life: number }
  Runes: { Health: number; ResistanceCold: number; ResistanceFire: number; ResistanceLightning: number }
  Items: { Hand: { HasEnchantment: boolean }; Wpn1: SimulatorWeapon; Wpn2: SimulatorWeapon }
  BlockChance?: number
  Health?: number
  HealthMultiplier?: number
  NoBaseDamage?: boolean
  NoGladiator?: boolean
  Snack?: string | number
  SnackPotency?: number
  Boss?: boolean
  Type?: number
  Pet?: number
  Attacks?: number
}

export type SimulatorPlayerInput = Omit<SimulatorPlayer, 'Dungeons' | 'Fortress' | 'Potions' | 'Runes' | 'Items'> & {
  Dungeons?: Partial<SimulatorPlayer['Dungeons']>
  Fortress?: Partial<SimulatorPlayer['Fortress']>
  Potions?: Partial<SimulatorPlayer['Potions']>
  Runes?: Partial<SimulatorPlayer['Runes']>
  Items?: {
    Hand?: Partial<SimulatorPlayer['Items']['Hand']>
    Wpn1?: Partial<SimulatorWeapon>
    Wpn2?: Partial<SimulatorWeapon>
  }
}

export type GeneralConfig = {
  CritBase: number
  CritGladiatorBonus: number
  CritEnchantmentBonus: number
}

export type StateConfig = {
  Name?: string
  Duration?: number
  DamageBonus?: number
  DamageReductionBonus?: number
  MaximumDamageReductionBonus?: number
  SkipChance: number
  SkipVariant?: number
  CriticalBonus: number
  CriticalChance: number
  CriticalChanceBonus: number
  StanceChangeChance?: number
  HealMultiplier?: number
  ReviveCount?: number
  ReviveDuration?: number
  ReviveChance?: number
}

export type ClassConfig = {
  ID: CharacterClass
  Attribute: MainAttribute
  Disabled?: boolean
  HealthMultiplier: number
  WeaponMultiplier: number
  DamageMultiplier: number
  MaximumDamageReduction: number
  MaximumDamageReductionMultiplier: number
  BypassDamageReduction?: boolean
  BypassSkipChance?: boolean
  BypassSpecial?: boolean
  UseBlockChance?: boolean
  SkipChance: number
  SkipLimit: number
  SkipType: number
  SkipVariant: number
  ReviveChance?: number
  ReviveChanceDecay?: number
  ReviveHealth?: number
  ReviveHealthMin?: number
  ReviveHealthDecay?: number
  ReviveDamage?: number
  ReviveDamageMin?: number
  ReviveDamageDecay?: number
  ReviveMax?: number
  SwoopChance?: number
  SwoopChanceMin?: number
  SwoopChanceMax?: number
  SwoopChanceDecay?: number
  SwoopBonus?: number
  Rage?: StateConfig
  EffectRounds?: number
  EffectBaseDuration?: number[]
  EffectBaseChance?: number[]
  EffectValues?: number[]
  SummonChance?: number
  SummonImmediateAttack?: boolean
  Summons?: StateConfig[]
  StanceInitial?: number
  Stances?: StateConfig[]
  TinctureChance?: number
  TinctureRounds?: StateConfig[]
  [key: `${string}DamageBonus` | `${string}DamageMultiplier`]: number | undefined
}

export type ClassConfigKey = 'Warrior' | 'Mage' | 'Scout' | 'Assassin' | 'Battlemage' | 'Berserker' | 'DemonHunter' | 'Druid' | 'Bard' | 'Necromancer' | 'Paladin' | 'PlagueDoctor'

export type ClassConfigData = { General: GeneralConfig } & Record<ClassConfigKey, ClassConfig>

export type ClassConfigTable = ClassConfigData & {
  set(config?: Record<string, unknown> | null): void
  fromID(index: number): ClassConfig
  ids(): CharacterClass[]
  classes(): ClassConfig[]
}

export type ModelConfig = ClassConfig & GeneralConfig

export type SimulatorDamage = {
  Base: number
  Max: number
  Min: number
}

export type SimulatorState = {
  Config?: StateConfig
  SkipChance: number
  SkipVariant: number
  CriticalChance: number
  CriticalMultiplier: number
  ReceivedDamageMultiplier: number
  Weapon1: SimulatorDamage
  Weapon2?: SimulatorDamage
  StanceChangeChance?: number
  RageState?: SimulatorState
  Songs?: SimulatorState[]
  Stances?: SimulatorState[]
  Minions?: SimulatorState[]
  TinctureRounds?: SimulatorState[]
}

export type ConfiguredState = SimulatorState & { Config: StateConfig }

export type SnackBonus = {
  RuneDamageType?: number
  RuneDamageBonus?: number
  RuneResistanceFireBonus?: number
  RuneResistanceColdBonus?: number
  RuneResistanceLightningBonus?: number
  AttributeBonus?: number
  ConstitutionBonus?: number
  LuckBonus?: number
  CriticalBonus?: number
  MaximumDamageReductionBonus?: number
  SideAttributeBonus?: number
  DamageBonus?: number
}

export type FightLogFighter = {
  ID: number | string | null | undefined
  Name: string | undefined
  Level: number
  TotalHealth: number
  Health: number
  Strength: { Total: number }
  Dexterity: { Total: number }
  Intelligence: { Total: number }
  Constitution: { Total: number }
  Luck: { Total: number }
  Face: unknown
  Race: number | undefined
  Gender: number | undefined
  Class: CharacterClass
  Items: { Wpn1: SimulatorWeapon; Wpn2: SimulatorWeapon }
}

export type FightLogEffect = {
  type: number
  duration: number
  tier: number
}

export type FightLogRound = {
  attackerId: number | string | null | undefined
  targetId: number | string | null | undefined
  attackerState: number
  targetState: number
  attackType: number
  defenseType: number
  attackerHealth: number
  targetHealth: number
  attackerEffects: FightLogEffect[]
  targetEffects: FightLogEffect[]
  attackDamage: number
  attackRage: number
  attackTypeSecondary: boolean
  attackTypeCritical: boolean
  attackTypeSpecial: boolean
}

export type FightLog = {
  fighterA: FightLogFighter
  fighterB: FightLogFighter
  rounds: FightLogRound[]
}
