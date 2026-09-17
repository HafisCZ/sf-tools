import { shallowRef } from 'vue'
import { globalLocalize } from '@utils/localization'
import { copyJson, mergeDeep, scaleValue } from '@utils/utils'

/**
 * Simulator config by group, such as `General` or `Warrior`
 */
export type SimulatorConfig = Record<string, Record<string, unknown>>

/**
 * Where a simulation log goes: downloaded as a file, or opened in the analyzer
 */
export type SimulatorLogTarget = 'file' | 'broadcast'

/**
 * Whether the page was opened with `debug` in its URL, which shows the simulator debug tools
 */
export const isSimulatorDebug = new URLSearchParams(window.location.search).has('debug')

/**
 * Config set in the simulator config dialog, `null` while the simulators use their defaults
 */
export const simulatorConfig = shallowRef<SimulatorConfig | null>(null)

/**
 * Copy of the default simulator config
 */
export function getDefaultSimulatorConfig() {
  return mergeDeep({}, CONFIG) as SimulatorConfig
}

/**
 * Label of a config value from its path without the group, such as `Health Multiplier` for `['Warrior', 'HealthMultiplier']`
 */
export function formatSimulatorConfigKey(path: string[]) {
  return path
    .slice(1)
    .map((key) => key.replace(/([A-Z])/g, ' $1').trim())
    .join(' - ')
}

/**
 * Copies data together with the current config, so pasting it into a simulator page brings the config along
 */
export function copySimulatorData(data: unknown) {
  void copyJson({ config: simulatorConfig.value, data, type: 'custom' })
}

// Data copied with copySimulatorData
type CopiedSimulatorData = {
  data: unknown
  config: SimulatorConfig | null
}

function isCopiedSimulatorData(value: unknown): value is CopiedSimulatorData {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'custom'
}

/**
 * Unwraps data copied with its config, which is applied in debug mode. Any other value is returned as it is.
 */
export function handleSimulatorPaste(value: unknown) {
  if (isCopiedSimulatorData(value)) {
    if (isSimulatorDebug) {
      simulatorConfig.value = value.config ?? null
    }

    return value.data
  }

  return value
}

/**
 * Turns a sample of a Warrior into one player of every class, with its values scaled to that class
 *
 * @param suffix - Added to the name of every player
 */
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

// The main attribute of the sample becomes the main attribute of the new class, and its side attributes keep their order
function swapAttributes(data: PlayerModel, from: MainAttribute, to: MainAttribute) {
  const values = PlayerModel.ATTRIBUTE_ORDER_BY_ATTRIBUTE[from].map((attribute) => ({ Base: data[attribute].Base, Total: data[attribute].Total }))

  PlayerModel.ATTRIBUTE_ORDER_BY_ATTRIBUTE[to].forEach((attribute, index) => {
    data[attribute].Base = values[index].Base
    data[attribute].Total = values[index].Total
  })
}

/**
 * Player model of data that is either a model already or raw player data from the game, with the weapons corrected
 */
export function preparePlayerData(data: unknown) {
  const player = hasClass(data) ? data : new PlayerModel(data)

  ItemModel.forceCorrectRune(player.Items.Wpn1)
  ItemModel.forceCorrectRune(player.Items.Wpn2)

  if (Number(player.Class) === WARRIOR && player.BlockChance === undefined) {
    player.BlockChance = player.Items.Wpn2.DamageMin
  }

  if (Number(player.Class) !== ASSASSIN) {
    player.Items.Wpn2 = ItemModel.empty()
  }

  return player
}

function hasClass(value: unknown): value is PlayerModel {
  return typeof value === 'object' && value !== null && 'Class' in value && Boolean(value.Class)
}

/**
 * Downloads the log as a JSON file, or opens the analyzer in a new tab and sends the log to it
 */
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
