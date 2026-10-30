<template>
  <a v-if="props.href" :href="props.href" target="_blank" class="pointer-events-auto flex cursor-pointer items-center gap-1.5 text-accent hover:underline">
    <SFIcon :name="props.icon" />
    <slot />
  </a>
  <button v-else type="button" class="pointer-events-auto flex cursor-pointer items-center gap-1.5 text-accent hover:underline">
    <SFIcon :name="props.icon" />
    <slot />
  </button>
</template>

<script setup lang="ts">
import SFIcon from '@library/SFIcon.vue'
import { type IconName } from '@utils/icons'

defineOptions({
  name: 'FooterLink'
})

const props = defineProps<{
  /**
   * Icon before the text
   */
  icon: IconName
  /**
   * Opens this address in a new tab
   */
  href?: string
}>()
</script>
