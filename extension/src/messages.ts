import { getCurrentScope, onScopeDispose } from 'vue'
import { type GameData } from '../../src/utils/extension'

type ExtensionMessages = {
  response: {
    data: GameData
    reply: void
  }
  open: {
    data: null
    reply: void
  }
  read: {
    data: null
    reply: GameData | null
  }
  game: {
    data: GameData
    reply: void
  }
}

type ExtensionMessageEnvelope<TData> = {
  name?: unknown
  data: TData
}

export function useExtensionMessage<TName extends keyof ExtensionMessages>(name: TName) {
  type Data = ExtensionMessages[TName]['data']
  type Reply = ExtensionMessages[TName]['reply']

  return {
    async send(...args: Data extends null ? [] : [data: Data, tabId?: number]): Promise<Reply | undefined> {
      const message = { name, data: args[0] ?? null }
      const tabId = args[1]

      try {
        return (await (tabId === undefined ? chrome.runtime.sendMessage(message) : chrome.tabs.sendMessage(tabId, message))) as Reply
      } catch {
        return undefined
      }
    },
    receive(listener: (data: Data, tab: ChromeTab | undefined) => Reply | Promise<Reply>) {
      function handleMessage(message: ExtensionMessageEnvelope<Data> | null, sender: { tab?: ChromeTab }, sendResponse: (response: unknown) => void) {
        if (message?.name !== name) return

        const reply = listener(message.data, sender.tab)

        if (reply instanceof Promise) {
          void reply.then(sendResponse)

          // Keeps sendResponse usable after this returns
          return true
        }
      }

      chrome.runtime.onMessage.addListener(handleMessage)

      if (getCurrentScope()) {
        onScopeDispose(() => chrome.runtime.onMessage.removeListener(handleMessage))
      }
    }
  }
}
