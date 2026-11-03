<template>
  <ul class="grid w-full grid-cols-[repeat(auto-fill,192px)] justify-center gap-3">
    <li class="w-48 shrink-0">
      <button type="button" class="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[2px] border border-line bg-black/50 font-bold text-white/90 outline-none hover:border-accent focus-visible:border-accent" @click="importInlineSelectorEndpoint">
        <span class="flex h-10 items-center">
          <img src="/res/endpoint/account.webp" alt="" class="h-7.5 opacity-90" />
        </span>
        {{ localize('login') }}
      </button>
    </li>
    <li class="w-48 shrink-0">
      <button type="button" class="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[2px] border border-line bg-black/50 font-bold text-white/90 outline-none hover:border-accent focus-visible:border-accent" @click="importInlineSelectorFiles">
        <span class="flex h-10 items-center">
          <SFIcon name="upload" class="text-3xl" />
        </span>
        {{ localize('import') }}
      </button>
    </li>
    <li v-for="entry in inlineSelectorPlayers" :key="entry.LinkId" class="w-48 shrink-0">
      <CharacterTile :name="entry.Name" :level="entry.Level" :character-class="entry.Class" :world="formatWorldName(entry.Data.prefix)" :portrait="entry" hoverable @click="emit('select', entry)" />
    </li>
  </ul>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import SFIcon from '@library/SFIcon.vue'
import { formatWorldName } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import CharacterTile from '~/components/CharacterTile.vue'
import { type PlayerModel } from '~/core/models/player'
import { importInlineSelectorEndpoint, importInlineSelectorFiles, inlineSelectorPlayers, loadInlineSelectorPlayers } from './inline-selector'

defineOptions({
  name: 'CharacterShelf'
})

const emit = defineEmits<{
  /**
   * A saved character was picked
   */
  select: [player: PlayerModel]
}>()

const localize = useLocalize('integration')

onMounted(() => {
  void loadInlineSelectorPlayers()
})
</script>
