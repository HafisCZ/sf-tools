import { getCurrentScope, onScopeDispose } from 'vue'

export type GameData = {
  url: string
  text: string
}

type WindowMessages = {
  'sftools-hook': GameData
  'sftools-dungeons': null
  'sftools-extension': GameData
}

type WindowMessageEnvelope<TData> = {
  source?: unknown
  data: TData
}

export function useWindowMessage<TName extends keyof WindowMessages>(name: TName) {
  type Data = WindowMessages[TName]

  return {
    send(...args: Data extends null ? [] : [data: Data]) {
      window.postMessage({ source: name, data: args[0] ?? null }, window.location.origin)
    },
    receive(listener: (data: Data) => void) {
      function handleMessage(event: MessageEvent<WindowMessageEnvelope<Data> | null>) {
        if (event.source === window && event.data?.source === name) {
          listener(event.data.data)
        }
      }

      window.addEventListener('message', handleMessage)

      if (getCurrentScope()) {
        onScopeDispose(() => window.removeEventListener('message', handleMessage))
      }
    }
  }
}
