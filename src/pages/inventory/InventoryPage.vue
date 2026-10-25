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
    <InlineSelector v-else :title="localize('picker.title')" :empty-message="localize('picker.empty')" @select="selectPlayer" />
  </Page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFIcon from '@library/SFIcon.vue'
import SFTabs from '@library/SFTabs.vue'
import { type SelectOption } from '@utils/components'
import { useLocalize } from '@utils/localization'
import { type PlayerModel } from '~/core/models/player'
import { DatabaseManager } from '~/data/database-manager'
import { loadInlineSelectorPlayers } from '~/integration/inline-selector'
import InlineSelector from '~/integration/InlineSelector.vue'
import InventoryView from '~/pages/inventory/components/InventoryView.vue'
import ResourcesView from '~/pages/inventory/components/ResourcesView.vue'
import { type InventoryPlayer } from '~/pages/inventory/inventory'
import Page from '~/pages/Page.vue'

defineOptions({
  name: 'InventoryPage'
})

type Tab = 'inventory' | 'resources'

const localize = useLocalize('inventory')

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

function showPlayers() {
  player.value = null
}
</script>
