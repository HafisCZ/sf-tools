<template>
  <td class="border-t border-white/10 group-first/row:border-t-0" :class="[ALIGN_CLASSES[props.align ?? 'left'], table.dense ? 'px-[8.4px] py-[5.6px]' : 'p-[11px]']">
    <slot />
  </td>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { DEFAULT_TABLE_OPTIONS, TABLE_OPTIONS_KEY } from '@utils/components'

defineOptions({
  name: 'SFTableCell'
})

const props = defineProps<{
  /**
   * Horizontal alignment of the content
   */
  align?: 'left' | 'center' | 'right'
}>()

const ALIGN_CLASSES = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right'
}

const table = inject(TABLE_OPTIONS_KEY, DEFAULT_TABLE_OPTIONS)
</script>
