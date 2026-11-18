import { mock, spyOn } from 'bun:test'
import { createPresetPlayers, preparePlayerData } from '~/sim/debug'
import { CONFIG } from '~/sim/workers/base'

export const SETUP_SEED = [0x5eed0001, 0x9e3779b9, 0x7f4a7c15, 0x00001f0f]
export const FIGHT_SEED = [0xf1600001, 0xbf58476d, 0x1ce4e5b9, 0x0001991b]

// Same generator as src/sim/engine/src/rng.rs, so both sides roll the same numbers
let state0 = 0n
let state1 = 0n

export function seed(words: number[]) {
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

export function mockRandom() {
  spyOn(Math, 'random').mockImplementation(next)
  spyOn(crypto, 'getRandomValues').mockImplementation(<T extends ArrayBufferView | null>(array: T) => {
    if (array instanceof Uint32Array) {
      array.set(FIGHT_SEED)
    }

    return array
  })
}

export function restoreRandom() {
  mock.restore()
}

export async function loadPresetPlayers() {
  const presets = (await Bun.file(new URL('../../../js/sim/presets.json', import.meta.url)).json()) as { name: string; suffix?: string; data: unknown }[]
  const preset = presets.find(({ name }) => name === 'Generic - Level 500')!

  return createPresetPlayers(preset.data, preset.suffix).map((player) => structuredClone(preparePlayerData(player)))
}

export function getClassName(classId: number) {
  for (const [name, value] of Object.entries(CONFIG)) {
    if ('ID' in value && value.ID === classId) {
      return name
    }
  }

  return String(classId)
}
