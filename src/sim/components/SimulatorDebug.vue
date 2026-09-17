<template>
  <template v-if="isSimulatorDebug">
    <SFTooltip :content="localize('configure')">
      <SFButton variant="ghost" icon :aria-label="localize('configure')" @click="openConfig">
        <SFIcon name="wrench" />
      </SFButton>
    </SFTooltip>
    <SFTooltip v-if="props.copy" :content="localize('configure_copy')">
      <SFButton variant="ghost" icon :aria-label="localize('configure_copy')" @click="emit('copy')">
        <SFIcon name="copy" />
      </SFButton>
    </SFTooltip>
    <SFTooltip v-if="props.logs" :content="localize('configure_log')">
      <SFDropdown :items="logItems" :label="localize('configure_log')">
        <SFIcon name="file-zipper" />
      </SFDropdown>
    </SFTooltip>
    <SFTooltip v-if="props.presets" :content="localize('configure_insert')">
      <SFDropdown :items="presetItems" :label="localize('configure_insert')">
        <SFIcon name="list-check" />
      </SFDropdown>
    </SFTooltip>
    <Teleport to="body">
      <div v-if="differences.length > 0" class="fixed bottom-8 left-8 text-[90%] text-white">
        <div v-for="group in differences" :key="group.name">
          <SFHeading level="6" class="mt-2">{{ group.name }}</SFHeading>
          <div v-for="difference in group.items" :key="difference.label">
            {{ difference.label }}: <span class="text-red-400">{{ difference.from }}</span> -&gt; <span class="text-[greenyellow]">{{ difference.to }}</span>
          </div>
        </div>
      </div>
    </Teleport>
  </template>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDropdown from '@library/SFDropdown.vue'
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { type DropdownItem } from '@utils/components'
import { useDialog } from '@utils/dialogs'
import { useLocalize } from '@utils/localization'
import { dig } from '@utils/utils'
import SimulatorConfigDialog from '../dialogs/SimulatorConfigDialog.vue'
import SimulatorPresetDialog from '../dialogs/SimulatorPresetDialog.vue'
import { createPresetPlayers, formatSimulatorConfigKey, getDefaultSimulatorConfig, isSimulatorDebug, simulatorConfig, type SimulatorConfig, type SimulatorLogTarget } from '../debug'

defineOptions({
  name: 'SimulatorDebug'
})

const props = defineProps<{
  /**
   * Shows a menu that runs the simulation with logging and saves the log
   */
  logs?: boolean
  /**
   * Shows a button that copies the simulated data together with the config
   */
  copy?: boolean
  /**
   * Shows a menu that fills the page with a sample player of every class
   */
  presets?: boolean
}>()

const emit = defineEmits<{
  log: [target: SimulatorLogTarget]
  copy: []
  insert: [players: PlayerModel[]]
}>()

type ConfigDifference = {
  label: string
  from: string
  to: string
}

// One entry of js/sim/presets.json
type SimulatorPreset = {
  name: string
  suffix?: string
  data: unknown
}

const localize = useLocalize('simulator')

const presets = shallowRef<SimulatorPreset[]>([])

const logItems = computed<DropdownItem[]>(() => [
  { label: localize('configure_log_file'), action: () => emit('log', 'file') },
  { label: localize('configure_log_broadcast'), action: () => emit('log', 'broadcast') }
])

const presetItems = computed<DropdownItem[]>(() => [...presets.value.map((preset) => ({ label: preset.name, action: () => emit('insert', createPresetPlayers(preset.data, preset.suffix)) })), { label: localize('configure_insert_custom'), action: openPreset }])

if (isSimulatorDebug && props.presets) {
  void loadPresets()
}

// Values of the current config that differ from the defaults, by group
const differences = computed(() => {
  const config = simulatorConfig.value

  if (!config) return []

  const defaultConfig = getDefaultSimulatorConfig()

  return Object.keys(defaultConfig)
    .map((name) => ({ name, items: collectDifferences(defaultConfig, config, [name]) }))
    .filter((group) => group.items.length > 0)
})

function formatValue(value: unknown) {
  return Array.isArray(value) ? value.join(', ') : String(value)
}

function collectDifferences(defaultConfig: SimulatorConfig, config: SimulatorConfig, path: string[]): ConfigDifference[] {
  const defaultValue = dig(defaultConfig, ...path)
  const value = dig(config, ...path)

  if (Array.isArray(defaultValue) && typeof defaultValue[0] !== 'object') {
    if (Array.isArray(value) && value.some((item, index) => item !== defaultValue[index])) {
      return [{ label: formatSimulatorConfigKey(path), from: formatValue(defaultValue), to: formatValue(value) }]
    }
  } else if (typeof defaultValue === 'object' && defaultValue !== null) {
    return Object.keys(defaultValue).flatMap((key) => collectDifferences(defaultConfig, config, [...path, key]))
  } else if (value !== undefined && value !== defaultValue) {
    return [{ label: formatSimulatorConfigKey(path), from: formatValue(defaultValue), to: formatValue(value) }]
  }

  return []
}

async function loadPresets() {
  try {
    presets.value = (await fetch('/js/sim/presets.json').then((response) => response.json())) as SimulatorPreset[]
  } catch (e) {
    Logger.error(e, 'Simulator presets could not be loaded!')
  }
}

function openPreset() {
  useDialog(
    SimulatorPresetDialog,
    {},
    {
      callback: (player) => {
        if (player) {
          emit('insert', createPresetPlayers(player))
        }
      }
    }
  )
}

function openConfig() {
  useDialog(
    SimulatorConfigDialog,
    { config: simulatorConfig.value },
    {
      callback: (config) => {
        if (config) {
          simulatorConfig.value = config
        }
      }
    }
  )
}
</script>
