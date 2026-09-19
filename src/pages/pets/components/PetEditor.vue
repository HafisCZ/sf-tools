<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-col gap-[14px] rounded-md border border-line bg-surface p-2">
      <div class="grid grid-cols-3 gap-[14px]">
        <SFSelect ref="type-ref" :model-value="type" :label="localize('editor.type')" :options="typeOptions" @update:model-value="changeType" />
        <SFSelect ref="pet-ref" v-model="pet" :label="localize('editor.pet')" :options="petOptions" search />
        <div class="grid grid-cols-2 gap-[14px]">
          <SFSelect ref="boss-ref" v-model="boss" :label="localize('editor.habitat')" :options="bossOptions" />
          <div :inert="isBoss" :class="{ 'opacity-45': isBoss }">
            <SFNumber ref="level-ref" v-model="level" :label="localize.global('editor.level')" placeholder="1 - 200" required :min="1" :max="200" :step="1" centered />
          </div>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-[14px]" :inert="isBoss" :class="{ 'opacity-45': isBoss }">
        <SFNumber ref="at100-ref" v-model="at100" :label="localize('editor.at100.title')" :placeholder="localize('editor.at100.placeholder')" :min="0" :max="20" :step="1" centered />
        <SFNumber ref="at150-ref" v-model="at150" :label="localize('editor.at150.title')" :placeholder="localize('editor.at150.placeholder')" :min="0" :max="20" :step="1" centered />
        <SFNumber ref="at200-ref" v-model="at200" :label="localize('editor.at200.title')" :placeholder="localize('editor.at200.placeholder')" :min="0" :max="20" :step="1" centered />
      </div>
      <div class="grid grid-cols-3 gap-[14px]" :inert="isBoss" :class="{ 'opacity-45': isBoss }">
        <SFNumber ref="pack-ref" v-model="pack" :label="localize('editor.pack.title')" :placeholder="localize('editor.pack.placeholder')" :min="0" :max="20" :step="1" centered />
        <SFSelect ref="gladiator-ref" v-model="gladiator" :label="localize.global('editor.gladiator')" :options="gladiatorOptions" search />
      </div>
    </div>

    <div v-show="props.model" class="flex flex-col gap-[14px] rounded-md border border-line bg-surface p-2">
      <div class="grid grid-cols-2 gap-[14px]">
        <SFInput :model-value="stats.class" :label="localize.global('editor.class')" readonly class="text-center" />
        <SFInput :model-value="stats.health" :label="localize('editor.health')" readonly class="text-center" />
      </div>
      <div class="grid grid-cols-3 gap-[14px]">
        <SFInput :model-value="stats.attribute" :label="localize('editor.attribute')" readonly class="text-center" />
        <SFInput :model-value="stats.defense" :label="localize('editor.defense')" readonly class="text-center" />
        <SFInput :model-value="stats.luck" :label="localize.global('general.attribute5')" readonly class="text-center" />
      </div>
      <div class="grid grid-cols-2 gap-[14px]">
        <SFInput :model-value="stats.skip" :label="localize('editor.skip')" readonly class="text-center" />
        <SFInput :model-value="stats.chance" :label="localize('editor.crit')" readonly class="text-center" />
      </div>
      <div class="grid grid-cols-2 gap-[14px]">
        <SFInput :model-value="stats.damage" :label="localize('editor.damage')" readonly class="text-center" />
        <SFInput :model-value="stats.critical" :label="localize('editor.critical_bonus')" readonly class="text-center" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import SFInput from '@library/SFInput.vue'
import SFNumber from '@library/SFNumber.vue'
import SFSelect from '@library/SFSelect.vue'
import { formatSpacedNumber } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { sequence } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import { CONFIG, type SimulatorModel } from '~/sim/base'
import { type SimulatorPet } from '~/sim/pets'

defineOptions({
  name: 'PetEditor'
})

const props = defineProps<{
  /**
   * Simulator model whose stats are shown
   */
  model?: SimulatorModel | null
  /**
   * Shows the skip chance, damage and critical values of the model
   */
  fightStats?: boolean
}>()

defineExpose({
  read,
  fill,
  get isValid() {
    return isValid.value
  }
})

const UNKNOWN_STATS = {
  class: '?',
  health: '?',
  attribute: '?',
  defense: '?',
  luck: '?',
  skip: '?',
  damage: '?',
  chance: '?',
  critical: '?'
}

const localize = useLocalize('pets')

const type = ref(0)
const pet = ref(0)
const boss = ref(0)
const level = ref<number | null>(null)
const at100 = ref<number | null>(null)
const at150 = ref<number | null>(null)
const at200 = ref<number | null>(null)
const pack = ref<number | null>(null)
const gladiator = ref(0)

const isBoss = computed(() => boss.value === 1)

const isHabitatValid = useComponentValidation(useTemplateRef('type-ref'), useTemplateRef('pet-ref'), useTemplateRef('boss-ref'))

const isPetValid = useComponentValidation(useTemplateRef('level-ref'), useTemplateRef('at100-ref'), useTemplateRef('at150-ref'), useTemplateRef('at200-ref'), useTemplateRef('pack-ref'), useTemplateRef('gladiator-ref'))

const isValid = computed(() => isHabitatValid.value && (isBoss.value || isPetValid.value))

const typeOptions = computed(() => sequence(5).map((index) => ({ value: index, label: localize(`types.${index}`) })))

const petOptions = computed(() =>
  sequence(20).map((index) => {
    const monster = getMonsterId(type.value, index)

    return { value: index, label: localize.global(`monsters.${monster}`), image: `/res/pets/monster${monster}.png` as const }
  })
)

const bossOptions = computed(() => [
  { value: 0, label: localize.global('general.no') },
  { value: 1, label: localize.global('general.yes') }
])

const gladiatorOptions = computed(() => [{ value: 0, label: localize('editor.none') }, ...sequence(15, 1).map((value) => ({ value, label: `${value} (${100 * value * CONFIG.General.CritGladiatorBonus}%)` }))])

// The stats panel uses v-show, a v-model input that mounts and changes in one render keeps its first value
const stats = computed(() => {
  const model = props.model

  if (!model) return UNKNOWN_STATS

  const data = props.fightStats ? model.Data : null
  const defense = model.Config.Attribute === 'Strength' ? 'Intelligence' : 'Strength'

  return {
    class: localize.global(`general.class${model.Player.Class}`),
    health: formatSpacedNumber(model.TotalHealth),
    attribute: formatSpacedNumber(model.Player[model.Config.Attribute].Total),
    defense: formatSpacedNumber(model.Player[defense].Total),
    luck: formatSpacedNumber(model.Player.Luck.Total),
    skip: data ? formatChance(data.SkipChance) : '?',
    damage: data ? formatSpacedNumber(data.Weapon1.Min) : '?',
    chance: data ? formatChance(data.CriticalChance) : '?',
    critical: data ? `${Math.round(100 * data.CriticalMultiplier)}%` : '?'
  }
})

function getMonsterId(petType: number, index: number) {
  return 800 + 20 * petType + index
}

function formatChance(value: number) {
  return value > 0 ? `${(100 * value).toFixed(2)}%` : localize('editor.none')
}

// Not a watch on type, that would also reset the pet after fill()
function changeType(value: number) {
  type.value = value
  pet.value = 0
}

function read(): SimulatorPet {
  return {
    Type: type.value,
    Pet: pet.value,
    Boss: boss.value,
    Level: level.value ?? 0,
    At100: at100.value ?? 0,
    At150: at150.value ?? 0,
    At200: at200.value ?? 0,
    Pack: pack.value ?? 0,
    Gladiator: gladiator.value,
    Name: localize.global(`monsters.${getMonsterId(type.value, pet.value)}`)
  }
}

function fill(data: SimulatorPet | null) {
  type.value = data?.Type ?? 0
  pet.value = data?.Pet ?? 0
  boss.value = data?.Boss ?? 0
  level.value = data?.Level ?? null
  at100.value = data?.At100 ?? null
  at150.value = data?.At150 ?? null
  at200.value = data?.At200 ?? null
  pack.value = data?.Pack ?? null
  gladiator.value = data?.Gladiator ?? 0
}
</script>
