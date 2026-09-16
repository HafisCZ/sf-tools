<template>
  <span class="flex items-center gap-1.5">
    <SFIcon name="copyright" />
    2019 - {{ currentYear }} | mar21 |
    <SFIcon name="discord" />
    mar21 |
    <SFIcon name="envelope" />
    support@mar21.eu
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
