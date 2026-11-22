<template>
  <div class="group relative flex min-h-21 items-center gap-3 rounded-[10px] bg-surface/80 py-2.5 pl-2.5 has-[a:focus-visible]:outline-1 has-[a:focus-visible]:outline-accent/50" :class="props.managing ? 'pr-12' : 'pr-3.5'">
    <span class="flex size-16 shrink-0 items-center justify-center">
      <img v-if="props.picture" :src="props.picture" alt="" width="256" height="256" class="size-16" />
      <img v-else-if="props.icon" :src="props.icon" alt="" width="128" height="128" class="size-11 rounded-lg object-contain" />
      <span v-else class="flex size-11 items-center justify-center rounded-full border-2 border-dashed border-white/30 text-lg text-white/60">
        <SFIcon name="link" />
      </span>
    </span>
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="flex min-w-0 items-center gap-2">
        <a :href="props.href" :target="props.external ? '_blank' : undefined" class="min-w-0 truncate text-[15px] leading-tight font-bold text-white outline-none transition-colors group-hover:text-accent after:absolute after:inset-0">
          <span v-if="props.author" class="text-accent">{{ localize('author', { author: props.author }) }}</span> {{ props.title }}
        </a>
        <span v-if="props.tag" class="shrink-0 rounded bg-accent px-1.5 text-[11px] leading-4 font-bold tracking-wider text-black uppercase text-shadow-none">{{ props.tag }}</span>
      </span>
      <span v-if="props.description" class="line-clamp-2 text-[13px] leading-snug text-white/70">{{ props.description }}</span>
    </span>
    <span v-if="props.managing" class="absolute top-1/2 right-1.5 z-10 -translate-y-1/2">
      <SFButton variant="ghost" icon :aria-label="props.favorite ? localize('favorite_remove') : localize('favorite_add')" :aria-pressed="!!props.favorite" @click="emit('favorite')">
        <SFIcon :name="props.favorite ? 'star-solid' : 'star'" :class="{ 'text-accent': props.favorite }" />
      </SFButton>
    </span>
  </div>
</template>

<script setup lang="ts">
import SFButton from '@library/SFButton.vue'
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
   * Fills the favorite star
   */
  favorite?: boolean
  /**
   * Shows the favorite star button
   */
  managing?: boolean
}>()

const emit = defineEmits<{
  /**
   * Favorite star button was clicked
   */
  favorite: []
}>()

const localize = useLocalize('index')
</script>
