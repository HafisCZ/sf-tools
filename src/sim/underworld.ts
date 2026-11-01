import { createUnderworldUnits, type UnderworldValues } from './data/underworld'
import { saveSimulatorLog, simulatorConfig, type SimulatorLogTarget } from './debug'
import { type FightLog, type SimulatorRun } from './types'
import { WorkerBatch } from './workers'
import type { UnderworldMessage, UnderworldPlayerEntry, UnderworldResponse } from './workers/underworld'

export function useUnderworldSimulator() {
  async function simulate<T extends UnderworldPlayerEntry>(entries: T[], values: UnderworldValues, shieldMode: boolean, gladiator: boolean, { instances, iterations }: SimulatorRun, log?: SimulatorLogTarget) {
    const units = createUnderworldUnits(values, shieldMode)

    const results: T[] = []

    let logs: FightLog[] = []

    const batch = new WorkerBatch<UnderworldResponse<T>, UnderworldMessage>('underworld')

    entries.forEach((entry, index) => {
      batch.add(
        (data) => {
          results[index] = data.results

          if (log) {
            logs = logs.concat(data.logs)
          }
        },
        {
          units,
          player: entry,
          iterations,
          flags: { Gladiator15: gladiator },
          config: simulatorConfig.value,
          log: !!log
        }
      )
    })

    const duration = await batch.run(instances)

    if (duration === null) return null

    if (log && logs.length > 0) {
      saveSimulatorLog(log, { fights: logs, players: results.map(({ player }) => player), config: simulatorConfig.value })
    }

    return { entries: results, duration }
  }

  return { simulate }
}
