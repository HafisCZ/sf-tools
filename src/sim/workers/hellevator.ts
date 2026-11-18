import { loadEngine } from '~/sim/engine/engine'
import { runPlayers } from '~/sim/engine/players'
import { runLegacyPlayers } from '~/sim/legacy/players'
import { type FightLog, type SimulatorPlayerInput } from '~/sim/types'
import { CONFIG, resetState, SimulatorModel } from './base'

export type HellevatorMessage = {
  config?: Record<string, unknown> | null
  player: SimulatorPlayerInput
  enemy: SimulatorPlayerInput
  iterations: number
  log?: boolean
  legacy?: boolean
}

export type HellevatorResponse = {
  score: number
  logs: FightLog[]
}

if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.addEventListener('message', function ({ data }: MessageEvent<HellevatorMessage>) {
    void respond(data)
  })
}

async function respond({ config, player, enemy, iterations, log, legacy }: HellevatorMessage) {
  const engine = legacy ? null : await loadEngine()

  resetState()

  CONFIG.set(config)

  const attacker = SimulatorModel.create(0, player)
  const defender = SimulatorModel.create(1, enemy)

  const options = { iterations, log: !!log }

  const result = engine ? runPlayers(engine, attacker, defender, options) : runLegacyPlayers(attacker, defender, options)

  self.postMessage({
    score: result.score / iterations,
    logs: result.logs
  } satisfies HellevatorResponse)
}
