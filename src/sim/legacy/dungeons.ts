import { FIGHT_LOG, FLAGS, SimulatorBase, SimulatorModel } from '~/sim/workers/base'

export function runLegacyDungeons(playerModels: SimulatorModel[], bossModel: SimulatorModel, { iterations, hpcap, log }: { iterations: number; hpcap: number; log: boolean }) {
  FIGHT_LOG.reset()
  FLAGS.log(log)

  return {
    results: new DungeonSimulator().simulate(playerModels, bossModel, iterations, hpcap),
    logs: FIGHT_LOG.dump()
  }
}

class DungeonSimulator extends SimulatorBase {
  declare cache_players: SimulatorModel[]
  declare cache_boss: SimulatorModel
  declare cache_health: number
  declare la: SimulatorModel[]
  declare lb: SimulatorModel[]

  simulate(players: SimulatorModel[], boss: SimulatorModel, iterations: number, hpcap: number) {
    this.cache(players, boss)

    let score = 0
    let enemyHealths = new Float64Array(iterations)
    let playersHealths = new Float64Array(iterations)

    if (players.length === 1) {
      // Single-player battle
      SimulatorModel.initializeFighters(this.cache_players[0], this.cache_boss)

      for (let i = 0; i < iterations; i++) {
        let { win, enemyHealth, playersHealth } = this.battleSingle()

        score += win as unknown as number
        enemyHealths[i] = enemyHealth
        playersHealths[i] = playersHealth
      }
    } else {
      // Multi-player battle
      for (let i = 0; i < iterations; i++) {
        let { win, enemyHealth, playersHealth } = this.battleMulti()

        score += win as unknown as number
        enemyHealths[i] = enemyHealth
        playersHealths[i] = playersHealth
      }
    }

    return {
      iterations: iterations,
      score: score,
      enemyHealths: trimHealths(enemyHealths, hpcap),
      playersHealths: trimHealths(playersHealths, hpcap)
    }
  }

  cache(players: SimulatorModel[], boss: SimulatorModel) {
    this.cache_players = players
    this.cache_boss = boss
    this.cache_health = this.cache_players.reduce((total, player) => total + player.TotalHealth, 0)
  }

  battleSingle() {
    this.a = this.cache_players[0]
    this.b = this.cache_boss

    this.a.resetHealth()
    this.b.resetHealth()

    const win = super.fight()

    return {
      win,
      enemyHealth: win ? 0 : this.cache_boss.Health / this.cache_boss.TotalHealth,
      playersHealth: win ? this.cache_players[0].Health / this.cache_health : 0
    }
  }

  battleMulti() {
    this.la = [...this.cache_players]
    this.lb = [this.cache_boss]

    // Reset health
    for (const p of this.la) p.resetHealth()
    for (const p of this.lb) p.resetHealth()

    // Run fight
    while (this.la.length > 0 && this.lb.length > 0) {
      this.a = this.la[0]
      this.b = this.lb[0]

      SimulatorModel.initializeFighters(this.a, this.b)

      if ((this.fight() as unknown as number) == 0) {
        this.la.shift()
      } else {
        this.lb.shift()
      }
    }

    let playersHealth = 0
    for (const p of this.la) playersHealth += Math.max(0, p.Health)

    // Return result based on empty array
    return {
      win: (this.la.length > 0 ? this.la[0].Index : this.lb[0].Index) == 0,
      enemyHealth: Math.max(0, this.lb.length > 0 ? this.lb[0].Health / this.lb[0].TotalHealth : 0),
      playersHealth: playersHealth / this.cache_health
    }
  }
}

function trimHealths(healths: Float64Array, hpcap: number) {
  let healthsLength = healths.length
  let truncSteps = Math.max(1, Math.floor(healthsLength / hpcap))
  if (truncSteps > 1) {
    let truncLength = Math.ceil(healthsLength / truncSteps)
    let truncHealths = new Array<number>(truncLength)

    healths.sort()

    for (let i = 0; i < truncLength; i++) {
      let sliceSum = 0
      let slices = 0
      for (let j = 0; j < truncSteps; j++) {
        let iterator = i * truncSteps + j
        if (iterator >= healthsLength) {
          break
        } else {
          slices++
          sliceSum += healths[iterator]
        }
      }

      if (slices > 0) {
        truncHealths[i] = Math.max(0, sliceSum / slices)
      }
    }

    return truncHealths
  } else {
    healths.sort()

    return Array.from(healths)
  }
}
