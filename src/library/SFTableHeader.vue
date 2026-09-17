<template>
  <th class="border-b border-white/10 bg-black/15 py-[13px] font-bold" :class="[ALIGN_CLASSES[props.align ?? 'left'], table.dense ? 'px-[8.4px]' : 'px-[11px]']">
    <slot />
  </th>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { TABLE_OPTIONS_KEY } from '@utils/components'

defineOptions({
  name: 'SFTableHeader'
})

const props = defineProps<{
  /**
   * Horizontal alignment of the content, left when left out
   */
  align?: 'left' | 'center' | 'right'
}>()

const ALIGN_CLASSES = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right'
}

const table = inject(TABLE_OPTIONS_KEY, { dense: false })
</script>
