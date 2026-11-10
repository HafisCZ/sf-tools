<template>
  <div class="flex flex-col gap-8">
    <div class="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-x-10 gap-y-8">
      <PlayerDetailPanel v-for="panel in panels" :key="panel.title" :title="panel.title" :rows="panel.rows" />
    </div>

    <div class="flex flex-col gap-3">
      <div class="flex items-center gap-2.5 border-b border-white/30 pb-2">
        <SFHeading level="4" class="flex-1 leading-none">{{ localize('deeds.shelf') }}</SFHeading>
        <span class="text-white/60">{{ localize.global(`general.deed_shelf_${props.deeds.Shelf}`) }}</span>
      </div>
      <div class="grid grid-cols-6 gap-3">
        <div v-for="(trophy, index) in shelf" :key="index" class="flex min-w-0 flex-col overflow-hidden rounded-md border" :class="trophy ? ['bg-surface', trophy.border] : 'border-dashed border-line'">
          <div class="flex h-39 items-center justify-center border-b border-white/10" :class="trophy ? 'bg-[#121416]' : 'border-dashed'">
            <img v-if="trophy" :src="trophy.image" alt="" class="h-34" :class="{ 'drop-shadow-[0_0_10px_rgba(255,236,170,0.8)]': trophy.hot }" />
          </div>
          <div class="px-3 pt-2 pb-2.5">
            <div class="truncate font-bold" :class="{ 'text-white/60': !trophy }" :title="trophy?.name">{{ trophy ? trophy.name : localize('items.empty') }}</div>
            <div v-if="trophy" class="mt-0.5 text-xs text-white/60">{{ trophy.description }}</div>
            <div v-if="trophy" class="text-xs text-white/60">{{ trophy.required }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFHeading from '@library/SFHeading.vue'
import { formatSpacedNumber } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { type PlayerDeeds } from '~/core/models/player'
import { DEED_REQUIREMENTS } from '~/playa/deeds'
import PlayerDetailPanel from '~/pages/stats/components/PlayerDetailPanel.vue'
import { type PlayerDetailRow } from '~/pages/stats/types'

defineOptions({
  name: 'PlayerDetailDeeds'
})

const props = defineProps<{
  /**
   * Deeds & Titles save of the shown scan
   */
  deeds: PlayerDeeds
}>()

const localize = useLocalize('stats.player')

const panels = computed((): { title: string; rows: PlayerDetailRow[] }[] => {
  const deeds = props.deeds
  const title = deeds.EquippedTitle

  return [
    {
      title: localize('deeds.glory'),
      rows: [
        { label: localize('rank'), value: deeds.Rank ? formatSpacedNumber(deeds.Rank) : '-' },
        { label: localize('deeds.points'), value: formatSpacedNumber(deeds.GloryPoints), read: (scan) => scan.Deeds?.GloryPoints }
      ]
    },
    {
      title: localize('deeds.trophies'),
      rows: [
        { label: localize.global('general.trophy_bronze'), value: formatSpacedNumber(deeds.TrophiesBronze), read: (scan) => scan.Deeds?.TrophiesBronze },
        { label: localize.global('general.trophy_silver'), value: formatSpacedNumber(deeds.TrophiesSilver), read: (scan) => scan.Deeds?.TrophiesSilver },
        { label: localize.global('general.trophy_gold'), value: formatSpacedNumber(deeds.TrophiesGold), read: (scan) => scan.Deeds?.TrophiesGold }
      ]
    },
    {
      title: localize('deeds.titles'),
      rows: [
        { icon: title ? `/res/deeds/titles/${title}.webp` : undefined, label: localize('deeds.title'), value: title ? localize.global(`general.hero_title_type_${title}`) : '-' },
        { label: localize('deeds.unlocked'), value: `${deeds.TitlesUnlocked} / 12`, read: (scan) => scan.Deeds?.TitlesUnlocked }
      ]
    }
  ]
})

const shelf = computed(() => {
  const borders = ['border-[#c27c48]', 'border-[#b8c4cc]', 'border-[#e8b931]']

  // The base shelf holds 3 trophies, the other shelves hold 6
  const capacity = props.deeds.Shelf === 1 ? 3 : 6

  return props.deeds.Trophies.slice(0, capacity).map((trophy) => {
    if (!trophy.Type) return null

    // Every deed has a bronze, silver and gold trophy
    const deed = Math.ceil(trophy.Type / 3)
    const tier = (trophy.Type - 1) % 3
    const required = formatSpacedNumber(DEED_REQUIREMENTS[deed][tier])

    return {
      image: `/res/deeds/trophies/${trophy.Type}.webp`,
      name: localize.global(`general.deed_${deed}`),
      description: localize.global(`general.deed_${deed}_description`),
      // Collector counts the Scrapbook percentage
      required: localize('deeds.required', { value: deed === 28 ? `${required}%` : required }),
      border: borders[tier],
      hot: trophy.Hot
    }
  })
})
</script>
