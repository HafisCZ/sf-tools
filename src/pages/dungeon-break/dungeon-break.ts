import { formatSpacedNumber } from '@utils/formatting'
import { sum } from '@utils/utils'
import { type PlayerModel } from '~/core/models/player'
import { ModelUtils } from '~/core/models/utils'
import { type PlayerDungeons } from '~/data/dungeon-helper'
import { Calculations } from '~/playa/calculations'
import { copyDungeonSharedValues, DUNGEON_COMPANION_CLASSES, DUNGEON_DATA, getDungeonExperience, getOpenBosses, NEXT_DUNGEONS, SANDSTORM, TWISTER, YOUTUBE, type Dungeon, type DungeonEntry, type DungeonResult } from '~/sim/data/dungeons'
import { preparePlayerData } from '~/sim/debug'

export type BreakGroup = 'light' | 'shadow' | 'idols' | 'twister' | 'sandstorm'

export type BreakStatus = 'win' | 'blocked' | 'never' | 'none'

export type MushroomCost = 'average' | 'certain'

export type OpenDungeon = {
  dungeon: Dungeon
  previous: Dungeon | null
  done: number
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

export type BreakDungeon = OpenDungeon & {
  group: BreakGroup
  bosses: BreakBoss[]
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

export function getChanceClass(chance: number) {
  if (chance >= 0.75) return 'bg-[#6fcf7c]'
  if (chance >= 0.35) return 'bg-[#f2c14e]'

  return 'bg-[#ef6b5f]'
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

export function createBreakFighters(character: PlayerModel): (PlayerModel | null)[] {
  const data = ModelUtils.toSimulatorData(character, true)

  if (!Array.isArray(data)) return [preparePlayerData(data), null, null, null]

  const [player, ...companions] = data.map((item) => preparePlayerData(item))

  for (const [index, companion] of companions.entries()) {
    companion.Class = DUNGEON_COMPANION_CLASSES[index]

    copyDungeonSharedValues(companion, player)
  }

  return [player, ...companions]
}

export function listOpenDungeons(progress: PlayerDungeons) {
  const dungeons: OpenDungeon[] = []

  for (const entry of getOpenBosses(progress)) {
    if (getDungeonExperience(entry) === 0) continue

    const floors = Object.values(entry.dungeon.floors)
    const done = floors.indexOf(entry.boss)

    dungeons.push({ dungeon: entry.dungeon, previous: null, done, entries: floors.slice(done).map((boss) => ({ dungeon: entry.dungeon, boss })) })

    const next = entry.dungeon.id in NEXT_DUNGEONS ? DUNGEON_DATA[NEXT_DUNGEONS[entry.dungeon.id]] : undefined

    if (next) {
      dungeons.push({ dungeon: next, previous: entry.dungeon, done: 0, entries: Object.values(next.floors).map((boss) => ({ dungeon: next, boss })) })
    }
  }

  return dungeons
}

const CLEAN_HEALTH = 0.9

export function getCleanWinShare({ score, iterations, playersHealths }: DungeonResult) {
  if (score === 0 || playersHealths.length === 0) return 0

  const clean = playersHealths.filter((health) => health > CLEAN_HEALTH).length / playersHealths.length

  return Math.min(1, clean / (score / iterations))
}

const CERTAINTY = 0.9

function getTries(chance: number, cost: MushroomCost) {
  if (cost === 'average') return 1 / chance
  if (chance >= 1) return 1

  return Math.max(1, Math.ceil(Math.log(1 - CERTAINTY) / Math.log(1 - chance)))
}

function planDungeon(source: OpenDungeon, results: Map<string, DungeonResult>, threshold: number, blocked: boolean, cost: MushroomCost) {
  const hasFreeFights = source.dungeon.id === TWISTER || source.dungeon.id === SANDSTORM

  let stopped = blocked
  let previousClean = 0

  return source.entries.map((entry): BreakBoss => {
    const result = results.get(getFightKey(entry))
    const chance = result ? result.score / result.iterations : null
    const experience = getDungeonExperience(entry)

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

export function planBreak(dungeons: OpenDungeon[], results: Map<string, DungeonResult>, threshold: number, excluded: Set<number>, cost: MushroomCost) {
  const complete = new Set<number>()

  return dungeons.map((source): BreakDungeon => {
    const blocked = source.previous !== null && !complete.has(source.previous.id)
    const bosses = planDungeon(source, results, threshold, blocked, cost)
    const counted = bosses.filter((boss) => boss.status === 'win')
    const included = !excluded.has(source.dungeon.id)

    if (included && counted.length === bosses.length) {
      complete.add(source.dungeon.id)
    }

    return {
      ...source,
      group: getBreakGroup(source.dungeon),
      bosses,
      included,
      potential: sum(bosses.map((boss) => boss.experience)),
      current: sum(counted.map((boss) => boss.experience)),
      mushrooms: sum(counted.map((boss) => boss.cost)),
      winnable: counted.length,
      complete: counted.length === bosses.length
    }
  })
}

export function orderFights(dungeons: BreakDungeon[]) {
  const chains = new Map<number, BreakFight[]>()

  for (const dungeon of dungeons) {
    if (!dungeon.included) continue

    const chain = (dungeon.previous && chains.get(dungeon.previous.id)) || []

    for (const boss of dungeon.bosses) {
      if (boss.status === 'win') {
        chain.push({ dungeon, boss })
      }
    }

    chains.set(dungeon.dungeon.id, chain)
  }

  const pending = [...new Set(chains.values())].filter((chain) => chain.length > 0)
  const order: BreakFight[] = []

  while (pending.some((chain) => chain.length > 0)) {
    let best = { chain: 0, length: 0, ratio: -1 }

    for (const [index, chain] of pending.entries()) {
      let experience = 0
      let cost = 0

      for (const [length, fight] of chain.entries()) {
        experience += fight.boss.experience
        cost += fight.boss.cost

        const ratio = experience / cost

        if (ratio > best.ratio) {
          best = { chain: index, length: length + 1, ratio }
        }
      }
    }

    order.push(...pending[best.chain].splice(0, best.length))
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
