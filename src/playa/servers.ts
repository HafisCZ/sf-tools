import { Logger } from '~/core/logger'
import { Store, StoreCache } from '~/core/store'

type PlayaData = {
  servers: Record<string, string>
  clientVersion: string | null
  timestamp: number | null
}

type PlayaConfig = {
  servers: { i: number; d: string }[]
  recommended_app_version: string
}

export class Playa {
  static #data = Store.get<PlayaData>('playa', { servers: {}, clientVersion: null, timestamp: null })

  static getServerUrlById(id: number) {
    return this.#data.servers[id] as string | undefined
  }

  static getClientVersion() {
    return this.#data.clientVersion
  }

  static async reload() {
    Logger.log('APPINFO', 'Fetching playa configuration because it is missing or expired')

    const { servers: rawServers, recommended_app_version: rawClientVersion } = (await fetch('https://sfgame.net/config.json').then((response) => response.json())) as PlayaConfig

    const data = {
      servers: rawServers.reduce<Record<string, string>>(
        (servers, server) => {
          servers[String(server.i)] = server.d

          return servers
        },
        Object.create(null) as Record<string, string>
      ),
      clientVersion: rawClientVersion.replace('.', '').padEnd(12, '0'),
      timestamp: Date.now()
    }

    Store.set('playa', (this.#data = data))
  }

  static isExpired() {
    return Date.now() > Number(this.#data.timestamp) + StoreCache.hours(1)
  }
}

// If expired, simply lazily reload playa config. Hopefully it is done before someone needs the data.
if (Playa.isExpired()) void Playa.reload()
