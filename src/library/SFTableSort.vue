<template>
  <button type="button" class="relative inline-flex cursor-pointer items-center outline-none" @click="table.sort.sortBy(props.column, props.descending ? 'desc' : 'asc')">
    <slot />
    <SFIcon v-if="sortIcon" :name="sortIcon" class="absolute top-1/2 -translate-y-1/2 text-[0.6em] text-white/60" :class="props.arrowSide === 'left' ? 'right-full mr-[3px]' : 'left-full ml-[3px]'" />
  </button>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { DEFAULT_TABLE_OPTIONS, TABLE_OPTIONS_KEY } from '@utils/components'
import { type IconName } from '@utils/icons'
import SFIcon from './SFIcon.vue'

defineOptions({
  name: 'SFTableSort'
})

const props = defineProps<{
  /**
   * Key the rows are sorted by when clicked
   */
  column: string
  /**
   * Sorts the column from its largest value on the first click
   */
  descending?: boolean
  /**
   * Side the sort arrow is drawn on, outside the label so it never moves it
   */
  arrowSide?: 'left' | 'right'
}>()

const table = inject(TABLE_OPTIONS_KEY, DEFAULT_TABLE_OPTIONS)

const sortIcon = computed<IconName | false>(() => {
  switch (table.sort.isSortedBy(props.column)) {
    case 'asc':
      return 'sort-up'
    case 'desc':
      return 'sort-down'
    default:
      return false
  }
})
</script>
