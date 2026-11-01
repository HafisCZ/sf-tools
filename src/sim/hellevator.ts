import { saveSimulatorLog, simulatorConfig, type SimulatorLogTarget } from './debug'
import { type FightLog, type SimulatorPlayerInput, type SimulatorRun } from './types'
import { WorkerBatch } from './workers'
import type { HellevatorMessage, HellevatorResponse } from './workers/hellevator'

export function useHellevatorSimulator() {
  async function simulate(player: SimulatorPlayerInput, enemies: SimulatorPlayerInput[], { instances, iterations }: SimulatorRun, log?: SimulatorLogTarget) {
    const scores: number[] = []

    let logs: FightLog[] = []

    const batch = new WorkerBatch<HellevatorResponse, HellevatorMessage>('hellevator')

    enemies.forEach((enemy, index) => {
      batch.add(
        (data) => {
          scores[index] = data.score

          if (log) {
            logs = logs.concat(data.logs)
          }
        },
        {
          player,
          iterations,
          enemy,
          log: !!log,
          config: simulatorConfig.value
        }
      )
    })

    const duration = await batch.run(instances)

    if (duration === null) return null

    if (log && logs.length > 0) {
      saveSimulatorLog(log, { fights: logs, players: [player, ...enemies], config: simulatorConfig.value })
    }

    return { scores, duration }
  }

  return { simulate }
}
