import { randomHash } from '@utils/hash'
import { removeItem, sortDescending } from '@utils/utils'
import { DatabaseManager } from '~/data/database-manager'
import { Store } from '~/site/store'
import { ScriptArchive } from './archive'
import { DefaultScripts } from './default-scripts'

export type ScriptRemoteInfo = {
  created_at: number
  updated_at: number
  key: string
  secret: string
  version: number
  visibility?: string
  verified?: boolean
}

export type StoredScript = {
  key: string
  name: string
  description: string
  content: string
  version: number
  created_at: number
  updated_at: number
  remote: ScriptRemoteInfo | null
  favorite: boolean
  tables: string[] | null
}

export type RemoteScriptVersion = {
  version: number
  updated_at: number
}

// What the script API returns for a script
export type ApiScript = {
  key: string
  secret: string
  version: number
  created_at: string
  updated_at: string
  visibility: string
  verified: boolean
}

type ScriptsData = {
  list: StoredScript[]
  assignments: Record<string, string>
  remote: Record<string, RemoteScriptVersion>
}

type LegacySetting = {
  content: string
  timestamp: number
  version: number
}

type LegacyTemplate = LegacySetting & {
  name: string
  favorite: boolean
  online?: {
    key: string
    secret: string
    timestamp: number
    version: number
  }
}

export class Scripts {
  static LastChange = Date.now()

  static #DEFAULT_DATA: ScriptsData = {
    list: [],
    assignments: {},
    remote: {}
  }

  static RESERVED_SCRIPT_IDENTIFIERS = ['players', 'groups', 'player', 'group']

  static #data: ScriptsData | undefined

  static get data(): ScriptsData {
    if (this.#data === undefined) {
      if (!Store.shared.has('scripts')) {
        this.#migrateLegacyScripts()
      }

      let data: ScriptsData
      if (Store.isTemporary()) {
        data = Store.shared.get('scripts', this.#DEFAULT_DATA)

        // Clear assignments for temporary mode
        data.assignments = this.#DEFAULT_DATA.assignments
      } else {
        data = Store.get('scripts', this.#DEFAULT_DATA)
      }

      if (typeof data.remote === 'undefined') {
        data.remote = Object.create(null) as Record<string, RemoteScriptVersion>
      }

      this.#data = data
    }

    return this.#data
  }

  static #migrateLegacyScripts() {
    const scripts: StoredScript[] = []
    const scriptsAssignments: Record<string, string> = {}

    const legacyScripts = Store.shared.get<Record<string, LegacySetting>>('settings', {})
    for (const [identifier, { content, timestamp, version }] of Object.entries(legacyScripts)) {
      const key = randomHash()

      scripts.push({
        key,
        name: `${DatabaseManager.PlayerNames[identifier] || DatabaseManager.GroupNames[identifier] || identifier} (migrated)`,
        description: '',
        content,
        version: isNaN(version) ? 1 : version,
        created_at: timestamp,
        updated_at: timestamp,
        remote: null,
        favorite: false,
        tables: null
      })

      scriptsAssignments[identifier] = key
    }

    const legacyTemplates = Store.shared.get<Record<string, LegacyTemplate>>('templates', {})
    for (const { name, content, version, timestamp, favorite, online } of Object.values(legacyTemplates)) {
      const remote = online
        ? {
            key: online.key,
            secret: online.secret,
            created_at: online.timestamp,
            updated_at: online.timestamp,
            version: isNaN(online.version) ? 1 : online.version
          }
        : null

      scripts.push({
        key: randomHash(),
        name: `${name} (migrated)`,
        content,
        description: '',
        version: isNaN(version) ? 1 : version,
        created_at: timestamp,
        updated_at: timestamp,
        remote,
        favorite,
        tables: null
      })
    }

    Store.shared.set('scripts', {
      list: scripts,
      assignments: scriptsAssignments
    })
  }

  static create({ name, content, description }: Pick<StoredScript, 'name' | 'content' | 'description'>) {
    const script: StoredScript = {
      key: randomHash(),
      name,
      content,
      description,
      version: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      remote: null,
      favorite: false,
      tables: ['players', 'group', 'player']
    }

    this.data.list.push(script)

    this.#persist()

    ScriptArchive.add('create', script.key, 1, content)

    return script
  }

  static remove(key: string) {
    removeItem<StoredScript | undefined>(this.data.list, this.findScript(key))

    this.#persist()
  }

  static markRemote(key: string, remote: ApiScript | null = null) {
    return this.update(
      key,
      {
        remote: remote
          ? {
              created_at: Date.parse(remote.created_at),
              updated_at: Date.parse(remote.updated_at),
              version: remote.version,
              key: remote.key,
              secret: remote.secret,
              visibility: remote.visibility,
              verified: remote.verified
            }
          : null
      },
      false
    )
  }

  // Throws when the key is unknown, like the legacy code did
  static update(key: string, changes: Partial<StoredScript>, touch = true) {
    const script = this.findScript(key) as StoredScript

    if (touch) {
      ScriptArchive.add('overwrite', script.key, script.version, script.content)
    }

    Object.assign(script, changes)

    if (touch) {
      script.version += 1
      script.updated_at = Date.now()
    }

    this.#persist()

    if (touch) {
      ScriptArchive.add('save', script.key, script.version, script.content)
    }

    return script
  }

  static list() {
    return this.data.list
  }

  static remoteList() {
    return Object.keys(this.data.remote)
  }

  static remoteAdd(key: string, script: RemoteScriptVersion) {
    this.data.remote[key] = script

    this.#persist()
  }

  static remoteRemove(key: string) {
    delete this.data.remote[key]

    this.#persist()
  }

  static remoteGet(key: string) {
    return this.data.remote[key] as RemoteScriptVersion | undefined
  }

  static sortedList(table: string | null = null) {
    let list = this.list()
    if (table) {
      list = list.filter((script) => (script.tables ? script.tables.includes(table) : true))
    }

    return sortDescending(
      sortDescending(list, ({ updated_at }) => updated_at),
      ({ favorite }) => (favorite ? 1 : -1)
    )
  }

  static getAssignedContent(targetIdentifier: string, fallbackIdentifier?: string) {
    return this.findAssignedScript(targetIdentifier)?.content ?? (fallbackIdentifier ? (this.findAssignedScript(fallbackIdentifier)?.content ?? DefaultScripts.getContent(fallbackIdentifier)) : DefaultScripts.getContent(targetIdentifier))
  }

  static getContent(key: string) {
    return (this.findScript(key) as StoredScript).content
  }

  static isAssigned(identifier: string) {
    return identifier in this.data.assignments
  }

  static isAssignedTo(identifier: string, key: string) {
    return this.data.assignments[identifier] === key
  }

  static assign(targetIdentifier: string, key: string) {
    this.data.assignments[targetIdentifier] = key
    this.#persist()
  }

  static unassign(targetIdentifier: string) {
    delete this.data.assignments[targetIdentifier]
    this.#persist()
  }

  static getAssigns(key: string | true) {
    if (key === true) {
      return Object.keys(this.data.assignments)
    } else {
      return Object.entries(this.data.assignments)
        .filter(([, v]) => v === key)
        .map(([k]) => k)
    }
  }

  static findAssignedScript(identifier: string) {
    const assignedKey = this.data.assignments[identifier]

    return assignedKey ? this.data.list.find(({ key }) => key === assignedKey) : null
  }

  static findScript(key: string) {
    return this.data.list.find(({ key: _key }) => key === _key)
  }

  static #persist() {
    Store.set('scripts', this.data)

    this.LastChange = Date.now()
  }
}
