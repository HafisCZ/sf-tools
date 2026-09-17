<template>
  <template v-if="isSimulatorDebug">
    <SFTooltip :content="localize('configure')">
      <SFButton variant="ghost" icon :aria-label="localize('configure')" @click="openConfig">
        <SFIcon name="wrench" />
      </SFButton>
    </SFTooltip>
    <SFTooltip v-if="props.logs" :content="localize('configure_log')">
      <SFDropdown :items="logItems" :label="localize('configure_log')">
        <SFIcon name="file-zipper" />
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
import { computed } from 'vue'
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
import { formatSimulatorConfigKey, getDefaultSimulatorConfig, isSimulatorDebug, simulatorConfig, type SimulatorConfig, type SimulatorLogTarget } from '../debug'

defineOptions({
  name: 'SimulatorDebug'
})

const props = defineProps<{
  /**
   * Shows a menu that runs the simulation with logging and saves the log
   */
  logs?: boolean
}>()

const emit = defineEmits<{
  log: [target: SimulatorLogTarget]
}>()

type ConfigDifference = {
  label: string
  from: string
  to: string
}

const localize = useLocalize('simulator')

const logItems = computed<DropdownItem[]>(() => [
  { label: localize('configure_log_file'), action: () => emit('log', 'file') },
  { label: localize('configure_log_broadcast'), action: () => emit('log', 'broadcast') }
])

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
