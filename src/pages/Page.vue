<template>
  <header class="fixed inset-x-0 top-0 z-10 flex h-14 items-center gap-2 bg-surface px-4 shadow-lg shadow-black/30">
    <a href="index.html" class="rounded-md px-2 py-1 text-xl font-bold text-white transition hover:text-accent">SFTools</a>
    <nav class="flex items-center gap-1">
      <slot name="nav" />
    </nav>
    <LocalePicker class="ml-auto" />
  </header>

  <main class="mx-auto w-full max-w-6xl px-4 pt-22 pb-16">
    <slot />
  </main>
</template>

<script setup lang="ts">
import LocalePicker from "./components/LocalePicker.vue"

defineOptions({
  name: "Page"
})
</script>
