<template>
  <th class="border-b border-white/10 bg-black/15 py-[13px] font-bold" :class="[ALIGN_CLASSES[props.align ?? 'left'], table.dense ? 'px-[8.4px]' : 'px-[11px]']">
    <button v-if="props.column" type="button" class="flex w-full cursor-pointer items-center gap-1.5 outline-none" :class="JUSTIFY_CLASSES[props.align ?? 'left']" @click="table.sort.sortBy(props.column, props.descending ? 'desc' : 'asc')">
      <slot />
      <SFIcon v-if="sortIcon" :name="sortIcon" class="text-[0.6em] text-white/60" />
    </button>
    <slot v-else />
  </th>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { DEFAULT_TABLE_OPTIONS, TABLE_OPTIONS_KEY } from '@utils/components'
import { type IconName } from '@utils/icons'
import SFIcon from './SFIcon.vue'

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

const JUSTIFY_CLASSES = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end'
}

const table = inject(TABLE_OPTIONS_KEY, DEFAULT_TABLE_OPTIONS)

const sortIcon = computed<IconName | false>(() => {
  switch (props.column ? table.sort.isSortedBy(props.column) : false) {
    case 'asc':
      return 'sort-up'
    case 'desc':
      return 'sort-down'
    default:
      return false
  }
})
</script>
