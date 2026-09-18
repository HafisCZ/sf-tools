<template>
  <div class="relative h-[27em] border p-[0.25em] text-[85%] leading-5 text-white" :class="props.dismantled ? 'border-[orange] shadow-[0_0_2px_2px_orange]' : 'border-[gray]'">
    <button type="button" class="flex h-[5.5em] w-full cursor-pointer flex-col items-stretch border-b border-[gray] pb-[0.15em] text-center font-bold focus-visible:outline-2 focus-visible:outline-accent" :aria-pressed="props.dismantled" @click="emit('toggle')">
      <span class="flex flex-wrap justify-center gap-x-[0.25em]">
        <span v-if="props.entry.item.HasEnchantment" class="text-[95%] font-normal text-[magenta] italic">{{ localize('tag.enchanted') }}</span>
        <span v-if="props.entry.item.HasSocket" class="text-[95%] font-normal text-[orange] italic">{{ localize('tag.socketed') }}</span>
      </span>
      <span class="block">
        {{ getItemName(props.entry.item) }} ({{ localize.global(`general.class${props.entry.item.Class}`) }})
        <span v-if="props.entry.item.HasRune" class="text-[95%] font-normal whitespace-nowrap text-[cyan] italic">{{ localize(`rune_suffix.${props.entry.item.RuneType}`) }}</span>
      </span>
    </button>

    <div class="mt-[0.5em] flex flex-col pl-[0.5em]">
      <div v-if="sellPrice.Metal || sellPrice.Crystal">
        <div class="font-bold">{{ localize('item.sell') }}</div>
        <div class="my-[0.25em] flex">
          <span class="flex-[0_0_33%]" />
          <span class="flex-[0_0_33%]">
            <ResourceValue v-if="sellPrice.Metal" type="metal" :value="sellPrice.Metal" />
          </span>
          <span class="flex-[0_0_33%]">
            <ResourceValue v-if="sellPrice.Crystal" type="crystal" :value="sellPrice.Crystal" />
          </span>
        </div>
      </div>
      <div v-if="props.entry.transmog">
        <div>
          {{ localize('item.transmog') }}
          <span class="font-bold text-[magenta]">{{ getItemName(props.entry.transmog.item) }}</span>
        </div>
        <div class="my-[0.25em] flex">
          <span class="flex-[0_0_33%]">
            <ResourceValue v-if="props.entry.transmog.Metal" type="metal" :value="props.entry.transmog.Metal" signed />
          </span>
          <span class="flex-[0_0_33%]">
            <ResourceValue v-if="props.entry.transmog.Crystal" type="crystal" :value="props.entry.transmog.Crystal" signed />
          </span>
        </div>
      </div>
      <div v-if="props.entry.item.DismantlePrice.Metal || props.entry.item.DismantlePrice.Crystal">
        <div class="font-bold">{{ localize('item.dismantle') }}</div>
        <div class="my-[0.25em] flex">
          <span class="flex-[0_0_33%]">
            <ResourceValue v-if="dismantlePrice.Metal" type="metal" :value="dismantlePrice.Metal" />
          </span>
          <span class="flex-[0_0_33%]">
            <ResourceValue v-if="dismantlePrice.Crystal" type="crystal" :value="dismantlePrice.Crystal" />
          </span>
        </div>
      </div>
      <div v-if="props.upgrades < 20">
        <div class="font-bold">{{ localize('item.upgrade') }}</div>
        <div v-for="(price, index) in upgradePrices" :key="index" class="my-[0.25em] flex">
          <span class="flex-[0_0_33%]" :class="price.Metal > props.ready.Metal ? 'text-[red]' : 'text-[lightgreen]'">
            <ResourceValue v-if="price.Metal" type="metal" :value="price.Metal" />
          </span>
          <span class="flex-[0_0_33%]" :class="price.Crystal > props.ready.Crystal ? 'text-[red]' : 'text-[lightgreen]'">
            <ResourceValue v-if="price.Crystal" type="crystal" :value="price.Crystal" />
          </span>
        </div>
      </div>
    </div>

    <div class="absolute bottom-0 left-0 flex w-full flex-wrap p-[0.25em] text-center select-none">
      <button type="button" class="flex-[0_0_17%] cursor-pointer border border-[lightgray] focus-visible:outline-2 focus-visible:outline-accent" @click="emit('upgrade', props.entry.item.Upgrades)">{{ props.entry.item.Upgrades }}</button>
      <button type="button" class="flex-[0_0_17%] cursor-pointer border border-[lightgray] focus-visible:outline-2 focus-visible:outline-accent" @click="emit('upgrade', props.upgrades - 1)">-</button>
      <span class="flex-[0_0_32%]">{{ props.entry.item.Upgrades }}{{ props.upgrades !== props.entry.item.Upgrades ? ` + ${props.upgrades - props.entry.item.Upgrades}` : '' }}</span>
      <button type="button" class="flex-[0_0_17%] cursor-pointer border border-[lightgray] focus-visible:outline-2 focus-visible:outline-accent" @click="emit('upgrade', props.upgrades + 1)">+</button>
      <button type="button" class="flex-[0_0_17%] cursor-pointer border border-[lightgray] focus-visible:outline-2 focus-visible:outline-accent" @click="emit('upgrade', 20)">20</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLocalize } from '@utils/localization'
import { getItemName, type ResourceEntry } from '~/pages/inventory/inventory'
import ResourceValue from './ResourceValue.vue'

defineOptions({
  name: 'ResourceItemCard'
})

const props = defineProps<{
  /**
   * Item shown on the card
   */
  entry: ResourceEntry
  /**
   * Upgrade level the prices are shown for
   */
  upgrades: number
  /**
   * Resources left to spend, colours the upgrade prices
   */
  ready: BlacksmithResources
  /**
   * Highlights the card as picked for dismantling
   */
  dismantled?: boolean
}>()

const emit = defineEmits<{
  toggle: []
  upgrade: [upgrades: number]
}>()

const localize = useLocalize('inventory')

const upgradedItem = computed(() => {
  const item = props.entry.item.clone()
  item.upgradeTo(props.upgrades)

  return item
})

const sellPrice = computed(() => upgradedItem.value.getBlacksmithPrice())

const dismantlePrice = computed(() => upgradedItem.value.getDismantleReward())

const upgradePrices = computed(() => [upgradedItem.value.getBlacksmithUpgradePrice(), upgradedItem.value.getBlacksmithUpgradePriceRange()])
</script>
