export type PlannerKind = 'fortress' | 'underworld'

export type PlannerResourceKey = 'wood' | 'stone' | 'souls'

export type PlannerStep = {
  building: number
  skipped: boolean
}

export type PlannerPlan = {
  levels: (number | null)[]
  quarters: number | null
  steps: PlannerStep[]
}

export type PlannerBlock = { kind: 'max' } | { kind: 'needs'; building: number; level: number }

export type PlannerBuilding = {
  name: string
  max: number
  pictures: number
  timeCap?: number
  cost: (level: number) => number[]
}

export type PlannerResource = {
  key: PlannerResourceKey
  producer: number
  hourly: (level: number) => number
}

export type PlannerConfig = {
  kind: PlannerKind
  buildings: PlannerBuilding[]
  resources: PlannerResource[]
  required: (building: number, level: number) => { building: number; level: number } | null
  quarters: number
  gemMine: number
}

export type PlannerRow = {
  index: number
  building: number
  level: number
  block: PlannerBlock | null
  skipped: boolean
  start: number
  end: number
  duration: number
  cost: number[]
  discount: number[]
  total: number[]
  gems: number
  searching: boolean
}

export type PlannerOption = {
  index: number
  name: string
  label: string
  block: PlannerBlock | null
  badge?: string
  picture: number
  cost: number[]
  discount: number[]
  duration: number
}

export type PlannerGemRun = {
  rows: number
  gems: number
}

export type PlannerState = {
  time: number
  levels: number[]
  mined: number[]
  gems: number
  search: number | null
}
