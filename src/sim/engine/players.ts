import { SimulatorModel } from '~/sim/workers/base'
import { callEngine, type Engine, type EngineFightLog, toEngineFighter, toFightLogs } from './engine'

type PlayersResult = {
  score: number
  logs: EngineFightLog[] | null
}

export function runPlayers(engine: Engine, attacker: SimulatorModel, defender: SimulatorModel, { iterations, log }: { iterations: number; log: boolean }) {
  SimulatorModel.initializeFighters(attacker, defender)

  const result = callEngine<PlayersResult>(engine, {
    mode: 'players',
    iterations,
    log,
    attacker: toEngineFighter(attacker, defender),
    defender: toEngineFighter(defender, attacker)
  })

  return {
    score: result.score,
    logs: toFightLogs(result.logs, [attacker, defender])
  }
}
