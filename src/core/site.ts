import { Logger } from './logger'
import { OptionsHandler } from './options'

export const MODULE_VERSION_MAJOR = '7'
export const MODULE_VERSION_MINOR = '4811'
export const MODULE_VERSION = `v${MODULE_VERSION_MAJOR}.${MODULE_VERSION_MINOR}`

export type SiteMetadata = {
  name: string
  type?: string
  requires?: string[]
}

export type SiteEvent = 'april_fools_day' | 'winter' | 'halloween'

const SITE_OPTIONS = {
  advanced: false,
  hidden: false,
  terms_accepted: false as number | boolean,
  endpoint_terms_accepted: false as number | boolean,
  version_accepted: false as string | boolean,
  groups_hidden: false,
  players_hidden: false,
  browse_hidden: false,
  groups_other: false,
  players_other: false,
  always_prev: false,
  migration_allowed: true,
  migration_accepted: false,
  profile: 'default',
  groups_empty: false,
  tab: 'groups_grid',
  load_rows: 100,
  persisted: false,
  has_storage_access: false,
  locale: 'en',
  export_public_only: false,
  export_bundle_groups: true,
  unsafe_delete: false,
  skip_grid_if_single_entry_present: true,
  event_override: [] as SiteEvent[],
  simulator_info_id: 0,
  table_sticky_header: false,
  script_author: '',
  debug: false,
  backup_reminder_frequency: 1,
  backup_reminder_timestamp: Date.now() + 2592000000,
  announcement_accepted: 0,
  announcements_viewed: [] as string[]
}

export type SiteOptions = typeof SITE_OPTIONS

let resolveStartup: () => void = () => {}

const startupPromise = new Promise<void>((resolve) => {
  Logger.log('APPINFO', `Version ${MODULE_VERSION}`)

  resolveStartup = resolve
})

export class Site {
  static #metadata: SiteMetadata | undefined

  static #startup = Date.now()

  static data: Record<string, unknown> | undefined

  static options = new OptionsHandler('options', SITE_OPTIONS)

  static run() {
    Logger.log('APPINFO', `Application ready in ${Date.now() - this.#startup} ms`)

    resolveStartup()
  }

  static is(name: string) {
    return this.#metadata?.name === name
  }

  static isType(type: string) {
    return this.#metadata?.type === type
  }

  static requires(name: string) {
    return this.#metadata?.requires?.includes(name)
  }

  static isEvent(type: SiteEvent) {
    if (Array.isArray(Site.options.event_override)) {
      if (Site.options.event_override.includes(type)) {
        return true
      }
    }

    const date = new Date()

    if (type === 'april_fools_day') {
      return date.getMonth() === 3 && date.getDate() === 1
    } else if (type === 'winter') {
      return [0, 1, 11].includes(date.getMonth())
    } else if (type === 'halloween') {
      return date.getMonth() === 9
    } else {
      return false
    }
  }

  static ready(metadata: SiteMetadata, callback: (params: URLSearchParams) => Record<string, unknown> | undefined | void) {
    this.#metadata = metadata

    void this.#runWhenStarted(callback)
  }

  static async #runWhenStarted(callback: (params: URLSearchParams) => Record<string, unknown> | undefined | void) {
    await startupPromise

    this.data = callback(new URLSearchParams(window.location.search)) || {}
  }
}
