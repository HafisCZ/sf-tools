<template>
  <div class="grid grid-cols-16 gap-x-7">
    <div class="col-span-13">
      <section v-for="section in sections" :key="section.list" class="mb-[1em] border" :class="section.border">
        <SFHeading level="5" class="py-[0.25em] pl-[0.75em] leading-[1.28571429em]">{{ localize.global(section.label) }}</SFHeading>
        <div class="-mt-[0.25em] mb-[0.25em] grid grid-cols-5">
          <div v-for="entry in section.entries" :key="entry.id" class="p-[0.25em]">
            <ResourceItemCard :entry="entry" :upgrades="getUpgrades(entry)" :ready="ready" :dismantled="dismantledIds.includes(entry.id)" @toggle="toggleDismantled(entry.id)" @upgrade="(value) => setUpgrades(entry, value)" />
          </div>
        </div>
      </section>
    </div>

    <div class="col-span-3">
      <section class="border border-white px-[0.25em] pb-[0.5em]">
        <div class="h-[61.5em] border border-transparent p-[0.25em] pb-0">
          <div class="-mt-[0.3em] border-b border-[gray] text-center">
            <SFHeading level="5" class="py-[0.25em] pl-[0.75em] leading-[1.28571429em]">{{ localize('section.summary') }}</SFHeading>
          </div>
          <div class="mt-[0.5em] flex flex-col pl-[0.5em]">
            <template v-for="block in summary" :key="block.key">
              <div class="font-bold" :class="SUMMARY_MARGINS[block.key]">{{ localize(`summary.${block.key}`) }}</div>
              <div v-for="resource in RESOURCES" :key="resource.key" class="flex" :class="{ 'text-[red]': block.key === 'spendable' && block.value[resource.key] < 0 }">
                <span class="flex-[0_0_66%] pr-[1em] text-right whitespace-nowrap">{{ formatSpacedNumber(block.value[resource.key]) }}</span>
                <span class="flex-[0_0_34%]">
                  <img :src="resource.icon" alt="" class="-mt-[0.5em] -mr-[0.25em] -mb-[0.625em] inline-block size-[2em] max-w-none align-baseline" />
                </span>
              </div>
            </template>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SFHeading from '@library/SFHeading.vue'
import { formatSpacedNumber } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { createResourceEntries, type InventoryPlayer, type ResourceEntry, type ResourceList } from '~/pages/inventory/inventory'
import ResourceItemCard from './ResourceItemCard.vue'

defineOptions({
  name: 'ResourcesView'
})

const props = defineProps<{
  /**
   * Player whose items are shown
   */
  player: InventoryPlayer
}>()

type Section = {
  list: ResourceList
  label: string
  border: string
}

type SummaryBlock = {
  key: 'current' | 'sold' | 'dismantled' | 'spendable' | 'used'
  value: BlacksmithResources
}

const SECTIONS: Section[] = [
  { list: 'player', label: 'inventory.section.player', border: 'border-[yellow]' },
  { list: 'bert', label: 'general.companion1', border: 'border-[lightblue]' },
  { list: 'mark', label: 'general.companion2', border: 'border-[lightgreen]' },
  { list: 'kunigunde', label: 'general.companion3', border: 'border-[lightyellow]' },
  { list: 'storage', label: 'inventory.section.storage', border: 'border-[red]' },
  { list: 'dummy', label: 'inventory.section.dummy', border: 'border-[gray]' }
]

const RESOURCES = [
  { key: 'Metal', icon: '/res/icon_metal.png' },
  { key: 'Crystal', icon: '/res/icon_crystal.png' }
] as const

const SUMMARY_MARGINS: Record<SummaryBlock['key'], string> = {
  current: '',
  sold: 'mt-[2em]',
  dismantled: 'mt-[2em]',
  spendable: 'mt-[4em]',
  used: 'mt-[2em]'
}

const localize = useLocalize('inventory')

const upgrades = ref<Record<number, number>>({})
const dismantledIds = ref<number[]>([])

const entries = computed(() => createResourceEntries(props.player))

const allEntries = computed(() => Object.values(entries.value).flat())

const sections = computed(() => SECTIONS.map((section) => ({ ...section, entries: entries.value[section.list] })).filter((section) => section.entries.length > 0))

const dismantled = computed(() => allEntries.value.filter((entry) => dismantledIds.value.includes(entry.id)))

const current = computed(() => ({ Metal: props.player.Metal, Crystal: props.player.Crystals }))

const sold = computed(() => sumResources(dismantled.value.map((entry) => entry.item.SellPrice)))

const dismantledTotal = computed(() => sumResources(dismantled.value.map((entry) => entry.item.DismantlePrice)))

const used = computed(() => sumResources(allEntries.value.map((entry) => entry.item.getBlacksmithUpgradePriceRange(getUpgrades(entry)))))

const ready = computed(() => ({
  Metal: current.value.Metal + dismantledTotal.value.Metal - used.value.Metal,
  Crystal: current.value.Crystal + dismantledTotal.value.Crystal - used.value.Crystal
}))

const summary = computed((): SummaryBlock[] => [
  { key: 'current', value: current.value },
  { key: 'sold', value: sold.value },
  { key: 'dismantled', value: dismantledTotal.value },
  { key: 'spendable', value: ready.value },
  { key: 'used', value: used.value }
])

function sumResources(list: BlacksmithResources[]) {
  return list.reduce((total, resources) => ({ Metal: total.Metal + resources.Metal, Crystal: total.Crystal + resources.Crystal }), { Metal: 0, Crystal: 0 })
}

function getUpgrades(entry: ResourceEntry) {
  return upgrades.value[entry.id] ?? entry.item.Upgrades
}

function setUpgrades(entry: ResourceEntry, value: number) {
  upgrades.value = { ...upgrades.value, [entry.id]: Math.min(20, Math.max(entry.item.Upgrades, value)) }
}

function toggleDismantled(id: number) {
  dismantledIds.value = dismantledIds.value.includes(id) ? dismantledIds.value.filter((dismantledId) => dismantledId !== id) : [...dismantledIds.value, id]
}
</script>
