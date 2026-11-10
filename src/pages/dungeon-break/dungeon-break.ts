import { formatSpacedNumber } from '@utils/formatting'
import { globalLocalize } from '@utils/localization'
import { sum } from '@utils/utils'
import { type PlayerModel } from '~/core/models/player'
import { ModelUtils } from '~/core/models/utils'
import { Calculations } from '~/playa/calculations'
import { copyDungeonSharedValues, DUNGEON_COMPANION_CLASSES, DUNGEON_DATA, getDungeonExperience, getDungeonName, getDungeonTries, PREVIOUS_DUNGEONS, SANDSTORM, TOWER, TWISTER, YOUTUBE, type Dungeon, type DungeonEntry, type DungeonResult } from '~/sim/data/dungeons'
import { preparePlayerData } from '~/sim/debug'

export type BreakGroup = 'light' | 'shadow' | 'idols' | 'twister' | 'sandstorm'

export type BreakStatus = 'win' | 'blocked' | 'never' | 'none' | 'locked'

export type MushroomCost = 'average' | 'certain'

export type RemainingDungeon = {
  dungeon: Dungeon
  done: number
  open: boolean
  entries: DungeonEntry[]
}

export type BreakBoss = {
  entry: DungeonEntry
  experience: number
  chance: number | null
  clean: number
  free: number | null
  cost: number
  status: BreakStatus
}

export type BreakDungeon = RemainingDungeon & {
  group: BreakGroup
  bosses: BreakBoss[]
  reachable: boolean
  included: boolean
  potential: number
  current: number
  mushrooms: number
  winnable: number
  complete: boolean
}

export type BreakFight = {
  dungeon: BreakDungeon
  boss: BreakBoss
}

export type BreakOptions = {
  threshold: number
  excluded: Set<number>
  cost: MushroomCost
  level: number
  xp: number
  progress: Map<number, number>
}

export const FIGHTER_NAME_KEYS = ['dungeons.player', 'general.companion1', 'general.companion2', 'general.companion3']

type DungeonUnlock = {
  level?: number
  after?: number[]
  floors?: [id: number, count: number]
  open?: number
}

const DUNGEON_UNLOCKS: Record<number, DungeonUnlock> = {
  1: { level: 10 },
  2: { level: 20 },
  3: { level: 30 },
  4: { level: 40 },
  5: { level: 50 },
  6: { level: 70 },
  7: { level: 80 },
  8: { level: 95 },
  9: { level: 110 },
  10: { after: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
  11: { after: [10] },
  12: { after: [11] },
  22: { level: 210 },
  23: { level: 240 },
  13: { after: [12] },
  24: { level: 280 },
  16: { level: 200 },
  17: { floors: [11, 5] },
  14: { open: 11 },
  25: { level: 340 },
  21: { level: 270 },
  27: { after: [14] },
  28: { after: [16] },
  19: { level: 180 },
  29: { after: [17] },
  30: { after: [13] },
  20: { level: 200 },
  26: { level: 480 },
  31: { level: 500 },
  32: { level: 520 },
  33: { level: 540 },
  34: { level: 560 },
  35: { level: 580 },
  [TOWER]: { level: 125, after: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
  [TWISTER]: { level: 130, open: TOWER },
  [YOUTUBE]: { level: 222, open: TOWER },
  [SANDSTORM]: { level: 500, after: [26] },
  101: { level: 140, open: TOWER },
  102: { floors: [101, 5] },
  103: { floors: [102, 5] },
  104: { floors: [103, 5] },
  105: { floors: [104, 5] },
  106: { floors: [105, 5] },
  107: { floors: [106, 5] },
  108: { floors: [107, 5] },
  109: { floors: [108, 5] },
  110: { floors: [109, 5] },
  111: { floors: [110, 5] },
  112: { floors: [111, 5] },
  122: { level: 320 },
  123: { level: 350 },
  113: { floors: [112, 5] },
  124: { level: 370 },
  116: { level: 350 },
  117: { floors: [112, 5] },
  114: { floors: [113, 5] },
  125: { level: 500 },
  121: { level: 350 },
  127: { after: [114] },
  128: { after: [116] },
  119: { level: 280 },
  129: { after: [117] },
  130: { after: [113] },
  120: { level: 300 },
  126: { level: 600 },
  131: { level: 620 },
  132: { level: 640 },
  133: { level: 660 },
  134: { level: 680 },
  135: { level: 700 }
}

export function formatExperience(value: number) {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)} M`

  return formatSpacedNumber(Math.round(value))
}

export function formatMushrooms(value: number) {
  const mushrooms = Math.ceil(value - 1e-9)

  return mushrooms > 9999 ? `${(Math.ceil(mushrooms / 100) / 10).toFixed(1).replace(/\.0$/, '')}K` : String(mushrooms)
}

export function formatChance(chance: number) {
  return chance >= 0.99995 ? '100%' : `${(chance * 100).toFixed(2)}%`
}

export function getBreakGroup({ id }: Dungeon): BreakGroup {
  if (id === YOUTUBE) return 'idols'
  if (id === TWISTER) return 'twister'
  if (id === SANDSTORM) return 'sandstorm'

  return id < 100 ? 'light' : 'shadow'
}

export function getFightKey({ dungeon, boss }: DungeonEntry) {
  return `${dungeon.id}:${boss.pos}`
}

function getUnlockName(id: number) {
  const name = getDungeonName(DUNGEON_DATA[id])

  return id > 100 && id < TOWER ? `${globalLocalize('general.dungeon_shadow')} ${name}` : name
}

export function getUnlockText(id: number) {
  const { level, after = [], floors, open } = DUNGEON_UNLOCKS[id] ?? {}

  if (floors) return globalLocalize('dungeon_break.unlock.floors', { count: floors[1], name: getUnlockName(floors[0]) })
  if (after.length > 1) return globalLocalize('dungeon_break.unlock.after_range', { from: DUNGEON_DATA[after[0]].pos, to: DUNGEON_DATA[after[after.length - 1]].pos })
  if (after.length === 1) return level ? globalLocalize('dungeon_break.unlock.level_after', { level, name: getUnlockName(after[0]) }) : globalLocalize('dungeon_break.unlock.after', { name: getUnlockName(after[0]) })
  if (open !== undefined) return level ? globalLocalize('dungeon_break.unlock.level_open', { level, name: getUnlockName(open) }) : globalLocalize('dungeon_break.unlock.open', { name: getUnlockName(open) })

  return level ? globalLocalize('dungeon_break.unlock.level', { level }) : ''
}

export function createBreakFighters(character: PlayerModel): (PlayerModel | null)[] {
  const data = ModelUtils.toSimulatorData(character, true)

  if (!Array.isArray(data)) {
    return [preparePlayerData(data), null, null, null]
  }

  const [player, ...companions] = data.map((item) => preparePlayerData(item))

  for (const [index, companion] of companions.entries()) {
    companion.Class = DUNGEON_COMPANION_CLASSES[index]

    copyDungeonSharedValues(companion, player)
  }

  return [player, ...companions]
}

export function setFightersLevel(fighters: (PlayerModel | null)[], level: number) {
  return fighters.map((fighter) => fighter && Object.assign(structuredClone(fighter), { Level: level }))
}

export function listRemainingDungeons(progress: Map<number, number>) {
  const dungeons: RemainingDungeon[] = []

  for (const dungeon of Object.values(DUNGEON_DATA).sort((a, b) => a.pos - b.pos)) {
    const floors = Object.values(dungeon.floors)
    const value = progress.get(dungeon.id) ?? -1
    const done = Math.max(0, value)

    if (done >= floors.length || getDungeonExperience({ dungeon, boss: floors[0] }) === 0) continue

    dungeons.push({ dungeon, done, open: value >= 0, entries: floors.slice(done).map((boss) => ({ dungeon, boss })) })
  }

  return dungeons
}

type UnlockState = {
  level: number
  progress: Map<number, number>
  done: Map<number, number>
}

function getSavedFloors(progress: Map<number, number>) {
  return new Map([...progress].map(([id, value]) => [id, Math.max(0, value)]))
}

function isCleared(id: number, done: Map<number, number>) {
  return (done.get(id) ?? 0) >= Object.keys(DUNGEON_DATA[id].floors).length
}

function isUnlocked(id: number, state: UnlockState): boolean {
  if ((state.progress.get(id) ?? -1) >= 0) return true

  const unlock = DUNGEON_UNLOCKS[id]

  if (!unlock) return false

  const { level = 0, after = [], floors, open } = unlock

  return state.level >= level && after.every((other) => isCleared(other, state.done)) && (!floors || (state.done.get(floors[0]) ?? 0) >= floors[1]) && (open === undefined || isUnlocked(open, state))
}

const CLEAN_HEALTH = 0.9

export function getCleanWinShare({ score, iterations, playersHealths }: DungeonResult) {
  if (score === 0 || playersHealths.length === 0) return 0

  const clean = playersHealths.filter((health) => health > CLEAN_HEALTH).length / playersHealths.length

  return Math.min(1, clean / (score / iterations))
}

function getTries(chance: number, cost: MushroomCost) {
  const tries = getDungeonTries(chance)

  return cost === 'average' ? tries.average : tries.certain
}

function planDungeon(source: RemainingDungeon, results: Map<string, DungeonResult>, threshold: number, locked: boolean, cost: MushroomCost) {
  const hasFreeFights = source.dungeon.id === TWISTER || source.dungeon.id === SANDSTORM

  let stopped = false
  let previousClean = 0

  return source.entries.map((entry): BreakBoss => {
    const result = results.get(getFightKey(entry))
    const chance = result ? result.score / result.iterations : null
    const experience = getDungeonExperience(entry)

    if (locked) {
      return { entry, experience, chance, clean: 0, free: null, cost: 0, status: 'locked' }
    }

    if (stopped || !result || chance === null || chance === 0 || chance < threshold) {
      stopped = true

      return { entry, experience, chance, clean: 0, free: null, cost: 0, status: chance === null ? 'none' : chance === 0 ? 'never' : 'blocked' }
    }

    const tries = getTries(chance, cost)

    if (!hasFreeFights) {
      return { entry, experience, chance, clean: 0, free: null, cost: tries, status: 'win' }
    }

    // A win above 90% HP on the floor before makes the first fight here free, retries after a loss are always paid
    const free = previousClean
    const clean = getCleanWinShare(result)

    previousClean = clean

    return { entry, experience, chance, clean, free, cost: tries - free, status: 'win' }
  })
}

export function planBreak(dungeons: RemainingDungeon[], results: Map<string, DungeonResult>, { threshold, excluded, cost, level, xp, progress }: BreakOptions) {
  const plans = new Map<number, BreakBoss[]>()
  const done = getSavedFloors(progress)

  let experience = 0
  let opened = true

  while (opened) {
    opened = false

    const state = { level: getLevelAfter(level, xp, experience), progress, done }

    for (const source of dungeons) {
      const { id } = source.dungeon

      if (plans.has(id) || !isUnlocked(id, state)) continue

      const bosses = planDungeon(source, results, threshold, false, cost)

      plans.set(id, bosses)
      opened = true

      if (excluded.has(id)) continue

      const won = bosses.filter((boss) => boss.status === 'win')

      experience += sum(won.map((boss) => boss.experience))
      done.set(id, source.done + won.length)
    }
  }

  return dungeons.map((source): BreakDungeon => {
    const bosses = plans.get(source.dungeon.id) ?? planDungeon(source, results, threshold, true, cost)
    const counted = bosses.filter((boss) => boss.status === 'win')

    return {
      ...source,
      group: getBreakGroup(source.dungeon),
      bosses,
      reachable: plans.has(source.dungeon.id),
      included: !excluded.has(source.dungeon.id),
      potential: sum(bosses.map((boss) => boss.experience)),
      current: sum(counted.map((boss) => boss.experience)),
      mushrooms: sum(counted.map((boss) => boss.cost)),
      winnable: counted.length,
      complete: counted.length === bosses.length
    }
  })
}

export function orderFights(dungeons: BreakDungeon[], progress: Map<number, number>, level: number, xp: number) {
  const chains = new Map<number, BreakFight[]>()

  for (const dungeon of dungeons) {
    if (!dungeon.included) continue

    const chain = chains.get(PREVIOUS_DUNGEONS[dungeon.dungeon.id]) || []

    for (const boss of dungeon.bosses) {
      if (boss.status === 'win') {
        chain.push({ dungeon, boss })
      }
    }

    chains.set(dungeon.dungeon.id, chain)
  }

  const pending = [...new Set(chains.values())].filter((chain) => chain.length > 0)
  const done = getSavedFloors(progress)
  const order: BreakFight[] = []

  let experience = 0

  while (pending.length > 0) {
    const state = { level: getLevelAfter(level, xp, experience), progress, done }

    let best = { chain: -1, length: 0, ratio: -1 }

    for (const [index, chain] of pending.entries()) {
      if (!isUnlocked(chain[0].dungeon.dungeon.id, state)) continue

      let chainExperience = 0
      let cost = 0

      for (const [length, fight] of chain.entries()) {
        chainExperience += fight.boss.experience
        cost += fight.boss.cost

        const ratio = chainExperience / cost

        if (ratio > best.ratio) {
          best = { chain: index, length: length + 1, ratio }
        }
      }
    }

    if (best.chain === -1) break

    for (const fight of pending[best.chain].splice(0, best.length)) {
      const { id } = fight.dungeon.dungeon

      experience += fight.boss.experience
      done.set(id, (done.get(id) ?? 0) + 1)
      order.push(fight)
    }

    if (pending[best.chain].length === 0) {
      pending.splice(best.chain, 1)
    }
  }

  return order
}

export function spendMushrooms(order: BreakFight[], mushrooms: number) {
  let spent = 0
  let experience = 0
  let fights = 0

  for (const { boss } of order) {
    if (spent + boss.cost > mushrooms + 1e-9) break

    spent += boss.cost
    experience += boss.experience
    fights++
  }

  return { fights, experience }
}

export function getLevelAfter(level: number, xp: number, experience: number) {
  let current = Math.max(1, level)
  let rest = Math.max(0, xp) + experience

  while (rest >= Calculations.experienceNextLevel(current)) {
    rest -= Calculations.experienceNextLevel(current)
    current++
  }

  return current + rest / Calculations.experienceNextLevel(current)
}
