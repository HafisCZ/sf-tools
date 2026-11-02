<template>
  <Page :width="player ? 'calc(100% - 140px)' : undefined">
    <template v-if="player" #nav-left>
      <CharacterSwitcher :player="player" @select="selectPlayer" />
      <span class="mx-1.5 h-5 w-px bg-white/12" />
      <SFTabs v-model="tab" :options="tabOptions" />
    </template>

    <InventoryView v-if="player && tab === 'inventory'" :player="player" />
    <ResourcesView v-else-if="player" :player="player" />
    <InlineSelector v-else @select="selectPlayer" />
  </Page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import SFTabs from '@library/SFTabs.vue'
import { type SelectOption } from '@utils/components'
import { useLocalize } from '@utils/localization'
import { type PlayerModel } from '~/core/models/player'
import { DatabaseManager } from '~/data/database-manager'
import CharacterSwitcher from '~/integration/CharacterSwitcher.vue'
import { loadInlineSelectorPlayers } from '~/integration/inline-selector'
import InlineSelector from '~/integration/InlineSelector.vue'
import InventoryView from '~/pages/inventory/components/InventoryView.vue'
import ResourcesView from '~/pages/inventory/components/ResourcesView.vue'
import Page from '~/pages/Page.vue'

defineOptions({
  name: 'InventoryPage'
})

type Tab = 'inventory' | 'resources'

const localize = useLocalize('inventory')

const player = shallowRef<PlayerModel | null>(null)

const tab = ref<Tab>('inventory')

const tabOptions = computed<SelectOption<Tab>[]>(() => [
  { value: 'inventory', label: localize('tab.inventory') },
  { value: 'resources', label: localize('tab.resources') }
])

onMounted(() => {
  void initialize()
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
  tab.value = 'inventory'
}
</script>
