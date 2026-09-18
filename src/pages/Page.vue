<template>
  <header class="fixed inset-x-0 top-0 z-10 flex h-[50px] items-center gap-2 pr-3.5 pl-3.5" :class="props.opaque ? 'bg-surface shadow-lg shadow-black/30' : ''">
    <a v-if="props.link" href="index.html" class="rounded-md px-2 py-1 text-xl font-bold text-white transition hover:text-accent">SFTools</a>
    <span v-else class="px-2 py-1 text-xl font-bold text-white">SFTools</span>
    <nav class="flex items-center gap-1">
      <slot name="nav" />
    </nav>
    <LocalePicker class="ml-auto" />
  </header>

  <main class="mx-auto w-full px-4 pt-[70px] pb-16" :class="props.wide ? 'md:max-w-[calc(80vw+2rem)]' : 'max-w-[calc(1127px+2rem)]'">
    <slot />
  </main>
</template>

<script setup lang="ts">
import LocalePicker from './components/LocalePicker.vue'

defineOptions({
  name: 'Page'
})

const props = withDefaults(
  defineProps<{
    /**
     * Gives the header a background and shadow
     */
    opaque?: boolean
    /**
     * Uses 80% of the window width instead of the 1127px container
     */
    wide?: boolean
    /**
     * Makes SFTools title a link to the index page
     */
    link?: boolean
  }>(),
  {
    opaque: true,
    link: true
  }
)
</script>
