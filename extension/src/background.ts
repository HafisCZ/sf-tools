import { type GameData } from '../../src/utils/extension'
import { useExtensionMessage } from './messages'
import { getOrigin, onSettingsChange, readSettings, type Settings } from './sites'

type GameState = {
  url: string
  entries: Record<string, string>
}

const gameMessage = useExtensionMessage('game')

let queue = Promise.resolve()

useExtensionMessage('response').receive((data) => {
  queue = queue.then(() => storeResponse(data.url, data.text)).catch((error: unknown) => console.error(error))
})

useExtensionMessage('open').receive(() => {
  void openSimulator()
})

useExtensionMessage('read').receive((_data, tab) => readGameFor(tab))

onSettingsChange((settings) => {
  queue = queue.then(() => applySettings(settings)).catch((error: unknown) => console.error(error))
})

// Same keys as PlayaResponse.fromText, so achievement(284) and achievement(285) are one entry
function getKey(item: string) {
  return item
    .split(':')[0]
    .replace(/\(\d+?\)| /g, '')
    .split('.')[0]
    .toLowerCase()
}

async function getSyncOrigin() {
  const settings = await readSettings()

  return settings.enabled ? getOrigin(settings) : null
}

async function readGame(): Promise<GameData | null> {
  const stored = await chrome.storage.session.get('game')
  const game = stored.game as GameState | undefined

  return game ? { url: game.url, text: Object.values(game.entries).join('&') } : null
}

async function readGameFor(tab: ChromeTab | undefined) {
  const origin = await getSyncOrigin()

  if (!origin || !tab?.url || new URL(tab.url).origin !== origin) return null

  return readGame()
}

async function applySettings(settings: Settings) {
  if (!settings.enabled) {
    await chrome.storage.session.remove('game')

    return
  }

  const origin = getOrigin(settings)
  const game = await readGame()

  if (origin && game) {
    await sendGame(origin, game)
  }
}

async function storeResponse(url: string, text: string) {
  const origin = await getSyncOrigin()
  const items = text.split('&').filter((item) => item.length > 0)

  if (!origin || items.length === 0) return

  const keys = items.map(getKey)

  const stored = await chrome.storage.session.get('game')
  const game = stored.game as GameState | undefined

  // Only the login response has the server version, it holds the whole save
  const entries = keys.includes('serverversion') ? {} : Object.assign({}, game?.entries)

  items.forEach((item, index) => {
    entries[keys[index]] = item
  })

  await chrome.storage.session.set({ game: { url, entries } })

  await sendGame(origin, { url, text: Object.values(entries).join('&') })
}

async function sendGame(origin: string, game: GameData) {
  for (const tab of await findSimulatorTabs(origin)) {
    if (tab.id !== undefined) {
      void gameMessage.send(game, tab.id)
    }
  }
}

async function findSimulatorTabs(origin: string) {
  const target = new URL(origin)

  // Match patterns take no port
  const tabs = await chrome.tabs.query({ url: `${target.protocol}//${target.hostname}/*` })

  return tabs.filter((tab) => {
    if (!tab.url) return false

    const url = new URL(tab.url)

    return url.origin === origin && url.pathname === '/dungeons.html' && url.searchParams.has('sync')
  })
}

async function openSimulator() {
  const origin = await getSyncOrigin()

  if (!origin) return

  const tab = (await findSimulatorTabs(origin)).at(0)

  if (tab?.id !== undefined) {
    await chrome.tabs.update(tab.id, { active: true })
    await chrome.windows.update(tab.windowId, { focused: true })
  } else {
    await chrome.tabs.create({ url: `${origin}/dungeons.html?sync` })
  }
}
