<template>
  <SFDialog :title="localize('results')" size="sm">
    <div class="grid grid-cols-16 items-center gap-x-[14px] gap-y-[28px] px-[14px]">
      <template v-for="(result, index) in props.results" :key="index">
        <img :src="getPetImageUrl(result.pet)" alt="" class="col-span-2 h-[3em]" />
        <span class="col-span-4 text-[110%] leading-[3em]">{{ getPetName(result.pet) }}</span>
        <img :src="getPetImageUrl(result.boss)" alt="" class="col-span-2 h-[3em]" />
        <span class="col-span-4 text-[110%] leading-[3em]">{{ getPetName(result.boss) }}</span>
        <span class="col-span-4 text-center leading-[3em]">{{ result.chance === 0 ? localize('bulk.not_possible') : `${result.chance.toFixed(result.chance < 0.01 ? 5 : 2)}%` }}</span>
      </template>
    </div>

    <template #buttons>
      <SFButton block @click="emit('close')">
        {{ localize.global('dialog.shared.close') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import { useLocalize } from '@utils/localization'

defineOptions({
  name: 'PetResultsDialog'
})

const props = defineProps<{
  /**
   * Win chance from 0 to 100 of each pet against its boss
   */
  results: {
    chance: number
    pet: SimulatorPet
    boss: SimulatorPet
  }[]
}>()

const emit = defineEmits<{
  close: []
}>()

const localize = useLocalize('pets')

function getMonsterId(pet: SimulatorPet) {
  return 800 + 20 * pet.Type + pet.Pet
}

function getPetImageUrl(pet: SimulatorPet) {
  return `/res/pets/monster${getMonsterId(pet)}.png`
}

function getPetName(pet: SimulatorPet) {
  return localize.global(`monsters.${getMonsterId(pet)}`)
}
</script>
