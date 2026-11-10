<template>
  <div>
    <div v-if="props.title" class="mb-1 flex items-center gap-2.5 border-b border-white/30 pb-2">
      <img v-if="props.icon" :src="props.icon" alt="" class="size-7 object-contain" />
      <SFHeading level="4" class="leading-none">{{ props.title }}</SFHeading>
    </div>
    <div v-for="(row, rowIndex) in props.rows" :key="rowIndex" :class="{ 'mt-[35px]': row.gap }" class="flex items-start gap-2 border-b border-white/5 py-1.5 leading-[22px]">
      <img v-if="row.icon" :src="row.icon" alt="" class="size-[22px] shrink-0 object-contain" />
      <span class="flex-1">{{ row.label }}</span>
      <span v-if="row.placeholder" class="group grid text-right">
        <span class="col-start-1 row-start-1 opacity-0 group-hover:opacity-100">{{ row.value }}</span>
        <span class="pointer-events-none col-start-1 row-start-1 text-white/60 group-hover:opacity-0">{{ row.placeholder }}</span>
      </span>
      <PlayerDetailValue v-else :value="row.value" :read="row.read" :title="row.label" class="text-right" />
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import SFHeading from '@library/SFHeading.vue'
import PlayerDetailValue from '~/pages/stats/components/PlayerDetailValue.vue'
import { type PlayerDetailRow } from '~/pages/stats/types'

defineOptions({
  name: 'PlayerDetailPanel'
})

const props = defineProps<{
  /**
   * Heading shown above the rows
   */
  title?: string
  /**
   * Image shown before the heading
   */
  icon?: `/${string}`
  /**
   * Label and value rows shown under the heading
   */
  rows?: PlayerDetailRow[]
}>()

defineSlots<{
  /**
   * Content shown after the rows
   */
  default?(): unknown
}>()
</script>
