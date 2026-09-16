// Globals declared by the legacy classic scripts that a page loads in its HTML (<script vite-ignore>).
// Only what the Vue code uses is typed here.

// js/core/core.js

type SiteMetadata = {
  name: string
  type?: string
  requires?: string[]
}

type SiteOptions = {
  locale: string
  terms_accepted: number | boolean
  version_accepted: string | boolean
  announcement_accepted: number
  announcements_viewed: string[]
}

declare class Site {
  static options: SiteOptions
  static ready(metadata: SiteMetadata, callback: (params: URLSearchParams) => unknown): void
  static run(): void
  static is(name: string): boolean
  static isEvent(type: 'april_fools_day' | 'winter' | 'halloween'): boolean
}

declare class SiteAPI {
  static post(endpoint: string, data: unknown): Promise<unknown>
}

declare class StoreWrapper {
  static isAvailable(): boolean
}

declare class Logger {
  static log(type: string, text: string): void
}

declare const MODULE_VERSION: string
declare const MODULE_VERSION_MAJOR: string

// js/changelog.js

type ChangelogRelease = string[] | Record<string, string[]>

declare const CHANGELOG: Record<string, ChangelogRelease>

type Announcement = {
  id: string
  title: string
  content: string
  for?: string[]
  disabled?: boolean
}

declare const ANNOUNCEMENTS: Announcement[]
