<template>
  <section class="flex flex-col items-center gap-7 pt-10" :aria-labelledby="titleId">
    <div class="pointer-events-none absolute inset-x-0 top-0 h-160 overflow-hidden">
      <img src="/res/backgrounds/classselect.webp" alt="" class="size-full object-cover object-[center_45%]" />
      <div class="absolute inset-0 bg-linear-to-b from-page/55 via-page/60 to-page" />
    </div>
    <SFHeading :id="titleId" level="1" class="relative text-center text-shadow-[0_3px_0_rgb(0_0_0/0.55)]">{{ localize('choose') }}</SFHeading>
    <CharacterShelf class="relative" @select="emit('select', $event)" />
  </section>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import SFHeading from '@library/SFHeading.vue'
import { useLocalize } from '@utils/localization'
import { type PlayerModel } from '~/core/models/player'
import CharacterShelf from './CharacterShelf.vue'

defineOptions({
  name: 'InlineSelector'
})

const emit = defineEmits<{
  /**
   * A saved character was picked
   */
  select: [player: PlayerModel]
}>()

const localize = useLocalize('integration')

const titleId = useId()
</script>
