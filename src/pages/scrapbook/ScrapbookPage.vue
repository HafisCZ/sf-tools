<template>
  <Page>
    <template #nav-left>
      <CharacterSwitcher :player="player" @select="selectPlayer" />
      <span class="mx-1.5 h-5 w-px bg-white/12" />
      <SFButton variant="ghost" @click="clear">
        <SFIcon name="recycle" />
        {{ localize.global('analyzer.topbar.clear') }}
      </SFButton>
      <span class="mx-1.5 h-5 w-px bg-white/12" />
      <SFTabs v-model="tab" :options="tabOptions" />
    </template>

    <template #nav-right>
      <span class="px-2 text-white/70">{{ filtered.collected }} / {{ filtered.total }}</span>
    </template>

    <SFParagraph v-if="!hasData" class="text-center">{{ localize('empty') }}</SFParagraph>
    <div v-else class="flex flex-wrap items-start gap-6">
      <aside ref="sidebar-ref" class="flex grow basis-75 flex-col gap-4 lg:sticky" :style="sidebarStyle">
        <ScrapbookFilterPanel
          v-model:search="filters.search"
          v-model:status="filters.status"
          v-model:worn-by="filters.wornBy"
          v-model:item-classes="filters.itemClasses"
          v-model:kinds="filters.kinds"
          v-model:rarities="filters.rarities"
          v-model:origins="filters.origins"
          v-model:minimum-level="filters.minimumLevel"
          v-model:maximum-level="filters.maximumLevel"
          :book="tab"
          :item-class-counts="itemClassCounts"
          :kind-counts="kindCounts"
          :rarity-counts="rarityCounts"
          :origin-counts="originCounts"
        />
      </aside>
      <ScrapbookView :kinds="filtered.kinds" class="min-w-0 grow-999 basis-140" @toggle="toggleMarked" />
    </div>
  </Page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFIcon from '@library/SFIcon.vue'
import SFParagraph from '@library/SFParagraph.vue'
import SFTabs from '@library/SFTabs.vue'
import { type SelectOption } from '@utils/components'
import { useLocalize } from '@utils/localization'
import { toggleItem } from '@utils/utils'
import { type PlayerModel } from '~/core/models/player'
import { DatabaseManager } from '~/data/database-manager'
import CharacterSwitcher from '~/integration/CharacterSwitcher.vue'
import { loadInlineSelectorPlayers } from '~/integration/inline-selector'
import Page from '~/pages/Page.vue'
import ScrapbookFilterPanel from '~/pages/scrapbook/components/ScrapbookFilterPanel.vue'
import ScrapbookView from '~/pages/scrapbook/components/ScrapbookView.vue'
import { countScrapbookEntries, createScrapbookKinds, filterScrapbookKinds, MAX_UNLOCK_LEVEL, type ScrapbookBook, type ScrapbookFilters } from '~/pages/scrapbook/scrapbook'

defineOptions({
  name: 'ScrapbookPage'
})

const localize = useLocalize('scrapbook')

const player = shallowRef<PlayerModel | null>(null)

const tab = ref<ScrapbookBook>('items')

const filters = ref<ScrapbookFilters>(createFilters())

const marked = ref<string[]>([])

const sidebarElement = useTemplateRef('sidebar-ref')

const sidebarHeight = shallowRef(0)

const resizeObserver = new ResizeObserver(() => {
  sidebarHeight.value = sidebarElement.value?.offsetHeight ?? 0
})

const tabOptions = computed<SelectOption<ScrapbookBook>[]>(() => [
  { value: 'items', label: localize('tab.items') },
  { value: 'legendaries', label: localize('tab.legendaries') }
])

const hasData = computed(() => {
  if (!player.value) return true

  const bits = tab.value === 'items' ? player.value.Scrapbook : player.value.ScrapbookLegendary

  return bits !== undefined && bits.length > 0
})

const kinds = computed(() => createScrapbookKinds(player.value, tab.value, marked.value))

const filtered = computed(() => filterScrapbookKinds(kinds.value, filters.value))

const itemClassCounts = computed(() => countScrapbookEntries(kinds.value, { ...filters.value, itemClasses: [] }, (entry) => entry.itemClass))

const kindCounts = computed(() => countScrapbookEntries(kinds.value, { ...filters.value, kinds: [] }, (entry) => entry.type))

const rarityCounts = computed(() => countScrapbookEntries(kinds.value, { ...filters.value, rarities: [] }, (entry) => entry.rarity))

const originCounts = computed(() => countScrapbookEntries(kinds.value, { ...filters.value, origins: [] }, (entry) => entry.note ?? entry.origin))

const sidebarStyle = computed(() => ({ top: `min(70px, calc(100dvh - ${sidebarHeight.value}px - 1.25rem))` }))

watch(sidebarElement, (element, previousElement) => {
  if (previousElement) {
    resizeObserver.unobserve(previousElement)
  }

  if (element) {
    resizeObserver.observe(element)
  }
})

onMounted(() => {
  void initialize()
})

onBeforeUnmount(() => {
  resizeObserver.disconnect()
})

async function initialize() {
  await loadInlineSelectorPlayers()

  const linkId = DatabaseManager.getLink(new URLSearchParams(window.location.search).get('id'))

  if (linkId && DatabaseManager.Players[linkId]) {
    player.value = DatabaseManager.Players[linkId].Latest
  }
}

function selectPlayer(entry: PlayerModel) {
  player.value = DatabaseManager.Players[entry.LinkId].Latest
  tab.value = 'items'
  marked.value = []
}

function toggleMarked(key: string) {
  marked.value = toggleItem(marked.value, key)
}

function clear() {
  player.value = null
  marked.value = []
}

function createFilters(): ScrapbookFilters {
  return {
    search: '',
    status: 'missing',
    wornBy: null,
    itemClasses: [],
    kinds: [],
    rarities: [],
    origins: [],
    minimumLevel: 1,
    maximumLevel: MAX_UNLOCK_LEVEL
  }
}
</script>
