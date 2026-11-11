import { type Engine, loadEngine } from '~/sim/engine/engine'
import { runPlayers } from '~/sim/engine/players'
import { runLegacyPlayers } from '~/sim/legacy/players'
import { type FightLog, type SimulatorPlayerInput } from '~/sim/types'
import { CONFIG, FLAGS, resetState, SimulatorModel } from './base'

export type PlayerEntry = {
  index: number
  player: SimulatorPlayerInput
  score?: { avg: number; min?: number; max?: number } | null
}

export type PlayersMessage = {
  flags?: Record<string, unknown> | null
  config?: Record<string, unknown> | null
  player: PlayerEntry
  target: PlayerEntry | PlayerEntry[]
  mode: string
  iterations: number
  log?: boolean
  legacy?: boolean
}

export type PlayersResponse<T extends PlayerEntry = PlayerEntry> = {
  results: T
  logs: FightLog[]
}

// WebWorker hooks
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.addEventListener('message', function ({ data }: MessageEvent<PlayersMessage>) {
    void respond(data)
  })
}

async function respond({ flags, config, player, target, mode, iterations, log, legacy }: PlayersMessage) {
  const engine = legacy ? null : await loadEngine()

  resetState()

  CONFIG.set(config)

  FLAGS.set(flags)

  const simulator = new FightSimulator(engine, !!log)

  // Sim type decision
  if (mode == 'all') {
    self.postMessage({
      results: simulator.simulateMultiple(player, target as PlayerEntry[], iterations),
      logs: simulator.logs
    } satisfies PlayersResponse)
  } else if (mode == 'attack') {
    self.postMessage({
      results: simulator.simulateSingle(player, target as PlayerEntry, iterations, false),
      logs: simulator.logs
    } satisfies PlayersResponse)
  } else if (mode == 'defend') {
    self.postMessage({
      results: simulator.simulateSingle(player, target as PlayerEntry, iterations, true),
      logs: simulator.logs
    } satisfies PlayersResponse)
  } else if (mode == 'tournament') {
    self.postMessage({
      results: simulator.simulateTournament(player, target as PlayerEntry[], iterations),
      logs: simulator.logs
    } satisfies PlayersResponse)
  }
}

class FightSimulator {
  engine: Engine | null
  log: boolean
  logs: FightLog[] = []

  constructor(engine: Engine | null, log: boolean) {
    this.engine = engine
    this.log = log
  }

  fight(source: SimulatorPlayerInput, target: SimulatorPlayerInput, iterations: number) {
    const attacker = SimulatorModel.create(0, source)
    const defender = SimulatorModel.create(1, target)

    const { score, logs } = this.engine ? runPlayers(this.engine, attacker, defender, { iterations, log: this.log }) : runLegacyPlayers(attacker, defender, { iterations, log: this.log })

    for (const log of logs) {
      this.logs.push(log)
    }

    return score
  }

  // Fight 1vAl only
  simulateMultiple(player: PlayerEntry, targets: PlayerEntry[], iterations: number) {
    let score = 0
    let min = iterations
    let max = 0

    for (let i = 0; i < targets.length; i++) {
      if (player.index != targets[i].index) {
        const subscore = this.fight(player.player, targets[i].player, iterations)

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

      subscores.push(this.fight(player.player, targets[i].player, iterations))
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
    let score = this.fight(player.player, target.player, iterations)

    if (invert) {
      score = iterations - score
    }

    target.score = {
      avg: (100 * score) / iterations
    }

    return target
  }
}
