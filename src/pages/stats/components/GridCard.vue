<template>
  <div class="group relative" :class="{ 'opacity-50': props.hidden }">
    <button
      type="button"
      class="flex h-[270px] w-full cursor-pointer flex-col items-stretch rounded-md border p-3 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      :class="selected ? 'border-accent bg-accent/5' : 'border-line bg-surface hover:border-white/30 hover:bg-surface-hover'"
      @click="handleClick"
    >
      <span class="flex h-4 items-center justify-end gap-1 text-xs leading-4" :class="props.outdated ? 'text-red-400' : 'text-white/50'">
        <SFIcon v-if="props.hidden" name="eye-slash" />
        <SFIcon v-if="props.outdated" name="clock" />
        {{ props.date }}
      </span>
      <span class="mx-auto mt-2 flex size-[120px] shrink-0 items-center justify-center rounded-full bg-radial from-white/10 to-transparent to-70%">
        <img :src="props.image" alt="" width="120" height="120" class="size-full transition-transform group-hover:scale-105" />
      </span>
      <span class="mt-3 truncate text-base leading-[22px] font-bold text-white" :title="props.name">{{ props.name }}</span>
      <span class="truncate text-sm leading-5 text-white/50">{{ props.prefix }}</span>
      <span v-if="slots.default" class="mt-auto flex h-10 flex-col items-center gap-0.5 border-t border-line pt-2 text-xs leading-4 text-white/70">
        <slot />
      </span>
    </button>
    <input v-model="selected" type="checkbox" :aria-label="props.name" class="absolute top-[13px] left-[13px] size-4 cursor-pointer accent-accent" />
  </div>
</template>

<script setup lang="ts">
import SFIcon from '@library/SFIcon.vue'

defineOptions({
  name: 'GridCard'
})

const props = defineProps<{
  /**
   * Image shown in the middle of the card
   */
  image: string
  /**
   * Date text shown at the top
   */
  date: string
  /**
   * Server shown below the name
   */
  prefix: string
  /**
   * Name of the player or guild
   */
  name: string
  /**
   * Shows the date in red with a clock icon to mark the entry as older than the latest file
   */
  outdated?: boolean
  /**
   * Fades the card and shows an eye icon to mark the entry as hidden
   */
  hidden?: boolean
}>()

const emit = defineEmits<{
  /**
   * The card was clicked without Ctrl
   */
  open: []
}>()

const selected = defineModel<boolean>('selected', { default: false })

const slots = defineSlots<{
  /**
   * Extra info shown at the bottom of the card
   */
  default?(): unknown
}>()

function handleClick(event: MouseEvent) {
  if (event.ctrlKey) {
    selected.value = !selected.value
  } else {
    emit('open')
  }
}
</script>
