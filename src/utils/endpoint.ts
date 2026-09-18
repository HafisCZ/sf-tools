export type EndpointCharacter = {
  id: number
  name: string
  level: number
  char_class: number
  server_id: number
  order: number
}

export type EndpointLogin = {
  type?: string
  characters: EndpointCharacter[]
  members: string[]
  friends: string[]
}

export type EndpointCapture = {
  data: string
}

type EndpointMessage = {
  error?: string
  progress?: number
}

type EndpointWindow = Window & {
  callback: ((message: EndpointMessage) => void) | null
  load(): Promise<void>
  destroy(): Promise<void>
  login(server: string, version: string, username: string, password: string): void
  continue_login(server: string, version: string, username: string, id: number): void
  query_many(names: string): void
  query_self(): void
  query_hall_of_fame(): void
}

export class EndpointController {
  #iframe: HTMLIFrameElement
  #onProgress: (percent: number) => void
  #window: EndpointWindow | null = null

  constructor(iframe: HTMLIFrameElement, onProgress: (percent: number) => void) {
    this.#iframe = iframe
    this.#onProgress = onProgress
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

  login(server: string, username: string, password: string) {
    Logger.log('ECLIENT', `Logging in as ${username}@${server}`)

    return this.#request<EndpointLogin>((endpoint) => endpoint.login(server, Playa.getClientVersion(), username, password))
  }

  continueLogin(server: string, username: string, id: number) {
    Logger.log('ECLIENT', `Continuing logging in as ${username}@${server}`)

    return this.#request<EndpointLogin>((endpoint) => endpoint.continue_login(server, Playa.getClientVersion(), username, id))
  }

  query(names: string[]) {
    Logger.log('ECLIENT', 'Query many')

    return this.#request<EndpointCapture>((endpoint) => endpoint.query_many(names.join(',')))
  }

  querySelf() {
    Logger.log('ECLIENT', 'Query self')

    return this.#request<EndpointCapture>((endpoint) => endpoint.query_self())
  }

  queryHallOfFame() {
    Logger.log('ECLIENT', 'Query HOF')

    return this.#request<EndpointCapture>((endpoint) => endpoint.query_hall_of_fame())
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
        } else if (message.progress) {
          this.#onProgress(message.progress)
        } else {
          resolve(message as TResponse)
        }
      }

      send(endpoint)
    })
  }
}
