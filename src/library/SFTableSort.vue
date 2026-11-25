<template>
  <button
    type="button"
    class="group/sort -mx-1.5 -my-0.5 inline-flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-0.5 outline-none hover:bg-white/7 focus-visible:bg-white/7"
    :class="direction ? 'text-accent' : 'hover:text-white focus-visible:text-white'"
    @click="table.sort.sortBy(props.column, props.descending ? 'desc' : 'asc')"
  >
    <slot />
    <span class="relative inline-flex text-[0.7em]">
      <SFIcon name="sort-up" :class="getArrowClass('asc')" />
      <SFIcon name="sort-down" class="absolute inset-0" :class="getArrowClass('desc')" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { DEFAULT_TABLE_OPTIONS, TABLE_OPTIONS_KEY } from '@utils/components'
import SFIcon from './SFIcon.vue'

defineOptions({
  name: 'SFTableSort'
})

const props = defineProps<{
  /**
   * Key the rows are sorted by when clicked, without it the click puts the rows back in their own order
   */
  column?: string
  /**
   * Sorts the column from its largest value on the first click
   */
  descending?: boolean
}>()

const table = inject(TABLE_OPTIONS_KEY, DEFAULT_TABLE_OPTIONS)

const direction = computed(() => table.sort.isSortedBy(props.column))

function getArrowClass(arrow: 'asc' | 'desc') {
  if (direction.value === arrow) return 'text-accent'

  return direction.value ? 'text-white/15' : 'text-white/30 group-hover/sort:text-white/60 group-focus-visible/sort:text-white/60'
}
</script>
