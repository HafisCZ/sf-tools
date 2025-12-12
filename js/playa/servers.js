class Playa {
  static #data = Store.get('playa', { servers: {}, clientVersion: null, timestamp: null })

  static getServerUrlById (id) {
    return this.#data.servers[id]
  }

  static getClientVersion () {
    return this.#data.clientVersion
  }

  static async reload () {
    Logger.log('APPINFO', 'Fetching playa configuration because it is missing or expired');

    const { servers: rawServers, recommended_app_version: rawClientVersion } = await fetch('https://sfgame.net/config.json').then((response) => response.json())

    const data = {
      servers: rawServers.reduce((acc, server) => {
        acc[String(server.i)] = server.d

        return acc
      }, Object.create(null)),
      clientVersion: rawClientVersion.replace('.', '').padEnd(12, '0'),
      timestamp: Date.now()
    }

    Store.set('playa', this.#data = data)
  }

  static isExpired () {
    return Date.now() > this.#data.timestamp + StoreCache.hours(1)
  }
}

/**
 * If expired, simply lazily reload playa config. Hopefully it is done before someone needs the data.
 */
if (Playa.isExpired()) void Playa.reload()