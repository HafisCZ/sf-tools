<template>
  <div class="grid grid-cols-16 gap-x-7">
    <div class="col-span-3">
      <div v-if="props.player.Companions" class="mb-[1.5em] flex h-[5em] w-full justify-between">
        <button v-for="index in CHARACTERS" :key="index" type="button" class="h-fit w-[70px] cursor-pointer focus-visible:outline-2 focus-visible:outline-accent" :class="{ 'border border-[magenta] shadow-[0_0_2px_2px_magenta]': index === character }" :aria-pressed="index === character" @click="selectCharacter(index)">
          <img :src="`/res/portrait${index || ''}.png`" :alt="localize.global(CHARACTER_NAME_KEYS[index])" class="w-full" />
        </button>
      </div>

      <section class="border border-white">
        <SFHeading level="5" class="py-[0.25em] pl-[0.75em] leading-[1.28571429em]">{{ localize('section.equipped') }}</SFHeading>
        <div class="-mt-[0.25em] mb-[0.25em] flex flex-col">
          <div v-for="entry in equipped" :key="entry.id" class="p-[0.25em]">
            <InventoryItemCard :item="entry.item" :player="props.player" :collapsed="!expandedIds.includes(entry.id)" :highlight="entry.id === baseId ? 'base' : undefined" @click="selectBase(entry.id)" @contextmenu="(event: MouseEvent) => toggleExpanded(entry.id, event)" />
          </div>
        </div>
      </section>
    </div>

    <div class="col-span-10">
      <section v-for="section in sections" :key="section.list" class="mb-[1em] border" :class="section.border">
        <SFHeading level="5" class="py-[0.25em] pl-[0.75em] leading-[1.28571429em]">{{ localize.global(section.label) }}</SFHeading>
        <div class="-mt-[0.25em] mb-[0.25em] grid grid-cols-4">
          <div v-for="entry in section.entries" :key="entry.id" class="p-[0.25em]">
            <InventoryItemCard :item="entry.item" :player="props.player" :hide-sell="section.list === 'shops'" :highlight="comparedIds.includes(entry.id) ? 'compared' : undefined" :comparison="comparisons[entry.id]" :disabled="!baseEntry" @click="toggleCompared(entry.id)" />
          </div>
        </div>
      </section>
    </div>

    <div class="col-span-3 text-right">
      <div class="flex h-[6.5em] w-full flex-col">
        <SFButton size="sm" variant="outline" class="flex-[1_0_50%]" @click="flip">{{ localize('flip') }}</SFButton>
        <div class="flex flex-[1_0_50%] items-center justify-around">
          <SFCheckbox v-model="ignoreGems" :label="localize('ignore_gems')" />
          <SFCheckbox v-model="ignoreUpgrades" :label="localize('ignore_upgrades')" />
        </div>
      </div>

      <section class="border border-white px-[0.25em] pb-[0.5em]">
        <div class="h-[55em] border border-transparent p-[0.25em]">
          <div class="-mt-[0.3em] border-b border-[gray] text-center">
            <SFHeading level="5" class="py-[0.25em] pl-[0.75em] leading-[1.28571429em]">{{ localize('section.overview') }}</SFHeading>
          </div>
          <div class="mt-[0.5em] flex flex-col gap-[1lh] pl-[0.5em]">
            <div v-for="(lines, index) in statsGroups" :key="index" class="flex flex-col">
              <div v-for="line in lines" :key="line.label" class="flex" :class="{ 'text-[orange]': line.warn }">
                <span class="flex-[0_0_40%] pr-[1em] text-right whitespace-nowrap">{{ formatSpacedNumber(line.value) }}</span>
                <span class="flex-[0_0_60%] text-left">{{ line.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFCheckbox from '@library/SFCheckbox.vue'
import SFHeading from '@library/SFHeading.vue'
import { formatSpacedNumber } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { createInventoryEntries, getCharacterStats, getComparisonGroups, getStatsGroups, type CharacterIndex, type InventoryEntry, type InventoryList, type InventoryPlayer } from '~/pages/inventory/inventory'
import { ASSASSIN } from '~/sim/base'
import InventoryItemCard from './InventoryItemCard.vue'

defineOptions({
  name: 'InventoryView'
})

const props = defineProps<{
  /**
   * Player whose items are shown
   */
  player: InventoryPlayer
}>()

type Section = {
  list: InventoryList
  label: string
  border: string
}

const SECTIONS: Section[] = [
  { list: 'backpack', label: 'inventory.section.backpack', border: 'border-[red]' },
  { list: 'chest', label: 'inventory.section.chest', border: 'border-[green]' },
  { list: 'player', label: 'inventory.section.player', border: 'border-[yellow]' },
  { list: 'bert', label: 'general.companion1', border: 'border-[lightblue]' },
  { list: 'mark', label: 'general.companion2', border: 'border-[lightgreen]' },
  { list: 'kunigunde', label: 'general.companion3', border: 'border-[lightyellow]' },
  { list: 'shops', label: 'inventory.section.shops', border: 'border-[orange]' },
  { list: 'dummy', label: 'inventory.section.dummy', border: 'border-[gray]' }
]

const CHARACTERS: CharacterIndex[] = [0, 1, 2, 3]

const CHARACTER_LISTS: InventoryList[] = ['player', 'bert', 'mark', 'kunigunde']

const CHARACTER_NAME_KEYS = ['inventory.section.player', 'general.companion1', 'general.companion2', 'general.companion3']

const localize = useLocalize('inventory')

const character = ref<CharacterIndex>(0)

const baseId = ref<number | null>(null)
const comparedIds = ref<number[]>([])
const expandedIds = ref<number[]>([])

const ignoreGems = ref(false)
const ignoreUpgrades = ref(false)

const entries = computed(() => createInventoryEntries(props.player))

const allEntries = computed(() => Object.values(entries.value).flat())

const baseEntry = computed(() => allEntries.value.find((entry) => entry.id === baseId.value) ?? null)

const equipped = computed(() => {
  const list = entries.value[CHARACTER_LISTS[character.value]]

  return character.value === 0 ? list.filter((entry) => entry.item.SlotIndex !== 10 || props.player.Class === ASSASSIN) : list
})

const sections = computed(() =>
  SECTIONS.filter((section) => section.list !== CHARACTER_LISTS[character.value])
    .map((section) => ({ ...section, entries: entries.value[section.list].filter(isComparable) }))
    .filter((section) => section.entries.length > 0)
)

const stats = computed(() => getCharacterStats(props.player, character.value))

const statsGroups = computed(() => getStatsGroups(stats.value))

const comparisons = computed(() => {
  const base = baseEntry.value

  if (!base) return {}

  return Object.fromEntries(allEntries.value.filter((entry) => comparedIds.value.includes(entry.id)).map((entry) => [entry.id, getComparisonGroups(stats.value, props.player, character.value, base.item, entry.item, ignoreGems.value, ignoreUpgrades.value)]))
})

function isComparable(entry: InventoryEntry) {
  const base = baseEntry.value

  return !base || (entry.item.Type === base.item.Type && entry.item.Class === base.item.Class)
}

function selectCharacter(index: CharacterIndex) {
  character.value = index

  baseId.value = null
  comparedIds.value = []
}

function selectBase(id: number) {
  baseId.value = baseId.value === id ? null : id
  comparedIds.value = []
}

function toggleCompared(id: number) {
  comparedIds.value = comparedIds.value.includes(id) ? comparedIds.value.filter((comparedId) => comparedId !== id) : [...comparedIds.value, id]
}

function toggleExpanded(id: number, event: MouseEvent) {
  event.preventDefault()

  expandedIds.value = expandedIds.value.includes(id) ? expandedIds.value.filter((expandedId) => expandedId !== id) : [...expandedIds.value, id]
}

function flip() {
  if (!baseEntry.value) return

  comparedIds.value = comparedIds.value.length > 0 ? [] : allEntries.value.filter(isComparable).map((entry) => entry.id)
}
</script>
