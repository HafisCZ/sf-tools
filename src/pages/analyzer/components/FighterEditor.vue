<template>
  <div class="flex flex-col gap-[14px] rounded-md border border-line bg-surface p-[14px]">
    <div class="flex items-end gap-2">
      <div class="min-w-0 flex-1">
        <SFInput ref="name-ref" v-model="name" :label="localize('name')" readonly class="text-center" />
      </div>
      <SFTooltip :content="localize.global('analyzer.autofill')">
        <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize.global('analyzer.autofill')" @click="emit('autofill')">
          <SFIcon name="box-archive" />
        </SFButton>
      </SFTooltip>
    </div>
    <div class="grid grid-cols-3 gap-[14px]">
      <SFSelect ref="class-ref" v-model="classId" :label="localize('class')" :options="classOptions" readonly />
      <SFNumber ref="level-ref" v-model="level" :label="localize('level')" readonly centered />
      <SFInput ref="health-ref" v-model="health" :label="localize.global('stats.player.health')" readonly class="text-center" />
    </div>
    <div class="grid grid-cols-5 gap-[14px]">
      <SFNumber ref="strength-ref" v-model="strength" :label="localize.global('general.attribute1')" readonly centered />
      <SFNumber ref="dexterity-ref" v-model="dexterity" :label="localize.global('general.attribute2')" readonly centered />
      <SFNumber ref="intelligence-ref" v-model="intelligence" :label="localize.global('general.attribute3')" readonly centered />
      <SFNumber ref="constitution-ref" v-model="constitution" :label="localize.global('general.attribute4')" readonly centered />
      <SFNumber ref="luck-ref" v-model="luck" :label="localize.global('general.attribute5')" readonly centered />
    </div>

    <SFHeading level="4" class="text-center">{{ localize.global('analyzer.form.editable_data') }}</SFHeading>

    <div v-for="(weapon, index) in visibleWeapons" :key="index" class="grid grid-cols-5 gap-[14px]">
      <SFNumber ref="weapon-refs" v-model="weapon.min" :label="localize('min')" :placeholder="localize('min_placeholder')" :min="0" :step="1" centered @update:model-value="handleInput" />
      <SFNumber ref="weapon-refs" v-model="weapon.max" :label="localize('max')" :placeholder="localize('max_placeholder')" :min="0" :step="1" centered @update:model-value="handleInput" />
      <SFSelect ref="weapon-refs" v-model="weapon.enchantment" :label="localize('weapon_enchant')" :options="yesNoOptions" @update:model-value="handleInput" />
      <SFSelect ref="weapon-refs" v-model="weapon.rune" :label="localize('rune')" :options="runeOptions" @update:model-value="handleInput" />
      <div class="flex flex-col gap-1.5">
        <span class="font-bold" aria-hidden="true">&nbsp;</span>
        <SFNumber ref="weapon-refs" v-model="weapon.runeValue" :aria-label="localize('rune')" placeholder="0 - 60" :min="0" :max="60" :step="1" centered @update:model-value="handleInput" />
      </div>
    </div>

    <div class="grid grid-cols-4 gap-[14px]">
      <SFNumber ref="armor-ref" v-model="armor" :label="localize('armor')" :placeholder="localize('armor_placeholder')" :min="0" :step="1" centered @update:model-value="handleInput" />
      <SFNumber ref="resistance-fire-ref" v-model="resistanceFire" :label="localize('fire')" placeholder="0 - 75" :min="0" :max="75" :step="1" centered @update:model-value="handleInput" />
      <SFNumber ref="resistance-cold-ref" v-model="resistanceCold" :label="localize('cold')" placeholder="0 - 75" :min="0" :max="75" :step="1" centered @update:model-value="handleInput" />
      <SFNumber ref="resistance-lightning-ref" v-model="resistanceLightning" :label="localize('lightning')" placeholder="0 - 75" :min="0" :max="75" :step="1" centered @update:model-value="handleInput" />
    </div>

    <div class="grid grid-cols-2 gap-[14px]">
      <SFNumber ref="portal-damage-ref" v-model="portalDamage" :label="localize('portal_damage')" placeholder="0 - 50" :min="0" :max="50" :step="1" centered @update:model-value="handleInput" />
      <SFNumber ref="gladiator-ref" v-model="gladiator" :label="localize('gladiator')" placeholder="0 - 15" :min="0" :max="15" :step="1" centered @update:model-value="handleInput" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, toRef, useTemplateRef, type Ref } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import SFInput from '@library/SFInput.vue'
import SFNumber from '@library/SFNumber.vue'
import SFSelect from '@library/SFSelect.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { isSelectable, type SelectOption } from '@utils/components'
import { formatSpacedNumber } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { getClassImageUrl, getValueAtPath } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import { type EditorWeapon, type Fighter, type FighterEditorData } from '~/pages/analyzer/analyzer'

defineOptions({
  name: 'FighterEditor'
})

const emit = defineEmits<{
  change: []
  autofill: []
}>()

defineExpose({
  read,
  fill,
  autofill,
  get isValid() {
    return isValid.value
  }
})

type EditorField = {
  path: string
  auto: boolean
  set: (value: unknown) => void
  reset: () => void
}

type WeaponFields = {
  min: number | null
  max: number | null
  enchantment: string
  rune: string
  runeValue: number | null
}

const localize = useLocalize('editor')

const name = ref('')
const classId = ref(String(WARRIOR))
const level = ref<number | null>(0)
const health = ref('0')
const strength = ref<number | null>(0)
const dexterity = ref<number | null>(0)
const intelligence = ref<number | null>(0)
const constitution = ref<number | null>(0)
const luck = ref<number | null>(0)
const weapons = reactive([createWeaponFields(), createWeaponFields()])
const armor = ref<number | null>(0)
const resistanceFire = ref<number | null>(0)
const resistanceCold = ref<number | null>(0)
const resistanceLightning = ref<number | null>(0)
const portalDamage = ref<number | null>(0)
const gladiator = ref<number | null>(0)

const isValid = useComponentValidation(
  useTemplateRef('name-ref'),
  useTemplateRef('class-ref'),
  useTemplateRef('level-ref'),
  useTemplateRef('health-ref'),
  useTemplateRef('strength-ref'),
  useTemplateRef('dexterity-ref'),
  useTemplateRef('intelligence-ref'),
  useTemplateRef('constitution-ref'),
  useTemplateRef('luck-ref'),
  useTemplateRef('weapon-refs'),
  useTemplateRef('armor-ref'),
  useTemplateRef('resistance-fire-ref'),
  useTemplateRef('resistance-cold-ref'),
  useTemplateRef('resistance-lightning-ref'),
  useTemplateRef('portal-damage-ref'),
  useTemplateRef('gladiator-ref')
)

const isAssassin = computed(() => classId.value === String(ASSASSIN))

const visibleWeapons = computed(() => (isAssassin.value ? weapons : weapons.slice(0, 1)))

const classOptions = computed<SelectOption[]>(() => CONFIG.ids().map((id) => ({ value: String(id), label: localize.global(`general.class${id}`), image: getClassImageUrl(id) })))

const yesNoOptions = computed<SelectOption[]>(() => [
  { value: 'false', label: localize.global('general.no') },
  { value: 'true', label: localize.global('general.yes') }
])

const runeOptions = computed<SelectOption[]>(() => [
  { value: '0', label: localize('none') },
  { value: String(RUNE_FIRE_DAMAGE), label: localize('fire') },
  { value: String(RUNE_COLD_DAMAGE), label: localize('cold') },
  { value: String(RUNE_LIGHTNING_DAMAGE), label: localize('lightning') },
  { value: String(RUNE_AUTO_DAMAGE), label: localize('auto') }
])

const fields: EditorField[] = [
  createTextField('Name', name),
  createSelectField('Class', classId, () => classOptions.value, String(WARRIOR)),
  createNumberField('Level', level),
  createNumberField('Armor', armor, true),
  {
    path: 'TotalHealth',
    auto: false,
    set: (value) => {
      health.value = formatSpacedNumber(Number(value))
    },
    reset: () => {
      health.value = '0'
    }
  },
  createNumberField('Runes.ResistanceFire', resistanceFire, true),
  createNumberField('Runes.ResistanceCold', resistanceCold, true),
  createNumberField('Runes.ResistanceLightning', resistanceLightning, true),
  createNumberField('Dungeons.Group', portalDamage, true),
  createNumberField('Fortress.Gladiator', gladiator, true),
  createNumberField('Strength.Total', strength),
  createNumberField('Dexterity.Total', dexterity),
  createNumberField('Intelligence.Total', intelligence),
  createNumberField('Constitution.Total', constitution),
  createNumberField('Luck.Total', luck),
  ...weapons.flatMap((weapon, index) => [
    createNumberField(`Items.Wpn${index + 1}.DamageMin`, toRef(weapon, 'min'), true),
    createNumberField(`Items.Wpn${index + 1}.DamageMax`, toRef(weapon, 'max'), true),
    createSelectField(`Items.Wpn${index + 1}.HasEnchantment`, toRef(weapon, 'enchantment'), () => yesNoOptions.value, 'false', true),
    createSelectField(`Items.Wpn${index + 1}.AttributeTypes.2`, toRef(weapon, 'rune'), () => runeOptions.value, '0', true),
    createNumberField(`Items.Wpn${index + 1}.Attributes.2`, toRef(weapon, 'runeValue'), true)
  ])
]

function createWeaponFields(): WeaponFields {
  return {
    min: 0,
    max: 0,
    enchantment: 'false',
    rune: '0',
    runeValue: 0
  }
}

function createTextField(path: string, model: Ref<string>): EditorField {
  return {
    path,
    auto: false,
    set: (value) => {
      model.value = String(value)
    },
    reset: () => {
      model.value = ''
    }
  }
}

function createNumberField(path: string, model: Ref<number | null>, auto = false): EditorField {
  return {
    path,
    auto,
    set: (value) => {
      const text = String(value).trim()
      const number = Number(text)

      model.value = text === '' || !Number.isFinite(number) ? null : number
    },
    reset: () => {
      model.value = 0
    }
  }
}

function createSelectField(path: string, model: Ref<string>, getOptions: () => SelectOption[], defaultValue: string, auto = false): EditorField {
  return {
    path,
    auto,
    set: (value) => {
      const text = String(value)

      model.value = getOptions().some((option) => isSelectable(option) && option.value === text) ? text : defaultValue
    },
    reset: () => {
      model.value = defaultValue
    }
  }
}

function setField(field: EditorField, value: unknown) {
  if (value === undefined) {
    field.reset()
  } else {
    field.set(value)
  }
}

function readWeapon(weapon: WeaponFields): EditorWeapon {
  return {
    DamageMin: weapon.min ?? 0,
    DamageMax: weapon.max ?? 0,
    HasEnchantment: weapon.enchantment === 'true',
    AttributeTypes: { 2: Number(weapon.rune) },
    Attributes: { 2: weapon.runeValue ?? 0 }
  }
}

function read(): FighterEditorData {
  return {
    Name: name.value,
    Class: Number(classId.value) as CharacterClass,
    Level: level.value ?? 0,
    Armor: armor.value ?? 0,
    TotalHealth: Number(health.value.replace(/ /g, '')),
    Runes: {
      ResistanceFire: resistanceFire.value ?? 0,
      ResistanceCold: resistanceCold.value ?? 0,
      ResistanceLightning: resistanceLightning.value ?? 0
    },
    Dungeons: {
      Group: portalDamage.value ?? 0
    },
    Fortress: {
      Gladiator: gladiator.value ?? 0
    },
    Strength: { Total: strength.value ?? 0 },
    Dexterity: { Total: dexterity.value ?? 0 },
    Intelligence: { Total: intelligence.value ?? 0 },
    Constitution: { Total: constitution.value ?? 0 },
    Luck: { Total: luck.value ?? 0 },
    Items: isAssassin.value ? { Wpn1: readWeapon(weapons[0]), Wpn2: readWeapon(weapons[1]) } : { Wpn1: readWeapon(weapons[0]) }
  }
}

// Health always comes from the fighter, everything else from `editable` when given
function fill(fighter: Fighter, editable?: object) {
  for (const field of fields) {
    setField(field, getValueAtPath(field.path === 'TotalHealth' ? fighter : (editable ?? fighter), field.path))
  }
}

function autofill(data: object) {
  for (const field of fields) {
    if (field.auto) {
      setField(field, getValueAtPath(data, field.path))
    }
  }
}

function handleInput() {
  void nextTick(() => {
    if (isValid.value) {
      emit('change')
    }
  })
}
</script>
