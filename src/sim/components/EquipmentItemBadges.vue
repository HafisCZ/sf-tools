<template>
  <span class="flex flex-col gap-1">
    <span v-if="props.stats && statBadges.length" class="flex flex-wrap gap-1">
      <span v-for="(stat, index) in statBadges" :key="index" class="inline-flex h-5 items-center rounded border border-line px-1.5 text-xs text-white/60">{{ stat }}</span>
    </span>
    <span v-if="extrasBadges.length" class="flex flex-wrap gap-1">
      <span v-for="badge in extrasBadges" :key="badge.key" class="inline-flex h-5 items-center gap-1 rounded bg-white/7 px-1.5 text-xs">
        <img v-if="badge.image" :src="badge.image" :alt="badge.alt" class="size-4 object-contain" />
        <SFIcon v-if="badge.icon" :name="badge.icon" class="text-accent" />
        {{ badge.text }}
      </span>
    </span>
    <span v-else-if="props.empty" class="text-xs text-white/50">{{ props.empty }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFIcon from '@library/SFIcon.vue'
import { type IconName } from '@utils/icons'
import { useLocalize } from '@utils/localization'
import { type ItemModel } from '~/core/models/item'

defineOptions({
  name: 'EquipmentItemBadges'
})

type ExtrasBadge = {
  key: string
  text: string
  image?: string
  alt?: string
  icon?: IconName
}

const props = defineProps<{
  /**
   * Item whose stats and extras are shown
   */
  item: ItemModel
  /**
   * Shows the damage, armor and attribute badges above the extras
   */
  stats?: boolean
  /**
   * Text shown in place of the extras when the item has none
   */
  empty?: string
}>()

const ITEM_ATTRIBUTES = ['Strength', 'Dexterity', 'Intelligence', 'Constitution', 'Luck'] as const

const localize = useLocalize('editor.equipment')

const statBadges = computed(() => {
  const item = props.item
  const badges: string[] = []

  if (item.Type === 1) {
    badges.push(`${item.DamageMin} - ${item.DamageMax}`)
  } else if (item.Type > 1 && item.Type < 8) {
    badges.push(`${item.Armor} ${localize.global('editor.armor')}`)
  }

  const value = item.Strength.Value

  if (value > 0 && ITEM_ATTRIBUTES.every((name) => item[name].Value === value)) {
    badges.push(`${value} ${localize('all_attributes')}`)
  } else {
    for (const name of ITEM_ATTRIBUTES) {
      const attribute = item[name]

      if (attribute.Value > 0) {
        badges.push(`${attribute.Value} ${localize.global(`general.attribute${attribute.Type}`)}`)
      }
    }
  }

  return badges
})

const extrasBadges = computed(() => {
  const item = props.item
  const badges: ExtrasBadge[] = []

  if (item.Upgrades > 0) {
    badges.push({ key: 'upgrades', text: `+${item.Upgrades}` })
  }

  if (item.GemType > 0) {
    badges.push({ key: 'gem', text: String(item.GemValue), image: `/res/gem${item.GemType}.png`, alt: localize.global(`general.gem${item.GemType}`) })
  }

  if (item.HasRune) {
    badges.push({ key: 'rune', text: `${localize.global(`general.rune${item.RuneType}`)} ${item.RuneValue}` })
  }

  if (item.HasEnchantment) {
    badges.push({ key: 'enchantment', text: localize('enchanted'), icon: 'wand-magic-sparkles' })
  }

  return badges
})
</script>
