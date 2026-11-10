<template>
  <button type="button" class="relative block aspect-[4/3] cursor-pointer overflow-hidden rounded-lg border border-line bg-dialog text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" @click="emit('select')">
    <img :src="`/res/dungeons/cards/${props.dungeon.id}.webp`" alt="" class="absolute inset-0 size-full object-cover" />
    <span class="absolute inset-x-0 bottom-0 bg-dialog/85 px-3 py-2 text-[15px] leading-5 font-bold text-white">{{ getDungeonName(props.dungeon) }}</span>
  </button>
</template>

<script setup lang="ts">
import { getDungeonName, type Dungeon } from '~/sim/data/dungeons'

defineOptions({
  name: 'BestiaryDungeonCard'
})

const props = defineProps<{
  /**
   * Dungeon whose map picture and name the card shows
   */
  dungeon: Dungeon
}>()

const emit = defineEmits<{
  /**
   * The card was clicked
   */
  select: []
}>()
</script>
