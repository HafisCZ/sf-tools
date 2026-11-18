import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { type PlayerModel } from '~/core/models/player'
import { getHellevatorEnemies, type HellevatorEnemy } from '~/sim/data/hellevator'
import { loadEngine } from '~/sim/engine/engine'
import { runPlayers } from '~/sim/engine/players'
import { runLegacyPlayers } from '~/sim/legacy/players'
import { resetState, SimulatorModel } from '~/sim/workers/base'
import { FIGHT_SEED, getClassName, loadPresetPlayers, mockRandom, restoreRandom, seed, SETUP_SEED } from './parity'

const engine = await loadEngine()

const ITERATIONS = 1000
const LOGGED_ITERATIONS = 20

// Level 500 players win some and lose some around these floors
const FLOORS = [245, 252, 260, 268, 280]

const players = await loadPresetPlayers()

function createModels(player: PlayerModel, enemy: HellevatorEnemy) {
  resetState()

  seed(SETUP_SEED)

  return { attacker: SimulatorModel.create(0, player), defender: SimulatorModel.create(1, enemy) }
}

function runTs(player: PlayerModel, enemy: HellevatorEnemy, iterations: number, log: boolean) {
  const models = createModels(player, enemy)

  seed(FIGHT_SEED)

  return runLegacyPlayers(models.attacker, models.defender, { iterations, log })
}

function runRust(player: PlayerModel, enemy: HellevatorEnemy, iterations: number, log: boolean) {
  const models = createModels(player, enemy)

  return runPlayers(engine, models.attacker, models.defender, { iterations, log })
}

describe('rust engine and ts parity for the hellevator', () => {
  beforeAll(mockRandom)

  afterAll(restoreRandom)

  for (const player of players) {
    for (const enemy of getHellevatorEnemies(1, 600).filter((entry) => FLOORS.includes(entry.Floor))) {
      test(`${getClassName(player.Class)} vs floor ${enemy.Floor}`, () => {
        expect(runRust(player, enemy, ITERATIONS, false).score).toBe(runTs(player, enemy, ITERATIONS, false).score)
        expect(runRust(player, enemy, LOGGED_ITERATIONS, true).logs).toEqual(runTs(player, enemy, LOGGED_ITERATIONS, true).logs)
      })
    }
  }
})
