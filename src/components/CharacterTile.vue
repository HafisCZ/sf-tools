<template>
  <button type="button" class="group @container relative block aspect-square w-full cursor-pointer overflow-hidden text-left text-white outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
    <img src="/res/endpoint/tile.webp" alt="" class="absolute inset-0 size-full" />
    <span class="absolute inset-0 bg-[radial-gradient(closest-side,rgb(5_121_160/0.95),rgb(5_121_160/0))] opacity-75" />
    <span class="absolute inset-[3px]">
      <CharacterRenderer v-if="props.portrait" :data="props.portrait" />
      <img v-else src="/res/endpoint/noface.webp" alt="" class="size-full" />
    </span>
    <span class="absolute inset-x-0 top-0 h-1/4 bg-linear-to-b from-[rgb(9_26_34/0.69)] to-[rgb(9_26_34/0)]" />
    <span class="absolute inset-x-0 bottom-0 h-[42%] bg-linear-to-t from-[rgb(9_26_34/0.69)] to-[rgb(9_26_34/0)]" />
    <span class="absolute inset-[3px] rounded-[2px] border shadow-[0_0_0_1px_rgb(0_0_0/0.35)]" :class="{ 'border-accent': props.selected, 'border-line': !props.selected, 'group-hover:border-accent group-focus-visible:border-accent': props.hoverable }" />
    <span class="absolute inset-x-[10px] top-[10px] truncate text-[length:max(9px,8.5cqw)] leading-none font-bold text-[#7fc8e0] uppercase text-shadow-[0_1px_2px_rgb(0_0_0/0.9)]">{{ props.world }}</span>
    <img :src="getClassImageUrl(props.characterClass)" :alt="localize(`class${props.characterClass}`)" class="absolute bottom-[8px] left-[8px] size-[22%]" />
    <span class="absolute right-[8px] bottom-[25px] left-[56px] truncate leading-[1.1] font-bold text-shadow-[0_2px_0_rgb(0_0_0/0.6)]" :style="{ fontSize: `${nameSize}px` }">{{ props.name }}</span>
    <span class="absolute right-[8px] bottom-[10px] left-[56px] truncate text-[length:max(8px,6.5cqw)] leading-none font-bold text-[#f0c042] uppercase text-shadow-[0_1px_0_rgb(0_0_0/0.6)]">{{ localize('level') }} {{ props.level }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useLocalize } from '@utils/localization'
import { getClassImageUrl } from '@utils/utils'
import CharacterRenderer from '~/components/CharacterRenderer.vue'
import type { PlayerModel } from '~/core/models/player'

defineOptions({
  name: 'CharacterTile'
})

const props = defineProps<{
  /**
   * Character name, shrunk to fit next to the class icon
   */
  name: string
  /**
   * Character level
   */
  level: number
  /**
   * Character class, shown as the class icon
   */
  characterClass: CharacterClass
  /**
   * World label shown at the top
   */
  world: string
  /**
   * Face data for the portrait, the game's silhouette is shown without it
   */
  portrait: Pick<PlayerModel, 'Face' | 'Race' | 'Gender' | 'Class'> | null
  /**
   * Highlights the border
   */
  selected?: boolean
  /**
   * Highlights the border on hover and focus
   */
  hoverable?: boolean
}>()

const NAME_FONT = 'bold 16px Lato'

const localize = useLocalize('general')

// Names are measured in the tile font, which might not be loaded yet
const isFontLoaded = shallowRef(document.fonts.check(NAME_FONT))

const nameSize = computed(() => (isFontLoaded.value ? getNameSize(props.name) : 16))

if (!isFontLoaded.value) {
  void loadFont()
}

async function loadFont() {
  await document.fonts.load(NAME_FONT)

  isFontLoaded.value = true
}

function getNameSize(name: string) {
  const context = document.createElement('canvas').getContext('2d')

  if (!context) return 16

  context.font = NAME_FONT

  // The name has 128px on a 192px tile, right of the class icon
  const fittingSize = Math.floor((16 * 128) / context.measureText(name).width)

  return Math.max(10, Math.min(16, fittingSize))
}
</script>
