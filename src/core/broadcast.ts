import { randomHash } from '@utils/hash'
import { Logger } from './logger'

type BroadcastMessage = {
  type: string
  data: unknown
}

export class Broadcast {
  #token: string
  #channel: BroadcastChannel

  constructor(token = randomHash()) {
    Logger.log('CHANNEL', `Creating channel ${token}`)

    this.#token = token
    this.#channel = new BroadcastChannel(token)
  }

  on(type: string, callback: (data: unknown) => void) {
    this.#channel.addEventListener('message', ({ data: message }: MessageEvent<BroadcastMessage>) => {
      if (message.type === type) {
        Logger.log('CHANNEL', `Received ${type} from ${this.#token}`)

        callback(message.data)
      }
    })
  }

  send(type: string, data: unknown) {
    Logger.log('CHANNEL', `Sending ${type} to ${this.#token}`)

    this.#channel.postMessage({ type, data })
  }

  close() {
    Logger.log('CHANNEL', `Closing channel ${this.#token}`)

    this.#channel.close()
  }

  get token() {
    return this.#token
  }
}
