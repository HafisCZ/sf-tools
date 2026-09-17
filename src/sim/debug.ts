import { shallowRef } from 'vue'
import { mergeDeep } from '@utils/utils'

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
