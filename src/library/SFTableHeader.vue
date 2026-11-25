<template>
  <th class="border-b border-white/10 py-[13px] font-bold" :class="[ALIGN_CLASSES[props.align ?? 'left'], table.dense ? 'px-[8.4px]' : 'px-[11px]', { 'bg-white/2': !table.plain }]">
    <SFTableSort v-if="props.column" :column="props.column" :descending="props.descending">
      <slot />
    </SFTableSort>
    <slot v-else />
  </th>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { DEFAULT_TABLE_OPTIONS, TABLE_OPTIONS_KEY } from '@utils/components'
import SFTableSort from './SFTableSort.vue'

defineOptions({
  name: 'SFTableHeader'
})

const props = defineProps<{
  /**
   * Horizontal alignment of the content
   */
  align?: 'left' | 'center' | 'right'
  /**
   * Key the rows are sorted by when the header is clicked
   */
  column?: string
  /**
   * Sorts the column from its largest value on the first click
   */
  descending?: boolean
}>()

const ALIGN_CLASSES = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right'
}

const table = inject(TABLE_OPTIONS_KEY, DEFAULT_TABLE_OPTIONS)
</script>
