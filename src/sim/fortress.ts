import { FLAGS, resetState, SimulatorBase, SimulatorModel } from './base'
import { type SimulatorPlayerInput } from './types'

type FortressMessage = {
  flags?: Record<string, unknown> | null
  iterations: number
  player: SimulatorPlayerInput[]
  target: SimulatorPlayerInput[]
  index: number
}

if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.addEventListener('message', function ({ data: { flags, iterations, player, target, index } }: MessageEvent<FortressMessage>) {
    resetState()

    FLAGS.set(flags)

    self.postMessage({
      score: new FortressSimulator().simulate(player, target, iterations),
      index
    })
  })
}

class FortressSimulator extends SimulatorBase {
  declare ga: SimulatorModel[]
  declare gb: SimulatorModel[]
  declare la: SimulatorModel[]
  declare lb: SimulatorModel[]

  simulate(player: SimulatorPlayerInput[], target: SimulatorPlayerInput[], iterations: number) {
    if (target.length == 0) {
      return 1
    }

    this.ga = this.cache(player, 0)
    this.gb = this.cache(target, 1)

    let score = 0
    for (let i = 0; i < iterations; i++) {
      score += this.battle()
    }

    return score / iterations
  }

  cache(array: SimulatorPlayerInput[], index: number) {
    return array.map((player) => SimulatorModel.create(index, player))
  }

  battle() {
    this.la = [...this.ga]
    this.lb = [...this.gb]

    for (const player of this.la) player.resetHealth()
    for (const player of this.lb) player.resetHealth()

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

    return this.la.length > 0 ? 1 : 0
  }
}
