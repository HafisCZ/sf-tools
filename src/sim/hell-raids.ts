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
   * Raids to plan, lowest first
   */
  raids: number[]
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
   * Win chance in % of the group, of everyone who could attack when not beaten, `null` when nobody could
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

    // Lowest top floor first, so the strong members stay free for the later raids
    let free = players.map((_, member) => member).sort((a, b) => floors[a] - floors[b] || players[a].Level - players[b].Level)

    const groups: HellRaidGroup[] = []

    for (let position = 0; position < settings.raids.length; position++) {
      const raid = settings.raids[position]

      const candidates = free.filter((member) => floors[member] >= raid * HELL_RAID_FLOORS)
      if (candidates.length === 0) {
        groups.push({ raid, beaten: false, chance: null, members: [] })

        continue
      }

      const simulateFirst = (count: number) =>
        simulateRaid(
          raid,
          candidates.slice(0, count).map((member) => players[member]),
          run
        )

      let chance = await simulateFirst(candidates.length)
      if (chance === null) return null
      if (chance < settings.raidChance) {
        groups.push({ raid, beaten: false, chance, members: [] })

        continue
      }

      let low = 1
      let high = candidates.length

      while (low < high) {
        const middle = Math.floor((low + high) / 2)
        const result = await simulateFirst(middle)

        if (result === null) return null
        if (result >= settings.raidChance) {
          high = middle
          chance = result
        } else {
          low = middle + 1
        }
      }

      const members = candidates.slice(0, high)

      free = free.filter((member) => !members.includes(member))

      groups.push({ raid, beaten: true, chance, members })
    }

    return { floors, groups, overhead: free, duration: Date.now() - timestamp }
  }

  return { plan }
}
