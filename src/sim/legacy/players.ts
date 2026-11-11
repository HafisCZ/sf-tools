import { FIGHT_LOG, FLAGS, SimulatorBase, SimulatorModel } from '~/sim/workers/base'

export function runLegacyPlayers(attacker: SimulatorModel, defender: SimulatorModel, { iterations, log }: { iterations: number; log: boolean }) {
  FIGHT_LOG.reset()
  FLAGS.log(log)

  SimulatorModel.initializeFighters(attacker, defender)

  const simulator = new SimulatorBase()

  let score = 0

  for (let i = 0; i < iterations; i++) {
    simulator.a = attacker
    simulator.b = defender

    attacker.resetHealth()
    defender.resetHealth()

    if (simulator.fight()) {
      score++
    }
  }

  return { score, logs: FIGHT_LOG.dump() }
}
