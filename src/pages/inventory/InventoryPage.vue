<template>
  <Page :width="player ? 'calc(100% - 140px)' : undefined">
    <template v-if="player" #nav-left>
      <SFButton variant="ghost" @click="showPlayers">
        <SFIcon name="arrow-left" />
        {{ localize('back') }}
      </SFButton>
      <SFTabs v-model="tab" :options="tabOptions" />
    </template>

    <InventoryView v-if="player && tab === 'inventory'" :player="player" />
    <ResourcesView v-else-if="player" :player="player" />
    <div v-else class="fixed inset-0 flex items-center justify-center p-4">
      <section class="flex w-full max-w-[570px] flex-col gap-5 rounded-lg border border-line bg-dialog p-5 text-white/90 shadow-xl" :aria-labelledby="titleId">
        <SFHeading :id="titleId" level="3" class="border-b border-line pb-1.5 text-center">{{ localize('picker.title') }}</SFHeading>
        <div v-if="players.length > 0" class="flex h-[45vh] flex-col gap-[14px] overflow-y-scroll pr-[14px]">
          <button v-for="entry in players" :key="entry.LinkId" type="button" class="group flex cursor-pointer items-center gap-[14px] rounded-[3.5px] border border-white/20 p-[7px] text-left outline-none hover:bg-page focus-visible:bg-page" @click="selectPlayer(entry)">
            <img :src="getClassImageUrl(entry.Class)" alt="" class="size-[42px]" />
            <span>
              <span class="block text-white/50">{{ entry.Prefix }}</span>
              <span class="block">{{ entry.Name }}</span>
            </span>
            <SFIcon name="right-to-bracket" class="invisible mr-1 ml-auto text-[28px] text-white/50 group-hover:visible group-focus-visible:visible" />
          </button>
        </div>
        <SFParagraph v-else class="text-center">{{ localize('picker.empty') }}</SFParagraph>
        <div class="flex gap-2">
          <SFButton variant="outline" block @click="importEndpoint">
            {{ localize.global('integration.game') }}
          </SFButton>
          <SFButton variant="outline" block @click="importFiles">
            {{ localize.global('integration.file') }}
          </SFButton>
        </div>
      </section>
    </div>
  </Page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, useId } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import SFParagraph from '@library/SFParagraph.vue'
import SFTabs from '@library/SFTabs.vue'
import { type SelectOption } from '@utils/components'
import { useDialog, useFilePicker } from '@utils/dialogs'
import { useLoader } from '@utils/loader'
import { useLocalize } from '@utils/localization'
import { useErrorToast } from '@utils/toasts'
import { getClassImageUrl, getErrorMessage, sortDescending } from '@utils/utils'
import { DatabaseManager } from '~/data/database-manager'
import { type PlayerModel } from '~/data/player-model'
import EndpointDialog from '~/dialogs/EndpointDialog.vue'
import InventoryView from '~/pages/inventory/components/InventoryView.vue'
import ResourcesView from '~/pages/inventory/components/ResourcesView.vue'
import { type InventoryPlayer } from '~/pages/inventory/inventory'
import Page from '~/pages/Page.vue'
import { Logger } from '~/site/logger'
import { SELF_PROFILE } from '~/site/profiles'

defineOptions({
  name: 'InventoryPage'
})

type Tab = 'inventory' | 'resources'

const localize = useLocalize('inventory')

const loader = useLoader()

const titleId = useId()

const players = shallowRef<PlayerModel[]>([])
const player = shallowRef<InventoryPlayer | null>(null)

const tab = ref<Tab>('inventory')

const tabOptions = computed<SelectOption<Tab>[]>(() => [
  { value: 'inventory', label: localize('tab.inventory') },
  { value: 'resources', label: localize('tab.resources') }
])

onMounted(() => {
  void initialize()
})

async function initialize() {
  await loadPlayers()

  const linkId = DatabaseManager.getLink(new URLSearchParams(window.location.search).get('id'))

  if (linkId && DatabaseManager.Players[linkId]) {
    player.value = DatabaseManager.Players[linkId].Latest
  }
}

async function loadPlayers() {
  loader.start()

  try {
    await DatabaseManager.load(SELF_PROFILE)

    players.value = sortDescending(DatabaseManager.getLatestPlayers(), (entry) => entry.Timestamp)
  } catch (e) {
    useErrorToast(localize.global('database.open_error.title'), localize.global('database.open_error.message'))
    Logger.error(e, 'Database could not be opened!')
  } finally {
    loader.stop()
  }
}

function selectPlayer(entry: PlayerModel) {
  player.value = DatabaseManager.Players[entry.LinkId].Latest
  tab.value = 'inventory'
}

function showPlayers() {
  player.value = null
}

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

  await loadPlayers()
}

function importEndpoint() {
  useDialog(
    EndpointDialog,
    { allowTemporary: true },
    {
      callback: (imported) => {
        if (imported) {
          void loadPlayers()
        }
      }
    }
  )
}
</script>
