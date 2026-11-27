type ChromeTab = {
  id?: number
  windowId: number
  url?: string
}

type ChromeStorageArea = {
  get(keys: string | string[]): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
  remove(keys: string | string[]): Promise<void>
}

type ChromeStorageChange = {
  oldValue?: unknown
  newValue?: unknown
}

declare const chrome: {
  runtime: {
    getURL(path: string): string
    sendMessage(message: unknown): Promise<unknown>
    onMessage: {
      addListener<T>(listener: (message: T, sender: { tab?: ChromeTab }, sendResponse: (response: unknown) => void) => boolean | void): void
      removeListener<T>(listener: (message: T, sender: { tab?: ChromeTab }, sendResponse: (response: unknown) => void) => boolean | void): void
    }
  }
  tabs: {
    query(query: { url?: string }): Promise<ChromeTab[]>
    create(properties: { url: string }): Promise<ChromeTab>
    update(tabId: number, properties: { active: boolean }): Promise<ChromeTab>
    sendMessage(tabId: number, message: unknown): Promise<unknown>
  }
  windows: {
    update(windowId: number, properties: { focused: boolean }): Promise<unknown>
  }
  storage: {
    local: ChromeStorageArea
    session: ChromeStorageArea
    onChanged: {
      addListener(listener: (changes: Record<string, ChromeStorageChange>, area: string) => void): void
    }
  }
}
