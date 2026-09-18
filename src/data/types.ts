export type RawGroupTournament = {
  tokens?: number
  floor?: number
  floor_max?: number
  rank?: number
}

export type RawDungeonProgress = {
  light?: number[]
  shadow?: number[]
  class?: number[]
}

type RawEntry = {
  id?: string
  identifier: string
  prefix: string
  timestamp: number
  offset: number
  own: boolean | number
  name: string
  group?: string
  description?: string
  gtsave?: RawGroupTournament
  tag?: string | string[]
  hidden?: boolean
}

export type RawPlayer = RawEntry & {
  save: number[]
  saveVersion?: number
  class?: number
  version?: number
  groupname?: string
  potions?: number[]
  status?: number[]
  fortress?: number[]
  fortressStorage?: number[]
  fortressrank?: number
  units?: number[]
  achievements?: number[]
  pets?: number[]
  tower?: number[]
  chest?: number[]
  dummy?: number[]
  scrapbook?: string
  scrapbook_legendary?: string
  witch?: number[]
  idle?: number[]
  calendar?: number[]
  webshopid?: string
  resources?: number[]
  dailyTasks?: number[]
  dailyTasksRewards?: number[]
  eventTasks?: number[]
  eventTasksRewards?: number[]
  toilet?: number[]
  adventure?: number[]
  groupMetadata?: number[]
  wheel?: number[]
  dice?: number[]
  companionItems?: number[]
  fidgetItems?: number[]
  shakesItems?: number[]
  equippedItems?: number[]
  dummyItems?: number[]
  backpackItems?: number[]
  dungeons?: RawDungeonProgress
}

export type RawGroup = RawEntry & {
  // Read with mixed(), every index the models use holds a number
  save: number[]
  rank: number
  knights?: number[]
  names: string[]
  members?: string[]
}

export type RawEntity = RawPlayer | RawGroup

export type RawFile = {
  players: RawPlayer[]
  groups: RawGroup[]
}

export type BlacksmithResources = {
  Metal: number
  Crystal: number
}

export type ItemAttribute = {
  Type: number
  Value: number
}

export type EntityLink = {
  Identifier: string
  Prefix: string
  Name: string
}

export type EntityHistory<TEntity extends { Timestamp: number }> = Record<number, TEntity> & {
  List: TEntity[]
  Latest: TEntity
  LatestTimestamp: number
  Links: Record<string, EntityLink>
  Relations: Set<string>
  Own: boolean
}
