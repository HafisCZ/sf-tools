import type { FightLog, FightLogEffect, FightLogFighter, ModelConfig, SimulatorState } from '~/sim/types'
import { ATTACK_TYPES_CRITICAL, ATTACK_TYPES_SECONDARY, ATTACK_TYPES_SPECIAL, BATTLEMAGE, type SimulatorModel } from '~/sim/workers/base'
import engineUrl from './engine.wasm?url'

export type Engine = {
  memory: WebAssembly.Memory
  alloc(length: number): number
  run(length: number): number
  result_length(): number
}

export type EngineFighter = {
  class: number
  index: number
  attackFirst: boolean
  totalHealth: number
  swoopMultiplier: number
  brackets: [number, number, number]
  fireball: number
  config: ModelConfig
  data: SimulatorState
}

export type EngineFightLog = {
  a: number
  b: number
  healthA: number
  healthB: number
  rounds: {
    attacker: number
    target: number
    attackerState: number
    targetState: number
    attackType: number
    defenseType: number
    attackerHealth: number
    targetHealth: number
    attackerEffects: FightLogEffect[]
    targetEffects: FightLogEffect[]
    attackDamage: number
    attackRage: number
  }[]
}

type ClassModel = SimulatorModel & {
  Bracket0?: number
  Bracket1?: number
  Bracket2?: number
  getFireballDamage?(target: SimulatorModel): number
}

const engine = fetch(engineUrl)
  .then((response) => response.arrayBuffer())
  .then((bytes) => WebAssembly.instantiate(bytes, {}))
  .then(({ instance }) => instance.exports as unknown as Engine)

export function loadEngine() {
  return engine
}

export function callEngine<T extends object>(engine: Engine, request: { mode: string } & Record<string, unknown>) {
  const input = new TextEncoder().encode(JSON.stringify({ ...request, seed: Array.from(crypto.getRandomValues(new Uint32Array(4))) }))

  const inputPointer = engine.alloc(input.length)
  new Uint8Array(engine.memory.buffer, inputPointer, input.length).set(input)

  const resultPointer = engine.run(input.length)
  const result = JSON.parse(new TextDecoder().decode(new Uint8Array(engine.memory.buffer, resultPointer, engine.result_length()))) as T | { error: string }

  if ('error' in result) {
    throw new Error(result.error)
  }

  return result
}

export function toEngineFighter(model: ClassModel, target: SimulatorModel): EngineFighter {
  return {
    class: Number(model.Player.Class),
    index: model.Index ?? 0,
    attackFirst: model.AttackFirst,
    totalHealth: model.TotalHealth,
    swoopMultiplier: model.SwoopMultiplier ?? 0,
    brackets: [model.Bracket0 ?? 0, model.Bracket1 ?? 0, model.Bracket2 ?? 0],
    fireball: Number(model.Player.Class) === BATTLEMAGE ? (model.getFireballDamage?.(target) ?? 0) : 0,
    config: model.Config,
    data: model.Data
  }
}

function getLogId(model: SimulatorModel) {
  return model.Player.ID || model.Index
}

function toLogFighter(model: SimulatorModel, health: number): FightLogFighter {
  const player = model.Player

  return {
    ID: getLogId(model),
    Name: player.Name,
    Level: player.Level,
    TotalHealth: model.TotalHealth,
    Health: health,
    Strength: { Total: player.Strength.Total },
    Dexterity: { Total: player.Dexterity.Total },
    Intelligence: { Total: player.Intelligence.Total },
    Constitution: { Total: player.Constitution.Total },
    Luck: { Total: player.Luck.Total },
    Face: player.Face,
    Race: player.Race,
    Gender: player.Gender,
    Class: player.Class,
    Items: { Wpn1: player.Items.Wpn1, Wpn2: player.Items.Wpn2 }
  }
}

export function toFightLogs(logs: EngineFightLog[] | null, models: SimulatorModel[]): FightLog[] {
  return (logs ?? []).map(({ a, b, healthA, healthB, rounds }) => ({
    fighterA: toLogFighter(models[a], healthA),
    fighterB: toLogFighter(models[b], healthB),
    rounds: rounds.map((round) => ({
      attackerId: getLogId(models[round.attacker]),
      targetId: getLogId(models[round.target]),
      attackerState: round.attackerState,
      targetState: round.targetState,
      attackType: round.attackType,
      defenseType: round.defenseType,
      attackerHealth: round.attackerHealth,
      targetHealth: round.targetHealth,
      attackerEffects: round.attackerEffects,
      targetEffects: round.targetEffects,
      attackDamage: round.attackDamage,
      attackRage: round.attackRage,
      attackTypeSecondary: ATTACK_TYPES_SECONDARY.includes(round.attackType),
      attackTypeCritical: ATTACK_TYPES_CRITICAL.includes(round.attackType),
      attackTypeSpecial: ATTACK_TYPES_SPECIAL.includes(round.attackType)
    }))
  }))
}
