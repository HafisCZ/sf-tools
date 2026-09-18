import { COLOR_MAP } from '@utils/colors'
import { PlayerModel } from '~/core/models/player'

export class Constants {
  static #default: Constants | undefined
  static #defaultValues: Map<string, unknown> | undefined

  Values: Map<string, unknown>

  constructor(values: Map<string, unknown> | null = null) {
    this.Values = values || Constants.DEFAULT_CONSTANTS_VALUES
  }

  get(key: string) {
    return this.Values.get(key)
  }

  fetch(key: string) {
    return this.Values.has(key) ? this.Values.get(key) : key
  }

  has(key: string) {
    return this.Values.has(key)
  }

  add(key: string, value: unknown) {
    this.Values.set(`@${key}`, value)
  }

  keys() {
    return this.Values.keys()
  }

  static get DEFAULT() {
    return (this.#default ??= new this())
  }

  static get DEFAULT_CONSTANTS_VALUES() {
    return (this.#defaultValues ??= new Map<string, unknown>(
      [
        ...COLOR_MAP,
        ...Object.entries({
          green: '#00c851',
          orange: '#ffbb33',
          red: '#ff3547',
          blue: '#0064b4',
          '15min': 900000,
          '1hour': 3600000,
          '12hours': 43200000,
          '1day': 86400000,
          '3days': 259200000,
          '7days': 604800000,
          '21days': 1814400000,
          mount10: 1,
          mount20: 2,
          mount30: 3,
          mount50: 4,
          none: 0,
          warrior: 1,
          mage: 2,
          scout: 3,
          assassin: 4,
          battlemage: 5,
          berserker: 6,
          demonhunter: 7,
          druid: 8,
          bard: 9,
          necromancer: 10,
          paladin: 11,
          plaguedoctor: 12,
          empty: '',
          tiny: 40,
          small: 60,
          normal: 100,
          large: 160,
          huge: 200,
          scrapbook: PlayerModel.SCRAPBOOK_COUNT,
          max: -1,
          weapon: 1,
          shield: 2,
          breastplate: 3,
          shoes: 4,
          gloves: 5,
          helmet: 6,
          belt: 7,
          necklace: 8,
          ring: 9,
          talisman: 10
        })
      ].map((entry): [string, unknown] => [`@${entry[0]}`, entry[1]])
    ))
  }
}
