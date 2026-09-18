<template>
  <SFDialog :title="localize('title')" size="lg">
    <div class="flex flex-col">
      <details v-for="group in groups" :key="group.name">
        <summary class="cursor-pointer border-b border-line py-2 text-lg font-bold text-white hover:text-accent">{{ group.name }}</summary>
        <div class="mb-4 flex flex-col gap-3 pt-3">
          <div v-for="row in group.rows" :key="row[0].path" class="grid auto-cols-fr grid-flow-col items-end gap-[14px]">
            <template v-for="field in row" :key="field.path">
              <SFInput v-if="field.type === 'text'" ref="field-refs" v-model="textValues[field.path]" :label="field.label" />
              <SFCheckbox v-else-if="field.type === 'checkbox'" ref="field-refs" v-model="checkboxValues[field.path]" :label="field.label" />
              <SFNumber v-else ref="field-refs" v-model="numberValues[field.path]" :label="field.label" />
            </template>
          </div>
        </div>
      </details>
    </div>

    <template #buttons>
      <SFButton block @click="emit('close')">
        {{ localize('cancel') }}
      </SFButton>
      <SFButton block @click="reset">
        {{ localize('reset') }}
      </SFButton>
      <SFButton variant="primary" block :disabled="!isValid" @click="apply">
        {{ localize('ok') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { reactive, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFCheckbox from '@library/SFCheckbox.vue'
import SFDialog from '@library/SFDialog.vue'
import SFInput from '@library/SFInput.vue'
import SFNumber from '@library/SFNumber.vue'
import { useLocalize } from '@utils/localization'
import { dig } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import { formatSimulatorConfigKey, getDefaultSimulatorConfig, type SimulatorConfig } from '../debug'

defineOptions({
  name: 'SimulatorConfigDialog'
})

const props = defineProps<{
  /**
   * Config shown when the dialog opens, the default config when `null`
   */
  config: SimulatorConfig | null
}>()

const emit = defineEmits<{
  close: [config?: SimulatorConfig]
}>()

type ConfigField = {
  path: string
  label: string
  type: 'text' | 'checkbox' | 'number'
}

type ConfigGroup = {
  name: string
  rows: ConfigField[][]
}

const localize = useLocalize('dialog.simulator_debug')

const defaultConfig = getDefaultSimulatorConfig()

const groups: ConfigGroup[] = Object.entries(defaultConfig).map(([name, group]) => ({ name, rows: collectRows(group, [name]) }))

const textValues = reactive<Record<string, string>>({})
const checkboxValues = reactive<Record<string, boolean>>({})
const numberValues = reactive<Record<string, number | null>>({})

const isValid = useComponentValidation(useTemplateRef('field-refs'))

setValues(props.config ?? defaultConfig)

function getFieldType(value: unknown): ConfigField['type'] {
  if (typeof value === 'string') {
    return 'text'
  } else if (typeof value === 'boolean') {
    return 'checkbox'
  } else {
    return 'number'
  }
}

function collectRows(group: object, path: string[]) {
  const rows: ConfigField[][] = []

  for (const [key, value] of Object.entries(group)) {
    const keyPath = [...path, key]
    const label = formatSimulatorConfigKey(keyPath)

    if (Array.isArray(value) && typeof value[0] !== 'object') {
      if (value.length > 0) {
        rows.push(value.map((item: unknown, index) => ({ path: [...keyPath, index].join('.'), label: `${label} - ${index + 1}`, type: getFieldType(item) })))
      }
    } else if (typeof value === 'object' && value !== null) {
      rows.push(...collectRows(value, keyPath))
    } else {
      rows.push([{ path: keyPath.join('.'), label, type: getFieldType(value) }])
    }
  }

  return rows
}

function setValues(config: SimulatorConfig) {
  for (const { rows } of groups) {
    for (const field of rows.flat()) {
      const value = dig(config, ...field.path.split('.'))

      if (field.type === 'text') {
        textValues[field.path] = String(value)
      } else if (field.type === 'checkbox') {
        checkboxValues[field.path] = Boolean(value)
      } else {
        numberValues[field.path] = typeof value === 'number' ? value : null
      }
    }
  }
}

function readField(path: string, defaultValue: unknown) {
  switch (getFieldType(defaultValue)) {
    case 'text':
      return textValues[path]
    case 'checkbox':
      return checkboxValues[path]
    default:
      return numberValues[path] ?? defaultValue
  }
}

function readValue(value: unknown, path: string[]): unknown {
  if (Array.isArray(value)) {
    return value.map((item: unknown, index) => (typeof item === 'object' ? readValue(item, [...path, String(index)]) : readField([...path, index].join('.'), item)))
  } else if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, readValue(item, [...path, key])]))
  } else {
    return readField(path.join('.'), value)
  }
}

function reset() {
  setValues(defaultConfig)
}

function apply() {
  emit('close', readValue(defaultConfig, []) as SimulatorConfig)
}
</script>
