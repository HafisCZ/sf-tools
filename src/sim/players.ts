import { saveSimulatorLog, simulatorConfig, type SimulatorLogTarget } from './debug'
import { type FightLog, type SimulatorFlags, type SimulatorRun } from './types'
import { WorkerBatch } from './workers'
import type { PlayerEntry, PlayersMessage, PlayersResponse } from './workers/players'

export function usePlayerSimulator() {
  async function simulate<T extends PlayerEntry>(mode: PlayersMessage['mode'], entries: T[], yourself: T | undefined, flags: Partial<SimulatorFlags>, { instances, iterations }: SimulatorRun, log?: SimulatorLogTarget) {
    const isSingleTarget = mode === 'attack' || mode === 'defend'

    const results: T[] = []

    let logs: FightLog[] = []

    const batch = new WorkerBatch<PlayersResponse<T>, PlayersMessage>('players')

    entries.forEach((entry, index) => {
      batch.add(
        (data) => {
          results[index] = data.results

          if (log) {
            logs = logs.concat(data.logs)
          }
        },
        {
          player: isSingleTarget && yourself ? yourself : entry,
          target: isSingleTarget ? entry : entries,
          flags,
          config: simulatorConfig.value,
          mode,
          log: !!log,
          iterations
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
