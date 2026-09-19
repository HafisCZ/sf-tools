<template>
  <div class="h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(props.percent)">
    <div class="h-full rounded-full bg-accent transition-[width]" :style="{ width: `${Math.min(100, Math.max(0, props.percent))}%` }" />
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SFProgress'
})

const props = defineProps<{
  /**
   * How far along it is, from 0 to 100
   */
  percent: number
}>()
</script>
