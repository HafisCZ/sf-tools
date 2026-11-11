import { runDungeons } from '~/sim/engine/dungeons'
import { loadEngine } from '~/sim/engine/engine'
import { runLegacyDungeons } from '~/sim/legacy/dungeons'
import { type FightLog, type SimulatorPlayerInput } from '~/sim/types'
import { CONFIG, FLAGS, resetState, SimulatorModel } from './base'

export type DungeonsMessage = {
  flags?: Record<string, unknown> | null
  config?: Record<string, unknown> | null
  players: SimulatorPlayerInput[]
  boss: SimulatorPlayerInput
  index?: number
  hpcap?: number
  iterations?: number
  log?: boolean
  legacy?: boolean
}

export type DungeonsResponse = {
  results: {
    iterations: number
    score: number
    enemyHealths: number[]
    playersHealths: number[]
  }
  logs: FightLog[]
  index?: number
}

if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.addEventListener('message', function ({ data }: MessageEvent<DungeonsMessage>) {
    void respond(data)
  })
}

async function respond({ flags, config, players, boss, index, hpcap, iterations, log, legacy }: DungeonsMessage) {
  const engine = legacy ? null : await loadEngine()

  resetState()

  CONFIG.set(config)

  FLAGS.set(flags)

  const playerModels = players.map((player) => SimulatorModel.create(0, player))
  const bossModel = SimulatorModel.create(1, boss)

  const options = { iterations: iterations || 100000, hpcap: hpcap || 5000, log: !!log }

  self.postMessage({
    ...(engine ? runDungeons(engine, playerModels, bossModel, options) : runLegacyDungeons(playerModels, bossModel, options)),
    index
  } satisfies DungeonsResponse)
}
