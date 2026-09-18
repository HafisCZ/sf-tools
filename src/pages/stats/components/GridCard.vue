<template>
  <div class="relative" :class="{ 'opacity-50': props.hidden }">
    <button type="button" class="flex h-[270px] w-full cursor-pointer flex-col items-center rounded-[0.25em] border bg-surface outline-none hover:bg-surface-hover focus-visible:bg-surface-hover" :class="props.outdated ? 'border-[#db2828]' : 'border-line'" @click="handleClick">
      <span class="my-[0.5em] text-[85%] leading-[20px]">{{ props.date }}</span>
      <img :src="props.image" alt="" width="173" height="173" class="size-[173px]" />
      <span class="mt-[9px] text-lg leading-[1.2857] font-bold text-white">{{ props.prefix }}</span>
      <span class="mb-[4.5px] text-lg leading-[1.2857] font-bold text-white">{{ props.name }}</span>
    </button>
    <input v-model="selected" type="checkbox" :aria-label="props.name" class="absolute top-2 left-2 size-[17px] cursor-pointer accent-accent" />
  </div>
</template>

<script setup lang="ts">
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
   * Server shown above the name
   */
  prefix: string
  /**
   * Name of the player or guild
   */
  name: string
  /**
   * Draws a red border to show the entry is older than the latest file
   */
  outdated?: boolean
  /**
   * Fades the card to show the entry is hidden
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

function handleClick(event: MouseEvent) {
  if (event.ctrlKey) {
    selected.value = !selected.value
  } else {
    emit('open')
  }
}
</script>
