import { globalLocalize, hasTranslation } from '@utils/localization'
import { chunk, sortDescending } from '@utils/utils'
import { type SimulatorConfig } from '~/sim/debug'

export type RageDisplayMode = 'decimal' | 'percentage' | 'fraction'

export type TypeDisplayMode = 'text' | 'text_with_id' | 'id'

export type GroupSort = 'default' | 'fight_count' | 'fighter_b_level'

export type AnalyzerOptions = {
  rage_display_mode: RageDisplayMode
  type_display_mode: TypeDisplayMode
  base_damage_error_margin: number
  damages_sidebar: boolean
  group_sort: GroupSort
}

export type FighterWeapon = {
  Index?: number
  DamageMin: number
  DamageMax: number
  RuneType?: number
  RuneValue?: number
  AttributeTypes: Record<number, number>
  Attributes: Record<number, number>
}

export type EditorWeapon = {
  DamageMin: number
  DamageMax: number
  HasEnchantment: boolean
  AttributeTypes: { 2: number }
  Attributes: { 2: number }
}

export type FighterEditorData = {
  Name: string
  Class: CharacterClass
  Level: number
  TotalHealth: number
  Armor: number
  Runes: {
    ResistanceFire: number
    ResistanceCold: number
    ResistanceLightning: number
  }
  Dungeons: {
    Group: number
  }
  Fortress: {
    Gladiator: number
  }
  Strength: { Total: number }
  Dexterity: { Total: number }
  Intelligence: { Total: number }
  Constitution: { Total: number }
  Luck: { Total: number }
  Items: {
    Wpn1: EditorWeapon
    Wpn2?: EditorWeapon
  }
}

export type AnalyzerPlayer = PlayerModel & {
  model?: SimulatorModel
  hash?: string
}

export type DamageRange = {
  min: number
  max: number
  err?: number
  cnt?: number
}

export type FighterDamages = {
  samples: number
  ranges: Record<string, DamageRange>
}

export type Fighter = {
  ID: number
  Name: string
  Level: number
  TotalHealth: number
  Health: number
  Strength: { Total: number }
  Dexterity: { Total: number }
  Intelligence: { Total: number }
  Constitution: { Total: number }
  Luck: { Total: number }
  Class: CharacterClass
  Items: {
    Wpn1: FighterWeapon
    Wpn2: FighterWeapon
  }
  Boss?: boolean
  Armor?: number
  hash?: string
  player?: AnalyzerPlayer
  editor?: FighterEditorData
  damages?: FighterDamages
}

export type FightEffect = {
  type: number
  tier: number
  duration: number
}

export type SpecialDisplay = { type: 'druid_rage' } | { type: 'berserker_rage' } | { type: 'bard_song'; level: number; notes: number } | { type: 'necromancer_minion'; minion: number } | { type: 'paladin_stance'; stance: number } | { type: 'plague_doctor_tincture'; duration: number }

export type FightRound = {
  attackerId: number
  targetId: number
  attackerState: number
  targetState: number
  attackType: number
  defenseType: number
  attackerHealth: number
  targetHealth: number
  attackerEffects: FightEffect[]
  targetEffects: FightEffect[]
  attacker: Fighter
  target: Fighter
  attackDamage: number
  attackRage: number
  attackTypeSecondary: boolean
  attackTypeCritical: boolean
  attackTypeSpecial: boolean
  attackerDeaths?: number
  targetDeaths?: number
  attackerSpecialDisplay?: SpecialDisplay
  targetSpecialDisplay?: SpecialDisplay
  hasDamage?: boolean
  hasBase?: boolean
  attackBase?: number
  hasError?: number
}

export type Fight = {
  fighterA: Fighter
  fighterB: Fighter
  rounds: FightRound[]
  rewards?: Record<string, number>
  winner?: Fighter
  hash?: string
  index?: string
}

export type GroupFight = {
  index: string
  rounds: FightRound[]
  winner: Fighter
}

export type FightGroup = {
  index: number
  hash: string
  fighterA: Fighter
  fighterB: Fighter
  fights: GroupFight[]
}

type ImportedFighter = Fighter & {
  Life?: number
  MaximumLife?: number
}

type ImportedFight = {
  fighterA: ImportedFighter
  fighterB: ImportedFighter
  rounds: Omit<FightRound, 'attacker' | 'target'>[]
}

export type FightFile = {
  players: AnalyzerPlayer[]
  fights: ImportedFight[]
  config?: SimulatorConfig | null
}

type PlayaData = Record<string, PlayaResponse | undefined>

type DigestedFight = {
  header: (number | string)[]
  rounds: number[]
  equipment?: number[]
  rewards: Record<string, number>
  version?: number
}

type DigestedPlayer = {
  own: boolean
  save: number[]
  saveVersion?: number
  potions?: number[]
  name: string
  tower?: number[] | null
  companionItems?: number[]
  equippedItems?: number[]
}

type HashSource = Pick<Fighter, 'Class' | 'Level' | 'Strength' | 'Dexterity' | 'Intelligence' | 'Constitution' | 'Luck' | 'Items'> & {
  model?: SimulatorModel
}

export const RAGE_DISPLAY_MODES: RageDisplayMode[] = ['decimal', 'percentage', 'fraction']

export const TYPE_DISPLAY_MODES: TypeDisplayMode[] = ['text', 'text_with_id', 'id']

export const GROUP_SORTS: GroupSort[] = ['default', 'fight_count', 'fighter_b_level']

export const RANGE_TYPES = ['weapon1_range_base', 'weapon1_range', 'weapon1_range_critical', 'weapon1_range_swoop', 'weapon1_range_swoop_critical', 'weapon2_range_base', 'weapon2_range', 'weapon2_range_critical', 'weapon1_fist_damage', 'weapon2_fist_damage']

// Fight types enum
const FIGHT_TYPES = {
  PlayerVsPlayer: 0,
  Quest: 1,
  Battle: 2,
  Raid: 3,
  Dungeon: 4,
  Tower: 5,
  PlayerPortal: 6,
  GuildPortal: 7,
  FortAttack: 8,
  FortDefend: 9,
  Shadow: 12,
  PetsDungeon: 13,
  PetsAttack: 14,
  PetsDefend: 15,
  Underworld: 16,
  GuildPet: 17,
  Hellevator: 18,
  GuildRaid: 20,
  TutorialDungeon: 21,
  DrivingDungeon: 22,
  FortRevenge: 109
}

const GT_REWARDS: Record<number, string> = {
  1: 'hellevator_point',
  2: 'hellevator_ticket',
  3: 'mushroom',
  4: 'gold',
  5: 'lucky_coin',
  6: 'wood',
  7: 'stone',
  8: 'arcane',
  9: 'metal',
  10: 'souls',
  11: 'fruit1',
  12: 'fruit2',
  13: 'fruit3',
  14: 'fruit4',
  15: 'fruit5',
  16: 'gem_legendary',
  17: 'shadow_gold',
  18: 'shadow_silver',
  19: 'shadow_bronze',
  20: 'gem_small',
  21: 'gem_medium',
  22: 'gem_large',
  23: 'fruit_mixed',
  24: 'experience',
  25: 'pet_egg',
  26: 'hourglass',
  27: 'honor',
  28: 'beer'
}

const HAR_ROUND_VERSION_2 = 2

const GROUP_SORTERS: Record<GroupSort, (group: FightGroup) => number> = {
  default: (group) => group.index,
  fight_count: (group) => group.fights.length,
  fighter_b_level: (group) => group.fighterB.Level
}

const PALADIN_STANCE_STATES: number[] = [FIGHTER_STATE_NORMAL, FIGHTER_STATE_PALADIN_DEFENSIVE, FIGHTER_STATE_PALADIN_OFFENSIVE]

const FIGHTER_WHITELIST = ['ID', 'Name', 'Level', 'TotalHealth', 'Health', 'Strength', 'Dexterity', 'Intelligence', 'Constitution', 'Luck', 'Class', 'Items'] as const

const ROUND_WHITELIST = ['attackerId', 'targetId', 'attackerState', 'targetState', 'attackType', 'defenseType', 'attackerHealth', 'targetHealth', 'attackerEffects', 'targetEffects', 'attackDamage', 'attackRage', 'attackTypeSecondary', 'attackTypeCritical', 'attackTypeSpecial'] as const

export class FighterModel implements Fighter {
  ID: number
  Name: string
  Level: number
  TotalHealth: number
  Health: number
  Strength: { Total: number }
  Dexterity: { Total: number }
  Intelligence: { Total: number }
  Constitution: { Total: number }
  Luck: { Total: number }
  Face: {
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
  Race: number
  Gender: number
  Class: CharacterClass
  Items: {
    Wpn1: ItemModel
    Wpn2: ItemModel
  }
  Boss?: boolean

  constructor(data: unknown[], equipment: number[] | undefined, fightType: number) {
    const dataType = new ComplexDataType(data)
    dataType.assert(47)

    this.ID = dataType.long()
    this.Name = dataType.string()
    this.Level = dataType.long()
    this.TotalHealth = dataType.long()
    this.Health = dataType.long()

    this.Strength = {
      Total: dataType.long()
    }

    this.Dexterity = {
      Total: dataType.long()
    }

    this.Intelligence = {
      Total: dataType.long()
    }

    this.Constitution = {
      Total: dataType.long()
    }

    this.Luck = {
      Total: dataType.long()
    }

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

    this.Race = dataType.long()
    this.Gender = dataType.long()
    this.Class = dataType.long() as CharacterClass

    this.Items = equipment
      ? {
          Wpn1: new ItemModel(ItemModel.MODERN, [equipment[0], 0, equipment[2], equipment[1], 0, 0, 0, 0, 0, equipment[3], 0, 0, equipment[4], 0, 0, 0, 0, 0, 0], 1, 9),
          Wpn2: new ItemModel(ItemModel.MODERN, [equipment[5], 0, equipment[7], equipment[6], 0, 0, 0, 0, 0, equipment[8], 0, 0, equipment[9], 0, 0, 0, 0, 0, 0], 1, 10)
        }
      : {
          Wpn1: new ItemModel(ItemModel.LEGACY, dataType.sub(12), 1, 9),
          Wpn2: new ItemModel(ItemModel.LEGACY, dataType.sub(12), 1, 10)
        }

    if (this.Face.Mouth < 0) {
      this.Boss = true
      this.Name = findBossName(fightType, -this.Face.Mouth)
    }
  }
}

function findBossName(type: number, face: number) {
  if (NAME_UNIT_COMPANION[face]) {
    return NAME_UNIT_COMPANION[face]
  } else if (type === FIGHT_TYPES.Shadow) {
    return `Shadow ${globalLocalize(`monsters.${face}`)}`
  } else if (hasTranslation(`monsters.${face}`)) {
    return globalLocalize(`monsters.${face}`)
  } else if (type === FIGHT_TYPES.Underworld) {
    return NAME_UNIT_UNDERWORLD[Math.trunc((face - 899) / 20)]
  } else {
    return 'Unknown'
  }
}

export function getFighterName(fighter: Fighter) {
  return fighter.player?.Name || fighter.Name
}

// Decode attack type
function decomposeAttackType(attackType: number) {
  return {
    attackTypeSecondary: ATTACK_TYPES_SECONDARY.includes(attackType),
    attackTypeCritical: ATTACK_TYPES_CRITICAL.includes(attackType),
    attackTypeSpecial: ATTACK_TYPES_SPECIAL.includes(attackType)
  }
}

// Compute item hash
function computeItemHash(item: FighterWeapon, player: HashSource, secondary = false) {
  if (secondary && player.Class !== ASSASSIN) {
    return ''
  } else if (item.Index === 0) {
    return ''
  } else {
    const json = [item.DamageMin, item.DamageMax, item.RuneType || item.AttributeTypes[2], item.RuneValue || item.Attributes[2]]

    if (player.model) {
      // Fix weapon damage (is not clamped by fist damage only if min is below min)
      const baseDamage = player.model.getBaseDamage(secondary)

      if (json[0] < baseDamage.DamageMin) {
        json[0] = baseDamage.DamageMin
        json[1] = baseDamage.DamageMax
      }
    }

    return JSON.stringify(json)
  }
}

// Compute player hash
function computePlayerHash(player: HashSource) {
  const json = [
    // Temporary disabled because of HASH errors // player.ID,
    player.Class,
    player.Level,
    player.Strength.Total,
    player.Dexterity.Total,
    player.Intelligence.Total,
    player.Constitution.Total,
    player.Luck.Total,
    computeItemHash(player.Items.Wpn1, player, false),
    computeItemHash(player.Items.Wpn2, player, true)
  ]

  return SHA1(JSON.stringify(json))
}

function getRewards(response: PlayaData) {
  const rewards: Record<string, number> = {}

  if (response.gtreward) {
    // TODO: Replace with specific separator
    for (const [type, , amount] of chunk(response.gtreward.numbers(/\/|,/), 3)) {
      if (type) {
        rewards[GT_REWARDS[type]] = amount
      }
    }
  }

  return rewards
}

function findHealth(rounds: FightRound[], index: number) {
  const currentRound = rounds[index]

  for (let i = index - 1; i >= 0; i--) {
    const round = rounds[i]

    if (round.attackType === ATTACK_TYPE_REVIVE) {
      return round.attacker === currentRound.attacker ? round.targetHealth : round.attackerHealth
    } else if (round.attacker === currentRound.attacker && !round.attackTypeSpecial) {
      return round.targetHealth
    }
  }

  return currentRound.target.Health
}

function readEffects(data: ComplexDataType) {
  const count = data.long()
  const effects: FightEffect[] = []

  for (let i = 0; i < count; i++) {
    effects.push({
      type: data.long(),
      tier: data.long(),
      duration: data.long()
    })
  }

  return effects
}

function parseRounds(fighterA: Fighter, fighterB: Fighter, rounds: number[]) {
  const processedRounds: FightRound[] = []

  const data = new ComplexDataType(rounds)
  while (data.atLeast(9)) {
    const attackerId = data.long()
    const targetId = attackerId === fighterA.ID ? fighterB.ID : fighterA.ID

    const attackerState = data.long()
    const attackType = data.long()

    const defenseType = data.long()
    const targetState = data.long()

    const attackerHealth = data.long()
    const targetHealth = data.long()

    const attackerEffects = readEffects(data)
    const targetEffects = readEffects(data)

    const [attacker, target] = attackerId === fighterA.ID ? [fighterA, fighterB] : [fighterB, fighterA]

    processedRounds.push({
      attackerId,
      targetId,
      attackerState,
      targetState,
      attackType,
      defenseType,
      attackerHealth,
      targetHealth,
      attackerEffects,
      targetEffects,
      attacker,
      target,
      attackDamage: 0,
      attackRage: 0,
      ...decomposeAttackType(attackType)
    })
  }

  // Finalize each round
  let attackRageOffset = 0
  processedRounds.forEach((round, index) => {
    // Calculate attack damage
    if (round.attackType === ATTACK_TYPE_REVIVE) {
      round.attackDamage = round.attackerHealth
    } else if (round.attackType === ATTACK_TYPE_MINION_SUMMON) {
      round.targetHealth = findHealth(processedRounds, index)
    } else {
      round.attackDamage = findHealth(processedRounds, index) - round.targetHealth
    }

    round.attackRage = 1 + (index + attackRageOffset) / 6

    if (round.attackerState === FIGHTER_STATE_BERSERKER_RAGE) {
      // Increase rage if it's a chained attack
      attackRageOffset++
    }

    let tinctureEffect: FightEffect | undefined
    if (round.attacker.Class === PLAGUEDOCTOR) {
      tinctureEffect = round.targetEffects.find((effect) => effect.type === EFFECT_TYPE_TINCTURE)
      if (tinctureEffect) {
        round.attackerEffects.push(tinctureEffect)
      }
    } else if (round.target.Class === PLAGUEDOCTOR) {
      tinctureEffect = round.attackerEffects.find((effect) => effect.type === EFFECT_TYPE_TINCTURE)
      round.attackerEffects = round.attackerEffects.filter((effect) => effect !== tinctureEffect)
      if (tinctureEffect) {
        round.targetEffects.push(tinctureEffect)
      }
    }

    if (tinctureEffect) {
      tinctureEffect.duration = Math.min(3, tinctureEffect.duration + 1)
    }
  })

  return processedRounds
}

function readOwnPlayer(r: PlayaData, lastPlayer: DigestedPlayer | undefined): DigestedPlayer | null {
  const save = r.ownplayersavecharacter ?? r.ownplayersave
  const saveVersion = r.ownplayersavecharacter ? 2 : 1

  if (save && r.ownplayername) {
    // Read only necessary data from own player
    return {
      own: true,
      save: save.numbers(),
      saveVersion,
      potions: r.ownplayersavepotions?.numbers(),
      name: r.ownplayername.string,
      tower: r.owntower?.numbers(),
      companionItems: r.companionequipment?.numbers(),
      equippedItems: r.ownplayersaveequipment?.numbers()
    }
  } else if (save) {
    // Capture save
    return lastPlayer
      ? {
          own: true,
          save: save.numbers(),
          saveVersion,
          potions: r.ownplayersavepotions?.numbers() ?? lastPlayer.potions,
          name: lastPlayer.name,
          tower: r.owntower?.numbers() ?? lastPlayer.tower,
          companionItems: r.companionequipment?.numbers() ?? lastPlayer.companionItems,
          equippedItems: r.ownplayersaveequipment?.numbers() ?? lastPlayer.equippedItems
        }
      : null
  } else if (r['#ownplayersave']) {
    // Capture save delta (ignoring for purposes of save v2)
    if (!lastPlayer) return null

    const delta = Array.from(lastPlayer.save)

    for (const [index, value] of chunk(r['#ownplayersave'].numbers(), 2)) {
      delta[index] = value
    }

    return {
      own: true,
      save: delta,
      name: lastPlayer.name,
      tower: r.owntower?.numbers() ?? lastPlayer.tower,
      companionItems: r.companionequipment?.numbers() ?? lastPlayer.companionItems,
      equippedItems: r.ownplayersaveequipment?.numbers() ?? lastPlayer.equippedItems
    }
  }

  return null
}

function readOtherPlayer(r: PlayaData): DigestedPlayer | null {
  const save = r.otherplayersavecharacter ?? r.otherplayer

  if (save && r.otherplayername) {
    return {
      own: false,
      save: save.numbers(),
      saveVersion: r.otherplayersavecharacter ? 2 : 1,
      potions: r.otherplayersavepotions?.numbers(),
      name: r.otherplayername.string,
      tower: null,
      equippedItems: r.otherplayersaveequipment?.numbers()
    }
  }

  return null
}

function digestFight(r: PlayaData, suffix: string | number): DigestedFight | null {
  const header = r[`fightheader${suffix}`]
  const rounds = r[`fight${suffix}`]

  if (!header || !rounds) return null

  return {
    header: header.mixed(),
    rounds: rounds.numbers(/[,/]/),
    equipment: r[`fightequipment${suffix}`]?.numbers(/[,/]/),
    rewards: getRewards(r),
    version: r.fightversion?.number
  }
}

// Extract individual fights from raw data array
export function importHar(json: unknown) {
  const digestedFights: DigestedFight[] = []
  const digestedPlayers: DigestedPlayer[] = []

  // Capture all relevant data
  for (const { text } of PlayaResponse.search(json)) {
    if (text.includes('fightheader')) {
      const r = PlayaResponse.fromText(text)

      if (r.fightheader1) {
        // Shadow or guild fights use indexed fight data
        const count = Math.max(
          ...Object.keys(r)
            .filter((key) => key.startsWith('fightheader'))
            .map((key) => parseInt(key.match(/(\d*)$/)?.[0] || '1'))
        )

        for (let i = 1; i <= count; i++) {
          const fight = digestFight(r, i)

          if (fight) {
            digestedFights.push(fight)
          }
        }
      } else {
        const fight = digestFight(r, '')

        if (fight) {
          digestedFights.push(fight)
        }
      }
    }

    if (text.includes('playerlookat') || text.includes('ownplayersave')) {
      const r = PlayaResponse.fromText(text)

      const lastPlayer = digestedPlayers.filter((entry) => entry.own && entry.name).at(-1)
      const player = r.ownplayersavecharacter || r.ownplayersave || r['#ownplayersave'] ? readOwnPlayer(r, lastPlayer) : readOtherPlayer(r)

      if (player) {
        digestedPlayers.push(player)
      }
    }
  }

  const fights: Fight[] = []

  for (const { header, rounds, rewards, equipment, version } of digestedFights) {
    const fightType = header[0]

    // Proceed only if type of fight is known to the system
    if (typeof fightType === 'number' && Object.values(FIGHT_TYPES).includes(fightType)) {
      // Parse fighters
      const fighterA = new FighterModel(header.slice(5, 52), equipment?.slice(0, 10), fightType)
      const fighterB = new FighterModel(header.slice(52, 99), equipment?.slice(10, 20), fightType)

      // Only version 2 of the rounds is read, version 1 is disabled for now
      if (version === HAR_ROUND_VERSION_2) {
        fights.push({
          fighterA,
          fighterB,
          rounds: parseRounds(fighterA, fighterB, rounds),
          rewards
        })
      }
    }
  }

  // Convert all player data into actual player models and optionally companions
  const players: AnalyzerPlayer[] = []

  for (const data of digestedPlayers) {
    const player = new PlayerModel(data)
    players.push(player)

    if (player.Companions) {
      players.push(player.Companions.Bert, player.Companions.Mark, player.Companions.Kunigunde)
    }
  }

  return { fights, players }
}

function replaceLifeWithHealth({ Life, MaximumLife, ...fighter }: ImportedFighter): Fighter {
  return {
    ...fighter,
    Health: Life ?? fighter.Health,
    TotalHealth: MaximumLife ?? fighter.TotalHealth
  }
}

export function prepareImportedFights(fights: ImportedFight[]) {
  return fights.map((fight): Fight => {
    const fighterA = replaceLifeWithHealth(fight.fighterA)
    const fighterB = replaceLifeWithHealth(fight.fighterB)

    const mapping: Record<number, Fighter> = {
      [fighterA.ID]: fighterA,
      [fighterB.ID]: fighterB
    }

    // Fill in all attacker & target data for each round
    const rounds = fight.rounds.map((round) => ({ ...round, attacker: mapping[round.attackerId], target: mapping[round.targetId] }))

    return { fighterA, fighterB, rounds }
  })
}

function injectComputedData(fighter: Fighter) {
  if (fighter.Boss) {
    const config = CONFIG.fromID(fighter.Class)

    fighter.Armor = fighter.Level * config.MaximumDamageReduction
  }
}

export function groupFights(fights: Fight[], allPlayers: AnalyzerPlayer[], sort: GroupSort) {
  const groups: FightGroup[] = []

  fights.forEach((fight, index) => {
    const { fighterA, fighterB, rounds } = fight

    // Compute hashes for all players and fighters
    fighterA.hash = computePlayerHash(fighterA)
    fighterB.hash = computePlayerHash(fighterB)

    injectComputedData(fighterA)
    injectComputedData(fighterB)

    fight.winner = rounds[rounds.length - 1].attacker
    fight.hash = `${fighterA.hash}-${fighterB.hash}`
    fight.index = String(index)

    // Group fights
    let group = groups.find((entry) => entry.hash === fight.hash)

    if (!group) {
      group = {
        index: groups.length,
        hash: fight.hash,
        fighterA,
        fighterB,
        fights: []
      }

      groups.push(group)
    }

    group.fights.push({ index: fight.index, rounds, winner: fight.winner })
  })

  for (const player of allPlayers) {
    player.model = SimulatorModel.create(null, player)
    player.hash = computePlayerHash(player)
  }

  // Unique players by hash
  const players = allPlayers.filter((value, index, self) => self.findIndex((object) => object.hash === value.hash) === index)

  // Merge fighters and hashes
  for (const { fighterA, fighterB } of fights) {
    const playerA = players.find((player) => player.hash === fighterA.hash)
    if (playerA) {
      fighterA.player = playerA
    }

    const playerB = players.find((player) => player.hash === fighterB.hash)
    if (playerB) {
      fighterB.player = playerB
    }
  }

  sortDescending(groups, GROUP_SORTERS[sort])

  return { groups, players }
}

function compareWithin(value: number, min: number, max: number) {
  return value >= min ? (value <= max ? 0 : 2) : 1
}

function findAttackerState(round: FightRound, model: SimulatorModel) {
  const data = model.Data

  if (!data) return undefined

  switch (round.attackerState) {
    case FIGHTER_STATE_DRUID_RAGE:
      return data.RageState
    case FIGHTER_STATE_PALADIN_DEFENSIVE:
      return data.Stances?.[1]
    case FIGHTER_STATE_PALADIN_OFFENSIVE:
      return data.Stances?.[2]
    default: {
      switch (model.Player.Class) {
        case BARD:
          return round.attackerEffects.length > 0 ? data.Songs?.[round.attackerEffects[0].tier - 1] : data
        case NECROMANCER:
          return ATTACK_TYPES_MINION.includes(round.attackType) && round.attackerEffects.length > 0 ? data.Minions?.[round.attackerEffects[0].tier - 1] : data
        case PALADIN:
          return data.Stances?.[0]
        case PLAGUEDOCTOR: {
          const tinctureEffect = round.attackerEffects.find((effect) => effect.type === EFFECT_TYPE_TINCTURE)

          return tinctureEffect && ATTACK_TYPES_TINCTURE.includes(round.attackType) ? data.TinctureRounds?.[tinctureEffect.duration - 1] : data
        }
        default:
          return data
      }
    }
  }
}

function findTargetState(round: FightRound, model: SimulatorModel) {
  const data = model.Data

  if (!data) return undefined

  switch (round.targetState) {
    case FIGHTER_STATE_DRUID_RAGE:
      return data.RageState
    case FIGHTER_STATE_PALADIN_DEFENSIVE:
      return data.Stances?.[1]
    case FIGHTER_STATE_PALADIN_OFFENSIVE:
      return data.Stances?.[2]
    default: {
      switch (model.Player.Class) {
        case BARD:
          return round.targetEffects.length > 0 ? data.Songs?.[round.targetEffects[0].tier - 1] : data
        case NECROMANCER:
          return round.targetEffects.length > 0 ? data.Minions?.[round.targetEffects[0].tier - 1] : data
        case PLAGUEDOCTOR: {
          const tinctureEffect = round.targetEffects.find((effect) => effect.type === EFFECT_TYPE_TINCTURE)

          return tinctureEffect ? data.TinctureRounds?.[tinctureEffect.duration - 1] : data
        }
        case PALADIN:
          return data.Stances?.[0]
        default:
          return data
      }
    }
  }
}

function decorateRound(round: FightRound) {
  // Set display special state
  if (round.attackerState === FIGHTER_STATE_DRUID_RAGE) {
    round.attackerSpecialDisplay = { type: 'druid_rage' }
  }

  if (round.attacker.Class === PALADIN) {
    round.attackerSpecialDisplay = { type: 'paladin_stance', stance: PALADIN_STANCE_STATES.indexOf(round.attackerState) + 1 }
  }

  if (round.target.Class === PALADIN) {
    round.targetSpecialDisplay = { type: 'paladin_stance', stance: PALADIN_STANCE_STATES.indexOf(round.targetState) + 1 }
  }

  if (round.targetState === FIGHTER_STATE_DRUID_RAGE) {
    round.targetSpecialDisplay = { type: 'druid_rage' }
  }

  if (round.attackerState === FIGHTER_STATE_BERSERKER_RAGE) {
    round.attackerSpecialDisplay = { type: 'berserker_rage' }
  }

  if (round.attackerEffects.length > 0 && round.attacker.Class === NECROMANCER) {
    round.attackerSpecialDisplay = { type: 'necromancer_minion', minion: round.attackerEffects[0].tier }
  }

  if (round.targetEffects.length > 0 && round.target.Class === NECROMANCER) {
    round.targetSpecialDisplay = { type: 'necromancer_minion', minion: round.targetEffects[0].tier }
  }

  if (round.attackerEffects.length > 0 && round.attacker.Class === PLAGUEDOCTOR) {
    round.attackerSpecialDisplay = { type: 'plague_doctor_tincture', duration: round.attackerEffects[0].duration }
  }

  if (round.targetEffects.length > 0 && round.target.Class === PLAGUEDOCTOR) {
    round.targetSpecialDisplay = { type: 'plague_doctor_tincture', duration: round.targetEffects[0].duration }
  }

  if (round.attackerEffects.length > 0 && round.attacker.Class === BARD) {
    const effect = round.attackerEffects[0]

    round.attackerSpecialDisplay = { type: 'bard_song', level: effect.tier, notes: effect.duration }
  }

  if (round.targetEffects.length > 0 && round.target.Class === BARD) {
    const effect = round.targetEffects[0]

    round.targetSpecialDisplay = { type: 'bard_song', level: effect.tier, notes: effect.duration }
  }

  // Skip if missed or special
  if (round.attackTypeSpecial || (round.defenseType && round.defenseType !== DEFENSE_TYPE_BLOCK_HEAL)) {
    return
  }

  round.hasDamage = true
  round.hasBase = round.attackType !== ATTACK_TYPE_FIREBALL && round.attackType !== ATTACK_TYPE_CATAPULT
}

function calculateBaseDamage(round: FightRound, attackerModel: SimulatorModel, targetModel: SimulatorModel) {
  const attackerState = findAttackerState(round, attackerModel)
  const targetState = findTargetState(round, targetModel)

  const weapon = round.attackTypeSecondary ? attackerState?.Weapon2 : attackerState?.Weapon1

  if (!attackerState || !targetState || !weapon) return undefined

  // Scaled down weapon damage
  let damage = round.attackDamage / round.attackRage / weapon.Base

  // Special cases
  if (round.attackTypeCritical) {
    damage /= attackerState.CriticalMultiplier
  }

  if (round.attacker.Class === DRUID && (round.attackType === ATTACK_TYPE_SWOOP || round.attackType === ATTACK_TYPE_SWOOP_CRITICAL)) {
    damage /= attackerModel.SwoopMultiplier ?? 1
  }

  if (round.attacker.Class === DEMONHUNTER) {
    const { ReviveDamage = 1, ReviveDamageMin = 0, ReviveDamageDecay = 0 } = attackerModel.Config

    damage /= Math.max(ReviveDamageMin, ReviveDamage - (round.attackerDeaths ?? 0) * ReviveDamageDecay)
  }

  if (round.defenseType === DEFENSE_TYPE_BLOCK_HEAL) {
    damage *= -1
    damage /= targetModel.Config.Stances?.[1]?.HealMultiplier ?? 1
  }

  // Apply back reduced damage
  damage /= targetState.ReceivedDamageMultiplier

  return Math.trunc(damage)
}

function createDamages(fighter: Fighter, editor: FighterEditorData, model: SimulatorModel): FighterDamages {
  const ranges: Record<string, DamageRange> = {}

  const fist1 = model.getBaseDamage(false)

  ranges.weapon1_range_base = { min: editor.Items.Wpn1.DamageMin, max: editor.Items.Wpn1.DamageMax }
  ranges.weapon1_fist_damage = { min: fist1.DamageMin, max: fist1.DamageMax }

  if (fighter.Class === ASSASSIN && editor.Items.Wpn2) {
    const fist2 = model.getBaseDamage(true)

    ranges.weapon2_range_base = { min: editor.Items.Wpn2.DamageMin, max: editor.Items.Wpn2.DamageMax }
    ranges.weapon2_fist_damage = { min: fist2.DamageMin, max: fist2.DamageMax }
  }

  return { samples: 0, ranges }
}

export function analyzeGroup(group: FightGroup, editorA: FighterEditorData, editorB: FighterEditorData, variance: number) {
  const { fighterA, fighterB } = group

  fighterA.editor = editorA
  fighterB.editor = editorB

  // Fetch data and initialize models
  const model1 = SimulatorModel.create(0, editorA)
  const model2 = SimulatorModel.create(1, editorB)

  // Initialize models
  SimulatorModel.initializeFighters(model1, model2)

  const getModel = (fighter: Fighter) => (fighter.ID === fighterA.ID ? model1 : model2)
  const getEditor = (fighter: Fighter) => (fighter.ID === fighterA.ID ? editorA : editorB)

  // Recalculate death counts
  for (const { rounds } of group.fights) {
    let deathsA = 0
    let deathsB = 0

    for (const round of rounds) {
      const isFighterA = round.attackerId === fighterA.ID

      if (round.attackType === ATTACK_TYPE_REVIVE) {
        if (isFighterA) {
          deathsA++
        } else {
          deathsB++
        }
      }

      round.attackerDeaths = isFighterA ? deathsA : deathsB
      round.targetDeaths = isFighterA ? deathsB : deathsA
    }
  }

  const flatRounds = group.fights.flatMap((fight) => fight.rounds)

  // Decorate each round
  flatRounds.forEach(decorateRound)

  // Calculate base damage of each round
  for (const round of flatRounds) {
    // We are assuming that lute round always follows after bard attack
    if (round.hasBase) {
      round.attackBase = calculateBaseDamage(round, getModel(round.attacker), getModel(round.target))
    }
  }

  // Verify whether damage is in range
  for (const round of flatRounds) {
    const weapon = round.attackTypeSecondary ? getEditor(round.attacker).Items.Wpn2 : getEditor(round.attacker).Items.Wpn1

    if (round.hasBase && !round.defenseType && weapon && round.attackBase !== undefined) {
      round.hasError = compareWithin(round.attackBase, weapon.DamageMin - variance, weapon.DamageMax + variance)
    }
  }

  // Prepare summary
  const damagesA = createDamages(fighterA, editorA, getModel(fighterA))
  const damagesB = createDamages(fighterB, editorB, getModel(fighterB))

  // Calculate summary
  for (const { attacker, attackType, attackTypeSecondary, defenseType, hasError, attackBase, hasBase, attackTypeCritical } of flatRounds) {
    const damages = fighterA.ID === attacker.ID ? damagesA : damagesB

    // Calculate damage range
    if (hasBase && !defenseType && attackBase !== undefined) {
      const key = `${attackTypeSecondary ? 'weapon2' : 'weapon1'}_range${attackType === ATTACK_TYPE_SWOOP || attackType === ATTACK_TYPE_SWOOP_CRITICAL ? '_swoop' : ''}${attackTypeCritical ? '_critical' : ''}`

      const range = (damages.ranges[key] ??= { min: +Infinity, max: -Infinity, err: 0, cnt: 0 })

      range.min = Math.min(range.min, attackBase)
      range.max = Math.max(range.max, attackBase)
      range.err = (range.err ?? 0) | (hasError ?? 0)
      range.cnt = (range.cnt ?? 0) + 1

      damages.samples++
    }
  }

  fighterA.damages = damagesA
  fighterB.damages = damagesB
}

function cleanCopy<TObject, TKey extends keyof TObject>(object: TObject, whitelist: readonly TKey[]) {
  return Object.fromEntries(whitelist.map((field) => [field, object[field]]))
}

export function exportFights(fights: Pick<Fight, 'fighterA' | 'fighterB' | 'rounds'>[]) {
  // Collect all players and fights
  const exportedPlayers: Record<string, PlayerModel> = {}

  const exportedFights = fights.map(({ fighterA, fighterB, rounds }) => {
    // Collect players
    if (fighterA.player && fighterA.hash) {
      exportedPlayers[fighterA.hash] = ModelUtils.toSimulatorData(fighterA.player)
    }

    if (fighterB.player && fighterB.hash) {
      exportedPlayers[fighterB.hash] = ModelUtils.toSimulatorData(fighterB.player)
    }

    // Collect fight
    return {
      fighterA: cleanCopy(fighterA, FIGHTER_WHITELIST),
      fighterB: cleanCopy(fighterB, FIGHTER_WHITELIST),
      rounds: rounds.map((round) => ({ ...cleanCopy(round, ROUND_WHITELIST), attackerId: round.attacker.ID, targetId: round.target.ID }))
    }
  })

  // Export
  Exporter.json(
    {
      players: Object.values(exportedPlayers),
      fights: exportedFights
    },
    `analyzer_${Exporter.time}`
  )
}
