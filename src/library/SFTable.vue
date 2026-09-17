<template>
  <div class="overflow-x-auto rounded-[4px] bg-surface">
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
import { TABLE_OPTIONS_KEY } from '@utils/components'

defineOptions({
  name: 'SFTable'
})

const props = defineProps<{
  /**
   * Shares the width equally between the columns that don't set their own, whatever their content
   */
  fixed?: boolean
  /**
   * Uses smaller padding in the headers and cells
   */
  dense?: boolean
}>()

const slots = defineSlots<{
  default?(): unknown
  header?(): unknown
}>()

provide(TABLE_OPTIONS_KEY, {
  get dense() {
    return props.dense
  }
})
</script>
