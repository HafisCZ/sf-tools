<template>
  <div
    class="group relative flex min-h-21 items-center gap-3 rounded-[10px] bg-surface/80 py-2.5 pr-3.5 pl-2.5 has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-accent/50"
    :class="{ 'touch-none select-none': props.managing && props.movable, 'z-20 scale-[1.03] shadow-xl shadow-black/60 transform-none!': props.dragging }"
  >
    <span class="flex size-16 shrink-0 items-center justify-center">
      <img v-if="props.picture" :src="props.picture" alt="" width="256" height="256" class="size-16" />
      <img v-else-if="props.icon" :src="props.icon" alt="" width="128" height="128" class="size-11 rounded-lg object-contain" />
      <span v-else class="flex size-11 items-center justify-center rounded-full border-2 border-dashed border-white/30 text-lg text-white/60">
        <SFIcon name="link" />
      </span>
    </span>
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="flex min-w-0 items-center gap-2">
        <button
          v-if="props.managing"
          type="button"
          :aria-pressed="!!props.favorite"
          class="min-w-0 text-left text-[15px] leading-tight font-bold text-white outline-none transition-colors group-hover:text-accent after:absolute after:inset-0"
          :class="props.dragging ? 'cursor-grabbing' : props.movable ? 'cursor-grab' : 'cursor-pointer'"
          @click="emit('favorite')"
        >
          <span v-if="props.author" class="text-accent">{{ localize('author', { author: props.author }) }}</span> {{ props.title }}
        </button>
        <a v-else :href="props.href" :target="props.external ? '_blank' : undefined" class="min-w-0 text-[15px] leading-tight font-bold text-white outline-none transition-colors group-hover:text-accent after:absolute after:inset-0">
          <span v-if="props.author" class="text-accent">{{ localize('author', { author: props.author }) }}</span> {{ props.title }}
        </a>
        <span v-if="props.tag" class="shrink-0 rounded bg-accent px-1.5 text-[11px] leading-4 font-bold tracking-wider text-black uppercase text-shadow-none">{{ props.tag }}</span>
      </span>
      <span v-if="props.description" class="line-clamp-2 text-[13px] leading-snug text-white/70">{{ props.description }}</span>
    </span>
    <span v-if="props.managing" aria-hidden="true" class="pointer-events-none absolute -top-2 -right-2 z-10 flex size-6 items-center justify-center rounded-full text-xs text-shadow-none" :class="props.favorite ? 'bg-accent text-black' : 'border border-line bg-surface text-white/60'">
      <SFIcon :name="props.favorite ? 'star-solid' : 'star'" />
    </span>
  </div>
</template>

<script setup lang="ts">
import SFIcon from '@library/SFIcon.vue'
import { useLocalize } from '@utils/localization'

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
   * Name shown in orange before the title
   */
  author?: string
  /**
   * Text under the title
   */
  description?: string
  /**
   * Picture shown left of the title
   */
  picture?: string
  /**
   * Smaller rounded icon shown when there is no picture, a link icon is shown when there is neither
   */
  icon?: string
  /**
   * Small pill after the title
   */
  tag?: string
  /**
   * Opens the link in a new tab
   */
  external?: boolean
  /**
   * Marks the card as a favorite
   */
  favorite?: boolean
  /**
   * Turns a click into favoriting
   */
  managing?: boolean
  /**
   * Lets the card be dragged while managing
   */
  movable?: boolean
  /**
   * Lifts the card while it is dragged
   */
  dragging?: boolean
}>()

const emit = defineEmits<{
  /**
   * Card was clicked while managing
   */
  favorite: []
}>()

const localize = useLocalize('index')
</script>
