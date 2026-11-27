export type Site = 'live' | 'beta' | 'local'

export type Settings = {
  enabled: boolean
  site: Site
  local: string
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  site: 'live',
  local: 'http://localhost:5173'
}

const ORIGINS = {
  live: 'https://sftools.mar21.eu',
  beta: 'https://beta.sftools.mar21.eu'
}

export function getOrigin(settings: Settings) {
  if (settings.site !== 'local') return ORIGINS[settings.site]

  const address = settings.local.trim()

  try {
    const url = new URL(address.includes('://') ? address : `http://${address}`)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : null
  } catch {
    return null
  }
}

export async function readSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get('settings')

  return Object.assign({}, DEFAULT_SETTINGS, stored.settings)
}

export function onSettingsChange(listener: (settings: Settings) => void) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.settings) return

    listener(Object.assign({}, DEFAULT_SETTINGS, changes.settings.newValue))
  })
}
