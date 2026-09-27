import { Logger } from '~/core/logger'
import { Playa } from '~/playa/servers'

export type EndpointCharacter = {
  id: number
  name: string
  level: number
  char_class: number
  server_id: number
  order: number
}

export type EndpointAccount = {
  characters: EndpointCharacter[]
}

export type EndpointMode = 'own' | 'guild' | 'friends' | 'hall_of_fame' | 'guild_friends'

export type EndpointExecuteCharacter = {
  id: number
  username: string
  server: string
}

export type EndpointCapture = {
  data: string
}

export type EndpointWarning = {
  warning: string
  player: string
  server: string
  target: string
}

type EndpointMessage = {
  error?: string
  warning?: string
  progress?: string
}

type EndpointExecuteParams = {
  characters: (EndpointExecuteCharacter & { version: string | null })[]
  mode: EndpointMode
}

type EndpointWindow = Window & {
  callback: ((message: EndpointMessage) => void) | null
  load(): Promise<void>
  destroy(): Promise<void>
  playaAccountLogin(server: string, username: string, password: string): void
  execute(params: EndpointExecuteParams): void
}

export class EndpointController {
  #iframe: HTMLIFrameElement
  #onProgress: (percent: number) => void
  #onWarning: (warning: EndpointWarning) => void
  #window: EndpointWindow | null = null

  constructor(iframe: HTMLIFrameElement, onProgress: (percent: number) => void, onWarning: (warning: EndpointWarning) => void) {
    this.#iframe = iframe
    this.#onProgress = onProgress
    this.#onWarning = onWarning
  }

  async load() {
    await new Promise<void>((resolve) => {
      this.#iframe.addEventListener('load', () => resolve(), { once: true })

      this.#iframe.src = '/endpoint/index.html'
    })

    this.#window = this.#iframe.contentWindow as EndpointWindow

    await this.#window.load()

    Logger.log('ECLIENT', 'Client started')
  }

  async destroy() {
    await this.#window?.destroy()

    Logger.log('ECLIENT', 'Client stopped')

    this.#iframe.src = ''
  }

  playaAccountLogin(server: string, username: string, password: string) {
    Logger.log('ECLIENT', `Logging in as ${username}@${server}`)

    return this.#request<EndpointAccount>((endpoint) => endpoint.playaAccountLogin(server, username, password))
  }

  execute(characters: EndpointExecuteCharacter[], mode: EndpointMode) {
    Logger.log('ECLIENT', `Executing ${mode} for ${characters.map(({ username, server }) => `${username}@${server}`).join(', ')}`)

    const version = Playa.getClientVersion()

    return this.#request<EndpointCapture>((endpoint) => endpoint.execute({ characters: characters.map((character) => ({ ...character, version })), mode }))
  }

  #request<TResponse>(send: (endpoint: EndpointWindow) => void) {
    const endpoint = this.#window

    if (!endpoint) {
      return Promise.reject(new Error('Endpoint is not loaded'))
    }

    return new Promise<TResponse>((resolve, reject) => {
      endpoint.callback = (message) => {
        if (message.error) {
          reject(new Error(message.error))
        } else if (message.warning) {
          this.#onWarning(message as EndpointWarning)
        } else if (message.progress) {
          this.#onProgress(Number(message.progress))
        } else {
          resolve(message as TResponse)
        }
      }

      send(endpoint)
    })
  }
}
