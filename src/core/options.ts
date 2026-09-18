import { Logger } from './logger'
import { Store } from './store'

type OptionsRecord = Record<string, unknown>

class OptionsHandlerBase<TOptions extends OptionsRecord> {
  #key: string
  #defaults: TOptions
  #listeners: { name: string; callback: (value: unknown) => void }[] = []

  options: TOptions

  constructor(key: string, defaults: TOptions) {
    this.#key = key
    this.#defaults = defaults
    this.options = Object.assign({}, defaults)

    Object.assign(this.options, Store.shared.get(this.#key, {}))

    for (const name of Object.keys(this.options)) {
      Object.defineProperty(this, name, {
        get: () => this.options[name],
        set: (value: unknown) => {
          if (this.options[name] === value && typeof value !== 'object') return
          else {
            ;(this.options as OptionsRecord)[name] = value
            Logger.log('OPTIONS', `Set ${this.#key}.${name} to ${Array.isArray(value) ? `[...${value.length}]` : String(value)}`)
            Store.shared.set(this.#key, this.options)
            this.#changed(name)
          }
        }
      })
    }
  }

  default<TKey extends keyof TOptions>(key: TKey) {
    return this.#defaults[key]
  }

  reset<TKey extends keyof TOptions>(key: TKey) {
    ;(this as unknown as TOptions)[key] = this.#defaults[key]
  }

  keys() {
    return Object.keys(this.#defaults) as (keyof TOptions & string)[]
  }

  toggle<TKey extends keyof TOptions>(key: TKey) {
    const options = this as unknown as TOptions

    options[key] = !options[key] as TOptions[TKey]
  }

  #changed(option: string) {
    for (const { name, callback } of this.#listeners) {
      if (name == option) callback(this.options[option])
    }
  }

  onChange<TKey extends keyof TOptions & string>(option: TKey, listener: (value: TOptions[TKey]) => void) {
    this.#listeners.push({
      name: option,
      callback: listener as (value: unknown) => void
    })
  }
}

// Only setting an option saves it, so an array has to be set again after changing it
export type OptionsHandler<TOptions extends OptionsRecord> = OptionsHandlerBase<TOptions> & TOptions

export const OptionsHandler = OptionsHandlerBase as new <TOptions extends OptionsRecord>(key: string, defaults: TOptions) => OptionsHandler<TOptions>
