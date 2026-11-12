<template>
  <button type="button" class="relative block aspect-[4/3] cursor-pointer overflow-hidden rounded-lg border border-line bg-dialog text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" @click="emit('select')">
    <img :src="props.image" alt="" class="absolute inset-0 size-full object-cover" />
    <span class="absolute inset-x-0 bottom-0 bg-dialog/85 px-3 py-2 text-[15px] leading-5 font-bold text-white">{{ props.name }}</span>
  </button>
</template>

<script setup lang="ts">
defineOptions({
  name: 'BestiaryDungeonCard'
})

const props = defineProps<{
  /**
   * Picture filling the card
   */
  image: string
  /**
   * Name in the band at the bottom
   */
  name: string
}>()

const emit = defineEmits<{
  /**
   * The card was clicked
   */
  select: []
}>()
</script>
