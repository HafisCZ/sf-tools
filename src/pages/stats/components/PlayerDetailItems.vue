<template>
  <div class="grid grid-cols-5 gap-3">
    <div v-for="slot in slots" :key="slot.key" class="flex min-w-0 flex-col overflow-hidden rounded-md border border-line" :class="slot.item ? 'bg-surface' : 'border-dashed'">
      <div class="shrink-0 border-b border-white/10 px-3 pt-3 pb-2.5" :class="slot.item ? 'bg-[#121416]' : 'border-dashed'">
        <div class="flex h-24 items-center justify-center">
          <img v-if="slot.item" :src="slot.item.ImageUrl" alt="" class="size-24 object-contain" />
          <img v-else :src="slot.emptyImage" alt="" class="size-[72px] object-contain opacity-45" />
        </div>
        <div class="mt-2">
          <div class="truncate font-bold" :title="slot.item?.Name">{{ slot.item ? slot.item.Name : slot.label }}</div>
          <div class="text-xs text-white/60">{{ slot.item ? slot.label : localize('items.empty') }}</div>
        </div>
      </div>
      <div v-if="slot.item" class="px-3 pb-1.5">
        <div v-for="(block, blockIndex) in slot.blocks" :key="blockIndex" class="py-2" :class="{ 'border-t border-white/10': blockIndex > 0 }">
          <div v-for="line in block" :key="line.label" class="flex items-center justify-between gap-2 py-0.5">
            <span class="min-w-0 text-white/60">{{ line.label }}</span>
            <span class="whitespace-nowrap">{{ line.value }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatSpacedNumber } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { type ItemModel } from '~/core/models/item'
import { type AnyEquipmentSlot, type PlayerModel } from '~/core/models/player'
import { getItemAttributes } from '~/pages/inventory/inventory'
import { ASSASSIN, WARRIOR } from '~/sim/workers/base'

defineOptions({
  name: 'PlayerDetailItems'
})

const props = defineProps<{
  /**
   * Player whose equipped items are shown
   */
  player: PlayerModel
}>()

type ItemSlot = {
  key: AnyEquipmentSlot
  type: number
  emptyImage: `/${string}`
}

type ItemLine = {
  label: string
  value: string
}

const SLOTS: ItemSlot[] = [
  { key: 'Head', type: 6, emptyImage: '/res/player/slot-head.webp' },
  { key: 'Body', type: 3, emptyImage: '/res/player/slot-body.webp' },
  { key: 'Hand', type: 5, emptyImage: '/res/player/slot-hand.webp' },
  { key: 'Feet', type: 4, emptyImage: '/res/player/slot-feet.webp' },
  { key: 'Neck', type: 8, emptyImage: '/res/player/slot-neck.webp' },
  { key: 'Belt', type: 7, emptyImage: '/res/player/slot-belt.webp' },
  { key: 'Ring', type: 9, emptyImage: '/res/player/slot-ring.webp' },
  { key: 'Misc', type: 10, emptyImage: '/res/player/slot-misc.webp' },
  { key: 'Wpn1', type: 1, emptyImage: '/res/player/slot-weapon.webp' }
]

const localize = useLocalize('stats.player')

const slots = computed(() => {
  const list = [...SLOTS]

  if (props.player.Class === WARRIOR) {
    list.push({ key: 'Wpn2', type: 2, emptyImage: '/res/player/slot-shield.webp' })
  } else if (props.player.Class === ASSASSIN) {
    list.push({ key: 'Wpn2', type: 1, emptyImage: '/res/player/slot-weapon.webp' })
  }

  return list.map((slot) => {
    const item = props.player.Items[slot.key]
    const equipped = item && item.Type > 0 ? item : null

    return {
      key: slot.key,
      label: localize.global(`general.item${slot.type}`),
      emptyImage: slot.emptyImage,
      item: equipped,
      blocks: equipped ? getBlocks(equipped) : []
    }
  })
})

function getBlocks(item: ItemModel) {
  return [getAttributeLines(item), getDefenseLines(item), getExtraLines(item)].filter((lines) => lines.length)
}

function getAttributeLines(item: ItemModel): ItemLine[] {
  const attributes = getItemAttributes(item, props.player.Primary.Type)

  if (attributes.length === 5 && attributes.every((attribute) => attribute.value === attributes[0].value)) {
    return [{ label: localize('items.all_attributes'), value: `+${formatSpacedNumber(attributes[0].value)}` }]
  }

  return attributes.map((attribute) => ({ label: localize.global(`general.attribute${attribute.type}`), value: `+${formatSpacedNumber(attribute.value)}` }))
}

function getDefenseLines(item: ItemModel): ItemLine[] {
  if (item.Type === 1) {
    return [{ label: localize('damage'), value: `${formatSpacedNumber(item.DamageMin)} - ${formatSpacedNumber(item.DamageMax)}` }]
  } else if (item.Type === 2) {
    return [{ label: localize('items.block_chance'), value: `${item.Armor}%` }]
  } else if (item.Type < 8) {
    return [{ label: localize('armor'), value: formatSpacedNumber(item.Armor) }]
  } else {
    return []
  }
}

function getExtraLines(item: ItemModel) {
  const lines: ItemLine[] = []

  if (item.HasGem) {
    // Two-handed weapons count their gem twice
    const multiplier = item.Type === 1 && props.player.Class !== WARRIOR && props.player.Class !== ASSASSIN ? 2 : 1

    lines.push({ label: localize('items.gem', { name: localize.global(`general.gem${item.GemType}`) }), value: `+${formatSpacedNumber(item.GemValue * multiplier)}` })
  } else if (item.HasSocket) {
    lines.push({ label: localize('items.empty_socket'), value: '' })
  }

  if (item.HasRune) {
    lines.push({ label: localize.global(`general.rune${item.RuneType}`), value: item.RuneType === 3 ? `+${item.RuneValue}` : `+${item.RuneValue}%` })
  }

  if (item.Upgrades) {
    lines.push({ label: localize('items.upgrades'), value: String(item.Upgrades) })
  }

  if (item.HasEnchantment) {
    lines.push({ label: localize('items.enchanted'), value: '' })
  }

  return lines
}
</script>
