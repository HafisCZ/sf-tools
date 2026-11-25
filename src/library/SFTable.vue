<template>
  <div class="overflow-x-auto" :class="{ 'rounded-[4px] bg-surface': !props.plain }">
    <table class="w-full border-separate border-spacing-0" :class="{ 'table-fixed': props.fixed }">
      <thead v-if="slots.header">
        <slot name="header" />
      </thead>
      <tbody>
        <slot />
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue'
import { TABLE_OPTIONS_KEY, type TableSorting } from '@utils/components'

defineOptions({
  name: 'SFTable'
})

const props = defineProps<{
  /**
   * Shares the width equally between the columns that don't set their own
   */
  fixed?: boolean
  /**
   * Uses smaller padding in the headers and cells
   */
  dense?: boolean
  /**
   * Drops the background, only the lines between the rows stay
   */
  plain?: boolean
}>()

const slots = defineSlots<{
  default?(): unknown
  header?(): unknown
}>()

/**
 * Column the rows are sorted by, undefined while they are in their own order
 */
const sorting = defineModel<TableSorting | undefined>('sorting')

provide(TABLE_OPTIONS_KEY, {
  get dense() {
    return props.dense
  },
  get plain() {
    return props.plain
  },
  sort: {
    isSortedBy: (column) => {
      if (!sorting.value) return column === undefined ? 'asc' : false

      return sorting.value.column === column ? sorting.value.direction : false
    },
    sortBy: (column, first = 'asc') => {
      if (column === undefined) {
        sorting.value = undefined
      } else if (sorting.value?.column !== column) {
        sorting.value = { column, direction: first }
      } else {
        sorting.value = { column, direction: sorting.value.direction === 'asc' ? 'desc' : 'asc' }
      }
    }
  }
})
</script>
