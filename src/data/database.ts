import { globalLocalize } from '@utils/localization'
import { useToast } from '@utils/toasts'
import { toRecord } from '@utils/utils'
import { Logger } from '~/core/logger'
import { type DatabaseProfile } from '~/core/profiles'
import { Site } from '~/core/site'
import { Expression } from '~/script/expression'
import { type RawEntity } from './types'

type StoreDefinition = {
  key: string | string[]
  indexes?: Record<string, string>
}

type SchemaUpdater = {
  shouldApply: (version: number) => boolean
  apply: (transaction: IDBTransaction, database: IDBDatabase) => void
}

type DataUpdater = {
  shouldApply: (version: number) => boolean
  apply: (database: IndexedDBWrapper) => Promise<void>
}

export type DatabaseMetadata = {
  timestamp: number
  identifiers: string[]
  hidden?: boolean
}

export type DatabaseTransaction = {
  set: (storeName: string, value: unknown) => void
  remove: (storeName: string, key: IDBValidKey) => void
}

const DATABASE_VERSION = 9

const DATABASE_STORES: Record<string, StoreDefinition> = {
  players: {
    key: ['identifier', 'timestamp'],
    indexes: {
      own: 'own',
      identifier: 'identifier',
      timestamp: 'timestamp',
      group: 'group',
      prefix: 'prefix',
      tag: 'tag'
    }
  },
  groups: {
    key: ['identifier', 'timestamp'],
    indexes: {
      own: 'own',
      identifier: 'identifier',
      timestamp: 'timestamp',
      prefix: 'prefix'
    }
  },
  trackers: {
    key: 'identifier'
  },
  metadata: {
    key: 'timestamp'
  },
  links: {
    key: 'id'
  }
}

const DATABASE_UPDATERS: SchemaUpdater[] = [
  {
    shouldApply: (version) => version < 2,
    apply: (transaction) => {
      transaction.objectStore('players').createIndex('profile', 'profile')
      transaction.objectStore('groups').createIndex('profile', 'profile')
    }
  },
  {
    shouldApply: (version) => version < 3,
    apply: (transaction) => {
      transaction.objectStore('players').createIndex('origin', 'origin')
      transaction.objectStore('groups').createIndex('origin', 'origin')
    }
  },
  {
    shouldApply: (version) => version < 4,
    apply: (transaction) => {
      transaction.objectStore('players').createIndex('tag', 'tag')
    }
  },
  {
    shouldApply: (version) => version < 5,
    apply: (_transaction, database) => {
      database.createObjectStore('metadata', { keyPath: 'timestamp' })
    }
  },
  {
    shouldApply: (version) => version < 7,
    apply: (transaction) => {
      transaction.objectStore('players').deleteIndex('origin')
      transaction.objectStore('groups').deleteIndex('origin')

      transaction.objectStore('players').deleteIndex('profile')
      transaction.objectStore('groups').deleteIndex('profile')
    }
  },
  {
    shouldApply: (version) => version < 8,
    apply: (_transaction, database) => {
      database.createObjectStore('links', { keyPath: 'id' })
    }
  },
  {
    shouldApply: (version) => version < 9,
    apply: (transaction) => {
      transaction.objectStore('players').deleteIndex('tag')
      transaction.objectStore('players').createIndex('tag', 'tag', { multiEntry: true })
    }
  }
]

const DATABASE_DATA_UPDATERS: DataUpdater[] = [
  {
    shouldApply: (version) => version < 6,
    apply: async (database) => {
      const players = await database.where<RawEntity>('players')
      const groups = await database.where<RawEntity>('groups')
      const entries = ([] as RawEntity[]).concat(players, groups)

      const metadata = toRecord(await database.where<DatabaseMetadata>('metadata'), (entry) => [entry.timestamp, Object.assign(entry, { identifiers: [] as string[] })])

      for (const { timestamp: dirtyTimestamp, identifier } of entries) {
        const timestamp = parseInt(String(dirtyTimestamp))
        if (!metadata[timestamp]) {
          metadata[timestamp] = { timestamp, identifiers: [] }
        }

        metadata[timestamp].identifiers.push(identifier)
      }

      for (const data of Object.values(metadata)) {
        await database.set('metadata', data)
      }
    }
  }
]

function promisify<TResult>(request: IDBRequest<TResult>) {
  return new Promise<TResult>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

function showUpdateToast() {
  useToast({ title: globalLocalize('database.update_info.title'), message: globalLocalize('database.update_info.message') })
}

export class IndexedDBWrapper {
  name: string
  version: number
  oldVersion: number
  stores: Record<string, StoreDefinition>
  updaters: SchemaUpdater[]
  dataUpdaters: DataUpdater[]
  database: IDBDatabase | null

  constructor(name: string, version: number, stores: Record<string, StoreDefinition>, updaters: SchemaUpdater[], dataUpdaters: DataUpdater[]) {
    this.name = name
    this.version = version
    this.oldVersion = version
    this.stores = stores
    this.updaters = updaters
    this.dataUpdaters = dataUpdaters
    this.database = null
  }

  store(store: string, index?: string | null, transactionType: IDBTransactionMode = 'readwrite') {
    const databaseStore = (this.database as IDBDatabase).transaction(store, transactionType).objectStore(store)
    if (index) {
      return databaseStore.index(index)
    } else {
      return databaseStore
    }
  }

  async open() {
    const openRequest = indexedDB.open(this.name, this.version)

    openRequest.onupgradeneeded = (event) => {
      const database = openRequest.result
      if (event.oldVersion < 1) {
        Logger.log('STORAGE', 'Creating database')
        for (const [name, { key, indexes }] of Object.entries(this.stores)) {
          const store = database.createObjectStore(name, { keyPath: key })
          if (indexes) {
            for (const [indexName, indexKey] of Object.entries(indexes)) {
              store.createIndex(indexName, indexKey)
            }
          }
        }
      } else if (Array.isArray(this.updaters)) {
        Logger.log('STORAGE', 'Updating database to new version')
        showUpdateToast()
        for (const updater of this.updaters) {
          if (updater.shouldApply(event.oldVersion)) {
            updater.apply(openRequest.transaction as IDBTransaction, database)
          }
        }
      }

      this.oldVersion = event.oldVersion
    }

    this.database = await promisify(openRequest)

    if (this.version != this.oldVersion && Array.isArray(this.dataUpdaters)) {
      const updatersToRun = this.dataUpdaters.filter((updater) => updater.shouldApply(this.oldVersion))

      if (updatersToRun.length > 0) {
        Logger.log('STORAGE', 'Updating database data due to compatibility with new version')
        showUpdateToast()

        // Every updater runs, not only the ones that apply
        for (const updater of this.dataUpdaters) {
          await updater.apply(this)
        }
      }
    }

    return this
  }

  close() {
    ;(this.database as IDBDatabase).close()

    return Promise.resolve()
  }

  set(store: string, value: unknown) {
    return promisify((this.store(store) as IDBObjectStore).put(value))
  }

  transaction(storeNames: string[], callback: (transaction: DatabaseTransaction) => void, mode: IDBTransactionMode = 'readwrite') {
    return new Promise<boolean>((resolve, reject) => {
      const transaction = (this.database as IDBDatabase).transaction(storeNames, mode)
      const stores = storeNames.reduce<Record<string, IDBObjectStore>>(
        (memo, storeName) => {
          memo[storeName] = transaction.objectStore(storeName)

          return memo
        },
        Object.create(null) as Record<string, IDBObjectStore>
      )

      callback({
        set: (storeName, value) => stores[storeName].put(value),
        remove: (storeName, key) => stores[storeName].delete(key)
      })

      transaction.oncomplete = () => resolve(true)
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
    })
  }

  get<TValue>(store: string, key: IDBValidKey) {
    return promisify((this.store(store, null, 'readonly') as IDBObjectStore).get(key) as IDBRequest<TValue | undefined>)
  }

  remove(store: string, key: IDBValidKey) {
    return promisify((this.store(store) as IDBObjectStore).delete(key))
  }

  clear(store: string) {
    return promisify((this.store(store) as IDBObjectStore).clear())
  }

  where<TValue>(store: string, index?: string, query?: IDBKeyRange | null) {
    return new Promise<TValue[]>((resolve) => {
      const items: TValue[] = []
      const cursorRequest = this.store(store, index, 'readonly').openCursor(query)
      cursorRequest.onerror = () => resolve([])
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result
        if (cursor) {
          items.push(cursor.value as TValue)
          cursor.continue()
        } else {
          resolve(items)
        }
      }
    })
  }

  latest<TValue>(store: string, accept: (value: TValue) => boolean, index?: string, query?: IDBKeyRange | null) {
    return new Promise<TValue[]>((resolve) => {
      const objectStore = this.store(store, null, 'readonly') as IDBObjectStore
      const source = index ? objectStore.index(index) : objectStore
      const keyPath = index ? ((source as IDBIndex).keyPath as string) : undefined

      const matches = (value: TValue) => {
        if (keyPath) {
          const indexed = (value as Record<string, IDBValidKey | undefined>)[keyPath]
          if (indexed === undefined || (query && !query.includes(indexed))) {
            return false
          }
        }

        return accept(value)
      }

      const items: TValue[] = []
      const latestKeys = new Map<string, [string, number]>()
      const longIdentifiers = new Set<string>()

      let pending = 0
      const complete = (value?: TValue) => {
        if (value) {
          items.push(value)
        }

        if (--pending === 0) {
          resolve(items)
        }
      }

      const findNewest = (identifier: string, upperKey: IDBValidKey) => {
        const cursorRequest = objectStore.openCursor(IDBKeyRange.bound([identifier], upperKey, false, true), 'prev')
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result
          if (!cursor) {
            complete()
          } else if (matches(cursor.value as TValue)) {
            complete(cursor.value as TValue)
          } else {
            cursor.continue()
          }
        }
      }

      let runIdentifier: string | undefined
      let runLength = 0

      objectStore.transaction.onerror = () => resolve([])

      const cursorRequest = source.openKeyCursor(query)
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result
        if (cursor) {
          const key = cursor.primaryKey as [string, number]
          const [identifier] = key

          runLength = identifier === runIdentifier ? runLength + 1 : 1
          runIdentifier = identifier

          if (runLength < 64) {
            const latestKey = latestKeys.get(identifier)
            if (!longIdentifiers.has(identifier) && (!latestKey || latestKey[1] < key[1])) {
              latestKeys.set(identifier, key)
            }

            cursor.continue()
          } else {
            latestKeys.delete(identifier)
            longIdentifiers.add(identifier)

            if (index) {
              cursor.continuePrimaryKey(cursor.key, [identifier, []])
            } else {
              cursor.continue([identifier, []])
            }
          }
        } else {
          pending = latestKeys.size + longIdentifiers.size
          if (pending === 0) {
            resolve(items)
          }

          for (const [identifier, key] of latestKeys) {
            const getRequest = objectStore.get(key)
            getRequest.onsuccess = () => {
              const value = getRequest.result as TValue | undefined
              if (value && matches(value)) {
                complete(value)
              } else {
                findNewest(identifier, key)
              }
            }
          }

          for (const identifier of longIdentifiers) {
            findNewest(identifier, [identifier, []])
          }
        }
      }
    })
  }

  all<TValue>(store: string, index?: string, query?: IDBKeyRange | null) {
    return promisify(this.store(store, index, 'readonly').getAll(query) as IDBRequest<TValue[]>)
  }
}

// No clear(), so resetting links in temporary mode throws like it always did
export class TemporaryDatabaseSession {
  set(_store: string, _value: unknown) {
    return Promise.resolve()
  }

  transaction(_storeNames: string[], callback: (transaction: DatabaseTransaction) => void, _mode?: IDBTransactionMode) {
    callback({
      set: () => {},
      remove: () => {}
    })

    return Promise.resolve(true)
  }

  get<TValue>(_store: string, _key: IDBValidKey) {
    return Promise.resolve(undefined as TValue | undefined)
  }

  remove(_store: string, _key: IDBValidKey) {
    return Promise.resolve()
  }

  where<TValue>(_store: string, _index?: string, _query?: IDBKeyRange | null) {
    return Promise.resolve([] as TValue[])
  }

  latest<TValue>(_store: string, _accept: (value: TValue) => boolean, _index?: string, _query?: IDBKeyRange | null) {
    return Promise.resolve([] as TValue[])
  }

  all<TValue>(_store: string, _index?: string, _query?: IDBKeyRange | null) {
    return Promise.resolve([] as TValue[])
  }

  close() {
    return Promise.resolve()
  }
}

export type DatabaseSession = IndexedDBWrapper | TemporaryDatabaseSession

export class DatabaseUtils {
  static async createSession(slot: number | string | undefined) {
    await DatabaseUtils.requestPersistentStorage()

    return new IndexedDBWrapper(`sftools${slot ? `_${slot}` : ''}`, DATABASE_VERSION, DATABASE_STORES, DATABASE_UPDATERS, DATABASE_DATA_UPDATERS).open()
  }

  static createTemporarySession() {
    return new TemporaryDatabaseSession()
  }

  static filterArray(profile: DatabaseProfile, type: 'primary' | 'primary_g' = 'primary') {
    return profile[type]?.mode === 'none' ? [] : undefined
  }

  static profileFilter(profile: DatabaseProfile, type: 'primary' | 'primary_g' = 'primary'): [string?, IDBKeyRange?] {
    const filter = profile[type]
    if (filter) {
      const { name, mode } = filter
      const value = filter.value ? filter.value.map((part) => (Expression.create(part) as Expression).eval()) : filter.value

      let range = null
      if (mode == 'below') {
        range = IDBKeyRange.upperBound(...(value as [IDBValidKey, boolean?]))
      } else if (mode == 'above') {
        range = IDBKeyRange.lowerBound(...(value as [IDBValidKey, boolean?]))
      } else if (mode == 'between') {
        range = IDBKeyRange.bound(...(value as [IDBValidKey, IDBValidKey, boolean?, boolean?]))
      } else if (mode == 'equals') {
        range = IDBKeyRange.only(...(value as [IDBValidKey]))
      }

      return [name, range as IDBKeyRange]
    } else {
      return []
    }
  }

  static async requestPersistentStorage() {
    if (!Site.options.persisted && typeof window.navigator.storage?.persist === 'function') {
      const persistent = await window.navigator.storage.persist()

      if (persistent) {
        Site.options.persisted = true
      }
    }
  }
}
