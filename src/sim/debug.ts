import { shallowRef } from 'vue'
import { useLoader } from '@utils/loader'
import { globalLocalize } from '@utils/localization'
import { copyJson, mergeDeep, scaleValue } from '@utils/utils'
import { Broadcast } from '~/core/broadcast'
import { Exporter } from '~/core/exporter'
import { ItemModel } from '~/core/models/item'
import { PlayerModel } from '~/core/models/player'
import { type RawPlayer } from '~/data/types'
import { ASSASSIN, CONFIG, WARRIOR } from './base'

export type SimulatorConfig = Record<string, Record<string, unknown>>

export type SimulatorLogTarget = 'file' | 'broadcast'

export const isSimulatorDebug = new URLSearchParams(window.location.search).has('debug')

export const simulatorConfig = shallowRef<SimulatorConfig | null>(null)

// Copied before a page applies a custom config to CONFIG
const DEFAULT_CONFIG = mergeDeep({}, CONFIG) as SimulatorConfig

export function getDefaultSimulatorConfig() {
  return mergeDeep({}, DEFAULT_CONFIG) as SimulatorConfig
}

export function formatSimulatorConfigKey(path: string[]) {
  return path
    .slice(1)
    .map((key) => key.replace(/([A-Z])/g, ' $1').trim())
    .join(' - ')
}

export function copySimulatorData(data: unknown) {
  void copyJson({ config: simulatorConfig.value, data, type: 'custom' })
}

type CopiedSimulatorData = {
  data: unknown
  config: SimulatorConfig | null
}

function isCopiedSimulatorData(value: unknown): value is CopiedSimulatorData {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'custom'
}

export function handleSimulatorPaste(value: unknown) {
  if (isCopiedSimulatorData(value)) {
    if (isSimulatorDebug) {
      simulatorConfig.value = value.config ?? null
    }

    return value.data
  }

  return value
}

export function createPresetPlayers(sample: unknown, suffix?: string) {
  return CONFIG.ids().map((classId) => createPresetPlayer(sample, classId, suffix))
}

function createPresetPlayer(sample: unknown, classId: CharacterClass, suffix?: string) {
  const from = CONFIG.fromID(WARRIOR)
  const to = CONFIG.fromID(classId)

  const data = structuredClone(sample) as PlayerModel

  swapAttributes(data, from.Attribute, to.Attribute)

  data.Armor = scaleValue(data.Armor, from.MaximumDamageReduction, to.MaximumDamageReduction)
  data.Items.Wpn1.DamageMin = scaleValue(data.Items.Wpn1.DamageMin, from.WeaponMultiplier, to.WeaponMultiplier)
  data.Items.Wpn1.DamageMax = scaleValue(data.Items.Wpn1.DamageMax, from.WeaponMultiplier, to.WeaponMultiplier)

  if (classId === WARRIOR) {
    data.BlockChance = to.SkipChance * 100

    data.Items.Wpn2 = ItemModel.empty()
    data.Items.Wpn2.DamageMin = to.SkipChance * 100
  } else if (classId === ASSASSIN) {
    data.Items.Wpn2 = data.Items.Wpn1
  }

  data.Class = classId
  data.Name = `${globalLocalize(`general.class${classId}`)}${suffix ? ` - ${suffix}` : ''}`

  return data
}

function swapAttributes(data: PlayerModel, from: MainAttribute, to: MainAttribute) {
  const values = PlayerModel.ATTRIBUTE_ORDER_BY_ATTRIBUTE[from].map((attribute) => ({ Base: data[attribute].Base, Total: data[attribute].Total }))

  PlayerModel.ATTRIBUTE_ORDER_BY_ATTRIBUTE[to].forEach((attribute, index) => {
    data[attribute].Base = values[index].Base
    data[attribute].Total = values[index].Total
  })
}

export function preparePlayerData(data: unknown) {
  const player = hasClass(data) ? data : new PlayerModel(data as RawPlayer)

  ItemModel.forceCorrectRune(player.Items.Wpn1)
  ItemModel.forceCorrectRune(player.Items.Wpn2)

  if (Number(player.Class) === WARRIOR && player.BlockChance === undefined) {
    player.BlockChance = player.Items.Wpn2?.DamageMin ?? CONFIG.fromID(WARRIOR).SkipChance * 100
  }

  if (Number(player.Class) !== ASSASSIN) {
    player.Items.Wpn2 = ItemModel.empty()
  }

  return player
}

function hasClass(value: unknown): value is PlayerModel {
  return typeof value === 'object' && value !== null && 'Class' in value && Boolean(value.Class)
}

export function saveSimulatorLog(target: SimulatorLogTarget, data: unknown) {
  if (target === 'file') {
    Exporter.json(data, `simulator_log_${Exporter.time}`)
  } else {
    const broadcast = new Broadcast()

    broadcast.on('token', () => {
      broadcast.send('data', data)
      broadcast.close()
    })

    window.open(`${window.location.origin}/analyzer.html?debug&broadcast=${broadcast.token}`, '_blank')
  }
}

export function receiveSimulatorBroadcast(onData: (data: unknown) => void) {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('broadcast')

  if (token === null) return

  const loader = useLoader()
  const broadcast = new Broadcast(token)

  broadcast.on('data', (data) => {
    loader.start()

    try {
      onData(data)
    } finally {
      loader.stop()

      broadcast.close()
    }
  })

  broadcast.send('token', token)

  params.delete('broadcast')

  window.history.replaceState({}, document.title, `${window.location.origin}${window.location.pathname}?${params.toString().replace(/=&/g, '&').replace(/=$/, '')}`)
}
