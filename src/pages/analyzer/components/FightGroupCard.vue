<template>
  <span class="flex min-w-0 flex-1 flex-col gap-3 py-2">
    <span class="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
      <span class="flex min-w-0 items-center gap-3">
        <img :src="getClassImageUrl(props.group.fighterA.Class)" alt="" class="size-10 object-contain" />
        <span class="flex min-w-0 flex-col">
          <span class="truncate font-bold">{{ getFighterName(props.group.fighterA) }}</span>
          <span class="text-xs text-white/50">{{ localize.global('general.level') }} {{ props.group.fighterA.Level }}</span>
        </span>
      </span>
      <span class="flex flex-col items-center">
        <span class="text-2xl font-bold">{{ winsA }} : {{ winsB }}</span>
        <span class="text-xs text-white/50">{{ fightCount }}</span>
      </span>
      <span class="flex min-w-0 flex-row-reverse items-center gap-3 text-right">
        <img :src="getClassImageUrl(props.group.fighterB.Class)" alt="" class="size-10 object-contain" />
        <span class="flex min-w-0 flex-col">
          <span class="truncate font-bold">{{ getFighterName(props.group.fighterB) }}</span>
          <span class="text-xs text-white/50">{{ localize.global('general.level') }} {{ props.group.fighterB.Level }}</span>
        </span>
      </span>
    </span>
    <span class="flex h-2 overflow-hidden rounded-full bg-white/15">
      <span class="bg-accent" :style="{ width: `${rateA}%` }" />
    </span>
    <span class="flex justify-between text-xs text-white/50">
      <span>{{ rateA.toFixed(1) }}%</span>
      <span>{{ rateB.toFixed(1) }}%</span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLocalize } from '@utils/localization'
import { getClassImageUrl } from '@utils/utils'
import { countWins, getFighterName, type FightGroup } from '~/pages/analyzer/analyzer'

defineOptions({
  name: 'FightGroupCard'
})

const props = defineProps<{
  /**
   * Fight group whose fighters, score and win rates are shown
   */
  group: FightGroup
}>()

const localize = useLocalize('analyzer.group_card')

const winsA = computed(() => countWins(props.group, props.group.fighterA))
const winsB = computed(() => countWins(props.group, props.group.fighterB))

const rateA = computed(() => (100 * winsA.value) / props.group.fights.length)
const rateB = computed(() => (100 * winsB.value) / props.group.fights.length)

const fightCount = computed(() => (props.group.fights.length === 1 ? localize('fight') : localize('fights', { count: props.group.fights.length })))
</script>
