<template>
  <header class="fixed inset-x-0 top-0 z-10 flex h-[50px] items-center gap-2 pr-3.5 pl-3.5" :class="props.opaque ? 'bg-surface shadow-lg shadow-black/30' : ''">
    <a v-if="props.link" href="index.html" class="rounded-md px-2 py-1 text-xl font-bold text-white transition hover:text-accent">SFTools</a>
    <span v-else class="px-2 py-1 text-xl font-bold text-white">SFTools</span>
    <nav class="flex items-center gap-1">
      <slot name="nav-left" />
    </nav>
    <div v-if="slots['nav-right']" class="ml-auto flex items-center gap-1">
      <slot name="nav-right" />
    </div>
    <LocalePicker :class="{ 'ml-auto': !slots['nav-right'] }" />
  </header>

  <div class="max-md:flex max-md:min-h-dvh max-md:flex-col">
    <main class="mx-auto w-full px-4 pt-[70px] pb-16 max-md:flex-1 md:max-w-[calc(var(--page-width)+2rem)]" :style="{ '--page-width': props.width }">
      <slot />
    </main>
    <footer v-if="slots['footer-left'] || slots['footer-right']" class="pointer-events-none fixed inset-x-0 bottom-0 flex items-end justify-between gap-4 p-3 text-[12.6px] text-white/70 text-shadow-[0_0_10px_black] max-md:static max-md:flex-col max-md:items-center">
      <div class="w-1/3 max-md:w-full max-md:text-center [&_a]:pointer-events-auto">
        <slot name="footer-left" />
      </div>
      <div class="flex w-1/3 flex-col items-end gap-0.5 text-right max-md:w-full max-md:items-center max-md:text-center">
        <slot name="footer-right" />
      </div>
    </footer>
  </div>
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
     * Maximum width of the content as a CSS length
     */
    width?: string
    /**
     * Makes SFTools title a link to the index page
     */
    link?: boolean
  }>(),
  {
    opaque: true,
    width: '1127px',
    link: true
  }
)

const slots = defineSlots<{
  /**
   * Content of the page
   */
  default(): unknown
  /**
   * Left side of the footer, shown above the right side on phones
   */
  'footer-left'?(): unknown
  /**
   * Right side of the footer, usually links and copyright
   */
  'footer-right'?(): unknown
  /**
   * Items shown in the header after the title
   */
  'nav-left'?(): unknown
  /**
   * Items shown on the right side of the header, before the language picker
   */
  'nav-right'?(): unknown
}>()
</script>
