import { sequence } from '@utils/utils'
import { type PlayerModel } from '~/core/models/player'
import { type SimulatorData } from '~/core/models/utils'
import { getHellevatorEnemies } from './data/hellevator'
import { getRaidEnemies } from './data/raids'
import { isLegacyEngine, simulatorConfig } from './debug'
import { type SimulatorRun } from './types'
import { WorkerBatch } from './workers'
import type { HellevatorMessage, HellevatorResponse } from './workers/hellevator'
import type { RaidsMessage, RaidsResponse } from './workers/raids'

export type HellRaidSettings = {
  /**
   * Win chance in % a group needs against its raid
   */
  raidChance: number
  /**
   * Win chance in % at which a floor counts as defeated
   */
  floorChance: number
}

export type HellRaidGroup = {
  raid: number
  beaten: boolean
  /**
   * Win chance in % of the group, of everyone who could attack when it has no members, null when nobody could
   */
  chance: number | null
  /**
   * Positions in the planned players
   */
  members: number[]
}

export type HellRaidPlan = {
  /**
   * Top floor per player
   */
  floors: number[]
  groups: HellRaidGroup[]
  /**
   * Players no group needed
   */
  overhead: number[]
  duration: number
}

export const HELL_RAIDS = 12

export const HELL_RAID_FLOORS = 50

type Player = PlayerModel | SimulatorData

type ClimbMessage = HellevatorMessage & { member: number; floor: number }

class PlanCancelled extends Error {}

export function useHellRaidPlanner() {
  async function climb(players: Player[], floorChance: number, run: SimulatorRun) {
    const enemies = getHellevatorEnemies(1, HELL_RAIDS * HELL_RAID_FLOORS)

    const firstLost = players.map(() => enemies.length + 1)

    const batch = new WorkerBatch<HellevatorResponse, ClimbMessage>('hellevator')

    players.forEach((player, member) => {
      for (const enemy of enemies) {
        const floor = enemy.Floor

        batch.add(
          (data) => {
            if (data.score * 100 < floorChance) {
              firstLost[member] = Math.min(firstLost[member], floor)

              batch.skip((params) => params.member === member && params.floor > floor)
            }
          },
          {
            player,
            enemy,
            iterations: run.iterations,
            config: simulatorConfig.value,
            legacy: isLegacyEngine,
            member,
            floor
          }
        )
      }
    })

    const duration = await batch.run(run.instances)
    if (duration === null) return null

    return firstLost.map((floor) => floor - 1)
  }

  async function simulateRaid(raid: number, group: Player[], run: SimulatorRun) {
    const enemies = getRaidEnemies(`hellevator_${raid}`).map((player) => ({ player }))
    const players = group.map((player) => ({ player }))

    let score = 0

    const batch = new WorkerBatch<RaidsResponse, RaidsMessage>('raids')

    sequence(run.instances).forEach(() => {
      batch.add(
        (data) => {
          score += data.results.score
        },
        {
          flags: { Gladiator15: false },
          players,
          enemies,
          iterations: run.iterations,
          config: simulatorConfig.value,
          legacy: isLegacyEngine
        }
      )
    })

    const duration = await batch.run(run.instances)
    if (duration === null) return null

    return (100 * score) / (run.instances * run.iterations)
  }

  async function plan(players: Player[], settings: HellRaidSettings, run: SimulatorRun): Promise<HellRaidPlan | null> {
    const timestamp = Date.now()

    const floors = await climb(players, settings.floorChance, run)
    if (floors === null) return null

    const weakestFirst = (a: number, b: number) => floors[a] - floors[b] || players[a].Level - players[b].Level

    const canAttack = (member: number, raid: number) => floors[member] >= raid * HELL_RAID_FLOORS

    // Lowest top floor first, so the strong members stay free for the later raids
    let free = players.map((_, member) => member).sort(weakestFirst)

    const groups: HellRaidGroup[] = []

    async function simulate(raid: number, members: number[]) {
      const chance = await simulateRaid(
        raid,
        members.map((member) => players[member]),
        run
      )

      if (chance === null) {
        throw new PlanCancelled()
      }

      return chance
    }

    // Fewest of the first pool members that reach the minimum chance together with the base members, all of them when not even they do
    async function findCount(raid: number, base: number[], pool: number[]) {
      let chance = await simulate(raid, [...base, ...pool])
      if (chance < settings.raidChance) {
        return { beaten: false, count: pool.length, chance }
      }

      let low = base.length === 0 ? 1 : 0
      let high = pool.length

      while (low < high) {
        const middle = Math.floor((low + high) / 2)
        const result = await simulate(raid, [...base, ...pool.slice(0, middle)])

        if (result >= settings.raidChance) {
          high = middle
          chance = result
        } else {
          low = middle + 1
        }
      }

      return { beaten: true, count: high, chance }
    }

    async function planRaid(raid: number) {
      const candidates = free.filter((member) => canAttack(member, raid))
      if (candidates.length === 0) {
        groups.push({ raid, beaten: false, chance: null, members: [] })

        return
      }

      const result = await findCount(raid, [], candidates)

      // Everyone left attacks a raid they can still win, a raid at 0% takes nobody
      let members = result.chance > 0 ? candidates.slice(0, result.count) : []
      let chance = result.chance

      if (result.beaten) {
        // The weakest members the group wins without stay free, most of them it does not need at the low end
        let low = 0
        let high = members.length - 1

        while (low < high) {
          const middle = Math.ceil((low + high) / 2)
          const trimmed = await simulate(raid, members.slice(middle))

          if (trimmed >= settings.raidChance) {
            low = middle
            chance = trimmed
          } else {
            high = middle - 1
          }
        }

        members = members.slice(low)
      }

      free = free.filter((member) => !members.includes(member))

      groups.push({ raid, beaten: result.beaten, chance, members })
    }

    // Moves the strongest member of each earlier group up to the target raid, free members who cannot attack that raid take the place
    async function reinforce(target: HellRaidGroup) {
      let improved = false

      const earlier = groups.filter((group) => group.beaten && group.raid < target.raid).reverse()

      for (const group of earlier) {
        const strongest = group.members.filter((member) => canAttack(member, target.raid)).at(-1)
        if (strongest === undefined) continue

        const rest = group.members.filter((member) => member !== strongest)

        const pool = free.filter((member) => canAttack(member, group.raid))
        if (pool.length === 0) continue

        const refill = await findCount(group.raid, rest, pool)
        if (!refill.beaten) continue

        const moved = pool.slice(0, refill.count)

        free = free.filter((member) => !moved.includes(member))

        group.members = [...rest, ...moved].sort(weakestFirst)
        group.chance = refill.chance

        target.members = [...target.members, strongest].sort(weakestFirst)
        target.chance = await simulate(target.raid, target.members)

        improved = true

        if (target.chance >= settings.raidChance) {
          target.beaten = true

          break
        }
      }

      return improved
    }

    try {
      for (let raid = 1; raid <= HELL_RAIDS; raid++) {
        await planRaid(raid)
      }

      // Each round can win one more raid at most
      for (let round = 0; round < HELL_RAIDS; round++) {
        // First raid that has members but misses the minimum chance
        const target = groups.find((group) => !group.beaten && group.members.length > 0)
        if (!target) break

        while (!target.beaten && (await reinforce(target))) {
          // Moves members up until no earlier group can spare one
        }

        if (!target.beaten) break

        // The raid can be beaten now, so it and the later raids are planned again from the members they had
        for (const group of groups.splice(groups.indexOf(target))) {
          free = [...free, ...group.members]
        }

        free.sort(weakestFirst)

        for (let raid = target.raid; raid <= HELL_RAIDS; raid++) {
          await planRaid(raid)
        }
      }
    } catch (error) {
      if (error instanceof PlanCancelled) {
        return null
      }

      throw error
    }

    return { floors, groups, overhead: free, duration: Date.now() - timestamp }
  }

  return { plan }
}
