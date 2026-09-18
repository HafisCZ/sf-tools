<template>
  <SFDialog :title="localize('title')">
    <div class="flex flex-col gap-4">
      <div class="grid grid-cols-4 gap-[14px]">
        <SFInput ref="id-ref" :model-value="id" :label="`${localize('id')}:`" readonly class="text-center" />
        <div class="col-span-2">
          <SFInput ref="name-ref" v-model="name" :label="`${localize('name')}:`" />
        </div>
        <SFSelect ref="slot-ref" v-model="slot" :label="`${localize('slot')}:`" :options="slotOptions" />
      </div>
      <SFHeading level="5">{{ localize('player.primary') }}</SFHeading>
      <div class="grid grid-cols-2 gap-[14px]">
        <SFSelect ref="player-index-ref" v-model="playerRule.name" :label="`${localize('index')}:`" :options="playerIndexOptions" search />
        <div :class="{ 'pointer-events-none opacity-45': playerRule.name === 'none' }">
          <SFSelect ref="player-mode-ref" v-model="playerRule.mode" :label="`${localize('operation')}:`" :options="modeOptions" search />
        </div>
        <div :class="{ 'pointer-events-none opacity-45': playerRule.name === 'none' }">
          <SFExpressionInput ref="player-value-ref" v-model="playerRule.value" :label="`${localize('value')} 1:`" :placeholder="localize('ast.primary')" :highlight="highlightPrimary" />
        </div>
        <div :class="{ 'pointer-events-none opacity-45': playerRule.name === 'none' || playerRule.mode !== 'between' }">
          <SFExpressionInput ref="player-value2-ref" v-model="playerRule.value2" :label="`${localize('value')} 2:`" :placeholder="localize('ast.primary')" :highlight="highlightPrimary" />
        </div>
      </div>
      <SFHeading level="5">{{ localize('player.secondary') }}</SFHeading>
      <SFExpressionInput ref="player-secondary-ref" v-model="playerRule.secondary" :label="`${localize('secondary')}:`" :placeholder="localize('ast.secondary')" :highlight="highlightPlayerSecondary" />
      <SFHeading level="5">{{ localize('group.primary') }}</SFHeading>
      <div class="grid grid-cols-2 gap-[14px]">
        <SFSelect ref="group-index-ref" v-model="groupRule.name" :label="`${localize('index')}:`" :options="groupIndexOptions" search />
        <div :class="{ 'pointer-events-none opacity-45': groupRule.name === 'none' }">
          <SFSelect ref="group-mode-ref" v-model="groupRule.mode" :label="`${localize('operation')}:`" :options="modeOptions" search />
        </div>
        <div :class="{ 'pointer-events-none opacity-45': groupRule.name === 'none' }">
          <SFExpressionInput ref="group-value-ref" v-model="groupRule.value" :label="`${localize('value')} 1:`" :placeholder="localize('ast.primary')" :highlight="highlightPrimary" />
        </div>
        <div :class="{ 'pointer-events-none opacity-45': groupRule.name === 'none' || groupRule.mode !== 'between' }">
          <SFExpressionInput ref="group-value2-ref" v-model="groupRule.value2" :label="`${localize('value')} 2:`" :placeholder="localize('ast.primary')" :highlight="highlightPrimary" />
        </div>
      </div>
      <SFHeading level="5">{{ localize('group.secondary') }}</SFHeading>
      <SFExpressionInput ref="group-secondary-ref" v-model="groupRule.secondary" :label="`${localize('secondary')}:`" :placeholder="localize('ast.secondary')" :highlight="highlightGroupSecondary" />
    </div>

    <template #buttons>
      <SFButton block @click="emit('close', false)">
        {{ localize('cancel') }}
      </SFButton>
      <SFButton variant="primary" block :disabled="!isValid" @click="save">
        {{ localize('save') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, useTemplateRef, watch } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import SFExpressionInput from '@library/SFExpressionInput.vue'
import SFHeading from '@library/SFHeading.vue'
import SFInput from '@library/SFInput.vue'
import SFSelect from '@library/SFSelect.vue'
import { type SelectOption } from '@utils/components'
import { sha1 } from '@utils/hash'
import { useLocalize } from '@utils/localization'
import { useComponentValidation } from '@utils/validations'
import { getGroupProfileConfig, getPlayerProfileConfig } from '~/pages/stats/stats'
import { DEFAULT_EXPRESSION_CONFIG, type ExpressionConfig } from '~/script/expression-config'
import { Highlighter } from '~/script/highlighter'
import { ProfileManager, type ProfileRule } from '~/site/profiles'

defineOptions({
  name: 'ProfileCreateDialog'
})

const props = defineProps<{
  /**
   * Key of the edited profile, a new profile is created when missing
   */
  profileKey?: string
}>()

const emit = defineEmits<{
  close: [saved: boolean]
}>()

type RuleState = {
  name: string
  mode: string
  value: string
  value2: string
  secondary: string
}

const MODES = ['equals', 'above', 'below', 'between']

const localize = useLocalize('dialog.profile_create')

const profile = props.profileKey ? ProfileManager.getProfile(props.profileKey) : undefined

const id = props.profileKey || sha1(String(Date.now())).slice(0, 4)
const name = ref(props.profileKey ? profile?.name || `${localize('profile')} ${props.profileKey}` : '')
const slot = ref(String(profile?.slot || ''))

const playerRule = reactive(createRuleState(profile?.primary, profile?.secondary))
const groupRule = reactive(createRuleState(profile?.primary_g, profile?.secondary_g))

const isValid = useComponentValidation(
  useTemplateRef('id-ref'),
  useTemplateRef('name-ref'),
  useTemplateRef('slot-ref'),
  useTemplateRef('player-index-ref'),
  useTemplateRef('player-mode-ref'),
  useTemplateRef('player-value-ref'),
  useTemplateRef('player-value2-ref'),
  useTemplateRef('player-secondary-ref'),
  useTemplateRef('group-index-ref'),
  useTemplateRef('group-mode-ref'),
  useTemplateRef('group-value-ref'),
  useTemplateRef('group-value2-ref'),
  useTemplateRef('group-secondary-ref')
)

const slotOptions = computed<SelectOption[]>(() => [{ value: '', label: localize('default') }, ...[1, 2, 3, 4, 5].map((value) => ({ value: String(value), label: String(value) }))])

const modeOptions = computed<SelectOption[]>(() => MODES.map((value) => ({ value, label: localize(value) })))

const playerIndexOptions = computed(() => createIndexOptions(['none', 'own', 'identifier', 'timestamp', 'group', 'prefix', 'tag']))

const groupIndexOptions = computed(() => createIndexOptions(['none', 'own', 'identifier', 'timestamp', 'prefix']))

for (const rule of [playerRule, groupRule]) {
  watch(
    () => rule.name,
    (value) => {
      if (value === 'none') {
        rule.value = ''
        rule.value2 = ''
      }
    }
  )
}

function createRuleState(rule: ProfileRule | null | undefined, secondary: string | null | undefined): RuleState {
  return {
    name: rule?.name ?? 'none',
    mode: rule?.mode ?? 'equals',
    value: rule?.value[0] || '',
    value2: rule?.value[1] || '',
    secondary: secondary ?? ''
  }
}

function createIndexOptions(names: string[]): SelectOption[] {
  return names.map((value) => ({ value, label: value === 'none' ? localize('none') : value.charAt(0).toUpperCase() + value.slice(1) }))
}

function highlight(value: string, config: ExpressionConfig) {
  return { html: Highlighter.expression(value || '', undefined, config).text }
}

function highlightPrimary(value: string) {
  return highlight(value, DEFAULT_EXPRESSION_CONFIG)
}

function highlightPlayerSecondary(value: string) {
  return highlight(value, getPlayerProfileConfig())
}

function highlightGroupSecondary(value: string) {
  return highlight(value, getGroupProfileConfig())
}

function createRule({ name, mode, value, value2 }: RuleState): ProfileRule | null {
  return name === 'none' ? null : { name, mode, value: mode === 'between' ? [value, value2] : [value] }
}

function save() {
  ProfileManager.setProfile(
    id,
    Object.assign(profile || {}, {
      name: name.value || `${localize('profile')} ${id}`,
      slot: slot.value,
      primary: createRule(playerRule),
      secondary: playerRule.secondary,
      primary_g: createRule(groupRule),
      secondary_g: groupRule.secondary
    })
  )

  emit('close', true)
}
</script>
