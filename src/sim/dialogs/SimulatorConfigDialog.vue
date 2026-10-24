<template>
  <SFDialog :title="localize('title')" size="xl" height="70vh" column>
    <div class="flex h-[70vh] min-h-0 gap-6">
      <SFTabs v-model="selectedGroup" :options="groupOptions" vertical class="w-48 shrink-0 overflow-y-auto border-r border-line pr-3">
        <template #option="{ option }">
          <span class="flex items-center gap-2">
            <span v-if="option.image && isIconName(option.image)" class="flex size-5 shrink-0 items-center justify-center">
              <SFIcon :name="option.image" />
            </span>
            <img v-else-if="option.image" :src="option.image" alt="" class="size-5 shrink-0 object-contain" />
            <span class="flex-1">{{ option.label }}</span>
            <span v-if="changedGroups.has(option.value)" class="size-1.5 shrink-0 rounded-full bg-accent" />
          </span>
        </template>
      </SFTabs>
      <div ref="content-ref" class="min-h-0 flex-1 overflow-y-auto pr-2">
        <div v-for="group in groups" v-show="group.key === selectedGroup" :key="group.key" class="flex flex-col gap-8">
          <section v-for="section in group.sections" :key="section.key" class="flex flex-col gap-4">
            <div v-if="section.title" class="border-b border-line pb-2">
              <SFHeading level="6">{{ section.title() }}</SFHeading>
              <SFParagraph v-if="section.description" type="muted" size="sm">{{ section.description() }}</SFParagraph>
            </div>
            <div v-for="block in section.blocks" :key="block.key" class="flex flex-col gap-4" :class="{ 'rounded-md border border-line p-4': block.title }">
              <SFHeading v-if="block.title" level="6" type="accent">{{ block.title() }}</SFHeading>
              <div class="grid grid-cols-3 items-start gap-x-[14px] gap-y-5">
                <div v-for="field in block.fields" :key="field.key" class="relative" :class="{ 'col-span-full': field.list }">
                  <fieldset v-if="field.list" class="min-w-0">
                    <legend class="mb-1.5 font-bold" :class="isFieldChanged(field) ? 'pr-8 text-accent' : 'text-white'">{{ field.label }}</legend>
                    <div class="grid grid-cols-3 items-start gap-[14px]">
                      <SFNumber v-for="(input, index) in field.inputs" :key="input.path" ref="field-refs" v-model="numberValues[input.path]" :aria-label="`${field.label} ${index + 1}`" />
                    </div>
                    <SFParagraph type="muted" size="sm" class="mt-1.5">{{ field.description() }}</SFParagraph>
                  </fieldset>
                  <SFInput v-else-if="field.input.type === 'text'" ref="field-refs" v-model="textValues[field.input.path]" :description="field.description()">
                    <template #label>
                      <span :class="{ 'pr-8 text-accent': isFieldChanged(field) }">{{ field.label }}</span>
                    </template>
                  </SFInput>
                  <SFCheckbox v-else-if="field.input.type === 'checkbox'" ref="field-refs" v-model="checkboxValues[field.input.path]" :description="field.description()" class="pt-[37px]">
                    <span :class="{ 'text-accent': isFieldChanged(field) }">{{ field.label }}</span>
                  </SFCheckbox>
                  <SFSelect v-else-if="field.input.type === 'select'" ref="field-refs" v-model="selectValues[field.input.path]" :options="field.input.options()" :description="field.description()">
                    <template #label>
                      <span :class="{ 'pr-8 text-accent': isFieldChanged(field) }">{{ field.label }}</span>
                    </template>
                  </SFSelect>
                  <SFNumber v-else ref="field-refs" v-model="numberValues[field.input.path]" :description="field.description()">
                    <template #label>
                      <span :class="{ 'pr-8 text-accent': isFieldChanged(field) }">{{ field.label }}</span>
                    </template>
                  </SFNumber>
                  <div v-if="isFieldChanged(field)" class="absolute -top-0.5 right-0">
                    <SFTooltip :content="localize('reset_field')">
                      <SFButton variant="ghost" size="sm" icon :aria-label="localize('reset_field')" @click="resetField(field)">
                        <SFIcon name="rotate-left" />
                      </SFButton>
                    </SFTooltip>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="section.opponents" class="grid grid-cols-3 items-center gap-x-[14px] gap-y-2">
              <span />
              <span v-for="column in OPPONENT_COLUMNS" :key="column" class="font-bold text-white">{{ localize(`opponents.${column}`) }}</span>
              <template v-for="row in section.opponents" :key="row.key">
                <span class="font-bold" :class="isRowChanged(row) ? 'text-accent' : 'text-white'">{{ row.label() }}</span>
                <div v-for="column in OPPONENT_COLUMNS" :key="column" class="flex items-center gap-2">
                  <div class="min-w-0 flex-1">
                    <SFNumber ref="field-refs" v-model="numberValues[row[column].path]" :aria-label="`${row.label()} ${localize(`opponents.${column}`)}`" />
                  </div>
                  <div class="w-6 shrink-0">
                    <SFTooltip v-if="isInputChanged(row[column])" :content="localize('reset_field')">
                      <SFButton variant="ghost" size="sm" icon :aria-label="localize('reset_field')" @click="resetInput(row[column])">
                        <SFIcon name="rotate-left" />
                      </SFButton>
                    </SFTooltip>
                  </div>
                </div>
              </template>
            </div>
          </section>
        </div>
      </div>
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
import { computed, reactive, ref, useTemplateRef, watch } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFCheckbox from '@library/SFCheckbox.vue'
import SFDialog from '@library/SFDialog.vue'
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import SFInput from '@library/SFInput.vue'
import SFNumber from '@library/SFNumber.vue'
import SFParagraph from '@library/SFParagraph.vue'
import SFSelect from '@library/SFSelect.vue'
import SFTabs from '@library/SFTabs.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { type SelectOption } from '@utils/components'
import { type IconName, isIconName } from '@utils/icons'
import { useLocalize } from '@utils/localization'
import { dig, getClassImageUrl } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import { DEFENSE_TYPE_BLOCK, DEFENSE_TYPE_BLOCK_HEAL, DEFENSE_TYPE_EVADE, DEFENSE_TYPE_MAGIC, DEFENSE_TYPE_NONE, SKIP_TYPE_CONTROL, SKIP_TYPE_DEFAULT } from '../base'
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

type SelectValue = string | number

type ConfigInput =
  | {
      type: 'text'
      path: string
      defaultValue: string
    }
  | {
      type: 'checkbox'
      path: string
      defaultValue: boolean
    }
  | {
      type: 'number'
      path: string
      defaultValue: number
      percent: boolean
    }
  | {
      type: 'select'
      path: string
      defaultValue: SelectValue
      options: () => SelectOption<SelectValue>[]
    }

type ConfigNumberInput = Extract<ConfigInput, { type: 'number' }>

type ConfigField = {
  key: string
  label: string
  description: () => string
} & (
  | {
      list: false
      input: ConfigInput
    }
  | {
      list: true
      inputs: ConfigNumberInput[]
    }
)

type ConfigBlock = {
  key: string
  title?: () => string
  fields: ConfigField[]
}

type OpponentRow = {
  key: string
  label: () => string
  multiplier: ConfigNumberInput
  bonus: ConfigNumberInput
}

type ConfigSection = {
  key: string
  title?: () => string
  description?: () => string
  blocks: ConfigBlock[]
  opponents?: OpponentRow[]
}

type ConfigGroup = {
  key: string
  label: () => string
  image: IconName | `/${string}`
  sections: ConfigSection[]
  inputs: ConfigInput[]
}

type FieldCategory = 'general' | 'stats' | 'skip' | 'ability' | 'opponents'

const FIELD_CATEGORIES: FieldCategory[] = ['general', 'stats', 'skip', 'ability']

const OPPONENT_COLUMNS = ['multiplier', 'bonus'] as const

const HIDDEN_KEYS = new Set(['ID', 'Name'])

const STAT_KEYS = new Set(['Attribute', 'HealthMultiplier', 'WeaponMultiplier', 'DamageMultiplier', 'MaximumDamageReduction', 'MaximumDamageReductionMultiplier'])

const SKIP_KEYS = new Set(['SkipChance', 'SkipLimit', 'SkipType', 'SkipVariant', 'UseBlockChance'])

const PERCENT_KEYS = new Set([
  'SkipChance',
  'CriticalChance',
  'CriticalChanceBonus',
  'ReviveChance',
  'ReviveChanceDecay',
  'SwoopChance',
  'SwoopChanceMin',
  'SwoopChanceMax',
  'SwoopChanceDecay',
  'SummonChance',
  'StanceChangeChance',
  'TinctureChance',
  'DaggerChance',
  'ScytheChance',
  'ReviveHealth',
  'ReviveHealthMin',
  'ReviveHealthDecay',
  'SealHealth',
  'SealHealthPerStack',
  'DaggerSacrifice',
  'HealMultiplier',
  'DamageBonus',
  'SwoopBonus',
  'EffectValues',
  'CriticalBonus',
  'CritGladiatorBonus',
  'CritEnchantmentBonus',
  'ReviveDamage',
  'ReviveDamageMin',
  'ReviveDamageDecay'
])

const ATTRIBUTES = ['Strength', 'Dexterity', 'Intelligence']

const SKIP_VARIANTS = [
  { value: DEFENSE_TYPE_NONE, name: 'none' },
  { value: DEFENSE_TYPE_BLOCK, name: 'block' },
  { value: DEFENSE_TYPE_EVADE, name: 'evade' },
  { value: DEFENSE_TYPE_MAGIC, name: 'magic' },
  { value: DEFENSE_TYPE_BLOCK_HEAL, name: 'block_heal' }
]

const localize = useLocalize('dialog.simulator_debug')

const defaultConfig = getDefaultSimulatorConfig()

const classIds = Object.fromEntries(Object.entries(defaultConfig).flatMap(([key, group]) => (typeof group.ID === 'number' ? [[key, group.ID] as const] : [])))

const opponentKeyPattern = new RegExp(`^(${Object.keys(classIds).join('|')})Damage(Multiplier|Bonus)$`)

const groups = Object.entries(defaultConfig).map(([key, group]) => createGroup(key, group))

const inputs = groups.flatMap((group) => group.inputs)

const inputsByPath = new Map(inputs.map((input) => [input.path, input]))

const selectedGroup = ref(groups[0].key)

const textValues = reactive<Record<string, string>>({})
const checkboxValues = reactive<Record<string, boolean>>({})
const numberValues = reactive<Record<string, number | null>>({})
const selectValues = reactive<Record<string, SelectValue>>({})

const contentElement = useTemplateRef('content-ref')

const isValid = useComponentValidation(useTemplateRef('field-refs'))

const groupOptions = computed(() => groups.map((group) => ({ value: group.key, label: group.label(), image: group.image })))

const changedGroups = computed(() => new Set(groups.filter((group) => group.inputs.some(isInputChanged)).map((group) => group.key)))

setValues(props.config ?? defaultConfig)

watch(selectedGroup, () => {
  contentElement.value?.scrollTo({ top: 0 })
})

function createGroup(key: string, group: Record<string, unknown>): ConfigGroup {
  const id = group.ID
  const entries = Object.entries(group).filter(([fieldKey]) => !HIDDEN_KEYS.has(fieldKey))

  const sections: ConfigSection[] = [
    ...FIELD_CATEGORIES.map((category): ConfigSection => ({
      key: category,
      title: category === 'general' ? undefined : () => localize(`sections.${category}`),
      blocks: [
        {
          key: category,
          fields: entries.filter(([fieldKey, value]) => !isNested(value) && getCategory(fieldKey, group) === category).map(([fieldKey, value]) => createField([key, fieldKey], value, group, () => localize(`fields.${fieldKey}`)))
        }
      ]
    })),
    ...entries.flatMap(([fieldKey, value]) => (isNested(value) ? [createNestedSection([key, fieldKey], value)] : [])),
    ...(typeof id === 'number' ? [createOpponentSection(key, group)] : [])
  ].filter((section) => section.opponents !== undefined || section.blocks.some((block) => block.fields.length > 0))

  return {
    key,
    label: typeof id === 'number' ? () => localize.global(`general.class${id}`) : () => localize('general'),
    image: typeof id === 'number' ? getClassImageUrl(id as CharacterClass) : 'gear',
    sections,
    inputs: sections.flatMap((section) => [...section.blocks.flatMap((block) => block.fields.flatMap(getFieldInputs)), ...(section.opponents ?? []).flatMap((row) => [row.multiplier, row.bonus])])
  }
}

function createOpponentSection(key: string, group: Record<string, unknown>): ConfigSection {
  return {
    key: 'opponents',
    title: () => localize('sections.opponents'),
    description: () => localize('opponents.description'),
    blocks: [],
    opponents: Object.entries(classIds).map(([opponent, id]) => ({
      key: opponent,
      label: () => localize.global(`general.class${id}`),
      multiplier: { type: 'number', path: `${key}.${opponent}DamageMultiplier`, defaultValue: Number(group[`${opponent}DamageMultiplier`]), percent: false },
      bonus: { type: 'number', path: `${key}.${opponent}DamageBonus`, defaultValue: Number(group[`${opponent}DamageBonus`]), percent: true }
    }))
  }
}

function createNestedSection(path: string[], value: Record<string, unknown> | Record<string, unknown>[]): ConfigSection {
  const key = path[path.length - 1]
  const title = formatSimulatorConfigKey(path)

  return {
    key: path.join('.'),
    title: () => title,
    description: () => localize(`groups.${key}`),
    blocks: Array.isArray(value) ? value.map((item, index) => createBlock([...path, String(index)], item, getItemTitle(key, item, index))) : [createBlock(path, value)]
  }
}

function createBlock(path: string[], item: Record<string, unknown>, title?: () => string): ConfigBlock {
  return {
    key: path.join('.'),
    title,
    fields: Object.entries(item)
      .filter(([key, value]) => !HIDDEN_KEYS.has(key) && !isNested(value))
      .map(([key, value]) => createField([...path, key], value, item, () => localize(`state_fields.${key}`)))
  }
}

function createField(path: string[], value: unknown, group: Record<string, unknown>, description: () => string): ConfigField {
  const key = path[path.length - 1]
  const fieldPath = path.join('.')
  const percent = PERCENT_KEYS.has(key)
  const label = `${formatSimulatorConfigKey(path.slice(-2))}${percent ? ' (%)' : ''}`

  if (isNumberList(value)) {
    return {
      key: fieldPath,
      label,
      description,
      list: true,
      inputs: value.map((item, index) => ({ type: 'number', path: `${fieldPath}.${index}`, defaultValue: item, percent }))
    }
  } else {
    return {
      key: fieldPath,
      label,
      description,
      list: false,
      input: createInput(fieldPath, key, value, group, percent)
    }
  }
}

function createInput(path: string, key: string, value: unknown, group: Record<string, unknown>, percent: boolean): ConfigInput {
  const options = getSelectOptions(key, group)

  if (options && (typeof value === 'string' || typeof value === 'number')) {
    return { type: 'select', path, defaultValue: value, options }
  } else if (typeof value === 'string') {
    return { type: 'text', path, defaultValue: value }
  } else if (typeof value === 'boolean') {
    return { type: 'checkbox', path, defaultValue: value }
  } else {
    return { type: 'number', path, defaultValue: Number(value), percent }
  }
}

function getSelectOptions(key: string, group: Record<string, unknown>): (() => SelectOption<SelectValue>[]) | undefined {
  if (key === 'Attribute') {
    return () => ATTRIBUTES.map((attribute, index) => ({ value: attribute, label: localize.global(`general.attribute${index + 1}`) }))
  } else if (key === 'SkipType') {
    return () => [
      { value: SKIP_TYPE_DEFAULT, label: localize('options.skip_type.default') },
      { value: SKIP_TYPE_CONTROL, label: localize('options.skip_type.control') }
    ]
  } else if (key === 'SkipVariant') {
    return () => SKIP_VARIANTS.map(({ value, name }) => ({ value, label: localize(`options.skip_variant.${name}`) }))
  } else if (key === 'StanceInitial' && Array.isArray(group.Stances)) {
    const names = group.Stances.map((stance: unknown, index) => getItemName(stance) ?? String(index + 1))

    return () => names.map((label, value) => ({ value, label }))
  } else {
    return undefined
  }
}

function getCategory(key: string, group: Record<string, unknown>): FieldCategory {
  if (typeof group.ID !== 'number') {
    return 'general'
  } else if (STAT_KEYS.has(key)) {
    return 'stats'
  } else if (SKIP_KEYS.has(key)) {
    return 'skip'
  } else if (opponentKeyPattern.test(key)) {
    return 'opponents'
  } else {
    return 'ability'
  }
}

function getItemTitle(key: string, item: Record<string, unknown>, index: number) {
  const name = getItemName(item)

  return name ? () => name : () => localize(`items.${key}`, { index: index + 1 })
}

function getItemName(item: unknown) {
  if (typeof item === 'object' && item !== null && 'Name' in item && typeof item.Name === 'string') {
    return item.Name.charAt(0) + item.Name.slice(1).toLowerCase()
  } else {
    return undefined
  }
}

function isNumberList(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'number')
}

function isNested(value: unknown): value is Record<string, unknown> | Record<string, unknown>[] {
  return typeof value === 'object' && value !== null && !isNumberList(value)
}

function getFieldInputs(field: ConfigField): ConfigInput[] {
  return field.list ? field.inputs : [field.input]
}

function setInputValue(input: ConfigInput, value: unknown) {
  if (input.type === 'text') {
    textValues[input.path] = typeof value === 'string' ? value : input.defaultValue
  } else if (input.type === 'checkbox') {
    checkboxValues[input.path] = typeof value === 'boolean' ? value : input.defaultValue
  } else if (input.type === 'select') {
    selectValues[input.path] = typeof value === 'string' || typeof value === 'number' ? value : input.defaultValue
  } else {
    const number = typeof value === 'number' ? value : input.defaultValue

    numberValues[input.path] = input.percent ? Number((number * 100).toFixed(10)) : number
  }
}

function readInput(input: ConfigInput) {
  switch (input.type) {
    case 'text':
      return textValues[input.path]
    case 'checkbox':
      return checkboxValues[input.path]
    case 'select':
      return selectValues[input.path]
    default: {
      const value = numberValues[input.path]

      if (value === null) {
        return input.defaultValue
      } else {
        return input.percent ? value / 100 : value
      }
    }
  }
}

function isInputChanged(input: ConfigInput) {
  return readInput(input) !== input.defaultValue
}

function isFieldChanged(field: ConfigField) {
  return getFieldInputs(field).some(isInputChanged)
}

function isRowChanged(row: OpponentRow) {
  return isInputChanged(row.multiplier) || isInputChanged(row.bonus)
}

function setValues(config: SimulatorConfig) {
  for (const input of inputs) {
    setInputValue(input, dig(config, ...input.path.split('.')))
  }
}

function readValue(value: unknown, path: string[]): unknown {
  if (Array.isArray(value)) {
    return value.map((item: unknown, index) => readValue(item, [...path, String(index)]))
  } else if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, readValue(item, [...path, key])]))
  } else {
    const input = inputsByPath.get(path.join('.'))

    return input ? readInput(input) : value
  }
}

function resetInput(input: ConfigInput) {
  setInputValue(input, input.defaultValue)
}

function resetField(field: ConfigField) {
  for (const input of getFieldInputs(field)) {
    resetInput(input)
  }
}

function reset() {
  setValues(defaultConfig)
}

function apply() {
  emit('close', readValue(defaultConfig, []) as SimulatorConfig)
}
</script>
