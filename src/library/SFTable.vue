<template>
  <div class="overflow-x-auto rounded-[4px]">
    <table class="w-full border-separate border-spacing-0">
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
defineOptions({
  name: 'SFTable'
})

const slots = defineSlots<{
  default?(): unknown
  header?(): unknown
}>()
</script>
