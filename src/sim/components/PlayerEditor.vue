<template>
  <div class="flex flex-col gap-2">
    <SFTabs v-if="slots.equipment" v-model="mode" :options="modeOptions" class="justify-end" />

    <div class="flex flex-col gap-[14px] rounded-md border border-line bg-surface p-2">
      <div v-if="!props.nameHidden" class="flex items-end gap-2">
        <div class="min-w-0 flex-1">
          <SFInput ref="name-ref" v-model="name" :label="localize('name')" :readonly="props.nameReadonly" />
        </div>
        <SFTooltip v-if="!props.companion && !isCharacterMode" :content="localize('smart_change')">
          <SFDropdown :items="changeClassItems" :label="localize('smart_change')" variant="outline" float="left">
            <SFIcon name="arrow-right-arrow-left" />
          </SFDropdown>
        </SFTooltip>
        <SFTooltip :content="localize('copy')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('copy')" @click="emit('copy', read())">
            <SFIcon name="copy" />
          </SFButton>
        </SFTooltip>
      </div>
      <div class="grid grid-cols-2 gap-[14px]">
        <SFSelect v-if="!props.classHidden" ref="class-ref" v-model="classId" :label="localize('class')" :options="classOptions" search :readonly="props.companion || isCharacterMode" />
        <SFNumber ref="level-ref" v-model="level" :label="localize('level')" placeholder="1 - 999" required :min="1" :max="999" :step="1" centered :readonly="props.companion" />
      </div>
      <div v-if="props.snacks" v-show="!isCharacterMode" class="grid grid-cols-2 gap-[14px]">
        <SFSelect ref="snack-ref" v-model="snack" :label="localize('snack')" :options="snackOptions" />
        <SFSelect ref="snack-potency-ref" v-model="snackPotency" :label="localize('snack_potency')" :options="SNACK_POTENCY_OPTIONS" />
      </div>
      <div v-show="!isCharacterMode" class="grid grid-cols-5 gap-[14px]">
        <SFNumber ref="strength-ref" v-model="strength" :label="localize.global('general.attribute1')" required :min="1" :step="1" centered />
        <SFNumber ref="dexterity-ref" v-model="dexterity" :label="localize.global('general.attribute2')" required :min="1" :step="1" centered />
        <SFNumber ref="intelligence-ref" v-model="intelligence" :label="localize.global('general.attribute3')" required :min="1" :step="1" centered />
        <SFNumber ref="constitution-ref" v-model="constitution" :label="localize.global('general.attribute4')" required :min="1" :step="1" centered />
        <SFNumber ref="luck-ref" v-model="luck" :label="localize.global('general.attribute5')" :min="0" :step="1" centered />
      </div>
    </div>

    <slot v-if="isCharacterMode" name="equipment" />

    <div v-for="(weapon, index) in visibleWeapons" v-show="!isCharacterMode" :key="index" class="grid grid-cols-5 gap-[14px] rounded-md border border-line bg-surface p-2">
      <SFNumber ref="weapon-refs" v-model="weapon.min" :label="localize('min')" :placeholder="localize('min_placeholder')" :min="0" :step="1" centered />
      <SFNumber ref="weapon-refs" v-model="weapon.max" :label="localize('max')" :placeholder="localize('max_placeholder')" :min="0" :step="1" centered />
      <SFSelect ref="weapon-refs" v-model="weapon.enchantment" :label="localize('weapon_enchant')" :options="yesNoOptions" />
      <SFSelect ref="weapon-refs" v-model="weapon.rune" :label="localize('rune')" :options="runeOptions" />
      <div class="flex flex-col gap-1.5">
        <span class="font-bold" aria-hidden="true">&nbsp;</span>
        <SFNumber ref="weapon-refs" v-model="weapon.runeValue" :aria-label="localize('rune')" placeholder="0 - 60" :min="0" :max="60" :step="1" centered />
      </div>
    </div>

    <div v-show="!isCharacterMode" class="grid auto-cols-fr grid-flow-col gap-[14px] rounded-md border border-line bg-surface p-2">
      <SFNumber ref="armor-ref" v-model="armor" :label="localize('armor')" :placeholder="localize('armor_placeholder')" :min="0" :step="1" centered />
      <SFNumber v-if="hasBlockChance" ref="block-chance-ref" v-model="blockChance" :label="localize('block')" placeholder="0 - 25" :min="0" :max="25" :step="1" centered />
      <SFNumber ref="resistance-fire-ref" v-model="resistanceFire" :label="localize('fire')" placeholder="0 - 75" :min="0" :max="75" :step="1" centered />
      <SFNumber ref="resistance-cold-ref" v-model="resistanceCold" :label="localize('cold')" placeholder="0 - 75" :min="0" :max="75" :step="1" centered />
      <SFNumber ref="resistance-lightning-ref" v-model="resistanceLightning" :label="localize('lightning')" placeholder="0 - 75" :min="0" :max="75" :step="1" centered />
    </div>

    <div class="grid grid-cols-3 gap-[14px] rounded-md border border-line bg-surface p-2">
      <SFNumber ref="portal-health-ref" v-model="portalHealth" :label="localize('portal_health')" placeholder="0 - 50" :min="0" :max="50" :step="1" centered :readonly="props.companion" />
      <SFNumber ref="portal-damage-ref" v-model="portalDamage" :label="localize('portal_damage')" placeholder="0 - 50" :min="0" :max="50" :step="1" centered :readonly="props.companion" />
      <SFNumber ref="gladiator-ref" v-model="gladiator" :label="localize('gladiator')" placeholder="0 - 15" :min="0" :max="15" :step="1" centered :readonly="props.companion" />
    </div>

    <div v-show="!isCharacterMode" class="grid grid-cols-3 gap-[14px] rounded-md border border-line bg-surface p-2">
      <SFNumber ref="rune-health-ref" v-model="runeHealth" :label="localize('rune_health')" placeholder="0 - 15" :min="0" :max="15" :step="1" centered />
      <SFSelect ref="life-potion-ref" v-model="lifePotion" :label="localize('life_potion')" :options="lifePotionOptions" :readonly="props.companion" />
      <SFSelect ref="hand-enchantment-ref" v-model="handEnchantment" :label="localize('hand_enchant')" :options="yesNoOptions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, toRef, useTemplateRef, watch, type Ref } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDropdown from '@library/SFDropdown.vue'
import SFIcon from '@library/SFIcon.vue'
import SFInput from '@library/SFInput.vue'
import SFNumber from '@library/SFNumber.vue'
import SFSelect from '@library/SFSelect.vue'
import SFTabs from '@library/SFTabs.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { isSelectable, type DropdownItem, type SelectOption } from '@utils/components'
import { useLocalize } from '@utils/localization'
import { useToast } from '@utils/toasts'
import { getClassImageUrl, getValueAtPath, sequence, setValueAtPath } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import { PlayerModel } from '~/core/models/player'
import { changePlayerClass } from '~/integration/cheats'
import { ASSASSIN, CONFIG, RUNE_AUTO_DAMAGE, RUNE_COLD_DAMAGE, RUNE_FIRE_DAMAGE, RUNE_LIGHTNING_DAMAGE, SNACKS, WARRIOR } from '~/sim/base'

defineOptions({
  name: 'PlayerEditor'
})

const props = defineProps<{
  /**
   * Shows the snack and snack strength fields
   */
  snacks?: boolean
  /**
   * Makes the name field read only
   */
  nameReadonly?: boolean
  /**
   * Hides the name field and the buttons next to it, and leaves the name out of the player
   */
  nameHidden?: boolean
  /**
   * Hides the class field and leaves the class out of the player
   */
  classHidden?: boolean
  /**
   * Locks the class, level, portal, gladiator and life potion fields, and hides the block chance and class change
   */
  companion?: boolean
  /**
   * Shows the button that replaces the fields with the equipment slot
   */
  equipment?: boolean
}>()

const emit = defineEmits<{
  copy: [player: PlayerModel]
  /**
   * The item view was opened or closed
   */
  view: [open: boolean]
}>()

const slots = defineSlots<{
  /**
   * Shown in place of the fields while the character tab is on, and the reason the tabs show at all
   */
  equipment?(): unknown
}>()

defineExpose({
  read,
  fill,
  get isValid() {
    return isValid.value
  }
})

type EditorMode = 'raw' | 'character'

type EditorField = {
  path: string
  getText: () => string
  set: (value: unknown) => void
  reset: () => void
  isVisible: () => boolean
}

type WeaponFields = {
  min: number | null
  max: number | null
  enchantment: string
  rune: string
  runeValue: number | null
}

const SNACK_POTENCY_OPTIONS: SelectOption[] = sequence(11).map((value) => ({ value: String(value * 2), label: `${value * 2} %` }))

const localize = useLocalize('editor')

const mode = ref<EditorMode>('raw')

const isCharacterMode = computed(() => props.equipment === true && mode.value === 'character')

const modeOptions = computed<SelectOption<EditorMode>[]>(() => [
  { value: 'raw', label: localize('mode.raw') },
  { value: 'character', label: localize('mode.character'), disabled: !props.equipment }
])

const name = ref('')
const classId = ref(String(WARRIOR))
const level = ref<number | null>(null)
const snack = ref('')
const snackPotency = ref('0')
const strength = ref<number | null>(null)
const dexterity = ref<number | null>(null)
const intelligence = ref<number | null>(null)
const constitution = ref<number | null>(null)
const luck = ref<number | null>(null)
const weapons = reactive([createWeaponFields(), createWeaponFields()])
const armor = ref<number | null>(null)
const blockChance = ref<number | null>(25)
const resistanceFire = ref<number | null>(null)
const resistanceCold = ref<number | null>(null)
const resistanceLightning = ref<number | null>(null)
const portalHealth = ref<number | null>(null)
const runeHealth = ref<number | null>(null)
const lifePotion = ref('0')
const portalDamage = ref<number | null>(null)
const gladiator = ref<number | null>(null)
const handEnchantment = ref('false')

const isValid = useComponentValidation(
  useTemplateRef('name-ref'),
  useTemplateRef('class-ref'),
  useTemplateRef('level-ref'),
  useTemplateRef('snack-ref'),
  useTemplateRef('snack-potency-ref'),
  useTemplateRef('strength-ref'),
  useTemplateRef('dexterity-ref'),
  useTemplateRef('intelligence-ref'),
  useTemplateRef('constitution-ref'),
  useTemplateRef('luck-ref'),
  useTemplateRef('weapon-refs'),
  useTemplateRef('armor-ref'),
  useTemplateRef('block-chance-ref'),
  useTemplateRef('resistance-fire-ref'),
  useTemplateRef('resistance-cold-ref'),
  useTemplateRef('resistance-lightning-ref'),
  useTemplateRef('portal-health-ref'),
  useTemplateRef('rune-health-ref'),
  useTemplateRef('life-potion-ref'),
  useTemplateRef('portal-damage-ref'),
  useTemplateRef('gladiator-ref'),
  useTemplateRef('hand-enchantment-ref')
)

const isWarrior = computed(() => classId.value === String(WARRIOR))

const hasBlockChance = computed(() => isWarrior.value && !props.companion)

// Only shown for Assassins, but always read
const visibleWeapons = computed(() => (classId.value === String(ASSASSIN) ? weapons : weapons.slice(0, 1)))

const classOptions = computed<SelectOption[]>(() => CONFIG.ids().map((id) => ({ value: String(id), label: localize.global(`general.class${id}`), image: getClassImageUrl(id) })))

const changeClassItems = computed<DropdownItem[]>(() => CONFIG.ids().map((id) => ({ label: localize.global(`general.class${id}`), image: getClassImageUrl(id), action: () => changeClass(id) })))

const snackOptions = computed<SelectOption[]>(() => [
  { value: '', label: localize('none') },
  ...Object.keys(SNACKS).map((key): SelectOption => ({
    value: key,
    label: localize(`snacks.${key.replace('_legendary', '')}`),
    image: `/res/snacks/gt_snack_${key.replace('_legendary', '')}.png`,
    accent: key.includes('_legendary')
  }))
])

const yesNoOptions = computed<SelectOption[]>(() => [
  { value: 'false', label: localize.global('general.no') },
  { value: 'true', label: localize.global('general.yes') }
])

const lifePotionOptions = computed<SelectOption[]>(() => [
  { value: '0', label: localize.global('general.no') },
  { value: '25', label: localize.global('general.yes') }
])

const runeOptions = computed<SelectOption[]>(() => [
  { value: '0', label: localize('none') },
  { value: String(RUNE_FIRE_DAMAGE), label: localize('fire') },
  { value: String(RUNE_COLD_DAMAGE), label: localize('cold') },
  { value: String(RUNE_LIGHTNING_DAMAGE), label: localize('lightning') },
  { value: String(RUNE_AUTO_DAMAGE), label: localize('auto') }
])

// Read and filled in this order, like legacy's editor
const fields: EditorField[] = [
  createTextField('Name', name, () => !props.nameHidden),
  createSelectField(
    'Class',
    classId,
    () => classOptions.value,
    String(WARRIOR),
    () => !props.classHidden
  ),
  createNumberField('Level', level),
  createNumberField('Armor', armor),
  createSelectField(
    'Snack',
    snack,
    () => snackOptions.value,
    '',
    () => props.snacks
  ),
  createSelectField(
    'SnackPotency',
    snackPotency,
    () => SNACK_POTENCY_OPTIONS,
    '0',
    () => props.snacks
  ),
  createNumberField('Runes.ResistanceFire', resistanceFire),
  createNumberField('Runes.ResistanceCold', resistanceCold),
  createNumberField('Runes.ResistanceLightning', resistanceLightning),
  createNumberField('Dungeons.Player', portalHealth),
  createNumberField('Dungeons.Group', portalDamage),
  createNumberField('Runes.Health', runeHealth),
  createNumberField('Fortress.Gladiator', gladiator),
  createSelectField('Potions.Life', lifePotion, () => lifePotionOptions.value, '0'),
  createSelectField('Items.Hand.HasEnchantment', handEnchantment, () => yesNoOptions.value, 'false'),
  createNumberField('BlockChance', blockChance, 25, () => hasBlockChance.value),
  createNumberField('Strength.Total', strength),
  createNumberField('Dexterity.Total', dexterity),
  createNumberField('Intelligence.Total', intelligence),
  createNumberField('Constitution.Total', constitution),
  createNumberField('Luck.Total', luck),
  ...weapons.flatMap((weapon, index) => [
    createNumberField(`Items.Wpn${index + 1}.DamageMin`, toRef(weapon, 'min')),
    createNumberField(`Items.Wpn${index + 1}.DamageMax`, toRef(weapon, 'max')),
    createSelectField(`Items.Wpn${index + 1}.HasEnchantment`, toRef(weapon, 'enchantment'), () => yesNoOptions.value, 'false'),
    createSelectField(`Items.Wpn${index + 1}.AttributeTypes.2`, toRef(weapon, 'rune'), () => runeOptions.value, '0'),
    createNumberField(`Items.Wpn${index + 1}.Attributes.2`, toRef(weapon, 'runeValue'))
  ])
]

function createWeaponFields(): WeaponFields {
  return {
    min: null,
    max: null,
    enchantment: 'false',
    rune: '0',
    runeValue: null
  }
}

function createTextField(path: string, model: Ref<string>, isVisible = () => true): EditorField {
  return {
    path,
    getText: () => model.value,
    set: (value) => {
      model.value = String(value)
    },
    reset: () => {
      model.value = ''
    },
    isVisible
  }
}

function createNumberField(path: string, model: Ref<number | null>, defaultValue: number | null = null, isVisible = () => true): EditorField {
  return {
    path,
    getText: () => (model.value === null ? '' : String(model.value)),
    set: (value) => {
      const text = String(value).trim()
      const number = Number(text)

      model.value = text === '' || !Number.isFinite(number) ? null : number
    },
    reset: () => {
      model.value = defaultValue
    },
    isVisible
  }
}

function createSelectField(path: string, model: Ref<string>, getOptions: () => SelectOption[], defaultValue: string, isVisible = () => true): EditorField {
  return {
    path,
    getText: () => model.value,
    set: (value) => {
      const text = String(value)

      if (getOptions().some((option) => isSelectable(option) && option.value === text)) {
        model.value = text
      }
    },
    reset: () => {
      model.value = defaultValue
    },
    isVisible
  }
}

function parseFieldText(text: string) {
  const number = Number(text)

  if (Number.isNaN(number)) {
    return text === 'true' ? true : text === 'false' ? false : text
  }

  return number
}

function read(target = new PlayerModel()) {
  for (const field of fields) {
    if (field.isVisible()) {
      setValueAtPath(target, field.path, parseFieldText(field.getText()))
    }
  }

  return target
}

function fill(data: unknown) {
  for (const field of fields) {
    const value = field.isVisible() ? getValueAtPath(data, field.path) : undefined

    if (value === undefined) {
      field.reset()
    } else {
      field.set(value)
    }
  }
}

watch(
  () => props.equipment,
  (value) => {
    if (!value) {
      mode.value = 'raw'
    }
  }
)

watch(isCharacterMode, (value) => emit('view', value))

function changeClass(newClass: CharacterClass) {
  if (isValid.value && Number(classId.value) !== newClass) {
    const data = read()

    changePlayerClass(data, newClass)

    fill(data)
  } else {
    useToast({ title: 'Class change failed', message: 'Please ensure your data is valid and you are not trying to convert into current class.', type: 'warning' })
  }
}
</script>
