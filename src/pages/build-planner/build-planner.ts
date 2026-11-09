import { globalLocalize } from '@utils/localization'
import { useToast } from '@utils/toasts'
import { clamp } from '@utils/utils'
import type { PlannerBlock, PlannerConfig, PlannerGemRun, PlannerKind, PlannerOption, PlannerPlan, PlannerRow, PlannerState, PlannerStep } from '~/pages/build-planner/types'
import { ACADEMY, ARCHERY, BARRACKS, buildTime, EXTRACTOR, FORTRESS, GATE, gemTime, GEMMINE, GEMTIME, GLADIATOR_TRAINER, GOBLIN_PIT, GOLD_PIT, HEART, KEEPER, KNIGHTS, MAGES, QUARRY, QUARTERS, SMITHY, TIME_MACHINE, TORTURE_CHAMBER, TREASURY, TROLL_BLOCK, WALL, WOODCUTTER } from '~/playa/buildings'

export const FORTRESS_BUILDING = { Fortress: 0, LaborerQuarters: 1, WoodcutterGuild: 2, Quarry: 3, GemMine: 4, Academy: 5, ArcheryGuild: 6, Barracks: 7, MageTower: 8, Treasury: 9, Smithy: 10, Fortifications: 11, HallOfKnights: 12 }
export const UNDERWORLD_BUILDING = { LaborerQuarters: 0, Heart: 1, Gate: 2, GoldPit: 3, Extractor: 4, GoblinPit: 5, Torture: 6, Gladiator: 7, TrollBlock: 8, TimeMachine: 9, Keeper: 10 }

function tableRow(table: number[][], level: number) {
  return table[Math.min(level, table.length) - 1]
}

function tableValue(table: number[], level: number) {
  return table[Math.min(level, table.length) - 1]
}

const FORTRESS_COSTS = [FORTRESS, QUARTERS, WOODCUTTER, QUARRY, GEMMINE, ACADEMY, ARCHERY, BARRACKS, MAGES, TREASURY, SMITHY, WALL, KNIGHTS]

const FORTRESS_MAX = [20, 15, 20, 20, 100, 20, 15, 15, 15, 45, 20, 20, 20]

function fortressRequirement(building: number, level: number) {
  switch (building) {
    case FORTRESS_BUILDING.Fortress:
      return 0
    case FORTRESS_BUILDING.GemMine:
      return Math.min(20, Math.max(3, level))
    case FORTRESS_BUILDING.Academy:
      return Math.max(6, level)
    case FORTRESS_BUILDING.ArcheryGuild:
      return Math.max(5, level)
    case FORTRESS_BUILDING.Barracks:
    case FORTRESS_BUILDING.Fortifications:
      return Math.max(4, level)
    case FORTRESS_BUILDING.MageTower:
    case FORTRESS_BUILDING.Smithy:
      return Math.max(7, level)
    case FORTRESS_BUILDING.Treasury:
      return level > 15 ? 20 : Math.max(2, level)
    default:
      return level
  }
}

export const FORTRESS_PLANNER: PlannerConfig = {
  kind: 'fortress',
  buildings: FORTRESS_COSTS.map((table, index) => ({
    name: index === FORTRESS_BUILDING.HallOfKnights ? 'general.buildings.knights' : `general.buildings.fortress${index + 1}`,
    picture: `fortress/${String(index + 1).padStart(2, '0')}`,
    max: FORTRESS_MAX[index],
    // The game has no Hall of Knights building art, every level shows its icon (13_00)
    pictures: index === FORTRESS_BUILDING.HallOfKnights ? 0 : Math.min(20, table.length),
    // Treasury levels past 15 repeat level 15
    timeCap: index === FORTRESS_BUILDING.Treasury ? 15 : undefined,
    instant: index === FORTRESS_BUILDING.HallOfKnights,
    cost: (level) => tableRow(table, level).slice(0, 2)
  })),
  resources: [
    { key: 'wood', producer: FORTRESS_BUILDING.WoodcutterGuild, hourly: (level) => (level > 0 ? WOODCUTTER[level - 1][3] : 0) },
    { key: 'stone', producer: FORTRESS_BUILDING.Quarry, hourly: (level) => (level > 0 ? QUARRY[level - 1][3] : 0) }
  ],
  required: (building, level) => {
    const fortress = fortressRequirement(building, level)

    return fortress > 0 ? { building: FORTRESS_BUILDING.Fortress, level: fortress } : null
  },
  quarters: FORTRESS_BUILDING.LaborerQuarters,
  gemMine: FORTRESS_BUILDING.GemMine
}

const UNDERWORLD_COSTS: ((level: number) => number)[] = [
  () => 0,
  (level) => tableValue(HEART, level),
  (level) => tableValue(GATE, level),
  (level) => tableValue(GOLD_PIT, level),
  (level) => tableRow(EXTRACTOR, level)[0],
  (level) => tableRow(GOBLIN_PIT, level)[0],
  (level) => tableValue(TORTURE_CHAMBER, level),
  (level) => tableValue(GLADIATOR_TRAINER, level),
  (level) => tableRow(TROLL_BLOCK, level)[0],
  (level) => tableValue(TIME_MACHINE, level),
  (level) => tableValue(KEEPER, level)
]

export const UNDERWORLD_PLANNER: PlannerConfig = {
  kind: 'underworld',
  buildings: UNDERWORLD_COSTS.map((cost, index) => {
    // A copy of the fortress building, upgraded for free and instantly here, it only speeds up the underworld builds after it
    const quarters = index === UNDERWORLD_BUILDING.LaborerQuarters

    return {
      name: quarters ? 'general.buildings.fortress2' : `general.buildings.underworld${index}`,
      picture: quarters ? 'fortress/02' : `underworld/${String(index).padStart(2, '0')}`,
      max: index === UNDERWORLD_BUILDING.GoldPit ? 100 : 15,
      pictures: 15,
      instant: quarters,
      cost: (level) => [cost(level)]
    }
  }),
  resources: [{ key: 'souls', producer: UNDERWORLD_BUILDING.Extractor, hourly: (level) => (level > 0 ? EXTRACTOR[level - 1][1] : 0) }],
  required: (building, level) => {
    if (building === UNDERWORLD_BUILDING.Heart || building === UNDERWORLD_BUILDING.LaborerQuarters) return null

    return { building: UNDERWORLD_BUILDING.Heart, level: building === UNDERWORLD_BUILDING.Gate ? Math.max(2, level) : Math.min(15, level) }
  },
  quarters: UNDERWORLD_BUILDING.LaborerQuarters,
  gemMine: -1
}

export const PLANNER_CONFIGS: Record<PlannerKind, PlannerConfig> = {
  fortress: FORTRESS_PLANNER,
  underworld: UNDERWORLD_PLANNER
}

export function createPlan(config: PlannerConfig): PlannerPlan {
  return { levels: config.buildings.map(() => 0), steps: [] }
}

export function normalizePlan(config: PlannerConfig, plan: PlannerPlan): PlannerPlan {
  return { ...plan, levels: getStartLevels(config, plan) }
}

export function checkUpgrade(config: PlannerConfig, levels: number[], building: number): PlannerBlock | null {
  const level = levels[building] + 1

  if (level > config.buildings[building].max) return { kind: 'max' }

  const requirement = config.required(building, level)

  if (requirement && levels[requirement.building] < requirement.level) return { kind: 'needs', building: requirement.building, level: requirement.level }

  return null
}

export function getStartLevels(config: PlannerConfig, plan: PlannerPlan) {
  return config.buildings.map((building, index) => clamp(plan.levels[index] ?? 0, 0, building.max))
}

export function getUpgradeTime(config: PlannerConfig, building: number, level: number, quarters: number) {
  if (config.buildings[building].instant) return 0

  return buildTime(Math.min(level, config.buildings[building].timeCap ?? level), quarters, config.kind === 'underworld')
}

export function getSkipCost(duration: number) {
  return Math.ceil(duration / 600000)
}

function gemSearchTime(mine: number, quarters: number) {
  return gemTime(GEMTIME[Math.min(19, mine - 1)] * 60000, quarters)
}

// Steps run back to back, what the producers make during one build lowers the price of the next one
export function simulate(config: PlannerConfig, plan: PlannerPlan, count = plan.steps.length) {
  const levels = getStartLevels(config, plan)
  const rows: PlannerRow[] = []
  const state: PlannerState = { time: 0, levels, mined: config.resources.map(() => 0), gems: 0, search: null }

  let total = config.resources.map(() => 0)
  let mushrooms = 0

  if (config.gemMine >= 0 && levels[config.gemMine] > 0) {
    state.search = gemSearchTime(levels[config.gemMine], levels[config.quarters])
  }

  for (let index = 0; index < count; index++) {
    const step = plan.steps[index]
    const building = step.building
    const level = levels[building] + 1
    const block = checkUpgrade(config, levels, building)
    const row: PlannerRow = { index, building, level, block, skipped: step.skipped, start: state.time, end: state.time, duration: 0, cost: [], discount: [], total: [], mushrooms, gems: 0, searching: state.search !== null }

    rows.push(row)

    if (block) continue

    const quarters = levels[config.quarters]

    row.cost = config.buildings[building].cost(level)
    row.discount = row.cost.map((value, resource) => Math.min(value, state.mined[resource]))
    total = total.map((value, resource) => value + row.cost[resource])
    row.total = total
    row.duration = getUpgradeTime(config, building, level, quarters)

    if (step.skipped) {
      mushrooms += getSkipCost(row.duration)
      row.mushrooms = mushrooms
    }

    row.end = state.time + (step.skipped ? 0 : row.duration)

    if (building === config.gemMine) {
      state.search = null
      row.searching = false
    }

    if (state.search !== null) {
      while (state.search <= row.end) {
        row.gems += 1
        state.search += gemSearchTime(levels[config.gemMine], quarters)
      }
    }

    // An instant upgrade only uses part of what the previous build mined, the rest still goes to the next step
    state.mined = config.buildings[building].instant ? state.mined.map((value, resource) => value - row.discount[resource]) : config.resources.map((resource) => (resource.producer === building ? 0 : (resource.hourly(levels[resource.producer]) * (row.end - row.start)) / 3600000))
    state.gems += row.gems
    state.time = row.end
    levels[building] = level

    if (building === config.gemMine) {
      state.search = row.end + gemSearchTime(level, levels[config.quarters])
    }
  }

  return { rows, state }
}

export function getGemRuns(rows: PlannerRow[]) {
  const runs = new Map<number, PlannerGemRun>()

  let first = -1
  let run: PlannerGemRun = { rows: 0, gems: 0 }

  for (const row of rows) {
    if (first >= 0 && !row.searching) {
      if (run.gems > 0) {
        runs.set(first, run)
      }

      first = -1
    }

    if (row.searching) {
      if (first < 0) {
        first = row.index
        run = { rows: 0, gems: 0 }
      }

      run.rows += 1
      run.gems += row.gems
    }
  }

  if (first >= 0 && run.gems > 0) {
    runs.set(first, run)
  }

  return runs
}

export function getNextOptions(config: PlannerConfig, plan: PlannerPlan, state: PlannerState): PlannerOption[] {
  const quarters = state.levels[config.quarters]

  return config.buildings.map((building, index) => {
    const current = state.levels[index]
    const level = current + 1
    const block = checkUpgrade(config, state.levels, index)
    const maxed = block?.kind === 'max'
    const cost = maxed ? [] : building.cost(level)
    const name = `${globalLocalize(building.name)} ${Math.min(level, building.max)}`

    return {
      index,
      name,
      label: block ? name : globalLocalize('build_planner.add', { name }),
      block,
      badge: block ? (maxed ? globalLocalize('build_planner.max') : undefined) : String(level),
      picture: Math.min(block ? current : level, building.pictures),
      cost,
      discount: cost.map((value, resource) => Math.min(value, state.mined[resource])),
      duration: maxed ? 0 : getUpgradeTime(config, index, level, quarters)
    }
  })
}

export function pruneSteps(config: PlannerConfig, plan: PlannerPlan) {
  const levels = getStartLevels(config, plan)
  const steps: PlannerStep[] = []

  for (const step of plan.steps) {
    if (checkUpgrade(config, levels, step.building)) continue

    levels[step.building] += 1
    steps.push(step)
  }

  return steps
}

export function notifyRemovedSteps(count: number) {
  if (count <= 0) return

  useToast({ title: globalLocalize('build_planner.removed.title'), message: globalLocalize(count === 1 ? 'build_planner.removed.message_one' : 'build_planner.removed.message', { count }) })
}

export function getBuildingPicture(config: PlannerConfig, building: number, level: number) {
  return `/res/buildings/${config.buildings[building].picture}_${String(level).padStart(2, '0')}.webp`
}

const TRACK_COUNT = Math.max(...Object.values(PLANNER_CONFIGS).map((config) => config.buildings.length))

export function getTimelineColumns(config: PlannerConfig) {
  const spare = TRACK_COUNT - config.buildings.length

  return `32px repeat(${config.buildings.length}, minmax(0, 1fr)) 460px${spare > 0 ? ` minmax(0, ${spare}fr)` : ''}`
}

export function getDetailColumns(config: PlannerConfig) {
  return `repeat(${config.resources.length}, 136px) 72px 84px`
}

export function formatBuildTime(milliseconds: number) {
  const units: [milliseconds: number, label: string][] = [
    [31536000000, 'y'],
    [86400000, 'd'],
    [3600000, 'h'],
    [60000, 'm'],
    [1000, 's']
  ]

  let remaining = Math.round(milliseconds / 1000) * 1000

  const parts: string[] = []

  for (const unit of units) {
    const amount = Math.floor(remaining / unit[0])

    remaining -= amount * unit[0]

    if (amount > 0) {
      parts.push(`${amount}${unit[1]}`)
    }
  }

  return parts.slice(0, 2).join(' ') || '0s'
}
