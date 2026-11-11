<template>
  <span class="flex items-center gap-1.5 max-md:flex-wrap max-md:justify-center max-md:gap-y-0.5">
    <span class="flex items-center gap-1.5">
      <SFIcon name="copyright" />
      2019 - {{ currentYear }} | mar21 |
    </span>
    <span class="flex items-center gap-1.5">
      <a href="https://discord.gg/XWfSwe3" target="_blank" class="pointer-events-auto flex cursor-pointer items-center gap-1.5 hover:underline">
        <SFIcon name="discord" />
        mar21
      </a>
      |
    </span>
    <span class="flex items-center gap-1.5">
      <a href="mailto:support@mar21.eu" class="pointer-events-auto flex cursor-pointer items-center gap-1.5 hover:underline">
        <SFIcon name="envelope" />
        support@mar21.eu
      </a>
      |
    </span>
    <span class="flex items-center gap-1.5">
      <a href="terms.html" class="pointer-events-auto cursor-pointer hover:underline">Terms</a>
      |
    </span>
    <a href="privacy.html" class="pointer-events-auto cursor-pointer hover:underline">Privacy</a>
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
