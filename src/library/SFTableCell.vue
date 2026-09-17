<template>
  <td class="border-t border-white/10 p-[11px] group-first/row:border-t-0" :class="ALIGN_CLASSES[props.align ?? 'left']">
    <slot />
  </td>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SFTableCell'
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
</script>
