import { afterAll, beforeAll, describe, expect, mock, spyOn, test } from 'bun:test'
import { type PlayerModel } from '~/core/models/player'
import { createPresetPlayers, preparePlayerData } from '~/sim/debug'
import { loadEngine } from '~/sim/engine/engine'
import { runPlayers } from '~/sim/engine/players'
import { runLegacyPlayers } from '~/sim/legacy/players'
import { CONFIG, resetState, SimulatorModel } from '~/sim/workers/base'

const engine = await loadEngine()

const ITERATIONS = 1000
const LOGGED_ITERATIONS = 20

const SETUP_SEED = [0x5eed0001, 0x9e3779b9, 0x7f4a7c15, 0x00001f0f]
const FIGHT_SEED = [0xf1600001, 0xbf58476d, 0x1ce4e5b9, 0x0001991b]

// Same generator as src/sim/engine/src/rng.rs, so both sides roll the same numbers
let state0 = 0n
let state1 = 0n

function seed(words: number[]) {
  state0 = (BigInt(words[0]) << 32n) | BigInt(words[1]) | 1n
  state1 = (BigInt(words[2]) << 32n) | BigInt(words[3])

  for (let i = 0; i < 16; i++) {
    next()
  }
}

function next() {
  let s1 = state0
  const s0 = state1

  state0 = s0

  s1 ^= BigInt.asUintN(64, s1 << 23n)
  s1 ^= s1 >> 17n
  s1 ^= s0
  s1 ^= s0 >> 26n

  state1 = s1

  return Number(state0 >> 12n) / 2 ** 52
}

function runTs(a: PlayerModel, b: PlayerModel, iterations: number, log: boolean) {
  resetState()

  seed(SETUP_SEED)

  const attacker = SimulatorModel.create(0, a)
  const defender = SimulatorModel.create(1, b)

  seed(FIGHT_SEED)

  return runLegacyPlayers(attacker, defender, { iterations, log })
}

function runRust(a: PlayerModel, b: PlayerModel, iterations: number, log: boolean) {
  resetState()

  seed(SETUP_SEED)

  return runPlayers(engine, SimulatorModel.create(0, a), SimulatorModel.create(1, b), { iterations, log })
}

const presets = (await Bun.file(new URL('../../../js/sim/presets.json', import.meta.url)).json()) as { name: string; suffix?: string; data: unknown }[]
const preset = presets.find(({ name }) => name === 'Generic - Level 500')!

const players = createPresetPlayers(preset.data, preset.suffix).map((player) => structuredClone(preparePlayerData(player)))

const CLASS_NAMES = new Map(Object.entries(CONFIG).flatMap(([name, value]) => ('ID' in value ? [[value.ID, name] as const] : [])))

describe('rust engine and ts parity', () => {
  beforeAll(() => {
    spyOn(Math, 'random').mockImplementation(next)
    spyOn(crypto, 'getRandomValues').mockImplementation(<T extends ArrayBufferView | null>(array: T) => {
      if (array instanceof Uint32Array) {
        array.set(FIGHT_SEED)
      }

      return array
    })
  })

  afterAll(() => {
    mock.restore()
  })

  for (const a of players) {
    for (const b of players) {
      if (a === b) continue

      test(`${CLASS_NAMES.get(a.Class)} vs ${CLASS_NAMES.get(b.Class)}`, () => {
        expect(runRust(a, b, ITERATIONS, false).score).toBe(runTs(a, b, ITERATIONS, false).score)
        expect(runRust(a, b, LOGGED_ITERATIONS, true).logs).toEqual(runTs(a, b, LOGGED_ITERATIONS, true).logs)
      })
    }
  }
})
