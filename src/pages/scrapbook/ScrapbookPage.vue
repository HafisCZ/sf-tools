<template>
  <Page>
    <template v-if="player" #nav-left>
      <SFButton variant="ghost" @click="showPlayers">
        <SFIcon name="arrow-left" />
        {{ localize('back') }}
      </SFButton>
      <SFTabs v-model="tab" :options="tabOptions" />
    </template>

    <template v-if="player" #nav-right>
      <span class="px-2 text-white/70">{{ collected }} / {{ total }}</span>
      <SFCheckbox v-model="missingOnly" :label="localize('missing_only')" class="px-2" />
    </template>

    <template v-if="player">
      <SFParagraph v-if="!hasData" class="text-center">{{ localize('empty') }}</SFParagraph>
      <div v-else class="flex flex-col gap-5">
        <div v-if="tab === 'items'" class="flex flex-col gap-4">
          <SFSlider v-model:from="minimumLevel" v-model:to="maximumLevel" :label="localize('unlock_level')" :min="1" :max="MAX_UNLOCK_LEVEL" :step="1" :from-label="localize.global('general.min')" :to-label="localize.global('general.max')" />
          <div class="grid grid-cols-2 gap-[14px]">
            <SFNumber v-model="minimumLevel" :label="localize.global('general.min')" :min="1" :max="maximumLevel ?? MAX_UNLOCK_LEVEL" :step="1" />
            <SFNumber v-model="maximumLevel" :label="localize.global('general.max')" :min="minimumLevel ?? 1" :max="MAX_UNLOCK_LEVEL" :step="1" />
          </div>
        </div>
        <ScrapbookView :classes="classes" :missing-only="missingOnly" @toggle="toggleMarked" />
      </div>
    </template>
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
            <span class="ml-auto text-white/50">{{ localize.global('general.level') }} {{ entry.Level }}</span>
            <SFIcon name="right-to-bracket" class="invisible mr-1 text-[28px] text-white/50 group-hover:visible group-focus-visible:visible" />
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
import SFCheckbox from '@library/SFCheckbox.vue'
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import SFNumber from '@library/SFNumber.vue'
import SFParagraph from '@library/SFParagraph.vue'
import SFSlider from '@library/SFSlider.vue'
import SFTabs from '@library/SFTabs.vue'
import { type SelectOption } from '@utils/components'
import { useDialog, useFilePicker } from '@utils/dialogs'
import { useLoader } from '@utils/loader'
import { useLocalize } from '@utils/localization'
import { useErrorToast } from '@utils/toasts'
import { getClassImageUrl, getErrorMessage, sortDescending, sum } from '@utils/utils'
import { Logger } from '~/core/logger'
import { type PlayerModel } from '~/core/models/player'
import { SELF_PROFILE } from '~/core/profiles'
import { DatabaseManager } from '~/data/database-manager'
import EndpointDialog from '~/dialogs/EndpointDialog.vue'
import Page from '~/pages/Page.vue'
import ScrapbookView from '~/pages/scrapbook/components/ScrapbookView.vue'
import { createScrapbookClasses, MAX_UNLOCK_LEVEL, type ScrapbookBook } from '~/pages/scrapbook/scrapbook'

defineOptions({
  name: 'ScrapbookPage'
})

const localize = useLocalize('scrapbook')

const loader = useLoader()

const titleId = useId()

const players = shallowRef<PlayerModel[]>([])
const player = shallowRef<PlayerModel | null>(null)

const tab = ref<ScrapbookBook>('items')

const missingOnly = ref(true)

const minimumLevel = ref<number | null>(1)
const maximumLevel = ref<number | null>(MAX_UNLOCK_LEVEL)

const marked = ref<string[]>([])

const tabOptions = computed<SelectOption<ScrapbookBook>[]>(() => [
  { value: 'items', label: localize('tab.items') },
  { value: 'legendaries', label: localize('tab.legendaries') }
])

const hasData = computed(() => {
  const bits = tab.value === 'items' ? player.value?.Scrapbook : player.value?.ScrapbookLegendary

  return bits !== undefined && bits.length > 0
})

const classes = computed(() => (player.value ? createScrapbookClasses(player.value, tab.value, marked.value, minimumLevel.value ?? 1, maximumLevel.value ?? MAX_UNLOCK_LEVEL) : []))

const collected = computed(() => sum(classes.value.map((entry) => entry.collected)))

const total = computed(() => sum(classes.value.map((entry) => entry.total)))

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
  tab.value = 'items'
  marked.value = []
}

function showPlayers() {
  player.value = null
}

function toggleMarked(key: string) {
  marked.value = marked.value.includes(key) ? marked.value.filter((markedKey) => markedKey !== key) : [...marked.value, key]
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
