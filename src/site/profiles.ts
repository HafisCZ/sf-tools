import { sortDescending } from '@utils/utils'
import { Site } from './site'
import { Store } from './store'

export type ProfileRule = {
  name: string
  mode: string
  value: string[]
}

export type DatabaseProfile = {
  key?: string
  name?: string
  temporary?: boolean
  slot?: number | string
  primary?: ProfileRule | null
  secondary?: string | null
  primary_g?: ProfileRule | null
  secondary_g?: string | null
  only_players?: boolean
  block_preload?: boolean
  updated?: number
}

export const DEFAULT_PROFILE: DatabaseProfile = {
  name: 'Default',
  temporary: false,
  slot: 0,
  primary: null,
  secondary: null,
  primary_g: null,
  secondary_g: null
}

export const SELF_PROFILE: DatabaseProfile = {
  primary: {
    name: 'own',
    mode: 'equals',
    value: ['1']
  },
  secondary: null,
  only_players: true
}

export const SELF_PROFILE_WITH_GROUP: DatabaseProfile = {
  primary: {
    name: 'own',
    mode: 'equals',
    value: ['1']
  },
  secondary: null
}

export const FIGHT_SIMULATOR_PROFILE: DatabaseProfile = {
  only_players: true,
  block_preload: true
}

export const HYDRA_PROFILE: DatabaseProfile = {
  block_preload: true
}

const DEFAULT_PROFILE_A: DatabaseProfile = {
  name: 'Own only',
  primary: {
    name: 'own',
    mode: 'equals',
    value: ['1']
  },
  secondary: null,
  primary_g: {
    name: 'own',
    mode: 'equals',
    value: ['1']
  },
  secondary_g: null
}

const DEFAULT_PROFILE_B: DatabaseProfile = {
  name: 'Newer that 1 month',
  primary: {
    name: 'timestamp',
    mode: 'above',
    value: ['now() - 4 * @7days']
  },
  secondary: null,
  primary_g: {
    name: 'timestamp',
    mode: 'above',
    value: ['now() - 4 * @7days']
  },
  secondary_g: null
}

function loadProfiles() {
  const data = Object.assign(Store.get<Record<string, DatabaseProfile>>('db_profiles', {}), {
    default: DEFAULT_PROFILE,
    own: DEFAULT_PROFILE_A,
    month_old: DEFAULT_PROFILE_B
  })

  for (const [key, profile] of Object.entries(data)) {
    profile.key = key
  }

  return data
}

export class ProfileManager {
  static profiles = loadProfiles()

  static isEditable(key: string) {
    return !this.#isDefault(key)
  }

  static #getDefaultProfile() {
    return this.profiles.default
  }

  static getActiveProfile() {
    return this.profiles[Site.options.profile] || this.#getDefaultProfile()
  }

  static getProfile(name: string | null) {
    return (name === null ? undefined : this.profiles[name]) || this.getActiveProfile()
  }

  static getActiveProfileName() {
    return Site.options.profile || 'default'
  }

  static setActiveProfile(name: string) {
    Site.options.profile = name
  }

  static removeProfile(name: string) {
    delete this.profiles[name]
    Store.set('db_profiles', this.profiles)
  }

  static setProfile(name: string, profile: DatabaseProfile) {
    this.profiles[name] = Object.assign(profile, { updated: Date.now() })
    Store.set('db_profiles', this.profiles)
  }

  static #isDefault(name: string) {
    return ['default', 'own', 'month_old'].includes(name)
  }

  static getProfiles(): [string, DatabaseProfile][] {
    return [
      ['default', this.profiles.default],
      ['own', this.profiles.own],
      ['month_old', this.profiles.month_old],
      ...sortDescending(
        Object.entries(this.profiles).filter(([key]) => !this.#isDefault(key)),
        ([, value]) => value.updated || 0
      )
    ]
  }
}
