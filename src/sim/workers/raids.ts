import { loadEngine } from '~/sim/engine/engine'
import { runRaids } from '~/sim/engine/raids'
import { runLegacyRaids } from '~/sim/legacy/raids'
import { type FightLog, type SimulatorPlayerInput } from '~/sim/types'
import { CONFIG, FLAGS, resetState, SimulatorModel } from './base'

type RaidEntity = {
  player: SimulatorPlayerInput
}

export type RaidsMessage = {
  config?: Record<string, unknown> | null
  flags?: Record<string, unknown> | null
  players: RaidEntity[]
  enemies: RaidEntity[]
  iterations: number
  log?: boolean
  legacy?: boolean
}

export type RaidsResponse = {
  results: {
    score: number
  }
  logs: FightLog[]
}

if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.addEventListener('message', function ({ data }: MessageEvent<RaidsMessage>) {
    void respond(data)
  })
}

async function respond({ config, flags, players, enemies, iterations, log, legacy }: RaidsMessage) {
  const engine = legacy ? null : await loadEngine()

  resetState()

  CONFIG.set(config)

  FLAGS.set(flags)
  FLAGS.set({
    // Assuming true like with guild fights
    NoGladiatorReduction: true
  })

  const playerModels = createModels(players, 0)
  const enemyModels = createModels(enemies, 1)

  const options = { iterations, log: !!log }

  self.postMessage((engine ? runRaids(engine, playerModels, enemyModels, options) : runLegacyRaids(playerModels, enemyModels, options)) satisfies RaidsResponse)
}

function createModels(entities: RaidEntity[], index: number) {
  return entities.map((entity) => SimulatorModel.create(index, entity.player)).sort((a, b) => a.Player.Level - b.Player.Level)
}
