import { CONFIG, FIGHT_LOG, FLAGS, SimulatorBase, SimulatorModel } from './base'
import { type SimulatorPlayerInput } from './types'

type PlayerEntry = {
  index: number
  player: SimulatorPlayerInput
  score?: { avg: number; min?: number; max?: number }
}

type PlayersMessage = {
  flags?: Record<string, unknown> | null
  config?: Record<string, unknown> | null
  player: PlayerEntry
  target: PlayerEntry | PlayerEntry[]
  mode: string
  iterations: number
  log?: boolean
}

// WebWorker hooks
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.addEventListener('message', function ({ data: { flags, config, player, target, mode, iterations, log } }: MessageEvent<PlayersMessage>) {
    CONFIG.set(config)

    FLAGS.log(!!log)
    FLAGS.set(flags)

    // Sim type decision
    if (mode == 'all') {
      self.postMessage({
        results: new FightSimulator().simulateMultiple(player, target as PlayerEntry[], iterations),
        logs: FIGHT_LOG.dump()
      })
    } else if (mode == 'attack') {
      self.postMessage({
        results: new FightSimulator().simulateSingle(player, target as PlayerEntry, iterations, false),
        logs: FIGHT_LOG.dump()
      })
    } else if (mode == 'defend') {
      self.postMessage({
        results: new FightSimulator().simulateSingle(player, target as PlayerEntry, iterations, true),
        logs: FIGHT_LOG.dump()
      })
    } else if (mode == 'tournament') {
      self.postMessage({
        results: new FightSimulator().simulateTournament(player, target as PlayerEntry[], iterations),
        logs: FIGHT_LOG.dump()
      })
    }

    self.close()
  })
}

class FightSimulator extends SimulatorBase {
  declare ca: SimulatorModel
  declare cb: SimulatorModel

  // Fight 1vAl only
  simulateMultiple(player: PlayerEntry, targets: PlayerEntry[], iterations: number) {
    let score = 0
    let min = iterations
    let max = 0

    for (let i = 0; i < targets.length; i++) {
      if (player.index != targets[i].index) {
        let subscore = 0
        this.cache(player.player, targets[i].player)

        for (let j = 0; j < iterations; j++) {
          subscore += this.fight() as unknown as number
        }

        score += subscore

        if (subscore > max) {
          max = subscore
        }

        if (subscore < min) {
          min = subscore
        }
      }
    }

    player.score = {
      avg: (100 * score) / (targets.length - 1) / iterations,
      min: (100 * min) / iterations,
      max: (100 * max) / iterations
    }

    return player
  }

  simulateTournament(player: PlayerEntry, targets: PlayerEntry[], iterations: number) {
    // Simulate fights against targets
    const subscores = []
    for (let i = 0; i < targets.length; i++) {
      if (player.index === targets[i].index) {
        subscores.push(iterations)
        continue
      }

      this.cache(player.player, targets[i].player)

      let subscore = 0
      for (let j = 0; j < iterations; j++) {
        subscore += this.fight() as unknown as number
      }

      subscores.push(subscore)
    }

    // Sort sub scores by score desc
    subscores.sort((a, b) => b - a)

    // Calculate resulting win %
    let score = 0
    for (let i = 0; i < subscores.length; i++) {
      if (subscores[i] > iterations / 2) {
        score += 1
      } else {
        score += subscores[i] / iterations
        break
      }
    }

    // Save score
    player.score = {
      avg: (100 * score) / subscores.length
    }

    return player
  }

  // Fight 1v1s only
  simulateSingle(player: PlayerEntry, target: PlayerEntry, iterations: number, invert: boolean) {
    let score = 0
    this.cache(player.player, target.player)

    for (let i = 0; i < iterations; i++) {
      score += this.fight() as unknown as number
    }

    if (invert) {
      score = iterations - score
    }

    target.score = {
      avg: (100 * score) / iterations
    }

    return target
  }

  // Cache Players initially
  cache(source: SimulatorPlayerInput, target: SimulatorPlayerInput) {
    this.ca = SimulatorModel.create(0, source)
    this.cb = SimulatorModel.create(1, target)

    SimulatorModel.initializeFighters(this.ca, this.cb)
  }

  fight() {
    this.a = this.ca
    this.b = this.cb

    this.a.resetHealth()
    this.b.resetHealth()

    return super.fight()
  }
}
