import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { type PlayerModel } from '~/core/models/player'
import { type SimulatorData } from '~/core/models/utils'
import { getRaidEnemies, scaleRaidPlayers } from '~/sim/data/raids'
import { loadEngine } from '~/sim/engine/engine'
import { runRaids } from '~/sim/engine/raids'
import { runLegacyRaids } from '~/sim/legacy/raids'
import { resetState, SimulatorModel } from '~/sim/workers/base'
import { FIGHT_SEED, getClassName, loadPresetPlayers, mockRandom, restoreRandom, seed, SETUP_SEED } from './parity'

const engine = await loadEngine()

const ITERATIONS = 500
const LOGGED_ITERATIONS = 10

const FULL_GROUP_RAIDS = ['hellevator_1', 'hellevator_4', 'hellevator_5', 'raid_50', 'raid_100', 'raid_150']

// Groups of these sizes win some and lose some against this raid
const SMALL_GROUP_RAID = 'hellevator_4'
const SMALL_GROUP_SIZES = [1, 3, 4]

const players = await loadPresetPlayers()

function createModels(raid: string, group: (PlayerModel | SimulatorData)[]) {
  resetState()

  seed(SETUP_SEED)

  const playerModels = scaleRaidPlayers(raid, group).map((player) => SimulatorModel.create(0, player))
  const enemyModels = getRaidEnemies(raid)
    .map((enemy) => SimulatorModel.create(1, enemy))
    .sort((a, b) => a.Player.Level - b.Player.Level)

  return { playerModels, enemyModels }
}

function runTs(raid: string, group: (PlayerModel | SimulatorData)[], iterations: number, log: boolean) {
  const models = createModels(raid, group)

  seed(FIGHT_SEED)

  return runLegacyRaids(models.playerModels, models.enemyModels, { iterations, log })
}

function runRust(raid: string, group: (PlayerModel | SimulatorData)[], iterations: number, log: boolean) {
  const models = createModels(raid, group)

  return runRaids(engine, models.playerModels, models.enemyModels, { iterations, log })
}

function expectParity(raid: string, group: (PlayerModel | SimulatorData)[]) {
  expect(runRust(raid, group, ITERATIONS, false).results.score).toBe(runTs(raid, group, ITERATIONS, false).results.score)
  expect(runRust(raid, group, LOGGED_ITERATIONS, true).logs).toEqual(runTs(raid, group, LOGGED_ITERATIONS, true).logs)
}

describe('rust engine and ts parity for raids', () => {
  beforeAll(mockRandom)

  afterAll(restoreRandom)

  for (const raid of FULL_GROUP_RAIDS) {
    test(`All classes vs ${raid}`, () => {
      expectParity(raid, players)
    })
  }

  for (const size of SMALL_GROUP_SIZES) {
    players.forEach((_, first) => {
      const group = Array.from({ length: size }, (_, offset) => players[(first + offset) % players.length])

      test(`${group.map((player) => getClassName(player.Class)).join(', ')} vs ${SMALL_GROUP_RAID}`, () => {
        expectParity(SMALL_GROUP_RAID, group)
      })
    })
  }
})
