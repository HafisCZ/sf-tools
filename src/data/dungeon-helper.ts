import { type RawDungeonProgress } from './types'

export type DungeonList = number[] & {
  Total: number
  Unlocked: number
}

export type LegacyDungeons = {
  Normal: number[]
  Shadow: number[]
  Class: number[]
  Group: number
  Player: number
  Tower: number
  Twister: number
  Raid: number
  Youtube: number
  Sandstorm: number
}

export type PlayerDungeons = Omit<LegacyDungeons, 'Normal' | 'Shadow' | 'Class'> & {
  Normal: DungeonList
  Shadow: DungeonList
  Class: DungeonList
}

export class DungeonHelper {
  static template(): LegacyDungeons {
    const open = DungeonHelper.DUNGEON_OPEN
    const locked = DungeonHelper.DUNGEON_LOCKED

    return {
      Normal: new Array<number>(DungeonHelper.LIGHT_DUNGEON_COUNT).fill(locked),
      Shadow: new Array<number>(DungeonHelper.SHADOW_DUNGEON_COUNT).fill(locked),
      Class: new Array<number>(DungeonHelper.CLASS_DUNGEON_COUNT).fill(0),
      Group: locked,
      Player: locked,
      Tower: open,
      Twister: open,
      Raid: locked,
      Youtube: locked,
      Sandstorm: locked
    }
  }

  static fromData(legacyDungeons: LegacyDungeons, dungeonData: RawDungeonProgress | null | undefined) {
    const dungeons = DungeonHelper.template() as PlayerDungeons

    if (dungeonData?.light) {
      // Standard dungeons
      const normal = dungeonData.light
      const shadow = dungeonData.shadow as number[]

      const lightCount = Math.min(DungeonHelper.LIGHT_DUNGEON_COUNT, normal.length)
      for (let index = 0; index < lightCount; index++) {
        dungeons.Normal[index] = normal[DungeonHelper.PLAYA_TO_INTERNAL_MAPPING[index]]
      }

      const shadowCount = Math.min(DungeonHelper.SHADOW_DUNGEON_COUNT, shadow.length)
      for (let index = 0; index < shadowCount; index++) {
        dungeons.Shadow[index] = shadow[DungeonHelper.PLAYA_TO_INTERNAL_MAPPING[index]]
      }

      // Special dungeons
      dungeons.Tower = normal[14]
      dungeons.Twister = shadow[14]
      dungeons.Player = normal[17]
      dungeons.Youtube = shadow[17]
      dungeons.Sandstorm = normal[31]
    } else {
      // Convert old dungeon data to new format
      for (const dungeonIndex of DungeonHelper.LEGACY_TO_INTERNAL_MAPPING) {
        dungeons.Normal[dungeonIndex] = (legacyDungeons.Normal[dungeonIndex] || 0) + DungeonHelper.DUNGEON_LOCKED
        dungeons.Shadow[dungeonIndex] = (legacyDungeons.Shadow[dungeonIndex] || 0) + DungeonHelper.DUNGEON_LOCKED
      }

      for (const dungeonIndex of DungeonHelper.LEGACY_MISSING) {
        dungeons.Normal[dungeonIndex] = DungeonHelper.DUNGEON_LOCKED
        dungeons.Shadow[dungeonIndex] = DungeonHelper.DUNGEON_LOCKED
      }

      // Convert legacy 20 floor dungeons
      for (const type of ['Normal', 'Shadow'] as const) {
        for (const [sourceDungeon, targetDungeon] of DungeonHelper.LEGACY_SPLIT_TO_INTERNAL_MAPPING) {
          const value = (legacyDungeons[type][sourceDungeon] || 0) + DungeonHelper.DUNGEON_LOCKED

          dungeons[type][sourceDungeon] = Math.min(value, 10)
          dungeons[type][targetDungeon] = value >= 10 ? value - 10 : DungeonHelper.DUNGEON_LOCKED
        }
      }

      dungeons.Tower = legacyDungeons.Tower || 0
      dungeons.Twister = (legacyDungeons.Twister || 0) + DungeonHelper.DUNGEON_LOCKED
      dungeons.Player = legacyDungeons.Player || 0
      dungeons.Youtube = (legacyDungeons.Youtube || 0) + DungeonHelper.DUNGEON_LOCKED
    }

    // Class dungeons
    if (dungeonData?.class) {
      const classCount = Math.min(DungeonHelper.CLASS_DUNGEON_COUNT, dungeonData.class.length)
      for (let dungeonIndex = 0; dungeonIndex < classCount; dungeonIndex++) {
        dungeons.Class[dungeonIndex] = dungeonData.class[dungeonIndex]
      }
    }

    // Copy over untouched data
    dungeons.Group = legacyDungeons.Group || 0
    dungeons.Raid = legacyDungeons.Raid || 0

    // Computations
    const dungeonProgress = (a: number, b: number) => a + Math.max(0, b)
    dungeons.Normal.Total = dungeons.Normal.reduce(dungeonProgress, 0)
    dungeons.Shadow.Total = dungeons.Shadow.reduce(dungeonProgress, 0)
    dungeons.Class.Total = dungeons.Class.reduce(dungeonProgress, 0)

    const dungeonUnlock = (a: number, b: number) => a + (b > -2 ? 1 : 0)
    dungeons.Normal.Unlocked = dungeons.Normal.reduce(dungeonUnlock, 0)
    dungeons.Shadow.Unlocked = dungeons.Shadow.reduce(dungeonUnlock, 0)
    dungeons.Class.Unlocked = dungeons.Class.reduce(dungeonUnlock, 0)

    return dungeons
  }

  static DUNGEON_OPEN = -1
  static DUNGEON_LOCKED = -2

  static CLASS_DUNGEON_COUNT = 5

  static PLAYA_TO_INTERNAL_MAPPING = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 32, 33, 34, 35, 36]

  static LIGHT_DUNGEON_COUNT = DungeonHelper.PLAYA_TO_INTERNAL_MAPPING.length

  static SHADOW_DUNGEON_COUNT = DungeonHelper.PLAYA_TO_INTERNAL_MAPPING.length

  static LEGACY_TO_INTERNAL_MAPPING = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 16, 17, 18]

  static LEGACY_MISSING = [19, 20, 21, 22, 23]

  static LEGACY_SPLIT_TO_INTERNAL_MAPPING = [
    [12, 27],
    [13, 24],
    [14, 25],
    [15, 26]
  ]
}
