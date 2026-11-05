<template>
  <span class="block">
    <span class="whitespace-nowrap">{{ props.value }}</span> <span v-if="difference" class="text-xs font-bold whitespace-nowrap" :class="difference > 0 ? 'text-[#8fd694]' : 'text-[#ff7676]'">{{ difference > 0 ? '+' : '-' }}{{ formatSpacedNumber(Math.abs(difference)) }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatSpacedNumber } from '@utils/formatting'

defineOptions({
  name: 'PlayerDetailValue'
})

const props = defineProps<{
  /**
   * Text shown as the value
   */
  value: string
  /**
   * Number in the shown scan, the change to `previous` is shown after the value
   */
  current?: number
  /**
   * Number in the compared scan
   */
  previous?: number
}>()

const difference = computed(() => (props.current === undefined || props.previous === undefined ? 0 : props.current - props.previous))
</script>
