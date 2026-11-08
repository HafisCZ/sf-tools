<template>
  <div class="flex flex-col gap-1">
    <span class="font-bold">{{ props.name }}</span>
    <template v-if="props.cost.length > 0">
      <span v-if="prices.length > 0" class="flex items-center gap-1.5 whitespace-nowrap">
        <span class="text-white/60">{{ localize('resources') }}:</span>
        <span v-for="price in prices" :key="price.key" class="flex items-center gap-1">
          <img :src="`/res/buildings/${price.key}.webp`" :alt="localize.global(`general.${price.key}`)" class="h-3.5 w-4 object-contain" />
          <span class="font-bold">{{ formatNamedNumber(price.cost) }}</span>
          <span v-if="price.discount >= 1" class="text-white/50">-{{ formatNamedNumber(Math.round(price.discount)) }}</span>
        </span>
      </span>
      <span class="flex items-center gap-1.5 whitespace-nowrap">
        <span class="text-white/60">{{ localize('build') }}:</span>
        <span class="font-bold">{{ formatBuildTime(props.duration) }}</span>
      </span>
      <span class="flex items-center gap-1.5 whitespace-nowrap">
        <span class="text-white/60">{{ localize('skip') }}:</span>
        <img src="/res/mushroom.png" alt="" class="size-3.5 object-contain" />
        <span class="font-bold">{{ formatSpacedNumber(getSkipCost(props.duration)) }}</span>
      </span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatNamedNumber, formatSpacedNumber } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { formatBuildTime, getSkipCost } from '~/pages/build-planner/build-planner'
import type { PlannerConfig } from '~/pages/build-planner/types'

defineOptions({
  name: 'BuildCostSummary'
})

const props = defineProps<{
  /**
   * Buildings, prices and rules of the planned area
   */
  config: PlannerConfig
  /**
   * Building and level shown as the title
   */
  name: string
  /**
   * Price per resource, empty when there is no level to build
   */
  cost: number[]
  /**
   * What the previous build mined towards each price
   */
  discount: number[]
  /**
   * Build time in milliseconds
   */
  duration: number
}>()

const localize = useLocalize('build_planner')

const prices = computed(() => props.config.resources.map((resource, index) => ({ key: resource.key, cost: props.cost[index], discount: props.discount[index] })).filter((price) => price.cost > 0))
</script>
