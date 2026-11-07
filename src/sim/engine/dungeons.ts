import { SimulatorModel } from '~/sim/workers/base'
import { callEngine, type Engine, type EngineFighter, type EngineFightLog, toEngineFighter, toFightLogs } from './engine'

type DungeonsResult = {
  score: number
  enemyHealths: number[]
  playersHealths: number[]
  logs: EngineFightLog[] | null
}

export function runDungeons(engine: Engine, playerModels: SimulatorModel[], bossModel: SimulatorModel, { iterations, hpcap, log }: { iterations: number; hpcap: number; log: boolean }) {
  const players: EngineFighter[] = []
  const bosses: EngineFighter[] = []

  for (const model of playerModels) {
    SimulatorModel.initializeFighters(model, bossModel)

    players.push(toEngineFighter(model, bossModel))
    bosses.push(toEngineFighter(bossModel, model))
  }

  const result = callEngine<DungeonsResult>(engine, { mode: 'dungeons', iterations, healthCap: hpcap, log, players, bosses })

  return {
    results: {
      iterations,
      score: result.score,
      enemyHealths: result.enemyHealths,
      playersHealths: result.playersHealths
    },
    logs: toFightLogs(result.logs, [...playerModels, bossModel])
  }
}
