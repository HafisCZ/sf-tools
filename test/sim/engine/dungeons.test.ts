import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { type PlayerModel } from '~/core/models/player'
import { getHellevatorEnemies, type HellevatorEnemy } from '~/sim/data/hellevator'
import { runDungeons } from '~/sim/engine/dungeons'
import { loadEngine } from '~/sim/engine/engine'
import { runLegacyDungeons } from '~/sim/legacy/dungeons'
import { resetState, SimulatorModel } from '~/sim/workers/base'
import { FIGHT_SEED, getClassName, loadPresetPlayers, mockRandom, restoreRandom, seed, SETUP_SEED } from './parity'

const engine = await loadEngine()

const ITERATIONS = 1000
const LOGGED_ITERATIONS = 20

const HEALTH_CAP = 500

// Hellevator enemies stand in for bosses, one level 500 player wins some and loses some around the first floor
const SINGLE_FLOOR = 260
const GROUP_FLOOR = 300
const GROUP_SIZE = 4

const players = await loadPresetPlayers()

function createModels(group: PlayerModel[], boss: HellevatorEnemy) {
  resetState()

  seed(SETUP_SEED)

  return { playerModels: group.map((player) => SimulatorModel.create(0, player)), bossModel: SimulatorModel.create(1, boss) }
}

function runTs(group: PlayerModel[], boss: HellevatorEnemy, iterations: number, log: boolean) {
  const models = createModels(group, boss)

  seed(FIGHT_SEED)

  return runLegacyDungeons(models.playerModels, models.bossModel, { iterations, hpcap: HEALTH_CAP, log })
}

function runRust(group: PlayerModel[], boss: HellevatorEnemy, iterations: number, log: boolean) {
  const models = createModels(group, boss)

  return runDungeons(engine, models.playerModels, models.bossModel, { iterations, hpcap: HEALTH_CAP, log })
}

function expectParity(group: PlayerModel[], boss: HellevatorEnemy) {
  expect(runRust(group, boss, ITERATIONS, false).results).toEqual(runTs(group, boss, ITERATIONS, false).results)
  expect(runRust(group, boss, LOGGED_ITERATIONS, true).logs).toEqual(runTs(group, boss, LOGGED_ITERATIONS, true).logs)
}

describe('rust engine and ts parity for dungeons', () => {
  beforeAll(mockRandom)

  afterAll(restoreRandom)

  const singleBoss = getHellevatorEnemies(SINGLE_FLOOR)[0]
  const groupBoss = getHellevatorEnemies(GROUP_FLOOR)[0]

  for (const player of players) {
    test(`${getClassName(player.Class)} vs floor ${SINGLE_FLOOR}`, () => {
      expectParity([player], singleBoss)
    })
  }

  players.forEach((_, first) => {
    const group = Array.from({ length: GROUP_SIZE }, (_, offset) => players[(first + offset) % players.length])

    test(`${group.map((player) => getClassName(player.Class)).join(', ')} vs floor ${GROUP_FLOOR}`, () => {
      expectParity(group, groupBoss)
    })
  })
})
