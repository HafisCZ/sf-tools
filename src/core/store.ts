import { Logger } from './logger'

type StoreData = Record<string, unknown>

type StoreCacheEntries = Record<string, { value: unknown; expire: number }>

export class StoreWrapper {
  static available: boolean | undefined

  static isAvailable() {
    let currentValue = StoreWrapper.available

    if (typeof currentValue === 'undefined') {
      try {
        window.localStorage.getItem('test')
        currentValue = true
      } catch {
        currentValue = false
      }

      if (!currentValue) {
        Logger.log('WARNING', 'Storage is not accessible')
        StoreWrapper.available = currentValue
      }
    }

    return currentValue
  }

  static getStore(type: 'localStorage' | 'sessionStorage'): StoreData | undefined {
    if (StoreWrapper.isAvailable()) {
      return window[type]
    } else {
      return undefined
    }
  }

  store: StoreData

  constructor(store: StoreData) {
    this.store = store
  }

  set(key: string, data: unknown, rawData = false) {
    this.store[key] = rawData ? data : JSON.stringify(data)
  }

  get<TValue>(key: string, defaultData: TValue, rawData = false): TValue {
    const data = this.store[key]

    return data ? ((rawData ? data : JSON.parse(data as string)) as TValue) : defaultData
  }

  remove(key: string) {
    delete this.store[key]
  }

  keys() {
    return Object.keys(this.store)
  }

  has(key: string) {
    return key in this.store
  }

  all() {
    return this.store
  }

  temporary() {
    this.store = {}
  }

  isTemporary() {
    return !this.isPermanent()
  }

  isPermanent() {
    return this.store instanceof Storage
  }
}

function createStore() {
  const store = StoreWrapper.getStore('localStorage') || StoreWrapper.getStore('sessionStorage') || {}

  return Object.assign(new StoreWrapper(store), {
    shared: new StoreWrapper(store),
    session: new StoreWrapper(StoreWrapper.getStore('sessionStorage') || {})
  })
}

export const Store = createStore()

export class StoreCache {
  static hours(value: number) {
    return value * 60 * 60 * 1000
  }

  static async use<TValue>(key: string, getter: () => Promise<TValue>, lifetime: number) {
    const { entries } = Store.get<{ entries: StoreCacheEntries }>('cache', { entries: {} })

    if (entries[key] && entries[key].expire >= Date.now()) {
      return entries[key].value as TValue
    }

    const value = await getter()

    entries[key] = {
      value,
      expire: Date.now() + lifetime
    }

    Store.set('cache', { entries })

    return value
  }

  static invalidate(key: string) {
    const { entries } = Store.get<{ entries: StoreCacheEntries }>('cache', { entries: {} })

    delete entries[key]

    Store.set('cache', { entries })
  }

  static clear() {
    Store.set('cache', { entries: {} })
  }
}
