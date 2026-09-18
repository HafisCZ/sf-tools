import { formatPrefix } from '@utils/formatting'
import { compact, countWhere, dig, filterInPlace, getTimestampOffset, isEmpty, pushUnique, removeItem, sortDescending, toArray, toRecord, unique } from '@utils/utils'
import { Actions } from '~/script/actions'
import { Expression, ExpressionCache, ExpressionScope } from '~/script/expression'
import { Logger } from '~/site/logger'
import { DEFAULT_PROFILE, type DatabaseProfile } from '~/site/profiles'
import { Site } from '~/site/site'
import { Store } from '~/site/store'
import { GroupModel } from './group-model'
import { type DatabaseMetadata, type DatabaseSession, DatabaseUtils, type IndexedDBWrapper } from './indexed-db'
import { ModelRegistry } from './model-registry'
import { PlayaResponse } from './playa-response'
import { PlayerModel } from './player-model'
import { type EntityHistory, type RawEntity, type RawFile, type RawGroup, type RawPlayer } from './types'

export type PlayerHistory = EntityHistory<PlayerModel>

export type GroupHistory = EntityHistory<GroupModel> & {
  LatestDisplayTimestamp: number
}

export type RemovalData = {
  identifiers?: string[]
  timestamps?: number[]
  instances?: RawEntity[]
}

type TrackerEntry = {
  ts: number
  out: unknown
}

type PlayerTracker = { identifier: string } & Record<string, TrackerEntry | string>

type ImportFlags = {
  temporary?: boolean
  deferred?: boolean
  skipExisting?: boolean
  skipActions?: boolean
}

export function getEntryKey(data: RawEntity) {
  return `${data.identifier}-${data.timestamp}`
}

export class DatabaseManager {
  static #interface: DatabaseSession | null = null

  static #profile: DatabaseProfile = DEFAULT_PROFILE

  static #links = new Map<string, string>()
  static #linksLookup = new Map<string, string[]>()

  // Metadata & Settings
  static #metadataDelta: number[] = []
  static #metadata: Record<number, DatabaseMetadata> = {}
  static #hiddenModels = new Set<RawEntity>()
  static #sessionObjects: Record<string, RawEntity> = {}
  static #hiddenVisible = false
  static #hiddenIdentifiers = new Set<string>()

  // Trackers
  static #trackerData: Record<string, string> = {}
  static #trackedPlayers: Record<string, PlayerTracker> = {}
  static #trackerConfig: ReturnType<typeof Actions.getTrackers> = {}
  static #trackerConfigEntries: [string, ReturnType<typeof Actions.getTrackers>[string]][] = []

  static Players: Record<string, PlayerHistory> = Object.create(null) as Record<string, PlayerHistory>
  static Groups: Record<string, GroupHistory> = Object.create(null) as Record<string, GroupHistory>
  static Identifiers = new ModelRegistry<string, number>()
  static Timestamps = new ModelRegistry<number, string>()
  static PlayerTimestamps: number[] = []
  // Keys read from objects, so these are strings
  static GroupTimestamps: string[] = []
  static Prefixes: string[] = []
  static GroupNames: Record<string, string> = {}
  static PlayerNames: Record<string, string> = {}
  static Latest = 0
  static LatestPlayer = 0
  static LatestGroup = 0
  static LastChange = 0

  static get #session() {
    return this.#interface as DatabaseSession
  }

  static #addToSession(object: RawEntity) {
    this.#sessionObjects[getEntryKey(object)] = object
  }

  static async reset() {
    if (this.#interface) {
      await this.#interface.close()
    }

    this.#interface = null

    this.#links.clear()
    this.#linksLookup.clear()

    // Models
    this.Players = Object.create(null) as Record<string, PlayerHistory>
    this.Groups = Object.create(null) as Record<string, GroupHistory>
    this.#metadata = {}

    this.#trackerData = {} // Metadata
    this.#trackedPlayers = {} // Tracker results
    this.#trackerConfig = {} // Tracker configurations (individual trackers)
    this.#trackerConfigEntries = []

    // Pools
    this.Identifiers = new ModelRegistry()
    this.Timestamps = new ModelRegistry()
    this.PlayerTimestamps = []
    this.GroupTimestamps = []
    this.Prefixes = []
    this.GroupNames = {}
    this.PlayerNames = {}

    this.#metadataDelta = []
    this.#hiddenModels = new Set()
    this.#hiddenIdentifiers = new Set()
    this.#hiddenVisible = Site.options.hidden
  }

  static #addPlayer(data: RawPlayer) {
    const model = new Proxy(
      {
        Data: data,
        Identifier: data.identifier,
        LinkId: this.getLink(data.identifier) as string,
        Timestamp: data.timestamp,
        Own: data.own,
        Name: data.name,
        Prefix: formatPrefix(data.prefix),
        Class: (data.class || (data.own ? data.save[29] : data.save[20]) % 65536) as CharacterClass,
        Group: {
          Identifier: data.group,
          LinkId: this.getLink(data.group),
          Name: data.groupname
        }
      },
      {
        get: function (target, prop) {
          if (prop == 'Data' || prop == 'Identifier' || prop == 'Timestamp' || prop == 'Own' || prop == 'Name' || prop == 'Prefix' || prop == 'Class' || prop == 'Group' || prop == 'LinkId') {
            return target[prop]
          } else if (prop == 'IsProxy') {
            return true
          } else {
            return (DatabaseManager.getPlayer(target.LinkId, target.Timestamp) as unknown as Record<PropertyKey, unknown>)[prop]
          }
        }
      }
    ) as unknown as PlayerModel

    const groupLinkId = model.Group.LinkId as string

    if (this.hasGroup(groupLinkId, model.Timestamp)) {
      this.Groups[groupLinkId][model.Timestamp].MembersPresent++
    }

    this.#registerModel('Players', model.LinkId, model.Timestamp, model)
  }

  static getLink(identifier: string | null | undefined) {
    if (identifier) {
      return this.#links.get(identifier) || identifier
    } else {
      // Return undefined since we dont want links to be created for invalid identifiers
      return undefined
    }
  }

  static async resetLinks() {
    for (const [sourceLink, links] of this.#linksLookup.entries()) {
      if (links.length > 1) {
        await this.unlink(sourceLink, false)
      }
    }

    // The temporary session has no clear(), so this throws in temporary mode
    await (this.#session as IndexedDBWrapper).clear('links')

    this.#updateLists()
  }

  static exportLinks() {
    return Object.fromEntries(Array.from(this.#linksLookup.entries()).filter(([, links]) => links.length > 1))
  }

  static async importLinks(linksObject: Record<string, string[]>) {
    for (const [fileTargetLink, fileSourceLinks] of Object.entries(linksObject)) {
      const targetLink = this.#links.get(fileTargetLink) || fileTargetLink

      for (const sourceLink of fileSourceLinks) {
        const parentLink = this.#links.get(sourceLink) || sourceLink

        // If link is reference to self, no need to unlink
        if (parentLink == sourceLink) continue
        else {
          // Otherwise we need it to separate from parent link
          // Objects that are affected
          const { players, groups } = this.getFile(this.getRelatedLinks([parentLink]), null)

          const objects = [...players, ...groups]

          // Unload objects
          for (const timestamp of this.Identifiers.values(parentLink)) {
            this.#unload(parentLink, timestamp)
          }

          // Separate link
          this.#links.set(sourceLink, sourceLink)
          this.#linksLookup.set(sourceLink, [sourceLink])

          // Remove from lookup
          const lookup = this.#linksLookup.get(parentLink) as string[]
          removeItem(lookup, sourceLink)

          this.#linksLookup.set(parentLink, lookup)

          await this.#session.set('links', { id: sourceLink, pid: sourceLink })

          // Add players and groups back to be registered with new links
          for (const object of objects) {
            if (this.isPlayer(object.identifier)) {
              this.#addPlayer(object)
            } else {
              this.#addGroup(object as RawGroup)
            }
          }
        }
      }

      await this.link(fileSourceLinks, targetLink, false)
    }

    this.#updateLists()
  }

  static getRelatedLinks(links: string[]) {
    const acc = new Set(links)

    for (const link of links) {
      const entry = DatabaseManager.getAny(link)
      if (entry?.Relations) {
        for (const relation of entry.Relations) {
          acc.add(relation)
        }
      }
    }

    return Array.from(acc)
  }

  static async unlink(sourceLink: string, updateLists = true) {
    const identifiers = this.getLinkedIdentifiers(sourceLink)

    // Objects that are affected
    const { players, groups } = this.getFile(this.getRelatedLinks([sourceLink]), null)

    const objects = [...players, ...groups]

    // Unload objects
    for (const timestamp of this.Identifiers.values(sourceLink)) {
      this.#unload(sourceLink, timestamp)
    }

    // Separate all links
    for (const identifier of identifiers) {
      this.#links.delete(identifier)
      this.#linksLookup.delete(identifier)

      await this.#session.remove('links', identifier)
    }

    // Add players and groups back to be registered with new links
    for (const object of objects) {
      if (this.isPlayer(object.identifier)) {
        this.#addPlayer(object)
      } else {
        this.#addGroup(object as RawGroup)
      }
    }

    // Reload lists
    if (updateLists) {
      this.#updateLists()
    }
  }

  static async link(sourceLinks: string[], targetLink: string, updateLists = true) {
    // Update all existing links
    const targetLookup = this.#linksLookup.get(targetLink) || [targetLink]

    // Objects that are affected
    const objects: RawEntity[] = []

    //  Target tracker
    let targetTracker = this.#trackedPlayers[targetLink]

    for (const sourceLink of sourceLinks) {
      if (sourceLink === targetLink && this.#links.has(sourceLink)) {
        // Skip for target link as it is already registered
        continue
      }

      for (const identifier of this.getLinkedIdentifiers(sourceLink)) {
        this.#links.set(identifier, targetLink)

        targetLookup.push(identifier)

        // Save link  to database
        await this.#session.set('links', { id: identifier, pid: targetLink })
      }

      if (sourceLink === targetLink) {
        // Skip the rest for target link
        continue
      }

      // Remove from lookup as link shouldnt exist anymore afterwards
      this.#linksLookup.delete(sourceLink)

      // Add objects to array
      const { players, groups } = this.getFile(this.getRelatedLinks([sourceLink]), null)

      objects.push(...players)
      objects.push(...groups)

      // Unload
      for (const timestamp of this.Identifiers.values(sourceLink)) {
        this.#unload(sourceLink, timestamp)
      }

      // Update trackers
      const sourceTracker = this.#trackedPlayers[sourceLink]
      if (sourceTracker) {
        targetTracker = Object.assign(sourceTracker, targetTracker || {})

        delete this.#trackedPlayers[sourceLink]

        await this.#session.remove('trackers', sourceLink)
      }
    }

    // Update target tracker
    if (targetTracker) {
      // Ensure identifier is correct
      targetTracker.identifier = targetLink

      this.#trackedPlayers[targetLink] = targetTracker

      await this.#session.set('trackers', targetTracker)
    }

    // Set lookup to new array
    this.#linksLookup.set(targetLink, unique(targetLookup))

    // Add players and groups back to be registered with new links
    for (const object of objects) {
      if (this.isPlayer(object.identifier)) {
        this.#addPlayer(object)
      } else {
        this.#addGroup(object as RawGroup)
      }
    }

    // Reload lists
    if (updateLists) {
      this.#updateLists()
    }
  }

  static getLinkedIdentifiers(linkId: string) {
    return this.#linksLookup.get(linkId) || [linkId]
  }

  static #addGroup(data: RawGroup) {
    // Create model instance and set link id
    const model = new GroupModel(data)
    model.LinkId = this.getLink(model.Identifier) as string

    for (const player of model.Players) {
      player.LinkId = this.getLink(player.Identifier)
    }

    this.#registerModel('Groups', model.LinkId, model.Timestamp, model)
  }

  // INTERNAL: Add model
  static #registerModel(type: 'Players', identifier: string, timestamp: number, model: PlayerModel): void
  static #registerModel(type: 'Groups', identifier: string, timestamp: number, model: GroupModel): void
  static #registerModel(type: 'Players' | 'Groups', identifier: string, timestamp: number, model: PlayerModel | GroupModel) {
    this.Identifiers.add(identifier, timestamp)
    this.Timestamps.add(timestamp, identifier)

    const collection = this[type] as Record<string, Record<number, PlayerModel | GroupModel>>

    if (!collection[identifier]) {
      collection[identifier] = Object.create(null) as Record<number, PlayerModel | GroupModel>
    }

    collection[identifier][timestamp] = model
  }

  // INTERNAL: Update internal player/group lists
  static #updateLists() {
    const start = Date.now()

    this.Latest = 0
    this.LatestPlayer = 0
    this.LatestGroup = 0
    this.LastChange = Date.now()
    this.GroupNames = Object.create(null) as Record<string, string>
    this.PlayerNames = Object.create(null) as Record<string, string>

    const prefixes = new Set<string>()
    const playerTimestamps = new Set<number>()
    const groupTimestamps = new Set<string>()

    for (const player of Object.values(this.Players)) {
      player.LatestTimestamp = 0
      player.Links = Object.create(null) as PlayerHistory['Links']
      player.Relations = new Set()

      const array: PlayerModel[] = []
      for (const [ts, obj] of Object.entries(player) as [string, PlayerModel][]) {
        if (!isNaN(Number(ts))) {
          const timestamp = Number(ts)
          array.push(obj)

          this.Latest = Math.max(this.Latest, timestamp)
          this.LatestPlayer = Math.max(this.LatestPlayer, timestamp)
          player.LatestTimestamp = Math.max(player.LatestTimestamp, timestamp)

          if (obj.Data.group) {
            this.GroupNames[obj.Group.LinkId as string] = obj.Data.groupname as string

            // Group is related to the player
            player.Relations.add(obj.Group.LinkId as string)
          }

          playerTimestamps.add(timestamp)
          prefixes.add(obj.Data.prefix)

          player.Links[obj.Identifier] = {
            Identifier: obj.Identifier,
            Prefix: obj.Prefix,
            Name: obj.Name
          }
        }
      }

      sortDescending(array, (p) => p.Timestamp)

      player.List = array
      player.Own = array.find((p) => p.Own) != undefined

      if (this.#profile.block_preload) {
        player.Latest = player[player.LatestTimestamp]
      } else {
        player.Latest = this.loadPlayer(player[player.LatestTimestamp])
      }

      this.PlayerNames[player.Latest.LinkId] = player.Latest.Data.name
    }

    for (const group of Object.values(this.Groups)) {
      group.LatestTimestamp = 0
      group.LatestDisplayTimestamp = 0
      group.Links = Object.create(null) as GroupHistory['Links']
      group.Relations = new Set()

      const array: GroupModel[] = []
      for (const [ts, obj] of Object.entries(group) as [string, GroupModel][]) {
        if (!isNaN(Number(ts))) {
          const timestamp = Number(ts)
          array.push(obj)

          this.Latest = Math.max(this.Latest, timestamp)
          this.LatestGroup = Math.max(this.LatestGroup, timestamp)
          group.LatestTimestamp = Math.max(group.LatestTimestamp, timestamp)

          obj.MembersPresent = countWhere(obj.Players, (player) => this.hasPlayer(player.LinkId as string, timestamp))
          if (obj.MembersPresent || Site.options.groups_empty) {
            group.LatestDisplayTimestamp = Math.max(group.LatestDisplayTimestamp, timestamp)
          }

          for (const player of obj.Players) {
            // Player is related to the group
            group.Relations.add(player.LinkId as string)
          }

          groupTimestamps.add(ts)
          prefixes.add(obj.Data.prefix)

          group.Links[obj.Identifier] = {
            Identifier: obj.Identifier,
            Prefix: obj.Prefix,
            Name: obj.Name
          }
        }
      }

      sortDescending(array, (g) => g.Timestamp)

      group.List = array
      group.Own = array.find((g) => g.Own) != undefined
      group.Latest = group[group.LatestTimestamp]

      this.GroupNames[group.Latest.LinkId] = group.Latest.Data.name
    }

    this.PlayerTimestamps = Array.from(playerTimestamps)
    this.GroupTimestamps = Array.from(groupTimestamps)
    this.Prefixes = Array.from(prefixes)

    Logger.log('STDEBUG', `List update took ${Date.now() - start} ms`)
  }

  // INTERNAL: Load player from proxy
  static loadPlayer(lazyPlayer: PlayerModel): PlayerModel
  static loadPlayer(lazyPlayer: PlayerModel | undefined): PlayerModel | undefined
  static loadPlayer(lazyPlayer: PlayerModel | undefined) {
    if (lazyPlayer && lazyPlayer.IsProxy) {
      const {
        LinkId: linkId,
        Timestamp: timestamp,
        Data: data,
        Group: { LinkId: groupLinkId }
      } = lazyPlayer

      // Create player instance and set links and inject guild data
      const player = new PlayerModel(data)
      player.LinkId = linkId
      player.injectGroup(this.getGroup(groupLinkId, timestamp))
      player.Group.LinkId = groupLinkId

      const playerObj = this.Players[linkId]

      playerObj[timestamp] = player

      const listIndex = playerObj.List.findIndex((p) => p.Timestamp == timestamp)
      playerObj.List[listIndex] = player

      if (playerObj.LatestTimestamp == timestamp) {
        playerObj.Latest = player
      }

      return player
    } else {
      return lazyPlayer
    }
  }

  static #loadTemporary() {
    this.#interface = DatabaseUtils.createTemporarySession()

    this.#links.clear()
    this.#hiddenIdentifiers = new Set()

    this.#updateLists()
    Logger.log('PERFLOG', 'Skipped load in temporary mode')

    return Promise.resolve()
  }

  static #initModel(type: 'Player' | 'Group', model: RawEntity) {
    if (this.isHidden(model)) {
      this.#hiddenModels.add(model)

      if (Site.options.hidden) {
        if (type === 'Player') {
          this.#addPlayer(model)
        } else {
          this.#addGroup(model as RawGroup)
        }
      }
    } else if (type === 'Player') {
      this.#addPlayer(model)
    } else {
      this.#addGroup(model as RawGroup)
    }
  }

  static async #loadDatabase() {
    const beginTimestamp = Date.now()

    // Open interface
    this.#interface = await DatabaseUtils.createSession(this.#profile.slot)
    if (!this.#interface) {
      throw new Error('Database was not opened correctly')
    }

    // Load all existing links
    const links = await this.#session.where<{ id: string; pid: string }>('links')

    this.#links.clear()
    for (const { id: identifier, pid: linkId } of links) {
      this.#links.set(identifier, linkId)

      const lookup = this.#linksLookup.get(linkId) || []
      lookup.push(identifier)

      this.#linksLookup.set(linkId, lookup)
    }

    // Load metadata
    this.#metadata = toRecord(await this.#session.where<DatabaseMetadata>('metadata'), (md) => [md.timestamp, md])

    // Load groups
    if (!this.#profile.only_players) {
      const groups = DatabaseUtils.filterArray(this.#profile, 'primary_g') || (await this.#session.where<RawGroup>('groups', ...DatabaseUtils.profileFilter(this.#profile, 'primary_g')))
      const groupsFilter = this.#profile.secondary_g && Expression.create(this.#profile.secondary_g)

      if (groupsFilter) {
        for (const group of groups) {
          ExpressionCache.reset()
          if (groupsFilter.eval(new ExpressionScope().addSelf(group))) {
            this.#initModel('Group', group)
          }
        }
      } else {
        for (const group of groups) {
          this.#initModel('Group', group)
        }
      }
    }

    // Load players
    const players = DatabaseUtils.filterArray(this.#profile) || (await this.#session.where<RawPlayer>('players', ...DatabaseUtils.profileFilter(this.#profile)))
    const playersFilter = this.#profile.secondary && Expression.create(this.#profile.secondary)

    if (playersFilter) {
      for (const player of players) {
        ExpressionCache.reset()
        if (playersFilter.eval(new ExpressionScope().addSelf(player))) {
          this.#initModel('Player', player)
        }
      }
    } else {
      for (const player of players) {
        this.#initModel('Player', player)
      }
    }

    // Load trackers
    if (!this.#profile.only_players) {
      const trackers = await this.#session.where<PlayerTracker>('trackers')

      for (const tracker of trackers) {
        this.#trackedPlayers[tracker.identifier] = tracker
      }
    }

    // Generate lists
    this.#updateLists()
    await this.refreshTrackers()

    this.#hiddenIdentifiers = new Set(Store.get<string[]>('hidden_identifiers', []))

    // Restore session-only objects
    const sessionObjects = Object.values(this.#sessionObjects)
    if (sessionObjects.length > 0) {
      for (const object of Object.values(sessionObjects)) {
        if (this.isPlayer(object.identifier)) {
          this.#initModel('Player', object)
        } else {
          this.#initModel('Group', object)
        }
      }

      this.#updateLists()
    }

    Logger.log('PERFLOG', `Load done in ${Date.now() - beginTimestamp} ms`)
  }

  static async reloadHidden() {
    if (this.#hiddenVisible != Site.options.hidden) {
      this.#hiddenVisible = Site.options.hidden

      const beginTimestamp = Date.now()

      if (this.#hiddenVisible) {
        // Load all hidden models
        for (const model of this.#hiddenModels) {
          if (this.isPlayer(model.identifier)) {
            this.#addPlayer(model)
          } else {
            this.#addGroup(model as RawGroup)
          }
        }
      } else {
        // Unload all hidden models
        for (const { identifier, timestamp } of this.#hiddenModels) {
          this.#unload(identifier, timestamp)
        }
      }

      this.#updateLists()
      await this.refreshTrackers()

      Logger.log('PERFLOG', `${this.#hiddenVisible ? 'Load' : 'Unload'} done in ${Date.now() - beginTimestamp} ms`)
    }
  }

  // Load database
  static async load(profile: DatabaseProfile = DEFAULT_PROFILE) {
    await this.reset()

    Actions.init()

    this.#profile = profile

    if (this.#profile.temporary) {
      return this.#loadTemporary()
    } else {
      return this.#loadDatabase()
    }
  }

  static isHidden(entry: RawEntity) {
    return entry.hidden || this.#metadata[entry.timestamp]?.hidden
  }

  static async #markHidden(timestamp: number, hidden: boolean) {
    const metadata = Object.assign(this.#metadata[timestamp], { timestamp: parseInt(String(timestamp)), hidden })

    this.#metadata[timestamp] = metadata
    await this.#session.set('metadata', metadata)
  }

  static #addMetadata(identifier: string, dirtyTimestamp: number) {
    const timestamp = parseInt(String(dirtyTimestamp))

    if (!this.#metadata[timestamp]) {
      this.#metadata[timestamp] = { timestamp, identifiers: [] }
    }

    pushUnique(this.#metadata[timestamp].identifiers, identifier)
    this.#metadataDelta.push(timestamp)
  }

  static #removeMetadata(identifier: string, dirtyTimestamp: number | string) {
    const timestamp = parseInt(String(dirtyTimestamp))

    if (this.#metadata[timestamp]) {
      removeItem(this.#metadata[timestamp].identifiers, identifier)
      this.#metadataDelta.push(timestamp)
    }
  }

  static async #updateMetadata() {
    await this.#session.transaction(['metadata'], (tx) => {
      for (const timestamp of unique(this.#metadataDelta)) {
        if (isEmpty(this.#metadata[timestamp].identifiers)) {
          delete this.#metadata[timestamp]

          tx.remove('metadata', timestamp)
        } else {
          tx.set('metadata', this.#metadata[timestamp])
        }
      }
    })

    this.#metadataDelta = []
  }

  // Check if player exists
  static hasPlayer(id: string, timestamp?: number | string) {
    return this.Players[id] && (timestamp ? this.Players[id][timestamp as number] : true) ? true : false
  }

  // Check if group exists
  static hasGroup(id: string, timestamp?: number | string) {
    return this.Groups[id] && (timestamp ? this.Groups[id][timestamp as number] : true) ? true : false
  }

  // Get player
  static getPlayer(identifier: string): PlayerHistory | undefined
  static getPlayer(identifier: string, timestamp: number | string | undefined): PlayerModel | undefined
  static getPlayer(identifier: string, timestamp?: number | string) {
    const player = this.Players[identifier] as PlayerHistory | undefined
    if (player && timestamp) {
      return this.loadPlayer(player[timestamp as number])
    } else {
      return player
    }
  }

  static getLatestPlayers(onlyOwn = false) {
    const array = Object.values(this.Players).map((player) => player.Latest)
    if (onlyOwn) {
      return array.filter((player) => player.Own)
    } else {
      return array
    }
  }

  // Get group
  static getGroup(identifier: string | undefined): GroupHistory | undefined
  static getGroup(identifier: string | undefined, timestamp: number | string | undefined): GroupModel | undefined
  static getGroup(identifier: string | undefined, timestamp?: number | string) {
    const group = this.Groups[identifier as string] as GroupHistory | undefined
    if (group && timestamp) {
      return group[timestamp as number]
    } else {
      return group
    }
  }

  static getAny(identifier: string): PlayerHistory | GroupHistory | undefined
  static getAny(identifier: string, timestamp: number | string | undefined): PlayerModel | GroupModel | undefined
  static getAny(identifier: string, timestamp?: number | string): PlayerHistory | GroupHistory | PlayerModel | GroupModel | undefined {
    if (this.isPlayer(identifier)) {
      return this.getPlayer(identifier, timestamp)
    } else {
      return this.getGroup(identifier, timestamp)
    }
  }

  static async remove(instances: RawEntity[]) {
    void this.#session.transaction(['players', 'groups'], (tx) => {
      for (const { identifier, timestamp } of instances) {
        tx.remove(this.isPlayer(identifier) ? 'players' : 'groups', [identifier, parseInt(String(timestamp))])

        this.#removeMetadata(identifier, timestamp)
        this.#unload(this.getLink(identifier) as string, timestamp)
      }
    })

    await this.#updateMetadata()
    this.#updateLists()
  }

  static async removeEntries(data: RemovalData) {
    const { identifiers, timestamps, instances } = Object.assign({ identifiers: [], timestamps: [], instances: [] }, data)

    if (identifiers.length > 0) {
      await this.#removeIdentifiers(...identifiers)
    }

    if (timestamps.length > 0) {
      await this.#removeTimestamps(...timestamps)
    }

    if (instances.length > 0) {
      await this.remove(instances)
    }
  }

  static #unload(identifier: string, timestamp: number | string) {
    this.#removeFromPool(identifier, timestamp as number)

    if (this.isPlayer(identifier)) {
      delete this.Players[identifier][timestamp as number]
      if (this.Identifiers.empty(identifier)) {
        delete this.Players[identifier]
      }
    } else {
      delete this.Groups[identifier][timestamp as number]
      if (this.Identifiers.empty(identifier)) {
        delete this.Groups[identifier]
      }
    }
  }

  // Remove one or more timestamps
  static async #removeTimestamps(...timestamps: number[]) {
    await this.#session.transaction(['players', 'groups'], (tx) => {
      for (const timestamp of timestamps) {
        for (const linkId of this.Timestamps.values(timestamp)) {
          for (const identifier of this.getLinkedIdentifiers(linkId)) {
            // Try removal for all linked identifiers
            tx.remove(this.isPlayer(identifier) ? 'players' : 'groups', [identifier, parseInt(String(timestamp))])

            this.#removeMetadata(identifier, timestamp)
          }

          this.#unload(linkId, timestamp)
        }
      }
    })

    await this.#updateMetadata()
    this.#updateLists()
  }

  static async purge() {
    await this.#session.transaction(['players', 'groups'], (tx) => {
      for (const [timestamp, identifiers] of this.Timestamps.entries()) {
        for (const linkId of identifiers) {
          for (const identifier of this.getLinkedIdentifiers(linkId)) {
            tx.remove(this.isPlayer(identifier) ? 'players' : 'groups', [identifier, parseInt(String(timestamp))])

            this.#removeMetadata(identifier, timestamp)
          }
        }
      }
    })

    await this.#updateMetadata()

    this.Players = Object.create(null) as Record<string, PlayerHistory>
    this.Groups = Object.create(null) as Record<string, GroupHistory>
    this.Timestamps = new ModelRegistry()
    this.Identifiers = new ModelRegistry()

    this.#updateLists()
  }

  static #removeFromPool(identifier: string, timestamp: number) {
    this.Timestamps.remove(timestamp, identifier)
    this.Identifiers.remove(identifier, timestamp)
  }

  static async migrateHiddenFiles() {
    for (const [timestamp, identifiers] of this.Timestamps.entries()) {
      const players = Array.from(identifiers).filter((identifier) => this.isPlayer(identifier))
      if (players.every((id) => dig(this.Players, id, String(timestamp), 'Data', 'hidden'))) {
        for (const id of players) {
          const player = this.Players[id][timestamp].Data
          delete player.hidden

          await this.#session.set('players', player)
        }

        for (const groupIdentifier of Array.from(identifiers).filter((identifier) => !this.isPlayer(identifier))) {
          this.#hiddenModels.add(dig(this.Groups, groupIdentifier, String(timestamp), 'Data') as RawEntity)
        }

        await this.#markHidden(timestamp, true)
      }
    }

    this.#updateLists()
  }

  static async #removeIdentifiers(...identifiers: string[]) {
    await this.#session.transaction(['players', 'groups'], (tx) => {
      for (const linkId of identifiers) {
        for (const timestamp of this.Identifiers.values(linkId)) {
          for (const identifier of this.getLinkedIdentifiers(linkId)) {
            tx.remove(this.isPlayer(identifier) ? 'players' : 'groups', [identifier, parseInt(String(timestamp))])

            this.#removeMetadata(identifier, timestamp)
          }

          this.#unload(linkId, timestamp)
        }
      }
    })

    await this.#updateMetadata()
    this.#updateLists()
  }

  static isIdentifierHidden(identifier: string) {
    return this.#hiddenIdentifiers.has(identifier)
  }

  static hideIdentifier(identifier: string) {
    if (!this.#hiddenIdentifiers.delete(identifier)) {
      this.#hiddenIdentifiers.add(identifier)
    }

    Store.set('hidden_identifiers', Array.from(this.#hiddenIdentifiers))
  }

  static async setTags(instances: RawEntity[], tags: string[] | undefined) {
    await this.#session.transaction(['players', 'groups'], (tx) => {
      for (const instance of instances) {
        if (tags) {
          instance.tag = tags
        } else {
          delete instance.tag
        }

        tx.set(this.isPlayer(instance.identifier) ? 'players' : 'groups', instance)
      }
    })

    this.LastChange = Date.now()
  }

  static async updateTimestamp(from: number, to: number) {
    if (from && to) {
      const file = this.getFile(null, [from])

      for (const i of file.players) {
        i.timestamp = to
      }

      for (const i of file.groups) {
        i.timestamp = to
      }

      await this.#addFile(file.players, file.groups, { skipActions: true })
      await this.#removeTimestamps(from)
    }
  }

  static async merge(timestamps: number[]) {
    if (timestamps.length > 1) {
      timestamps.sort((b, a) => a - b)

      let players: RawPlayer[] = []
      let groups: RawGroup[] = []

      const newestTimestamp = timestamps.shift() as number

      for (const timestamp of timestamps) {
        const file = this.getFile(null, [timestamp])

        for (const player of file.players) {
          player.timestamp = newestTimestamp
        }

        for (const group of file.groups) {
          group.timestamp = newestTimestamp
        }

        players = players.concat(file.players)
        groups = groups.concat(file.groups)
      }

      await this.#addFile(players, groups, { skipExisting: true, skipActions: true })
      await this.#removeTimestamps(...timestamps)
    }
  }

  static async hide(entries: RawEntity[]) {
    for (const entry of entries) {
      entry.hidden = !entry.hidden

      if (entry.hidden) {
        this.#hiddenModels.add(entry)
      } else {
        this.#hiddenModels.delete(entry)
      }

      if (entry.hidden && !Site.options.hidden) {
        this.#unload(this.getLink(entry.identifier) as string, entry.timestamp)
      }

      await this.#session.set(this.isPlayer(entry.identifier) ? 'players' : 'groups', entry)
    }

    this.#updateLists()
  }

  static async hideTimestamps(...timestamps: number[]) {
    if (!isEmpty(timestamps)) {
      const shouldHide = !timestamps.every((timestamp) => dig(this.#metadata, String(timestamp), 'hidden'))

      for (const timestamp of timestamps) {
        for (const identifier of this.Timestamps.values(timestamp)) {
          const model = dig(this, this.isPlayer(identifier) ? 'Players' : 'Groups', this.getLink(identifier) as string, String(timestamp), 'Data') as RawEntity

          if (shouldHide) {
            this.#hiddenModels.add(model)
          } else {
            this.#hiddenModels.delete(model)
          }
        }
      }

      for (const timestamp of timestamps) {
        await this.#markHidden(timestamp, shouldHide)
      }

      if (!Site.options.hidden) {
        for (const timestamp of timestamps) {
          for (const identifier of this.Timestamps.values(timestamp)) {
            this.#unload(identifier, timestamp)
          }
        }
      }

      this.#updateLists()
    }
  }

  static async importCollection<TItem>(array: TItem[], processCallback: (item: TItem) => Promise<{ text: string; timestamp: number }>, errorCallback: (error: unknown) => void, flags: ImportFlags = {}) {
    let players: RawPlayer[] = []
    const groups: RawGroup[] = []

    const offset = getTimestampOffset()

    for (const item of array) {
      try {
        const { text, timestamp } = await processCallback(item)

        const { players: filePlayers } = await this.import(text, timestamp, offset, Object.assign({ deferred: true }, flags))

        players = players.concat(filePlayers)
      } catch (e) {
        errorCallback(e)
      }
    }

    this.#updateLists()

    if (!flags.temporary) {
      for (const player of players) {
        await this.#track(this.getLink(player.identifier) as string, player.timestamp)
      }
    }

    return {
      players,
      groups
    }
  }

  // HAR - string
  // Endpoint - string
  // Share - object
  // Archive - string
  static import(text: unknown, timestamp?: number, timestampOffset?: number, flags?: ImportFlags) {
    this.#validateImport(text)

    const data: unknown = typeof text === 'string' ? JSON.parse(text) : text

    return this.#import(data, timestamp, timestampOffset, flags)
  }

  static #validateImport(text: unknown) {
    if (typeof text === 'string' && text.length === 0) {
      throw new Error('File is empty')
    }
  }

  static export(identifiers?: string[] | null, timestamps?: number[] | null, constraint?: ((data: RawEntity) => boolean) | null) {
    return this.getFile(identifiers, timestamps, constraint)
  }

  static relatedGroupData(players: RawPlayer[], groups: RawGroup[], bundleGroups = true) {
    const entries: Record<string, RawGroup> = {}
    for (const group of groups) {
      entries[getEntryKey(group)] = group
    }

    if (bundleGroups) {
      for (const player of players) {
        const group = dig(this.Groups, this.getLink(player.group) as string, String(player.timestamp), 'Data') as RawGroup | undefined
        if (group) {
          entries[getEntryKey(group)] = group
        }
      }
    }

    return Object.values(entries)
  }

  static getFile(identifiers?: Iterable<string> | null, timestamps?: Iterable<number> | null, constraint: ((data: RawEntity) => boolean) | null = null): RawFile {
    const players: RawPlayer[] = []
    const groups: RawGroup[] = []

    const identifierSet = new Set(identifiers || Array.from(this.Identifiers.keys()))

    for (const timestamp of timestamps || Array.from(this.Timestamps.keys())) {
      for (const identifier of this.Timestamps.values(timestamp)) {
        if (identifierSet.has(identifier)) {
          const isPlayer = this.isPlayer(identifier)
          const data = (isPlayer ? this.Players : this.Groups)[identifier]?.[timestamp]?.Data

          if (!constraint || constraint(data)) {
            if (isPlayer) {
              players.push(data)
            } else {
              groups.push(data as RawGroup)
            }
          }
        }
      }
    }

    return {
      players,
      groups
    }
  }

  static isPlayer(identifier: string | undefined) {
    return /_p\d/.test(identifier as string)
  }

  static isGroup(identifier: string | undefined) {
    return /_g\d/.test(identifier as string)
  }

  static #normalizeGroup(group: RawGroup) {
    if (group.id) {
      group.identifier = group.id
      delete group.id
    }

    group.prefix = group.prefix.toLowerCase()
    group.identifier = group.identifier.toLowerCase()
    group.group = group.identifier.toLowerCase()
    group.timestamp = parseInt(String(group.timestamp))
    group.own = group.own ? 1 : 0
    group.names = group.names || group.members
  }

  static #normalizePlayer(player: RawPlayer) {
    if (player.id) {
      player.identifier = player.id
      delete player.id
    }

    player.prefix = player.prefix.toLowerCase()
    player.identifier = player.identifier.toLowerCase()
    player.timestamp = parseInt(String(player.timestamp))
    player.own = player.own ? 1 : 0

    const group = player.save[player.own ? 435 : 161]
    if (group) {
      player.group = `${player.prefix}_g${group}`
    }
  }

  static async #addFile(playerEntries: RawPlayer[] | undefined, groupEntries: RawGroup[] | undefined, flags: ImportFlags = {}) {
    const unfilteredPlayers = playerEntries || []
    const unfilteredGroups = groupEntries || []

    for (const group of unfilteredGroups) {
      this.#normalizeGroup(group)
    }

    for (const player of unfilteredPlayers) {
      this.#normalizePlayer(player)
    }

    if (flags.skipExisting) {
      filterInPlace(unfilteredGroups, (group) => !this.hasGroup(group.identifier, group.timestamp))
      filterInPlace(unfilteredPlayers, (player) => !this.hasPlayer(player.identifier, player.timestamp))
    }

    const { players, groups } = flags.skipActions ? { players: unfilteredPlayers, groups: unfilteredGroups } : Actions.apply(unfilteredPlayers, unfilteredGroups)

    if (flags.temporary) {
      for (const group of unfilteredGroups) {
        this.#addGroup(group)
        this.#addToSession(group)
      }

      for (const player of unfilteredPlayers) {
        this.#addPlayer(player)
        this.#addToSession(player)
      }

      if (!flags.deferred) {
        this.#updateLists()
      }

      return {
        players: unfilteredPlayers,
        groups: unfilteredGroups
      }
    } else {
      for (const group of groups) {
        this.#addGroup(group)
        this.#addMetadata(group.identifier, group.timestamp)
      }

      for (const player of players) {
        this.#addPlayer(player)
        this.#addMetadata(player.identifier, player.timestamp)
      }

      await this.#session.transaction(['groups', 'players'], (tx) => {
        for (const group of groups) tx.set('groups', group)
        for (const player of players) tx.set('players', player)
      })

      await this.#updateMetadata()

      if (!flags.deferred) {
        this.#updateLists()

        for (const player of players) {
          await this.#track(this.getLink(player.identifier) as string, player.timestamp)
        }
      }

      return {
        players,
        groups
      }
    }
  }

  static getTracker(identifier: string, tracker: string) {
    return dig(this.#trackedPlayers, identifier, tracker, 'out')
  }

  static async refreshTrackers() {
    this.#trackerConfig = Actions.getTrackers()
    this.#trackerConfigEntries = Object.entries(this.#trackerConfig)
    this.#trackerData = Store.get<Record<string, string>>('tracker_data', {})

    const addTrackers = compact(this.#trackerConfigEntries.map(([name, { hash }]) => (this.#trackerData[name] != hash ? name : undefined)))
    const remTrackers = Object.keys(this.#trackerData).filter((name) => !this.#trackerConfig[name])

    this.#trackerData = toRecord(this.#trackerConfigEntries, ([name, { hash }]) => [name, hash])
    Store.set('tracker_data', this.#trackerData)

    if (!isEmpty(remTrackers)) {
      for (const name of remTrackers) {
        Logger.log('TRACKER', `Removed tracker ${name}`)
      }

      for (const identifier of Object.keys(this.#trackedPlayers)) {
        await this.#untrack(identifier, remTrackers)
      }
    }

    if (!isEmpty(addTrackers)) {
      for (const [name, { hash }] of this.#trackerConfigEntries) {
        if (this.#trackerData[name]) {
          if (hash != this.#trackerData[name]) {
            Logger.log('TRACKER', `Tracker ${name} changed! ${this.#trackerData[name]} -> ${hash}`)
          }
        } else {
          Logger.log('TRACKER', `Tracker ${name} with hash ${hash} added!`)
        }
      }

      for (const identifier of Object.keys(this.Players)) {
        await this.#untrack(identifier, addTrackers)

        const list = (this.getPlayer(identifier) as PlayerHistory).List
        for (let i = list.length - 1; i >= 0; i--) {
          if (await this.#track(identifier, list[i]?.Timestamp)) {
            break
          }
        }
      }
    }
  }

  static async #track(identifier: string, timestamp: number) {
    const player = this.getPlayer(identifier, timestamp)
    const playerTracker: PlayerTracker = this.#trackedPlayers[identifier] || {
      identifier: identifier
    }

    let trackerChanged = false
    for (const [name, { ast, out }] of this.#trackerConfigEntries) {
      const currentTracker = playerTracker[name] as TrackerEntry | undefined
      if (ast.eval(new ExpressionScope().with(player)) && (!currentTracker || currentTracker.ts > timestamp)) {
        playerTracker[name] = {
          ts: timestamp,
          out: out ? out.eval(new ExpressionScope().with(player)) : timestamp
        }
        trackerChanged = true
      }
    }

    if (trackerChanged) {
      this.#trackedPlayers[identifier] = playerTracker
      await this.#session.set('trackers', playerTracker)

      Logger.log('TRACKER', `Tracking updated for ${identifier}`)
    }

    return trackerChanged
  }

  static async #untrack(identifier: string, removedTrackers: string[]) {
    const currentTracker = this.#trackedPlayers[identifier]
    if (currentTracker) {
      let trackerChanged = false
      for (const name of Object.keys(currentTracker)) {
        if (removedTrackers.includes(name)) {
          delete currentTracker[name]
          trackerChanged = true
        }
      }

      if (trackerChanged) {
        this.#trackedPlayers[identifier] = currentTracker
        await this.#session.set('trackers', currentTracker)
      }
    }
  }

  static findDataFieldFor(timestamp: number, field: keyof RawPlayer) {
    for (const identifier of this.Timestamps.values(timestamp)) {
      const value = dig(this.Players, identifier, String(timestamp), 'Data', field)
      if (value) {
        return value
      }
    }

    return undefined
  }

  static getTagsForTimestamp(timestamps?: Iterable<number>) {
    const tags: Record<string, number> = {}

    const requestedTimestamps = timestamps ?? this.Timestamps.keys()
    for (const timestamp of requestedTimestamps) {
      for (const identifier of this.Timestamps.values(timestamp)) {
        const entityTags = toArray(dig(this.isPlayer(identifier) ? this.Players : this.Groups, identifier, String(timestamp), 'Data', 'tag') as string | string[] | undefined)

        for (const tag of entityTags) {
          if (tags[tag]) {
            tags[tag] += 1
          } else {
            tags[tag] = 1
          }
        }
      }
    }

    return tags
  }

  static async #import(json: unknown, timestamp?: number, timestampOffset = -3600000, flags: ImportFlags = {}) {
    if (Array.isArray(json)) {
      // Archive, Share
      if (dig(json, '0', 'players') || dig(json, '0', 'groups')) {
        let players: RawPlayer[] = []
        let groups: RawGroup[] = []

        for (const file of json as RawFile[]) {
          const { players: filePlayers, groups: fileGroups } = await this.#addFile(file.players, file.groups, flags)

          players = players.concat(filePlayers)
          groups = groups.concat(fileGroups)
        }

        return {
          players,
          groups
        }
      } else {
        const players: RawPlayer[] = []
        const groups: RawGroup[] = []

        for (const entry of json as RawEntity[]) {
          if (this.isPlayer(entry.identifier)) {
            players.push(entry)
          } else {
            groups.push(entry as RawGroup)
          }
        }

        return await this.#addFile(players, groups, flags)
      }
    } else if (typeof json == 'object' && dig(json, 'players')) {
      const file = json as RawFile

      return this.#addFile(file.players, file.groups, flags)
    } else {
      // HAR, Endpoint
      const { players, groups } = PlayaResponse.importData(json, timestamp, timestampOffset)
      return this.#addFile(players, groups, flags)
    }
  }
}

void DatabaseManager.reset()
