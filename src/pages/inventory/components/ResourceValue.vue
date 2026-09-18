<template>
  <span class="whitespace-nowrap">
    <img :src="ICONS[props.type]" alt="" class="-mt-[0.5em] -mr-[0.25em] -mb-[0.625em] inline-block size-[2em] max-w-none align-baseline" />
    {{ props.signed && props.value > 0 ? '+' : '' }}{{ formatSpacedNumber(props.value) }}
  </span>
</template>

<script setup lang="ts">
import { formatSpacedNumber } from '@utils/formatting'

defineOptions({
  name: 'ResourceValue'
})

const props = defineProps<{
  /**
   * Resource shown by the icon
   */
  type: 'gold' | 'metal' | 'crystal'
  /**
   * Amount of the resource
   */
  value: number
  /**
   * Adds a plus sign to positive amounts
   */
  signed?: boolean
}>()

const ICONS = {
  gold: '/res/icon_gold.png',
  metal: '/res/icon_metal.png',
  crystal: '/res/icon_crystal.png'
}
</script>
