<template>
  <a :href="props.href" :target="props.external ? '_blank' : undefined" class="group relative flex h-[140px] items-center justify-center p-7 text-center text-white">
    <span class="relative">
      <span v-if="props.author" class="absolute inset-x-0 bottom-full mb-1 flex items-center justify-center gap-1.5 text-sm font-bold text-accent">
        {{ props.author }}'s
        <span v-if="props.tag" class="rounded bg-accent px-1.5 text-[11px] leading-4 tracking-wider text-black text-shadow-none">{{ props.tag }}</span>
      </span>
      <span class="relative block text-[35px] leading-[35px] font-bold uppercase transition-opacity" :class="props.description ? 'group-hover:opacity-0' : 'group-hover:opacity-60'">
        <span v-if="props.badge" class="absolute -top-[1.5em] left-0 text-[50%] leading-[35px] text-accent">{{ props.badge }}</span>
        {{ props.title }}
      </span>
    </span>
    <span v-if="props.description" class="absolute inset-0 flex items-center justify-center p-7 opacity-0 transition-opacity group-hover:opacity-100">{{ props.description }}</span>
  </a>
</template>

<script setup lang="ts">
defineOptions({
  name: 'ToolCard'
})

const props = defineProps<{
  /**
   * Link the card opens
   */
  href: string
  /**
   * Title of the card
   */
  title: string
  /**
   * Replaces the title while the card is hovered
   */
  description?: string
  /**
   * Small accent word at the top left of the title
   */
  badge?: string
  /**
   * Small pill next to the author name
   */
  tag?: string
  /**
   * Author shown above the title
   */
  author?: string
  /**
   * Opens the link in a new tab
   */
  external?: boolean
}>()
</script>
