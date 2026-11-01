<template>
  <div class="fixed inset-0 flex items-center justify-center p-4">
    <section class="flex w-full max-w-[1034px] flex-col gap-5 rounded-lg border border-line bg-dialog p-5 text-white/90 shadow-xl" :aria-labelledby="titleId">
      <SFHeading :id="titleId" level="3" class="border-b border-line pb-1.5 text-center">{{ props.title }}</SFHeading>
      <ul v-if="inlineSelectorPlayers.length > 0" class="-mr-5 grid max-h-[392px] grid-cols-[repeat(auto-fill,192px)] justify-center gap-2 overflow-y-auto pr-5">
        <li v-for="entry in inlineSelectorPlayers" :key="entry.LinkId">
          <CharacterTile :name="entry.Name" :level="entry.Level" :character-class="entry.Class" :world="formatWorldName(entry.Data.prefix)" :portrait="entry" hoverable @click="emit('select', entry)" />
        </li>
      </ul>
      <SFParagraph v-else class="text-center">{{ props.emptyMessage }}</SFParagraph>
      <div class="flex gap-2">
        <SFButton variant="outline" block @click="importInlineSelectorEndpoint">
          {{ localize('game') }}
        </SFButton>
        <SFButton variant="outline" block @click="importInlineSelectorFiles">
          {{ localize('file') }}
        </SFButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, useId } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFHeading from '@library/SFHeading.vue'
import SFParagraph from '@library/SFParagraph.vue'
import { formatWorldName } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import CharacterTile from '~/components/CharacterTile.vue'
import { type PlayerModel } from '~/core/models/player'
import { importInlineSelectorEndpoint, importInlineSelectorFiles, inlineSelectorPlayers, loadInlineSelectorPlayers } from './inline-selector'

defineOptions({
  name: 'InlineSelector'
})

const props = defineProps<{
  /**
   * Heading above the characters
   */
  title: string
  /**
   * Shown instead of the characters when none are saved
   */
  emptyMessage: string
}>()

const emit = defineEmits<{
  /**
   * A saved character was picked
   */
  select: [player: PlayerModel]
}>()

const localize = useLocalize('integration')

const titleId = useId()

onMounted(() => {
  void loadInlineSelectorPlayers()
})
</script>
