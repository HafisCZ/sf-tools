import { CONFIG, FIGHT_LOG, FLAGS, SimulatorBase, SimulatorModel } from './base'
import { type SimulatorPlayerInput } from './types'

type RaidEntity = {
  player: SimulatorPlayerInput
}

type RaidsMessage = {
  config?: Record<string, unknown> | null
  flags?: Record<string, unknown> | null
  players: RaidEntity[]
  enemies: RaidEntity[]
  iterations: number
  log?: boolean
}

if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.addEventListener('message', function ({ data: { config, flags, players, enemies, iterations, log } }: MessageEvent<RaidsMessage>) {
    CONFIG.set(config)

    FLAGS.log(!!log)
    FLAGS.set(flags)
    FLAGS.set({
      // Assuming true like with guild fights
      NoGladiatorReduction: true
    })

    self.postMessage({
      results: new RaidSimulator().simulate(players, enemies, iterations),
      logs: FIGHT_LOG.dump()
    })

    self.close()
  })
}

class RaidSimulator extends SimulatorBase {
  declare cachedPlayers: SimulatorModel[]
  declare cachedEnemies: SimulatorModel[]
  declare currentPlayers: SimulatorModel[]
  declare currentEnemies: SimulatorModel[]

  simulate(players: RaidEntity[], enemies: RaidEntity[], iterations: number) {
    let score = 0

    this.cachedPlayers = this.cache(players, 0)
    this.cachedEnemies = this.cache(enemies, 1)

    for (let i = 0; i < iterations; i++) {
      let { win } = this.battle()

      score += win as unknown as number
    }

    return {
      score
    }
  }

  cache(entities: RaidEntity[], index: number) {
    return entities.map((entity) => SimulatorModel.create(index, entity.player)).sort((a, b) => a.Player.Level - b.Player.Level)
  }

  battle() {
    this.currentPlayers = this.cachedPlayers.slice()
    this.currentEnemies = this.cachedEnemies.slice()

    for (const entity of this.currentPlayers) entity.resetHealth()
    for (const entity of this.currentEnemies) entity.resetHealth()

    while (this.currentPlayers.length > 0 && this.currentEnemies.length > 0) {
      this.a = this.currentPlayers[0]
      this.b = this.currentEnemies[0]

      SimulatorModel.initializeFighters(this.a, this.b)

      if ((this.fight() as unknown as number) == 0) {
        this.currentPlayers.shift()
      } else {
        this.currentEnemies.shift()
      }
    }

    return {
      win: (this.currentPlayers.length > 0 ? this.currentPlayers[0].Index : this.currentEnemies[0].Index) == 0,
      left1: this.currentPlayers.length,
      left2: this.currentEnemies.length
    }
  }
}
