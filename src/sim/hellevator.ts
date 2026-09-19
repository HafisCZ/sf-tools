import { CONFIG, FIGHT_LOG, FLAGS, SimulatorBase, SimulatorModel } from './base'
import { type SimulatorPlayerInput } from './types'

type HellevatorMessage = {
  config?: Record<string, unknown> | null
  player: SimulatorPlayerInput
  enemy: SimulatorPlayerInput
  iterations: number
  log?: boolean
}

if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.addEventListener('message', function ({ data: { config, player, enemy, iterations, log } }: MessageEvent<HellevatorMessage>) {
    CONFIG.set(config)

    FLAGS.log(!!log)

    self.postMessage({
      score: new HellevatorSimulator().simulate(player, enemy, iterations),
      logs: FIGHT_LOG.dump()
    })

    self.close()
  })
}

class HellevatorSimulator extends SimulatorBase {
  declare ca: SimulatorModel
  declare cb: SimulatorModel

  simulate(player: SimulatorPlayerInput, enemy: SimulatorPlayerInput, iterations: number) {
    this.cache(player, enemy)

    let score = 0
    for (let i = 0; i < iterations; i++) {
      score += this.fight() as unknown as number
    }

    return score / iterations
  }

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
