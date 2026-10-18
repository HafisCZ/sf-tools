import { clamp } from '@utils/utils'

export class Calculations {
  // Returns base experience
  static experienceBase(level: number) {
    return this.experienceNextLevel(level) / this.experienceMultiplier(level)
  }

  // Returns reduced base experience
  static experienceReducedBase(level: number) {
    return Math.max(1, Math.exp((30090.33 / 5000000) * (level - 99)))
  }

  // Returns experience multiplier
  static experienceMultiplier(level: number) {
    return 0.75 * Math.max(0, level + 1)
  }

  // Returns curve of experience needed for next level
  static experienceNextLevelCurve() {
    return this.#EXPERIENCE_NEXT
  }

  // Returns experience needed for specific level
  static experienceNextLevel(level: number) {
    return this.#EXPERIENCE_NEXT[clamp(level, 0, 393)]
  }

  // Returns curve of total experience needed for next level
  static experienceTotalLevelCurve() {
    return this.#EXPERIENCE_TOTAL
  }

  // Returns total experience needed for specific level
  static experienceTotalLevel(level: number) {
    return this.#EXPERIENCE_TOTAL[clamp(level, 0, 393)] + Math.max(0, level - 393) * 1500000000
  }

  // Returns minimum experience reward from quest segment
  static experienceQuestMin(level: number, book: number, guildInstructor: number, runes: number) {
    return (((1 + clamp(guildInstructor, 0, 200) / 100 + clamp(book, 0, 100) / 100) * this.experienceBase(level)) / 11 / this.experienceReducedBase(level)) * (1 + clamp(runes, 0, 10) / 100)
  }

  // Returns maximum experience reward from quest segment
  static experienceQuestMax(level: number, book: number, guildInstructor: number, runes: number) {
    return this.experienceQuestMin(level, book, guildInstructor, runes) * 5
  }

  // Returns experience bonus from stars for expedition
  static expeditionStarBonus(stars: number) {
    switch (stars) {
      case 0:
        return 0
      case 1:
        return 0.1
      case 2:
        return 0.2
      case 3:
        return 0.35
    }
  }

  // Returns mount bonus for expedition
  static expeditionMountBonus(mount: number) {
    switch (mount) {
      case 0:
        return 1
      case 1:
        return 1.11
      case 2:
        return 1.25
      case 3:
        return 1.42
      case 4:
        return 2
    }
  }

  // Returns experience reward for 25 thirst
  static experienceExpedition(level: number, book: number, guildInstructor: number, runes: number, scroll: boolean, stars: number, mount: number) {
    let base = (((1 + clamp(guildInstructor, 0, 200) / 100 + clamp(book, 0, 100) / 100 + clamp(runes, 0, 10) / 100) * this.experienceBase(level)) / 11 / this.experienceReducedBase(level)) * 15.18
    if (scroll) base *= 1.1
    return base * (1 + Number(this.expeditionStarBonus(stars))) * Number(this.expeditionMountBonus(mount))
  }

  // Returns experience from secret mission of the day
  static experienceSecretMission(level: number, hydra: number) {
    return this.experienceBase(level) * (1 + 0.25 * clamp(hydra, 0, 20))
  }

  // Returns experience from arena fight
  static experienceArena(level: number) {
    return this.experienceBase(level) / 10
  }

  // Returns experience from multiple wheel book
  static experienceWheelBooks(level: number) {
    return Math.trunc(this.experienceBase(level) / Calculations.experienceReducedBase(level))
  }

  // Returns experience from wheel book
  static experienceWheelBook(level: number) {
    return Math.trunc(this.experienceWheelBooks(level) / 2)
  }

  // Returns experience from calendar with books [0, 1, 2]
  static experienceCalendar(level: number, book: number) {
    return Math.ceil(this.experienceNextLevel(level) / (5 * (3 - clamp(book, 0, 2))))
  }

  // Returns experience reward for defeating pet dungeon enemy
  static experiencePetHabitat(level: number) {
    return (6 * this.experienceMultiplier(level) * this.experienceBase(level)) / this.experienceReducedBase(level) / 30
  }

  // Returns experience reward for defeating twister enemy
  static experienceTwisterEnemy(level: number) {
    return Math.min(30e6, this.experienceNextLevel(level) / 50)
  }

  // Returns multiplier for experience from academy
  static experienceAcademyMultiplier(academy: number) {
    switch (clamp(academy, 1, 20)) {
      case 1:
        return 1
      case 2:
        return 1.1
      case 3:
        return 1.2
      case 4:
        return 1.3
      case 5:
        return 1.4
      case 6:
        return 1.5
      case 7:
        return 1.6
      case 8:
        return 2.0
      case 9:
        return 2.4
      case 10:
        return 3.2
      case 11:
        return 4.0
      case 12:
        return 4.8
      case 13:
        return 6.4
      case 14:
        return 8.0
      case 15:
        return 9.6
      case 16:
        return 10.0
      case 17:
        return 10.4
      case 18:
        return 10.8
      case 19:
        return 11.2
      case 20:
        return 12
    }
  }

  // Returns hourly output of academy
  static experienceAcademyHourly(level: number, academy: number) {
    return (clamp(academy, 1, 20) * this.experienceBase(level)) / this.experienceReducedBase(level) / 30
  }

  // Return capacity of academy
  static experienceAcademyCapacity(level: number, academy: number) {
    return this.experienceAcademyHourly(level, academy) * Number(this.experienceAcademyMultiplier(academy))
  }

  // Returns curve of souls gained from lure
  static soulsCurve() {
    return this.#SOULS_CURVE
  }

  // Returns souls gained from lure
  static souls(level: number, gate: number, torture: number) {
    const clampedLevel = Math.max(level, 0)
    const clampedGate = clamp(gate, 0, 15)
    const clampedTorture = clamp(torture, 0, 15)

    return Math.ceil((clampedLevel < 542 ? this.#SOULS_CURVE[clampedLevel] / 7.5 : 464075 + (clampedLevel - 525) * 8663) * (1 + 0.1 * clampedTorture) * (1 + 0.2 * Math.max(0, clampedGate - 5)))
  }

  // Returns basic gold curve
  static goldCurve() {
    return this.GOLD_CURVE
  }

  // Returns gold
  static gold(level: number) {
    const value = this.GOLD_CURVE[clamp(level, 0, 640)]

    return typeof value === 'undefined' ? 1e9 : value
  }

  // Returns gold from griffin mount
  static goldEnvironmentalReward(level: number) {
    return Math.min(10e6, this.goldBase(level))
  }

  // Return base gold
  static goldBase(level: number) {
    return (this.gold(level) * 12) / 1000
  }

  // Return cost of an attribute
  static goldAttributeCost(attribute: number) {
    let cost = 0

    for (let i = 0; i < 5; i++) {
      let num = Math.floor(1 + (attribute + i) / 5)

      cost = num >= 800 ? 5e9 : cost + this.gold(num)
    }

    cost = (5 * Math.floor(Math.floor(cost / 5) / 5)) / 100
    return cost < 10 ? cost : Math.min(1e7, Math.floor(cost))
  }

  // Return total cost of an attribute
  static goldAttributeTotalCost(attribute: number) {
    let cost = 0
    let index = attribute

    if (index > 3200) {
      cost += 1e7 * (index - 3200)
      index = 3200
    }

    return cost + (this.GOLD_ATTRIBUTE_TOTAL[index - 1] || 0)
  }

  // Returns gold reward from tower enemy
  static goldTowerEnemy(level: number) {
    return (9 * this.gold(level + 2)) / 100
  }

  // Returns gold reward from twister enemy
  static goldTwisterEnemy(level: number) {
    return (2 * this.gold(level)) / 100
  }

  // Returns maximum gold gained from arena fight
  static goldArena(level: number) {
    return level > 95 ? Math.trunc(this.goldTwisterEnemy(level) / this.goldArenaMultiplier(level)) : level
  }

  // Returns multiplier for arena gold
  static goldArenaMultiplier(level: number) {
    if (level >= 300) {
      return 10
    } else if (level >= 250) {
      return 15
    } else if (level >= 200) {
      return 20
    } else if (level >= 150) {
      return 24
    } else {
      return 28
    }
  }

  // Get gold from dices [0, 1, 2]
  static goldDice(level: number, dices: number) {
    return (Math.pow(5, clamp(dices, 0, 2)) * this.goldBase(level)) / 3
  }

  // Returns gold from guard duty
  static goldGuardDuty(level: number, tower: number, guildTreasure: number) {
    return Math.min(10e6, (this.goldBase(level) / 3) * (1 + clamp(tower, 0, 100) / 100 + clamp(guildTreasure, 0, 200) / 100))
  }

  // Returns gold value of a mined gem of sizes [0, 1, 2]
  static goldGem(level: number, mine: number, gemSize: number) {
    return Math.min(10e6, (2 * Number(this.goldGemMineMultiplier(mine)) * this.gold(level + clamp(gemSize, 0, 2) * 5)) / 1000)
  }

  // Returns multiplier for gold value of a mined gem
  static goldGemMineMultiplier(mine: number) {
    switch (clamp(mine, 1, 14)) {
      case 1:
        return 1
      case 2:
        return 2
      case 3:
        return 3
      case 4:
        return 4
      case 5:
        return 6
      case 6:
        return 8
      case 7:
        return 10
      case 8:
        return 12
      case 9:
        return 14
      case 10:
        return 16
      case 11:
        return 18
      case 12:
        return 20
      case 13:
        return 22
      case 14:
        return 24
    }
  }

  // Returns cost of witch scroll
  static goldWitchScroll(level: number) {
    return Math.min(10e6, (this.goldBase(level) * 12.5) / 3)
  }

  // Returns gold cost of fortress reroll
  static goldFortressReroll(level: number) {
    return (this.goldBase(level) * 5) / 8
  }

  // Returns gold value of witch potions
  static goldWitchPotion(level: number) {
    return (this.goldBase(level) * 5) / 6
  }

  // Returns base potion gold reduced by runes
  static goldPotionBase(level: number, runes: number) {
    return ((1 + Math.min(1, Math.max(0, (90 - level) / 10))) * this.gold(Math.max(1, level - clamp(runes, 0, 5))) * 15) / 1000
  }

  // Returns purchase cost of potion size [0, 1, 2]
  static goldPotionCost(level: number, runes: number, potionSize: number) {
    return Math.min(5e6, this.goldPotionBase(level, runes) / Math.pow(2, 2 - clamp(potionSize, 0, 2)))
  }

  // Returns purchase cost of life potion with mushrooms
  static goldLifePotionCost(level: number, runes: number) {
    return Math.min(5e6, this.goldPotionBase(level, runes) / 3)
  }

  // Returns purchase cost of life potion without mushrooms
  static goldLifePotionShroomlessCost(level: number, runes: number) {
    return Math.min(10e6, this.goldPotionBase(level, runes))
  }

  // Returns gold from calendar bar
  static goldCalendarBar(level: number) {
    return 2.5 * this.goldBase(level)
  }

  // Returns gold from 3 calendar bar
  static goldCalendarBars(level: number) {
    return (25 * this.goldBase(level)) / 3
  }

  // Returns cost of one hourglass
  static goldHourglassCost(level: number, runes: number) {
    const value = Math.min(375000, this.goldPotionBase(level, runes) / 6)

    if (value > 37500) {
      return 375000
    } else {
      return value
    }
  }

  // Returns cost of 10 hourglasses
  static goldHourglassPackCost(level: number, runes: number) {
    return Math.min(3750000, 10 * this.goldHourglassCost(level, runes))
  }

  // Returns hourly production of gold pit
  static goldPitHourly(level: number, pit: number) {
    const clampedPit = clamp(pit, 1, 100)

    return ((this.goldBase(level) * clampedPit) / 75) * (1 + Math.max(0, clampedPit - 15) / 100)
  }

  // Returns gold pit capacity
  static goldPitCapacity(level: number, pit: number) {
    const clampedPit = clamp(pit, 1, 100)

    return Math.min(300e6, this.goldPitHourly(level, clampedPit) * clampedPit * Math.max(2, 12 / clampedPit))
  }

  // Returns minimum gold reward from quest segment
  static goldQuestMin(level: number, tower: number, guildTreasure: number, runes: number) {
    return Math.min(10000000, (1 * (1 + clamp(guildTreasure, 0, 200) / 100 + clamp(tower, 0, 100) / 100) * this.goldBase(level)) / 11) * (1 + clamp(runes, 0, 50) / 100)
  }

  // Returns maximum gold reward from quest segment
  static goldQuestMax(level: number, tower: number, guildTreasure: number, runes: number) {
    return Math.min(10000000, (5 * (1 + clamp(guildTreasure, 0, 200) / 100 + clamp(tower, 0, 100) / 100) * this.goldBase(level)) / 11) * (1 + clamp(runes, 0, 50) / 100)
  }

  // Returns expedition final gold reward for 25 thirst
  static goldExpedition(level: number, tower: number, guildTreasure: number, runes: number, scroll: boolean, mount: number) {
    const base = this.gold(level) / 60.38647
    let goldMultiplier = 1 + clamp(clamp(guildTreasure, 0, 200) / 100 + (clamp(tower, 0, 100) * 2) / 100, 0, 3) + clamp(runes, 0, 50) / 100
    if (scroll) goldMultiplier *= 1.1

    let goldWithBonuses = Math.min(40_000_000, base * goldMultiplier) * Number(this.expeditionMountBonus(mount))
    goldWithBonuses += (clamp(level - 557, 0, 75) * (50_000_000 * Number(this.expeditionMountBonus(mount)) - goldWithBonuses)) / 75
    return goldWithBonuses
  }

  /*
    Data
  */
  static #goldCurve: number[] | undefined

  static #goldAttributeTotal: number[] | undefined

  static get GOLD_CURVE() {
    if (this.#goldCurve) return this.#goldCurve

    const array = [0, 25, 50, 75]

    for (let i = array.length; i < 650; i++) {
      array[i] = Math.min(Math.floor((array[i - 1] + Math.floor(array[Math.floor(i / 2)] / 3) + Math.floor(array[Math.floor(i / 3)] / 4)) / 5) * 5, 1e9)
    }

    return (this.#goldCurve = array)
  }

  static get GOLD_ATTRIBUTE_TOTAL() {
    if (this.#goldAttributeTotal) return this.#goldAttributeTotal

    const array: number[] = []

    for (let i = 0; i < 3200; i++) {
      array[i] = (array[i - 1] || 0) + this.goldAttributeCost(i)
    }

    return (this.#goldAttributeTotal = array)
  }

  static #experienceNext: number[] | undefined

  static #experienceTotal: number[] | undefined

  static get #EXPERIENCE_NEXT() {
    if (this.#experienceNext) return this.#experienceNext

    const array = [0, 400, 900, 1400]

    for (let i = array.length; i < 394; i++) {
      array[i] = Math.min(Math.floor((array[i - 1] + Math.floor(array[Math.floor(i / 2)] / 3) + Math.floor(array[Math.floor(i / 3)] / 4)) / 5) * 5, 1500000000)
    }

    return (this.#experienceNext = array)
  }

  static get #EXPERIENCE_TOTAL() {
    if (this.#experienceTotal) return this.#experienceTotal

    const array = [0]

    for (let i = 1; i < 394; i++) {
      array[i] = array[i - 1] + this.#EXPERIENCE_NEXT[i - 1]
    }

    return (this.#experienceTotal = array)
  }

  static #SOULS_CURVE = [
    0, 2175, 2295, 2415, 2535, 2648, 2768, 2888, 3000, 3120, 3240, 3360, 3473, 3593, 3713, 3825, 3945, 4065, 4185, 4298, 4418, 4538, 4650, 4770, 4890, 5010, 5123, 5243, 5363, 5475, 5595, 5715, 5835, 5948, 6068, 6188, 6255, 6330, 6398, 6465, 6540, 6608, 6683, 6750, 6825, 6893, 6960, 7035, 7103, 7178, 7245, 7320, 7388,
    7455, 7530, 7598, 7673, 7740, 7815, 7883, 7950, 8025, 8093, 8168, 8235, 8310, 8378, 8445, 8520, 8588, 8663, 8768, 8873, 8978, 9083, 9188, 9300, 9405, 9510, 9615, 9720, 9825, 9930, 10043, 10148, 10253, 10358, 10463, 10568, 10673, 10785, 10890, 10995, 11100, 11205, 11310, 11415, 11528, 11633, 11738, 11843, 11948,
    12053, 12158, 12270, 12375, 12585, 12795, 13013, 13223, 13433, 13643, 13860, 14070, 14280, 14498, 14708, 14918, 15128, 15345, 15555, 15765, 15983, 16193, 16403, 16613, 16830, 17040, 17250, 17468, 17678, 17888, 18098, 18315, 18525, 18735, 18953, 19163, 19373, 19583, 19800, 20115, 20438, 20753, 21068, 21390, 21705,
    22028, 22343, 22665, 22980, 23295, 23618, 23933, 24255, 24570, 24893, 25208, 25523, 25845, 26160, 26483, 26798, 27120, 27435, 27750, 28073, 28388, 28710, 29025, 29348, 29663, 29978, 30300, 30615, 30938, 31395, 31853, 32318, 32775, 33233, 33690, 34155, 34613, 35070, 35535, 35993, 36450, 36908, 37373, 37830, 38288,
    38753, 39210, 39668, 40125, 40590, 41048, 41505, 41970, 42428, 42885, 43343, 43808, 44265, 44723, 45188, 45645, 46103, 46560, 47025, 47730, 48435, 49148, 49853, 50558, 51263, 51975, 52680, 53385, 54098, 54803, 55508, 56213, 56925, 57630, 58335, 59048, 59753, 60458, 61163, 61875, 62580, 63285, 63998, 64703, 65408,
    66113, 66825, 67530, 68235, 68948, 69653, 70358, 71063, 71775, 72728, 73680, 74640, 75593, 76545, 77498, 78458, 79410, 80363, 81323, 82275, 83228, 84180, 85140, 86093, 87045, 88005, 88958, 89910, 90863, 91823, 92775, 93728, 94688, 95640, 96593, 97545, 98505, 99458, 100410, 101370, 102323, 103275, 104228, 105188,
    106598, 108015, 109425, 110843, 112260, 113670, 115088, 116498, 117915, 119325, 120743, 122160, 123570, 124988, 126398, 127815, 129225, 130643, 132060, 133470, 134888, 136298, 137715, 139125, 140543, 141960, 143370, 144788, 146198, 147615, 149025, 150443, 151860, 153270, 154688, 156810, 158925, 161048, 163170,
    165293, 167415, 169538, 171660, 173775, 175898, 178020, 180143, 182265, 184388, 186510, 188625, 190748, 192870, 194993, 197115, 199238, 201360, 203475, 205598, 207720, 209843, 211965, 214088, 216210, 218325, 220448, 222570, 224693, 226815, 228938, 232470, 236010, 239543, 243075, 246615, 250148, 253688, 257220,
    260760, 264293, 267825, 271365, 274898, 278438, 281970, 285510, 289043, 292575, 296115, 299648, 303188, 306720, 310260, 313793, 317325, 320865, 324398, 327938, 331470, 335010, 338543, 342075, 345615, 349148, 352688, 357810, 362940, 368063, 373193, 378323, 383445, 388575, 393698, 398828, 403950, 409080, 414210,
    419333, 424463, 429585, 434715, 439838, 444968, 450098, 455220, 460350, 465473, 470603, 475725, 480855, 485985, 491108, 496238, 501360, 506490, 511613, 516743, 521873, 526995, 532125, 539903, 547680, 555458, 563235, 571013, 578798, 586575, 594353, 602130, 609908, 617685, 625463, 633248, 641025, 648803, 656580,
    664358, 672135, 679913, 687698, 695475, 703253, 711030, 718808, 726585, 734363, 742148, 749925, 757703, 765480, 773258, 781035, 788813, 796598, 804375, 815865, 827355, 838845, 850335, 861825, 873323, 884813, 896303, 907793, 919283, 930773, 942263, 953760, 965250, 976740, 988230, 999720, 1011210, 1022700, 1034198,
    1045688, 1057178, 1068668, 1080158, 1091648, 1103138, 1114635, 1126125, 1137615, 1149105, 1160595, 1172085, 1183575, 1195073, 1206563, 1271528, 1336500, 1401465, 1466438, 1531403, 1596375, 1661340, 1726313, 1791278, 1856250, 1921223, 1986195, 2051168, 2116140, 2181113, 2246085, 2311058, 2376030, 2441003, 2505975,
    2570948, 2635920, 2700893, 2765865, 2830838, 2895810, 2960783, 3025755, 3090728, 3155700, 3220673, 3285645, 3350618, 3415590, 3480563, 3545535, 3610508, 3675480, 3740453, 3805425, 3870398, 3935370, 4000343, 4065315, 4130288, 4195260, 4260233, 4325205, 4390178, 4455150, 4520123
  ]
}

/*
  Item rune to runes conversions
*/
export const RUNE_VALUE = {
  GOLD: function (rune: number) {
    return rune < 2 ? 0 : 3 + 2 * (rune - 2)
  },
  EPIC_FIND: function (rune: number) {
    return rune < 2 ? 0 : 3 + 2 * (rune - 2)
  },
  ITEM_QUALITY: function (rune: number) {
    switch (rune) {
      case 1:
        return 3
      case 2:
        return 19
      case 3:
        return 50
      case 4:
        return 75
      case 5:
        return 99
      default:
        return 0
    }
  },
  XP: function (rune: number) {
    switch (rune) {
      case 1:
        return 3
      case 2:
        return 9
      case 3:
        return 25
      case 4:
        return 35
      case 5:
        return 45
      case 6:
        return 55
      case 7:
        return 65
      case 8:
        return 75
      case 9:
        return 85
      case 10:
        return 95
      default:
        return 0
    }
  },
  HEALTH: function (rune: number) {
    switch (rune) {
      case 1:
        return 3
      case 2:
        return 6
      case 3:
        return 17
      case 4:
        return 23
      case 5:
        return 30
      case 6:
        return 36
      case 7:
        return 43
      case 8:
        return 50
      case 9:
        return 56
      case 10:
        return 64
      case 11:
        return 72
      case 12:
        return 80
      case 13:
        return 88
      case 14:
        return 94
      case 15:
        return 99
      default:
        return 0
    }
  },
  SINGLE_RESISTANCE: function (rune: number) {
    if (rune < 2) {
      return 0
    } else {
      return Math.floor((rune - 0.4) / 0.75)
    }
  },
  TOTAL_RESISTANCE: function (rune: number): number {
    return RUNE_VALUE.SINGLE_RESISTANCE(rune * 3)
  },
  ELEMENTAL_DAMAGE: function (rune: number) {
    if (rune < 2) {
      return 0
    } else {
      return Math.floor((rune - 0.3) / 0.6)
    }
  }
}
