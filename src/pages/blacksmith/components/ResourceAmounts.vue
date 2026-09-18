<template>
  <div class="flex flex-col gap-[0.5em]">
    <div v-for="resource in RESOURCES" :key="resource.key" class="flex justify-between gap-[0.5em]">
      <span>
        <img :src="resource.icon" alt="" class="-mt-[0.5em] mr-[0.5em] -mb-[0.625em] inline-block size-[2em] max-w-none align-baseline" />
        {{ formatSpacedNumber(props.resources[resource.key]) }}
      </span>
      <span v-if="props.relativeTo" class="pr-[1em]">{{ ((100 * props.resources[resource.key]) / Math.max(1, props.relativeTo[resource.key])).toFixed(1) }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatSpacedNumber } from '@utils/formatting'
import { type BlacksmithResources } from '~/data/types'

defineOptions({
  name: 'ResourceAmounts'
})

const props = defineProps<{
  /**
   * Metal and crystal to show
   */
  resources: BlacksmithResources
  /**
   * Also shows each amount as a percentage of this one
   */
  relativeTo?: BlacksmithResources
}>()

const RESOURCES = [
  { key: 'Metal', icon: '/res/icon_metal.png' },
  { key: 'Crystal', icon: '/res/icon_crystal.png' }
] as const
</script>
