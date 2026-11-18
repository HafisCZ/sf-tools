import { type SimulatorState } from '~/sim/types'
import { SimulatorModel } from '~/sim/workers/base'
import { callEngine, type Engine, type EngineFighter, type EngineFightLog, toEngineFighter, toFightLogs } from './engine'

type RaidsResult = {
  score: number
  logs: EngineFightLog[] | null
}

type EngineSetup = {
  fireball: number
  data: SimulatorState
}

export function runRaids(engine: Engine, playerModels: SimulatorModel[], enemyModels: SimulatorModel[], { iterations, log }: { iterations: number; log: boolean }) {
  const players: EngineFighter[] = []
  const enemies: EngineFighter[] = []

  const playerSetups: EngineSetup[][] = []
  const enemySetups: EngineSetup[][] = []

  playerModels.forEach((playerModel, playerIndex) => {
    const playerRow: EngineSetup[] = []
    const enemyRow: EngineSetup[] = []

    enemyModels.forEach((enemyModel, enemyIndex) => {
      SimulatorModel.initializeFighters(playerModel, enemyModel)

      const player = toEngineFighter(playerModel, enemyModel)
      const enemy = toEngineFighter(enemyModel, playerModel)

      if (enemyIndex === 0) {
        players.push(player)
      }

      if (playerIndex === 0) {
        enemies.push(enemy)
      }

      playerRow.push({ fireball: player.fireball, data: player.data })
      enemyRow.push({ fireball: enemy.fireball, data: enemy.data })
    })

    playerSetups.push(playerRow)
    enemySetups.push(enemyRow)
  })

  const result = callEngine<RaidsResult>(engine, { mode: 'raids', iterations, log, players, enemies, playerSetups, enemySetups })

  return {
    results: {
      score: result.score
    },
    logs: toFightLogs(result.logs, [...playerModels, ...enemyModels])
  }
}
