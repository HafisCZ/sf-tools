<template>
  <header class="fixed inset-x-0 top-0 z-10 flex h-[50px] items-center gap-2 pr-3.5 pl-3.5" :class="props.opaque ? 'bg-surface shadow-lg shadow-black/30' : ''">
    <a href="index.html" class="rounded-md px-2 py-1 text-xl font-bold text-white transition hover:text-accent">SFTools</a>
    <nav class="flex items-center gap-1">
      <slot name="nav" />
    </nav>
    <LocalePicker class="ml-auto" />
  </header>

  <!-- Same width as the legacy Fomantic container (1127px) and the same 70px from the top -->
  <main class="mx-auto w-full max-w-[calc(1127px+2rem)] px-4 pt-[70px] pb-16">
    <slot />
  </main>
</template>

<script setup lang="ts">
import LocalePicker from "./components/LocalePicker.vue"

defineOptions({
  name: "Page"
})

const props = withDefaults(
  defineProps<{
    /**
     * Gives the header a background and shadow. Turn it off to show the header over the page content.
     */
    opaque?: boolean
  }>(),
  {
    opaque: true
  }
)
</script>
