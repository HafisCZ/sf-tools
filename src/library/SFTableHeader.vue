<template>
  <th class="border-b border-white/10 bg-black/15 px-[11px] py-[13px] font-bold" :class="ALIGN_CLASSES[props.align ?? 'left']">
    <slot />
  </th>
</template>

<script setup lang="ts">
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
</script>
