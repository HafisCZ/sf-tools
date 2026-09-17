const INITIAL_COSTS = [5, 100, 2500, 50000, 1000000, 25000000, 500000000, 10000000000, 250000000000, 5000000000000]

/**
 * Amounts of levels an upgrade can be bought in at once
 */
export const MULTIPLIERS = [1, 10, 25, 100]

// Position of each amount in MULTIPLIERS, counted from 1
const MULTIPLIER_BINDING: Record<number, number> = {
  1: 1,
  10: 2,
  25: 3,
  100: 4
}

const PRICE_TABLE_LEVELS = 25001

// Price of buying each amount of levels from every level, for every building
const PRICE_TABLE = INITIAL_COSTS.map((initialCost) => {
  const prices = MULTIPLIERS.map((): number[] => [])

  prices[0][0] = initialCost

  for (let level = 1; level < PRICE_TABLE_LEVELS; level++) {
    prices[0][level] = Math.ceil(1.03 * prices[0][level - 1])
  }

  for (let multiplier = 1; multiplier < MULTIPLIERS.length; multiplier++) {
    for (let level = 0; level < PRICE_TABLE_LEVELS - MULTIPLIERS[multiplier]; level++) {
      let cost = 0

      for (let offset = 0; offset < MULTIPLIERS[multiplier]; offset++) {
        cost += prices[0][level + offset]
      }

      prices[multiplier][level] = cost
    }
  }

  return prices
})

export class Building {
  readonly id: number
  readonly initialDuration: number
  readonly initialIncrement: number

  constructor(id: number, initialDuration: number, initialIncrement: number) {
    this.id = id
    this.initialDuration = initialDuration
    this.initialIncrement = initialIncrement
  }

  getUpgradePrice(level: number, bulk: number) {
    const amount = MULTIPLIER_BINDING[bulk]

    if (amount) {
      return PRICE_TABLE[this.id][amount - 1][level]
    }

    let price = 0
    let currentLevel = level
    let remaining = bulk

    for (let i = 0; i < MULTIPLIERS.length; i++) {
      while (remaining >= MULTIPLIERS[i]) {
        price += PRICE_TABLE[this.id][i][currentLevel]
        currentLevel += MULTIPLIERS[i]
        remaining -= MULTIPLIERS[i]
      }
    }

    return price
  }

  getCycleDuration(level: number) {
    return this.initialDuration * Math.pow(0.8, Building.getNearestBreakpoint(level))
  }

  getCycleProduction(level: number) {
    return Math.round(this.initialIncrement * level * Math.pow(2, Building.getNearestBreakpoint(level)))
  }

  getAmortisation(level: number, bulk: number) {
    return this.getUpgradePrice(level, bulk) / (this.getProductionRate(level + bulk) - this.getProductionRate(level))
  }

  getBreakpointAmortisation(level: number) {
    const breakpointLevel = Building.getBreakpointLevel(Building.getNearestBreakpoint(level) + 1)

    return this.getUpgradePrice(level, breakpointLevel - level) / ((this.getCycleProduction(breakpointLevel) - this.getCycleProduction(level)) / this.getCycleDuration(breakpointLevel))
  }

  getProductionRate(level: number) {
    return this.getCycleProduction(level) / this.getCycleDuration(level)
  }

  getProductionReduced(level: number, duration: number, reduced: number) {
    return this.getCycleProduction(level) * Math.trunc(duration / (this.getCycleDuration(level) * reduced))
  }

  static getNearestBreakpoint(level: number) {
    if (level < 25) {
      return 0
    } else if (level < 50) {
      return 1
    } else if (level < 100) {
      return 2
    } else if (level < 250) {
      return 3
    } else if (level < 500) {
      return 4
    } else if (level < 1000) {
      return 5
    } else if (level < 2500) {
      return 6
    } else if (level < 5000) {
      return 7
    } else if (level < 10000) {
      return 8
    } else {
      return 9
    }
  }

  static getBreakpointLevel(breakpoint: number): number {
    if (breakpoint > 3) {
      return 10 * Building.getBreakpointLevel(breakpoint - 3)
    } else if (breakpoint === 3) {
      return 100
    } else if (breakpoint === 2) {
      return 50
    } else if (breakpoint === 1) {
      return 25
    } else {
      return 0
    }
  }
}

/**
 * Every arena building in the order of the game, `name` is its translation key in `idle.building`
 */
export const BUILDINGS = [
  { name: 'seat', building: new Building(0, 72, 1) },
  { name: 'popcorn_stand', building: new Building(1, 360, 10) },
  { name: 'parking_lot', building: new Building(2, 720, 40) },
  { name: 'trap', building: new Building(3, 1080, 120) },
  { name: 'drinks', building: new Building(4, 1440, 320) },
  { name: 'deadly_trap', building: new Building(5, 2160, 960) },
  { name: 'vip_seat', building: new Building(6, 2880, 2560) },
  { name: 'snacks', building: new Building(7, 4320, 7680) },
  { name: 'straying_monsters', building: new Building(8, 8640, 30720) },
  { name: 'toilet', building: new Building(9, 21600, 153600) }
]
