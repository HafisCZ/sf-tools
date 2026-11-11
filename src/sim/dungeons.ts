import { compact, sequence, sum } from '@utils/utils'
import { NEXT_DUNGEONS, PREVIOUS_DUNGEONS, type DungeonEntry, type DungeonResult } from './data/dungeons'
import { isLegacyEngine, saveSimulatorLog, simulatorConfig, type SimulatorLogTarget } from './debug'
import { type FightLog, type SimulatorPlayerInput, type SimulatorRun } from './types'
import { WorkerBatch } from './workers'
import type { DungeonsMessage, DungeonsResponse } from './workers/dungeons'

export type DungeonFight = {
  entry: DungeonEntry
  players: SimulatorPlayerInput[]
  boss: SimulatorPlayerInput
}

const HEALTH_CAP = 500

function averageHealths(healths: number[][]) {
  return (healths.at(0) ?? []).map((_, index) => sum(healths.map((values) => values[index])) / healths.length).sort((a, b) => a - b)
}

export function useDungeonSimulator() {
  async function simulateBoss({ entry, players, boss }: DungeonFight, { instances, iterations }: SimulatorRun, log?: SimulatorLogTarget) {
    const enemyHealths: number[][] = []
    const playersHealths: number[][] = []

    let score = 0
    let logs: FightLog[] = []

    const batch = new WorkerBatch<DungeonsResponse, DungeonsMessage>('dungeons')

    sequence(instances).forEach(() => {
      batch.add(
        (data) => {
          enemyHealths.push(data.results.enemyHealths)
          playersHealths.push(data.results.playersHealths)

          score += data.results.score
          logs = logs.concat(data.logs)
        },
        {
          players,
          boss,
          config: simulatorConfig.value,
          log: !!log,
          legacy: isLegacyEngine,
          iterations
        }
      )
    })

    const duration = await batch.run(instances)

    if (duration === null) return null

    if (log && logs.length > 0) {
      saveSimulatorLog(log, { fights: logs, players: [...players, boss], config: simulatorConfig.value })
    }

    const result: DungeonResult = { ...entry, score, iterations: instances * iterations, enemyHealths: averageHealths(enemyHealths), playersHealths: averageHealths(playersHealths) }

    return { result, duration }
  }

  async function simulateBosses(fights: DungeonFight[], { instances, iterations }: SimulatorRun) {
    const results: DungeonResult[] = []

    const batch = new WorkerBatch<DungeonsResponse, DungeonsMessage>('dungeons')

    fights.forEach(({ entry, players, boss }, index) => {
      batch.add(
        (data) => {
          results[index] = { ...entry, ...data.results }
        },
        {
          players,
          boss,
          iterations,
          hpcap: HEALTH_CAP,
          config: simulatorConfig.value,
          legacy: isLegacyEngine
        }
      )
    })

    const duration = await batch.run(instances)

    if (duration === null) return null

    return { results, duration }
  }

  async function simulateNext(fights: DungeonFight[], threshold: { min: number; max: number }, { instances, iterations }: SimulatorRun) {
    const results: DungeonResult[] = []

    const batch = new WorkerBatch<DungeonsResponse, DungeonsMessage & { id: number }>('dungeons')

    fights.forEach(({ entry, players, boss }, index) => {
      batch.add(
        (data) => {
          const score = data.results.score

          if (score < (threshold.min * iterations) / 100 || score > (threshold.max * iterations) / 100) {
            batch.skip(({ id }) => id === entry.dungeon.id || id === NEXT_DUNGEONS[entry.dungeon.id])
          } else {
            results[index] = { ...entry, ...data.results }
          }
        },
        {
          players,
          boss,
          iterations,
          hpcap: HEALTH_CAP,
          config: simulatorConfig.value,
          legacy: isLegacyEngine,
          id: entry.dungeon.id
        }
      )
    })

    // Execute instance only if there is none running with the same dungeon id
    const duration = await batch.run(instances, ({ id }, { id: running }) => id !== running && PREVIOUS_DUNGEONS[id] !== running)

    if (duration === null) return null

    return { results: compact(results), duration }
  }

  async function simulateUntilNotPossible(fights: DungeonFight[], { instances, iterations }: SimulatorRun) {
    const results: DungeonResult[] = []

    const batch = new WorkerBatch<DungeonsResponse, DungeonsMessage & { id: number }>('dungeons')

    fights.forEach(({ entry, players, boss }, index) => {
      batch.add(
        (data) => {
          results[index] = { ...entry, ...data.results }

          if (data.results.score === 0) {
            batch.skip(({ id }) => id === entry.dungeon.id || id === NEXT_DUNGEONS[entry.dungeon.id])
          }
        },
        {
          players,
          boss,
          iterations,
          hpcap: HEALTH_CAP,
          config: simulatorConfig.value,
          legacy: isLegacyEngine,
          id: entry.dungeon.id
        }
      )
    })

    const duration = await batch.run(instances, ({ id }, { id: running }) => id !== running && PREVIOUS_DUNGEONS[id] !== running)

    if (duration === null) return null

    return { results: compact(results), duration }
  }

  return { simulateBoss, simulateBosses, simulateNext, simulateUntilNotPossible }
}
