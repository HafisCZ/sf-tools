import { CONFIG, FIGHT_LOG, FLAGS, SimulatorBase, SimulatorModel } from './base'
import { type SimulatorPlayerInput } from './types'

type DungeonsMessage = {
  flags?: Record<string, unknown> | null
  config?: Record<string, unknown> | null
  players: SimulatorPlayerInput[]
  boss: SimulatorPlayerInput
  index?: number
  hpcap?: number
  iterations?: number
  log?: boolean
}

if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.addEventListener('message', function ({ data: { flags, config, players, boss, index, hpcap, iterations, log } }: MessageEvent<DungeonsMessage>) {
    CONFIG.set(config)

    FLAGS.log(!!log)
    FLAGS.set(flags)

    self.postMessage({
      results: new DungeonSimulator().simulate(players, boss, iterations || 100000, hpcap || 5000),
      logs: FIGHT_LOG.dump(),
      index
    })

    self.close()
  })
}

class DungeonSimulator extends SimulatorBase {
  declare cache_players: SimulatorModel[]
  declare cache_boss: SimulatorModel
  declare cache_health: number
  declare la: SimulatorModel[]
  declare lb: SimulatorModel[]

  simulate(players: SimulatorPlayerInput[], boss: SimulatorPlayerInput, iterations: number, hpcap: number) {
    this.cache(players, boss)

    let score = 0
    let enemyHealths = []
    let playersHealths = []

    if (players.length === 1) {
      // Single-player battle
      SimulatorModel.initializeFighters(this.cache_players[0], this.cache_boss)

      for (let i = 0; i < iterations; i++) {
        let { win, enemyHealth, playersHealth } = this.battleSingle()

        score += win as unknown as number
        enemyHealths.push(enemyHealth)
        playersHealths.push(playersHealth)
      }
    } else {
      // Multi-player battle
      for (let i = 0; i < iterations; i++) {
        let { win, enemyHealth, playersHealth } = this.battleMulti()

        score += win as unknown as number
        enemyHealths.push(enemyHealth)
        playersHealths.push(playersHealth)
      }
    }

    return {
      iterations: iterations,
      score: score,
      enemyHealths: trimHealths(enemyHealths, hpcap),
      playersHealths: trimHealths(playersHealths, hpcap)
    }
  }

  cache(players: SimulatorPlayerInput[], boss: SimulatorPlayerInput) {
    this.cache_players = players.map((player) => SimulatorModel.create(0, player))
    this.cache_boss = SimulatorModel.create(1, boss)
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
      enemyHealth: win ? 0 : this.cache_boss.Health / this.cache_boss.getHealth(),
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
      enemyHealth: Math.max(0, this.lb.length > 0 ? this.lb[0].Health / this.lb[0].getHealth() : 0),
      playersHealth: playersHealth / this.cache_health
    }
  }
}

function trimHealths(healths: number[], hpcap: number) {
  let healthsLength = healths.length
  let truncSteps = Math.max(1, Math.floor(healthsLength / hpcap))
  if (truncSteps > 1) {
    let truncLength = Math.ceil(healthsLength / truncSteps)
    let truncHealths = new Array<number>(truncLength)

    healths.sort((a, b) => a - b)

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
    healths.sort((a, b) => a - b)

    return healths
  }
}
