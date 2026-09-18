<template>
  <button type="button" class="relative flex w-full flex-col items-stretch border p-[0.25em] text-left text-[85%] leading-5 text-white focus-visible:outline-2 focus-visible:outline-accent enabled:cursor-pointer" :class="[props.collapsed ? 'h-[5.65em]' : 'h-[36em]', HIGHLIGHT_CLASSES[props.highlight ?? 'none']]">
    <span class="block h-[5.5em] shrink-0 pb-[0.15em] text-center font-bold" :class="{ 'border-b border-[gray]': !props.collapsed }">
      <span class="flex flex-wrap justify-center gap-x-[0.25em]">
        <span v-for="tag in tags" :key="tag" class="text-[95%] font-normal italic" :class="TAG_CLASSES[tag]">{{ localize(`tag.${tag}`) }}</span>
      </span>
      <span class="block">
        {{ getItemName(props.item) }} ({{ localize.global(`general.class${props.item.Class}`) }})
        <span v-if="props.item.HasRune" class="text-[95%] font-normal whitespace-nowrap text-[cyan] italic">{{ localize(`rune_suffix.${props.item.RuneType}`) }}</span>
      </span>
    </span>

    <template v-if="!props.collapsed">
      <span v-if="props.comparison" class="mt-[0.5em] flex flex-col gap-[1lh] pl-[0.5em]">
        <span v-for="(lines, groupIndex) in props.comparison" :key="groupIndex" class="flex flex-col">
          <span v-for="(line, lineIndex) in lines" :key="lineIndex" class="flex" :class="COMPARISON_CLASSES[line.color]">
            <span class="flex-[0_0_50%] pr-[1em] text-right whitespace-nowrap">{{ line.value }}</span>
            <span class="flex-[0_0_50%]">{{ line.label }}</span>
          </span>
        </span>
      </span>

      <template v-else>
        <span class="mt-[0.5em] flex flex-col pl-[0.5em]">
          <span v-for="attribute in attributes" :key="attribute.type" class="flex">
            <span class="flex-[0_0_25%] text-center">{{ attribute.value }}</span>
            <span class="flex-[0_0_45%] text-center">
              <template v-if="attribute.upgrades || attribute.gem">
                <span class="text-[gray]">{{ attribute.base }}</span>
                <span v-if="props.item.Upgrades">
                  +
                  <span class="text-[lightgray]">{{ attribute.upgrades }}</span>
                </span>
                <span v-if="props.item.GemType"> + {{ attribute.gem }}{{ hasDoubleGem ? ' x2' : '' }}</span>
              </template>
            </span>
            <span class="font-bold" :class="ATTRIBUTE_CLASSES[attribute.type]">{{ localize.global(`general.attribute${attribute.type}`) }}</span>
          </span>
        </span>

        <span class="absolute top-[15em] flex flex-col pl-[0.5em]">
          <span v-if="props.item.Type === 1">
            <span class="font-bold">{{ localize('item.damage') }}</span>
            {{ props.item.DamageMin }} - {{ props.item.DamageMax }}
          </span>
          <span v-if="props.item.Type > 1 && props.item.Type < 8">
            <span class="font-bold">{{ localize('stat.armor') }}</span>
            {{ props.item.Armor }}
          </span>
          <span v-if="props.item.HasGem">
            <span class="font-bold">{{ localize.global(`general.gem${props.item.GemType}`) }}</span>
            +{{ props.item.GemValue }}
            <img :src="`/res/gem${props.item.GemType}.png`" alt="" class="-mt-[0.5em] -mr-[0.25em] -mb-[0.625em] -ml-[0.25em] inline-block size-[2em] max-w-none align-baseline" />
          </span>
          <span v-if="props.item.HasRune">
            <span class="font-bold">{{ localize.global(`general.rune${props.item.RuneType}`) }}</span>
            +{{ props.item.RuneValue }}%
            <img :src="`/res/rune${props.item.RuneType}.png`" alt="" class="-mt-[0.5em] -mr-[0.25em] -mb-[0.625em] -ml-[0.25em] inline-block size-[2em] max-w-none align-baseline" />
          </span>
          <span v-if="props.item.Upgrades">
            <span class="font-bold">{{ localize('item.upgrades') }}</span>
            {{ props.item.Upgrades }}/20
          </span>
        </span>

        <span class="absolute bottom-[0.5em] left-[0.75em] flex w-full flex-col">
          <span v-if="!props.hideSell && !isWashed">
            <span class="block font-bold">{{ localize('item.sell') }}</span>
            <span class="my-[0.25em] flex">
              <span class="flex-[0_0_33%]">
                <ResourceValue v-if="props.item.SellPrice.Gold" type="gold" :value="props.item.SellPrice.Gold" />
              </span>
              <span class="flex-[0_0_33%]">
                <ResourceValue v-if="props.item.SellPrice.Metal" type="metal" :value="props.item.SellPrice.Metal" />
              </span>
              <span class="flex-[0_0_33%]">
                <ResourceValue v-if="props.item.SellPrice.Crystal" type="crystal" :value="props.item.SellPrice.Crystal" />
              </span>
            </span>
          </span>
          <span v-if="props.item.DismantlePrice.Metal || props.item.DismantlePrice.Crystal">
            <span class="block font-bold">{{ localize('item.dismantle') }}</span>
            <span class="my-[0.25em] flex">
              <span class="flex-[0_0_33%]">
                <ResourceValue v-if="props.item.DismantlePrice.Metal" type="metal" :value="props.item.DismantlePrice.Metal" />
              </span>
              <span class="flex-[0_0_33%]">
                <ResourceValue v-if="props.item.DismantlePrice.Crystal" type="crystal" :value="props.item.DismantlePrice.Crystal" />
              </span>
            </span>
          </span>
          <span v-if="props.item.Upgrades < 20">
            <span class="block font-bold">{{ localize('item.upgrade') }}</span>
            <span v-for="(price, index) in upgradePrices" :key="index" class="my-[0.25em] flex">
              <span class="flex-[0_0_33%]">
                <ResourceValue v-if="price.Metal" type="metal" :value="price.Metal" />
              </span>
              <span class="flex-[0_0_33%]">
                <ResourceValue v-if="price.Crystal" type="crystal" :value="price.Crystal" />
              </span>
            </span>
          </span>
        </span>
      </template>
    </template>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLocalize } from '@utils/localization'
import { type ItemModel } from '~/core/models/item'
import { type PlayerModel } from '~/core/models/player'
import { getItemAttributes, getItemName, type ComparisonLine } from '~/pages/inventory/inventory'
import ResourceValue from './ResourceValue.vue'

defineOptions({
  name: 'InventoryItemCard'
})

const props = defineProps<{
  /**
   * Item shown on the card
   */
  item: ItemModel
  /**
   * Player the gem values are shown for
   */
  player: Pick<PlayerModel, 'Class' | 'Primary'>
  /**
   * Hides the sell price
   */
  hideSell?: boolean
  /**
   * Shows only the header
   */
  collapsed?: boolean
  /**
   * Highlights the card as the base item or as an item compared to it
   */
  highlight?: 'base' | 'compared'
  /**
   * Stat differences shown instead of the item details
   */
  comparison?: ComparisonLine[][]
}>()

type Tag = 'enchanted' | 'washed' | 'socketed'

const HIGHLIGHT_CLASSES = {
  none: 'border-[gray]',
  base: 'border-[cyan] shadow-[0_0_2px_2px_cyan]',
  compared: 'border-[lightgreen] shadow-[0_0_2px_2px_lightgreen]'
}

const TAG_CLASSES: Record<Tag, string> = {
  enchanted: 'text-[magenta]',
  washed: 'text-[lightgreen]',
  socketed: 'text-[orange]'
}

const ATTRIBUTE_CLASSES: Record<number, string> = {
  1: 'text-[lightblue]',
  2: 'text-[yellow]',
  3: 'text-[lightgreen]',
  4: 'text-[magenta]',
  5: 'text-[red]'
}

const COMPARISON_CLASSES = {
  green: 'text-[lightgreen]',
  orange: 'text-[orange]',
  red: 'text-[red]'
}

const localize = useLocalize('inventory')

const isWashed = computed(() => !props.item.SellPrice.Gold && !props.item.SellPrice.Metal && !props.item.SellPrice.Crystal)

const tags = computed(() => {
  const list: Tag[] = []

  if (props.item.HasEnchantment) list.push('enchanted')
  if (isWashed.value && !props.hideSell) list.push('washed')
  if (props.item.HasSocket) list.push('socketed')

  return list
})

const hasDoubleGem = computed(() => props.item.Type === 1 && props.player.Class !== WARRIOR && props.player.Class !== ASSASSIN)

const attributes = computed(() => getItemAttributes(props.item, props.player.Primary.Type))

const upgradePrices = computed(() => [props.item.getBlacksmithUpgradePrice(), props.item.getBlacksmithUpgradePriceRange()])
</script>
