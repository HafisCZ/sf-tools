import { FIGHT_LOG, FLAGS, SimulatorBase, SimulatorModel } from '~/sim/workers/base'

export function runLegacyRaids(playerModels: SimulatorModel[], enemyModels: SimulatorModel[], { iterations, log }: { iterations: number; log: boolean }) {
  FIGHT_LOG.reset()
  FLAGS.log(log)

  return {
    results: new RaidSimulator().simulate(playerModels, enemyModels, iterations),
    logs: FIGHT_LOG.dump()
  }
}

class RaidSimulator extends SimulatorBase {
  declare cachedPlayers: SimulatorModel[]
  declare cachedEnemies: SimulatorModel[]
  declare currentPlayers: SimulatorModel[]
  declare currentEnemies: SimulatorModel[]

  simulate(players: SimulatorModel[], enemies: SimulatorModel[], iterations: number) {
    let score = 0

    this.cachedPlayers = players
    this.cachedEnemies = enemies

    for (let i = 0; i < iterations; i++) {
      let { win } = this.battle()

      score += win as unknown as number
    }

    return {
      score
    }
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
