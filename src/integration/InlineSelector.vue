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
        <SFButton variant="outline" block @click="importEndpoint">
          {{ localize('game') }}
        </SFButton>
        <SFButton variant="outline" block @click="importFiles">
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
import { useDialog, useFilePicker } from '@utils/dialogs'
import { formatWorldName } from '@utils/formatting'
import { useLoader } from '@utils/loader'
import { useLocalize } from '@utils/localization'
import { useErrorToast } from '@utils/toasts'
import { getErrorMessage } from '@utils/utils'
import CharacterTile from '~/components/CharacterTile.vue'
import { Logger } from '~/core/logger'
import { type PlayerModel } from '~/core/models/player'
import { DatabaseManager } from '~/data/database-manager'
import EndpointDialog from '~/dialogs/EndpointDialog.vue'
import { inlineSelectorPlayers, loadInlineSelectorPlayers, reloadInlineSelectorPlayers } from './inline-selector'

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

const loader = useLoader()

const titleId = useId()

onMounted(() => {
  void loadInlineSelectorPlayers()
})

function importFiles() {
  useFilePicker({
    accept: '.har,.json',
    multiple: true,
    callback: (files) => void readFiles(files)
  })
}

async function readFiles(files: File[]) {
  loader.start({ progress: true })

  let filesDone = 0

  await Promise.all(
    files.map(async (file) => {
      try {
        await DatabaseManager.import(await file.text(), file.lastModified)
      } catch (e) {
        useErrorToast(localize.global('database.import_error'), getErrorMessage(e))
        Logger.error(e, 'Error occured while trying to import a file!')
      }

      loader.progress(++filesDone / files.length)
    })
  )

  await reloadInlineSelectorPlayers()
}

function importEndpoint() {
  useDialog(
    EndpointDialog,
    { allowTemporary: true },
    {
      callback: (imported) => {
        if (imported) {
          void reloadInlineSelectorPlayers()
        }
      }
    }
  )
}
</script>
