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

  <main class="mx-auto w-full px-4 pt-[70px] pb-16 md:max-w-[calc(var(--page-width)+2rem)]" :style="{ '--page-width': props.width }">
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
   * Items shown in the header after the title
   */
  'nav-left'?(): unknown
  /**
   * Items shown on the right side of the header, before the language picker
   */
  'nav-right'?(): unknown
}>()
</script>
