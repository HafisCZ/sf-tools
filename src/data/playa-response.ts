import { getTimestampOffset } from '@utils/utils'
import { type RawGroup, type RawPlayer, type RawGroupTournament } from './types'

type HarEntry = {
  startedDateTime: string
  request?: { url?: string }
  response?: { content?: { text?: string; encoding?: string } }
}

type HarFile = {
  log?: { entries?: HarEntry[] }
}

type PlayaResponses = Record<string, PlayaResponse | undefined>

export class PlayaResponse {
  static PLAYA_RESPONSE_CHARACTER_ENCODING = Object.entries({
    d: '$',
    P: '%',
    c: ':',
    C: ',',
    S: ';',
    p: '|',
    s: '/',
    '+': '&',
    q: '"',
    r: '#',
    b: `\n`
  });

  static *search(json: unknown) {
    // Both throw for files that are not HAR files, which the import reports as an error
    const entries = (json as HarFile | null)?.log?.entries as HarEntry[]

    for (const entry of entries) {
      const { text, encoding } = entry.response?.content as { text?: string; encoding?: string }

      if (text && encoding !== 'base64') {
        yield {
          text,
          url: entry.request?.url,
          date: new Date(entry.startedDateTime)
        }
      }
    }
  }

  static fromText(text: string) {
    return text
      .split('&')
      .filter((item) => item.length > 0)
      .reduce<PlayaResponses>((responses, item) => {
        const [key, ...value] = item.split(':')

        const normalizedKey = this.#normalizeKey(key)
        if (normalizedKey === 'otherplayerachievement' && value[0].startsWith('achievement')) {
          value.splice(0, 1)
        }

        responses[normalizedKey] = new PlayaResponse(value.join(':'))

        return responses
      }, {})
  }

  static #normalizeKey(key: string) {
    return key
      .replace(/\(\d+?\)| /g, '')
      .split('.')[0]
      .toLowerCase()
  }

  static unescape(value: string | undefined) {
    let text = value

    if (typeof text === 'string') {
      for (const [encodedCharacter, character] of this.PLAYA_RESPONSE_CHARACTER_ENCODING) {
        text = text.replaceAll(`$${encodedCharacter}`, character)
      }
    }

    return text
  }

  static importData(json: unknown, initialTimestamp?: number, initialOffset = -3600000) {
    let timestamp = initialTimestamp as number
    let offset = initialOffset

    const raws: [string, string][] = []
    const groups: RawGroup[] = []
    const players: RawPlayer[] = []
    const bonusPool: Record<string, { gtsave: RawGroupTournament }> = {}
    const bonusPoolByName: Record<string, { gtsave: RawGroupTournament }> = {}
    let currentVersion: number | undefined = undefined

    for (const { url, text, date } of this.search(json)) {
      if (date) {
        timestamp = date.getTime()
        offset = getTimestampOffset(date)
      }

      if (text.includes('otherplayername') || text.includes('othergroup') || text.includes('ownplayername') || text.includes('gtinternal') || text.includes('gtranking') || text.includes('legendaries')) {
        if (url) {
          const urlParts = url.toLowerCase().split(/.*\/(.*)\.sfgame\.(.*)\/.*/g)
          if (urlParts.length > 2) {
            raws.push([text, urlParts[1] + '_' + urlParts[2]])
          }
        } else {
          raws.push([text, 'invalid_server'])
        }
      }
    }

    for (const [text, prefix] of raws) {
      const r = this.fromText(text)
      if ((r.owngroupsave && r.owngrouprank && r.owngroupname && r.owngroupmember) || (r.othergroup && r.othergrouprank && r.othergroupname && r.othergroupmember)) {
        const data = {
          prefix: prefix,
          timestamp: timestamp,
          offset: offset
        } as RawGroup

        if (r.owngroupsave && r.owngroupname) {
          data.own = true
          data.name = r.owngroupname.string
          data.rank = (r.owngrouprank as PlayaResponse).number
          data.knights = (r.owngroupknights as PlayaResponse).numbers(',')
          data.save = r.owngroupsave.mixed() as number[]
          data.names = (r.owngroupmember as PlayaResponse).strings(',')

          const description = (r.owngroupdescription as PlayaResponse).string
          data.description = description.slice(description.indexOf('§') + 1)
        } else {
          data.own = false
          data.name = (r.othergroupname as PlayaResponse).string
          data.rank = (r.othergrouprank as PlayaResponse).number
          data.knights = undefined
          data.save = (r.othergroup as PlayaResponse).mixed() as number[]
          data.names = (r.othergroupmember as PlayaResponse).strings(',')

          const description = (r.othergroupdescription as PlayaResponse).string
          data.description = description.slice(description.indexOf('§') + 1)

          if (data.description.indexOf('$s$s$s') !== -1) {
            data.description = data.description.slice(data.description.indexOf('$s$s$s') + 6)
          }
        }

        data.identifier = `${data.prefix}_g${data.save[0]}`

        if (!groups.find((g) => g.identifier === data.identifier)) {
          groups.push(data)
        }
      }

      if (r.otherplayername || r.ownplayername) {
        let skip = false

        const data = {
          prefix: prefix,
          timestamp: timestamp,
          offset: offset
        } as RawPlayer

        if (r.ownplayername) {
          data.own = true
          data.name = r.ownplayername.string
          data.save = ((r.ownplayersavecharacter || r.ownplayersave) as PlayaResponse).numbers()
          data.saveVersion = r.ownplayersavecharacter ? 2 : 1

          data.identifier = `${data.prefix}_p${data.save[1]}`
          data.class = data.save[data.saveVersion === 2 ? 20 : 29] % 65536

          data.potions = r.ownplayersavepotions?.numbers()
          data.status = r.characterstatus?.numbers()
          data.fortress = r.fortress?.numbers()
          data.fortressStorage = r.fortressstorage?.numbers()

          // Optionals
          data.groupname = r.owngroupname?.string
          // TODO: Replace with specific separator
          data.units = r.unitlevel?.numbers(/\/|,/)
          data.achievements = r.achievement?.numbers()
          data.pets = r.ownpets?.numbers()
          data.tower = r.owntower?.numbers()
          data.chest = r.fortresschest?.numbers()
          data.dummy = r.dummies?.numbers()
          data.scrapbook = r.scrapbook?.string
          data.scrapbook_legendary = r.legendaries?.string
          data.witch = (r.witchshop || r.witch)?.numbers()
          data.idle = r.idle?.numbers()
          data.calendar = r.calenderinfo?.numbers()
          data.webshopid = r.webshopid?.string
          data.resources = r.resources?.numbers()
          data.dailyTasks = r.dailytasklist?.numbers()
          data.dailyTasksRewards = r.dailytaskrewardpreview?.numbers()
          data.eventTasks = r.eventtasklist?.numbers()
          data.eventTasksRewards = r.eventtaskrewardpreview?.numbers()
          data.description = r.owndescription?.string
          data.toilet = r.arcanetoilet?.numbers()
          data.adventure = r.adventure?.numbers()
          data.groupMetadata = r.charactergroup?.numbers()
          data.wheel = r.wheel?.numbers()
          data.dice = r.dice?.numbers()

          data.companionItems = r.companionequipment?.numbers()
          data.fidgetItems = r.storeitemsfidget?.numbers()
          data.shakesItems = r.storeitemsshakes?.numbers()
          data.equippedItems = r.ownplayersaveequipment?.numbers()
          data.dummyItems = r.dummieequipment?.numbers()
          data.backpackItems = r.backpack?.numbers()

          // Post-process
          if (data.saveVersion === 2) {
            if (data.save[65]) {
              data.group = `${data.prefix}_g${data.save[65]}`
            }
          } else {
            if (data.save[435]) {
              data.group = `${data.prefix}_g${data.save[435]}`
            }

            for (const i of [4, 503, 504, 505, 561]) {
              data.save[i] = 0
            }
          }

          data.dungeons = {
            light: r.dungeonprogresslight?.numbers(),
            shadow: r.dungeonprogressshadow?.numbers(),
            class: r.dungeonprogressclass?.numbers()
          }

          if (r.gtsave) {
            const v = r.gtsave.numbers()
            data.gtsave = {
              tokens: v[4],
              floor_max: v[7],
              floor: v[3]
            }
          }

          // Save version
          currentVersion = (r.serverversion as PlayaResponse).number
        } else if (r.ownplayersavecharacter) {
          // Prevent crash when looking at own player as it were someone else (game sends ownplayersavecharacter instead of otherplayersavecharacter)
          skip = true
        } else {
          data.own = false
          data.name = (r.otherplayername as PlayaResponse).string
          data.save = ((r.otherplayersavecharacter || r.otherplayer) as PlayaResponse).numbers()
          data.saveVersion = r.otherplayersavecharacter ? 2 : 1

          data.potions = r.otherplayersavepotions?.numbers()

          data.identifier = `${data.prefix}_p${data.save[data.saveVersion === 2 ? 1 : 0]}`
          data.class = data.save[20] % 65536

          // Optionals
          data.groupname = r.otherplayergroupname?.string
          // TODO: Replace with specific separator
          data.units = r.otherplayerunitlevel?.numbers(/\/|,/)
          data.achievements = r.otherplayerachievement?.numbers() || r.achievement?.numbers()
          data.fortress = r.otherplayerfortressbuildingprogressinfo?.numbers()
          data.fortressrank = r.otherplayerfortressrank?.number
          data.pets = r.otherplayerpetbonus?.numbers()
          data.description = r.otherdescription?.string

          data.equippedItems = r.otherplayersaveequipment?.numbers()

          // Post-process
          if (data.saveVersion === 2) {
            if (data.save[65]) {
              data.group = `${data.prefix}_g${data.save[65]}`
            }
          } else {
            if (data.save[161]) {
              data.group = `${data.prefix}_g${data.save[161]}`
            }
          }
        }

        if (!skip && !players.find((p) => p.identifier === data.identifier)) {
          players.push(data)
        }
      }

      if (r.gtinternal) {
        for (const gtEntry of r.gtinternal.table) {
          const identifier = `${prefix}_p${gtEntry[0]}`

          bonusPool[identifier] = {
            gtsave: {
              tokens: parseInt(gtEntry[1]),
              floor_max: parseInt(gtEntry[5]),
              floor: parseInt(gtEntry[6])
            }
          }
        }
      }

      if (r.gtranking) {
        for (const gtEntry of r.gtranking.table) {
          bonusPoolByName[`${prefix}_g${gtEntry[1]}`] = {
            gtsave: {
              rank: parseInt(gtEntry[0]),
              tokens: parseInt(gtEntry[2])
            }
          }
        }
      }

      if (r.legendaries) {
        const lastOwnPlayer = players.find((player) => player.prefix === prefix && player.own)
        if (lastOwnPlayer) {
          lastOwnPlayer.scrapbook_legendary = r.legendaries.string
        }
      }
    }

    for (const player of players) {
      player.version = currentVersion

      const bonusEntry = bonusPool[player.identifier]
      if (bonusEntry) {
        Object.assign(player, bonusEntry)
      }
    }

    for (const group of groups) {
      const bonusEntry = bonusPoolByName[`${group.prefix}_g${group.name}`]
      if (bonusEntry) {
        Object.assign(group, bonusEntry)
      }
    }

    return { players, groups }
  }

  _value: string

  constructor(value: string) {
    this._value = value
  }

  numbers(delimiter: string | RegExp = '/') {
    return this._value.split(delimiter).map(Number)
  }

  mixed(delimiter: string | RegExp = '/') {
    return this._value.split(delimiter).map((value) => (isNaN(Number(value)) ? value : Number(value)))
  }

  strings(delimiter: string | RegExp = '/') {
    return this._value.split(delimiter)
  }

  get number() {
    return parseInt(this._value)
  }

  get string() {
    return this._value
  }

  get table() {
    return this._value
      .split(';')
      .filter((value) => value)
      .map((value) => value.split(',').filter((part) => part))
  }
}
