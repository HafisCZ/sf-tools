<template>
  <div>
    <button ref="trigger-ref" type="button" class="flex min-h-13.5 w-full cursor-pointer items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-left leading-5 text-white/90 outline-none focus-visible:border-accent" aria-haspopup="menu" :aria-expanded="open" @click="toggle">
      <span class="flex min-w-0 flex-auto items-center gap-3">
        <img :src="getPetImageUrl(pet)" alt="" class="-my-1 size-10 shrink-0 object-contain" />
        <span class="flex min-w-0 flex-col">
          <span class="truncate text-base font-bold text-white">{{ getPetName(pet) }}</span>
          <span class="truncate text-xs" :class="PET_ELEMENTS[pet.Type].text">{{ localize(`types.${pet.Type}`) }}</span>
        </span>
      </span>
      <SFIcon name="chevron-down" class="text-white/60" :class="{ 'rotate-180': open }" />
    </button>
    <Teleport to="body">
      <SFDropdownMenu v-if="open && position" :anchor="position" :width="464" :max-height="480" float="right" position="bottom" class="scroll-pt-20" @close="close">
        <div class="sticky -top-1 z-10 -mx-1 -mt-1 flex flex-col gap-1 bg-surface p-1">
          <input v-model="query" type="search" :aria-label="localize('picker.search')" :placeholder="localize('picker.search')" class="w-full rounded border border-line bg-page px-3 py-2 leading-5 text-white/90 outline-none placeholder:text-white/40 focus:border-accent" @keydown.enter.prevent="selectFirstMatch" />
          <SFTabs v-if="!query" v-model="element" :options="elementOptions" stretch />
        </div>
        <div v-if="shownPets.length > 0" role="menu" class="grid grid-cols-5 gap-1">
          <button
            v-for="entry in shownPets"
            :key="`${entry.Type}-${entry.Pet}`"
            type="button"
            role="menuitem"
            class="flex aspect-square min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md px-1 outline-none"
            :class="isPicked(entry) ? 'bg-accent/15' : 'bg-page hover:bg-surface-hover focus-visible:bg-surface-hover'"
            @click="select(entry)"
          >
            <img :src="getPetImageUrl(entry)" alt="" class="size-14 object-contain" />
            <span class="w-full truncate text-center text-xs">{{ entry.name }}</span>
          </button>
        </div>
        <p v-else class="px-3 py-2 text-white/50">{{ localize('picker.empty') }}</p>
      </SFDropdownMenu>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import SFDropdownMenu from '@library/SFDropdownMenu.vue'
import SFIcon from '@library/SFIcon.vue'
import SFTabs from '@library/SFTabs.vue'
import { useDropdown } from '@utils/interactions'
import { useLocalize } from '@utils/localization'
import { sequence } from '@utils/utils'
import { type SimulatorPet } from '~/sim/workers/pets'
import { getMonsterId, getPetImageUrl, PET_ELEMENTS } from '../pets'

defineOptions({
  name: 'PetPicker'
})

const pet = defineModel<Pick<SimulatorPet, 'Type' | 'Pet'>>({ required: true })

const localize = useLocalize('pets')

const element = ref(pet.value.Type)
const query = ref('')

const triggerElement = useTemplateRef('trigger-ref')

const { open, position, toggle: toggleOpen, close } = useDropdown(triggerElement, triggerElement)

const elementOptions = computed(() => sequence(5).map((type) => ({ value: type, label: localize(`types.${type}`) })))

const shownPets = computed(() => {
  const search = query.value.trim().toLowerCase()
  const pets = search ? sequence(5).flatMap((type) => sequence(20).map((index) => ({ Type: type, Pet: index }))) : sequence(20).map((index) => ({ Type: element.value, Pet: index }))

  return pets.map((entry) => ({ ...entry, name: getPetName(entry) })).filter(({ name }) => !search || name.toLowerCase().includes(search))
})

function getPetName(entry: Pick<SimulatorPet, 'Type' | 'Pet'>) {
  return localize.global(`monsters.${getMonsterId(entry)}`)
}

function isPicked(entry: Pick<SimulatorPet, 'Type' | 'Pet'>) {
  return entry.Type === pet.value.Type && entry.Pet === pet.value.Pet
}

function toggle() {
  element.value = pet.value.Type
  query.value = ''

  toggleOpen()
}

function select(entry: Pick<SimulatorPet, 'Type' | 'Pet'>) {
  pet.value = { Type: entry.Type, Pet: entry.Pet }

  close()
}

function selectFirstMatch() {
  const first = shownPets.value.at(0)

  if (first) {
    select(first)
  }
}
</script>
