import { globalLocalize, hasTranslation } from '@utils/localization'
import { compact } from '@utils/utils'

export type DungeonEntry = {
  dungeon: Dungeon
  boss: DungeonBoss
}

export type DungeonResult = DungeonEntry & {
  score: number
  iterations: number
  healths: number[]
}

export const TOWER = 201
export const YOUTUBE = 202
export const TWISTER = 203
export const SANDSTORM = 204
export const CLASS_DUNGEONS = 300

// Dungeons that continue in another one once all of their enemies are beaten
export const NEXT_DUNGEONS: Record<number, number> = {
  13: 30,
  113: 130,
  14: 27,
  114: 127,
  16: 28,
  116: 128,
  17: 29,
  117: 129
}

export const PREVIOUS_DUNGEONS: Record<number, number> = Object.fromEntries(Object.entries(NEXT_DUNGEONS).map(([id, next]) => [next, Number(id)]))

// Dungeon ID of each index in the player's normal and shadow dungeon progress
const PROGRESS_DUNGEONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35]

export function getDungeonName(dungeon: Dungeon) {
  return globalLocalize(`dungeon_enemies.${dungeon.intl}.name`)
}

export function getBossName({ dungeon, boss }: DungeonEntry) {
  const key = `monsters.${boss.id}`

  return boss.id !== undefined && hasTranslation(key) ? globalLocalize(key) : globalLocalize(`dungeon_enemies.${dungeon.intl}.${boss.pos}`)
}

export function getDungeonExperience({ dungeon, boss }: DungeonEntry) {
  if (dungeon.id === TOWER || dungeon.id >= CLASS_DUNGEONS) {
    return 0
  }

  return Calculations.experienceNextLevel(boss.level) / (dungeon.id === TWISTER || dungeon.id === SANDSTORM ? 50 : 5)
}

function getBossAtIndex(id: number, index: number): DungeonEntry | null {
  const dungeon = DUNGEON_DATA[id]
  const boss = index >= 0 && dungeon ? Object.values(dungeon.floors).at(index) : undefined

  return boss ? { dungeon, boss } : null
}

function getBossAtPosition(id: number, position: number): DungeonEntry | null {
  const dungeon = DUNGEON_DATA[id]
  const boss = dungeon ? Object.values(dungeon.floors).find((floor) => floor.pos === position) : undefined

  return boss ? { dungeon, boss } : null
}

export function getOpenBosses(dungeons: PlayerDungeons) {
  const entries = compact([
    ...dungeons.Normal.map((progress, index) => getBossAtIndex(PROGRESS_DUNGEONS[index], progress)),
    getBossAtIndex(TOWER, dungeons.Normal.Total < 90 ? -1 : dungeons.Tower),
    getBossAtPosition(TWISTER, dungeons.Twister + 1),
    ...dungeons.Shadow.map((progress, index) => getBossAtIndex(PROGRESS_DUNGEONS[index] + 100, progress)),
    getBossAtIndex(YOUTUBE, dungeons.Youtube),
    getBossAtIndex(SANDSTORM, dungeons.Sandstorm),
    ...dungeons.Class.map((progress, index) => getBossAtIndex(CLASS_DUNGEONS + index, progress))
  ])

  return entries.sort((a, b) => a.dungeon.pos - b.dungeon.pos)
}

export function getRemainingBosses({ dungeon, boss }: DungeonEntry): DungeonEntry[] {
  const floors = Object.values(dungeon.floors)
  const start = floors.findIndex((floor) => floor.pos === boss.pos)

  const entries = (start === -1 ? [] : floors.slice(start)).map((floor) => ({ dungeon, boss: floor }))

  const next = dungeon.id in NEXT_DUNGEONS ? DUNGEON_DATA[NEXT_DUNGEONS[dungeon.id]] : undefined

  return next ? [...entries, ...Object.values(next.floors).map((floor) => ({ dungeon: next, boss: floor }))] : entries
}

function createMirrorBoss(entry: DungeonEntry, player: PlayerModel) {
  const mirror = structuredClone(player)

  if (entry.dungeon.companions) {
    mirror.Constitution.Total = 4 * mirror.Constitution.Total
  }

  mirror.Health = Math.trunc(mirror.Constitution.Total * CONFIG.fromID(mirror.Class).HealthMultiplier * (mirror.Level + 1))

  mirror.Level = entry.boss.level
  mirror.Name = getBossName(entry)
  mirror.Fortress = { Gladiator: 0 }
  mirror.Dungeons = { Player: 0, Group: 0 }

  delete mirror.Prefix

  return mirror
}

function createBossWeapon(boss: DungeonClassBoss) {
  return {
    AttributeTypes: { 2: boss.runes ? boss.runes.type : 0 },
    Attributes: { 2: boss.runes ? boss.runes.damage : 0 },
    DamageMax: boss.max,
    DamageMin: boss.min,
    HasEnchantment: false
  }
}

export function createBoss(entry: DungeonEntry, player: PlayerModel) {
  const { dungeon, boss } = entry

  if (boss.class === undefined) {
    return createMirrorBoss(entry, player)
  }

  const resistances = boss.runes?.res ?? [0, 0, 0]

  return {
    Armor: boss.armor || (dungeon.armor_multiplier || 1) * (boss.level * CONFIG.fromID(boss.class).MaximumDamageReduction),
    Class: boss.class,
    Name: getBossName(entry),
    Level: boss.level,
    Health: boss.health,
    NoBaseDamage: true,
    BlockChance: boss.block,
    Identifier: 999,
    Strength: { Total: boss.str },
    Dexterity: { Total: boss.dex },
    Intelligence: { Total: boss.int },
    Constitution: { Total: boss.con },
    Luck: { Total: boss.lck },
    Dungeons: { Player: 0, Group: 0 },
    Fortress: { Gladiator: 0 },
    Potions: { Life: 0 },
    Runes: {
      Health: 0,
      ResistanceFire: resistances[0],
      ResistanceCold: resistances[1],
      ResistanceLightning: resistances[2]
    },
    Items: {
      Hand: {},
      Wpn1: createBossWeapon(boss),
      Wpn2: createBossWeapon(boss)
    }
  }
}

export function createSimulatorBoss(entry: DungeonEntry, player: PlayerModel) {
  const data = createBoss(entry, player)

  data.Constitution.Total = Math.ceil((data.Health ?? 0) / (CONFIG.fromID(data.Class).HealthMultiplier * (data.Level + 1)))

  if (data.Class === WARRIOR && data.BlockChance === undefined) {
    data.BlockChance = 25
  }

  return data
}

export function createDungeonPlayers(dungeon: Dungeon, player: PlayerModel, companions: PlayerModel[]) {
  if (!dungeon.companions) {
    return [structuredClone(player)]
  }

  const [bert, mark, kunigunde] = companions.map((companion) => structuredClone(companion))

  const portalBonus = (100 + bert.Dungeons.Player) / 100
  const potionBonus = (100 + (bert.Potions.Life ?? 0)) / 100
  const runeBonus = (100 + bert.Runes.Health) / 100

  bert.BlockChance = 0
  bert.Health = Math.trunc(Math.floor(bert.Constitution.Total * 5 * (bert.Level + 1) * portalBonus) * potionBonus * runeBonus * 1.22)

  return [bert, mark, kunigunde, structuredClone(player)]
}
