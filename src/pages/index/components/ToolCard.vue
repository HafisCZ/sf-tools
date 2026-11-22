<template>
  <div class="group relative flex flex-col items-center gap-1 rounded-[10px] bg-surface/80 px-2 pt-2 pb-2.5 text-center has-[a:focus-visible]:outline-1 has-[a:focus-visible]:outline-accent/50">
    <div class="flex max-w-full flex-col items-center gap-0.5" :class="{ 'transition-opacity group-hover:opacity-0 group-has-[a:focus-visible]:opacity-0': props.description }">
      <span class="mb-1 flex size-20 items-center justify-center">
        <img v-if="props.picture" :src="props.picture" alt="" width="256" height="256" class="size-20" />
        <img v-else-if="props.icon" :src="props.icon" alt="" width="128" height="128" class="size-14 rounded-lg object-contain" />
        <span v-else class="flex size-14 items-center justify-center rounded-full border-2 border-dashed border-white/30 text-xl text-white/60">
          <SFIcon name="link" />
        </span>
      </span>
      <a :href="props.href" :target="props.external ? '_blank' : undefined" class="text-[15px] leading-tight font-bold text-white outline-none transition-colors group-hover:text-accent after:absolute after:inset-0">{{ props.title }}</a>
      <span v-if="props.subtitle" class="max-w-full truncate text-[13px] text-white/70" :title="props.subtitle">{{ props.subtitle }}</span>
    </div>
    <span v-if="props.description" class="pointer-events-none absolute inset-0 flex items-center justify-center p-4 text-sm text-white/90 opacity-0 transition-opacity group-hover:opacity-100 group-has-[a:focus-visible]:opacity-100">{{ props.description }}</span>
    <span v-if="props.tag" class="absolute top-3 rounded bg-accent px-1.5 text-[11px] leading-4 font-bold tracking-wider text-black uppercase text-shadow-none" :class="props.managing ? 'right-11' : 'right-3'">{{ props.tag }}</span>
    <span v-if="props.managing" class="absolute top-1.5 right-1.5 z-10">
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
   * Text shown instead of the picture and title while hovered
   */
  description?: string
  /**
   * Line of text under the title
   */
  subtitle?: string
  /**
   * Picture shown above the title
   */
  picture?: string
  /**
   * Smaller rounded icon shown above the title when there is no picture, a link icon is shown when there is neither
   */
  icon?: string
  /**
   * Small pill in the top right corner
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
