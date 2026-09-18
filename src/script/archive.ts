import { sortDescending } from '@utils/utils'
import { Store } from '~/core/store'

export type ScriptArchiveEntry = {
  type: string
  name: string | null
  version: number
  content: string
  timestamp: number
  temporary: boolean
}

export class ScriptArchive {
  static DATA_LIFETIME = 86_400_000
  static DATA_QUOTA = 1_024_000

  static bytes = 0

  static #data: ScriptArchiveEntry[] | undefined

  static get data(): ScriptArchiveEntry[] {
    if (this.#data === undefined) {
      this.#data = Store.shared.get<ScriptArchiveEntry[]>('archive', [])
      this.#persist()
    }

    return this.#data
  }

  static #persist() {
    this.#truncate()
    Store.shared.set('archive', this.data)
  }

  static #truncate() {
    this.bytes = 0
    this.#data = this.all()
      .filter(({ timestamp }) => timestamp > Date.now() - this.DATA_LIFETIME)
      .slice(0, 200)

    let index = -1
    for (let i = 0; i < this.#data.length; i++) {
      this.bytes += JSON.stringify(this.#data[i]).length

      if (this.bytes > this.DATA_QUOTA) {
        index = i
        break
      }
    }

    if (index >= 0) {
      this.#data = this.#data.slice(0, index)
    }
  }

  static clear() {
    this.#data = []
    this.#persist()
  }

  static empty() {
    return this.data.length === 0
  }

  static all() {
    return sortDescending(this.data, ({ timestamp }) => timestamp)
  }

  static get(timestamp: number) {
    return (this.data.find(({ timestamp: _timestamp }) => _timestamp == timestamp) as ScriptArchiveEntry).content
  }

  static find(type: string, name: string, version: number) {
    return this.data.find(({ type: _type, name: _name, version: _version }) => _type === type && _name === name && _version === version)
  }

  static has(type: string, name: string, version: number) {
    return this.data.findIndex(({ type: _type, name: _name, version: _version }) => _type === type && _name === name && _version === version) !== -1
  }

  static add(type: string, name: string | null, version: number, content: string) {
    this.data.push({
      type,
      name,
      version,
      content,
      timestamp: Date.now(),
      temporary: Store.isTemporary()
    })

    this.#persist()
  }
}
