<template>
  <footer class="pointer-events-none fixed inset-x-0 bottom-0 flex items-end justify-between gap-4 p-3 text-[12.6px] text-white/70 text-shadow-[0_0_10px_black]">
    <div class="w-1/3 [&_a]:pointer-events-auto">
      <slot />
    </div>
    <div class="flex w-1/3 flex-col items-end gap-0.5 text-right">
      <slot name="links" />
    </div>
  </footer>
</template>

<script setup lang="ts">
defineOptions({
  name: 'PageFooter'
})
</script>
