<template>
  <span class="flex items-center gap-1.5 max-md:flex-wrap max-md:justify-center max-md:gap-y-0.5">
    <span class="flex items-center gap-1.5">
      <SFIcon name="copyright" />
      2019 - {{ currentYear }} | mar21 |
    </span>
    <span class="flex items-center gap-1.5">
      <SFIcon name="discord" />
      mar21 |
    </span>
    <span class="flex items-center gap-1.5">
      <SFIcon name="envelope" />
      support@mar21.eu
    </span>
  </span>
</template>

<script setup lang="ts">
import SFIcon from '@library/SFIcon.vue'
import { computed } from 'vue'

defineOptions({
  name: 'FooterCopyright'
})

const currentYear = computed(() => new Date().getFullYear())
</script>
