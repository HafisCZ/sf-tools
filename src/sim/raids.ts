import { sequence, sum } from '@utils/utils'
import { type PlayerModel } from '~/core/models/player'
import { type SimulatorData } from '~/core/models/utils'
import { getRaidEnemies, scaleRaidPlayers } from './data/raids'
import { saveSimulatorLog, simulatorConfig, type SimulatorLogTarget } from './debug'
import { type FightLog, type SimulatorRun } from './types'
import { WorkerBatch } from './workers'
import type { RaidsMessage, RaidsResponse } from './workers/raids'

export function useRaidSimulator() {
  async function simulate(raid: string, players: (PlayerModel | SimulatorData)[], gladiator: boolean, { instances, iterations }: SimulatorRun, log?: SimulatorLogTarget) {
    const enemies = getRaidEnemies(raid).map((player) => ({ player }))

    const scaledPlayers = scaleRaidPlayers(raid, players).map((player) => ({ player }))

    const scores: number[] = []

    let logs: FightLog[] = []

    const batch = new WorkerBatch<RaidsResponse, RaidsMessage>('raids')

    sequence(instances).forEach(() => {
      batch.add(
        (data) => {
          scores.push(data.results.score)

          if (log) {
            logs = logs.concat(data.logs)
          }
        },
        {
          flags: { Gladiator15: gladiator },
          players: scaledPlayers,
          enemies,
          iterations,
          config: simulatorConfig.value,
          log: !!log
        }
      )
    })

    const duration = await batch.run(instances)

    if (duration === null) return null

    if (log && logs.length > 0) {
      saveSimulatorLog(log, { fights: logs, players, config: simulatorConfig.value })
    }

    return { score: (100 * sum(scores)) / (instances * iterations), duration }
  }

  return { simulate }
}
