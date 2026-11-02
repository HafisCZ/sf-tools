<template>
  <div class="relative aspect-[440/520] overflow-hidden rounded-lg border-2 bg-dialog text-white/90 has-[>button:focus-visible]:outline-2 has-[>button:focus-visible]:outline-offset-2 has-[>button:focus-visible]:outline-accent" :class="props.selected ? 'border-accent' : 'border-line'">
    <button type="button" class="absolute inset-0 block cursor-pointer text-left outline-none disabled:cursor-default" :aria-pressed="props.selected" :disabled="props.disabled" @click="emit('select')">
      <img :src="`/res/dungeons/${props.group}.webp`" alt="" class="absolute inset-0 size-full object-cover" />
      <span class="absolute inset-x-0 top-0 flex flex-col bg-linear-to-b from-dialog/90 to-dialog/0 px-3 pt-2.5 pb-7.5 text-shadow-[0_1px_2px_rgb(0_0_0/0.8)]" :class="{ 'pr-10': props.included !== undefined }">
        <span class="text-base font-bold text-white">{{ props.title }}</span>
        <span v-if="props.subtitle" class="text-xs text-white/80">{{ props.subtitle }}</span>
      </span>
      <span v-if="slots.default" class="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-dialog/85 p-3 pt-2.5">
        <slot />
      </span>
    </button>
    <SFCheckbox v-if="props.included !== undefined" :model-value="props.included === true" :indeterminate="props.included === 'mixed'" :aria-label="localize('table.include', { name: props.title })" class="absolute top-3.5 right-3" @update:model-value="emit('include', $event)" />
  </div>
</template>

<script setup lang="ts">
import SFCheckbox from '@library/SFCheckbox.vue'
import { useLocalize } from '@utils/localization'
import { type BreakGroup } from '~/pages/dungeon-break/dungeon-break'

defineOptions({
  name: 'DungeonBreakCard'
})

const props = defineProps<{
  /**
   * Group whose game picture fills the card
   */
  group: BreakGroup
  /**
   * Name shown on the picture
   */
  title: string
  /**
   * Line shown under the name
   */
  subtitle?: string
  /**
   * Marks the card as the picked one
   */
  selected?: boolean
  /**
   * Stops the card from being picked
   */
  disabled?: boolean
  /**
   * State of the checkbox at the top right, `mixed` when only part of the group is included, no checkbox when left out
   */
  included?: boolean | 'mixed'
}>()

const emit = defineEmits<{
  /**
   * The card was clicked
   */
  select: []
  /**
   * The checkbox was ticked or unticked
   */
  include: [included: boolean]
}>()

const slots = defineSlots<{
  /**
   * Numbers in the dark bar at the bottom of the picture, the bar is left out without them
   */
  default?(): unknown
}>()

const localize = useLocalize('dungeon_break')
</script>
