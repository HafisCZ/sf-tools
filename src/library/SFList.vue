<template>
  <ul class="list-disc space-y-2 pl-5">
    <slot />
  </ul>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SFList'
})
</script>
