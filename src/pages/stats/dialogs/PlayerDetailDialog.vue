<template>
  <div ref="dialog-ref" role="dialog" aria-modal="true" :aria-labelledby="titleId" class="fixed inset-0 flex flex-col bg-page text-white">
    <button type="button" class="fixed top-[31.5px] right-[35px] z-10 flex h-[1em] w-[1.18em] cursor-pointer items-center justify-center text-[21px] opacity-80 outline-none hover:opacity-100 focus-visible:opacity-100" :aria-label="localize.global('dialog.shared.close')" @click="emit('close')">
      <SFIcon name="xmark" />
    </button>
    <div class="relative shrink-0 bg-[url(/res/backgrounds/arena.webp)] bg-cover bg-[center_35%]">
      <div class="pointer-events-none absolute inset-0 bg-linear-to-b from-page/25 via-page/60 to-page" />
      <div class="relative mx-auto flex max-w-[1280px] flex-wrap items-end gap-4 px-4 pt-5 pb-1">
        <div class="relative w-[128px] shrink-0 overflow-hidden rounded-md border border-line bg-[radial-gradient(closest-side,rgb(5_121_160/0.7),rgb(9_26_34/0.9))]">
          <CharacterRenderer :data="player" />
          <img :src="getClassImageUrl(player.Class)" :alt="localize.global(`general.class${player.Class}`)" class="absolute bottom-1.5 left-1.5 size-[22%]" />
        </div>
        <div class="min-w-0 flex-[1_1_340px] self-center text-shadow-[0_2px_6px_rgb(0_0_0/0.7)]">
          <div class="text-sm leading-none font-bold text-[#7fc8e0] uppercase">{{ formatWorldName(player.Data.prefix) }}</div>
          <SFHeading :id="titleId" level="3" class="mt-1 truncate leading-[1.1]">{{ player.Name }}</SFHeading>
          <PlayerDetailValue :value="localize('level', { level: player.Level })" :read="(scan) => scan.Level" :title="localize.global('general.level')" class="mt-2.5 text-sm leading-none font-bold text-[#f0c042] uppercase" />
          <div class="mt-1.5 max-w-[420px]">
            <SFProgress :percent="player.XPNext ? (player.XP / player.XPNext) * 100 : 100" />
            <div class="mt-1 text-xs leading-none text-white/60">{{ localize('xp', { xp: formatSpacedNumber(player.XP), next: formatSpacedNumber(player.XPNext) }) }}</div>
          </div>
        </div>
        <TimestampSelect v-if="timestamps.length > 1" v-model:timestamp="timestamp" v-model:reference="reference" :options="timestamps.map((value) => ({ value, label: formatDate(value) }))" class="w-[200px] flex-col" />
        <div v-else>{{ formatDate(player.Timestamp) }}</div>
      </div>
      <div class="relative border-b border-line">
        <div class="mx-auto flex max-w-[1280px] items-center gap-4 px-4 py-2">
          <SFTabs
            v-model="tab"
            :options="[
              { value: 'overview', label: localize('tabs.overview') },
              { value: 'attributes', label: localize('tabs.attributes') },
              { value: 'items', label: localize('tabs.items') }
            ]"
          />
          <span class="ml-auto truncate text-xs text-white/60">{{ DatabaseManager.getLinkedIdentifiers(props.identifier).join(' / ') }}</span>
        </div>
      </div>
    </div>
    <div ref="content-ref" tabindex="-1" class="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none [scrollbar-color:rgba(88,88,88,0.329)_rgba(24,24,24,0.459)] [scrollbar-width:thin]">
      <div role="tabpanel" class="mx-auto max-w-[1280px] px-4 pt-7 pb-14">
        <PlayerDetailOverview v-if="tab === 'overview'" :player="player" :compare="compare" />
        <PlayerDetailAttributes v-else-if="tab === 'attributes'" :player="player" :compare="compare" />
        <PlayerDetailItems v-else :player="player" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, useId, useTemplateRef } from 'vue'
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import SFProgress from '@library/SFProgress.vue'
import SFTabs from '@library/SFTabs.vue'
import { formatDate, formatSpacedNumber, formatWorldName } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { getClassImageUrl } from '@utils/utils'
import CharacterRenderer from '~/components/CharacterRenderer.vue'
import { type PlayerModel } from '~/core/models/player'
import { DatabaseManager, type PlayerHistory } from '~/data/database-manager'
import PlayerDetailAttributes from '~/pages/stats/components/PlayerDetailAttributes.vue'
import PlayerDetailItems from '~/pages/stats/components/PlayerDetailItems.vue'
import PlayerDetailOverview from '~/pages/stats/components/PlayerDetailOverview.vue'
import PlayerDetailValue from '~/pages/stats/components/PlayerDetailValue.vue'
import TimestampSelect from '~/pages/stats/components/TimestampSelect.vue'
import { PLAYER_DETAIL_KEY } from '~/pages/stats/stats'

defineOptions({
  name: 'PlayerDetailDialog'
})

const props = defineProps<{
  /**
   * Link id of the shown player
   */
  identifier: string
  /**
   * Shows the newest entry at or before this timestamp
   */
  timestamp: number
  /**
   * Compares with the oldest entry between this timestamp and the shown one
   */
  reference: number
}>()

const emit = defineEmits<{
  close: []
}>()

type DetailTab = 'overview' | 'attributes' | 'items'

const localize = useLocalize('stats.player')

const titleId = useId()

const dialogElement = useTemplateRef('dialog-ref')

const contentElement = useTemplateRef('content-ref')

const history = DatabaseManager.getPlayer(props.identifier) as PlayerHistory
const timestamps = history.List.map((entry) => entry.Timestamp)

const timestamp = ref(timestamps.find((value) => value <= props.timestamp) || history.LatestTimestamp)
const reference = ref([...timestamps].reverse().find((value) => value >= props.reference && value <= timestamp.value) || timestamp.value)
const tab = ref<DetailTab>('overview')

const player = computed(() => DatabaseManager.getPlayer(props.identifier, timestamp.value) as PlayerModel)
const compare = computed(() => DatabaseManager.getPlayer(props.identifier, reference.value) as PlayerModel)

provide(PLAYER_DETAIL_KEY, {
  get player() {
    return player.value
  },
  get compare() {
    return compare.value
  },
  getHistory
})

onMounted(() => {
  contentElement.value?.focus({ preventScroll: true })

  // Registered before any menu inside the dialog, so it runs while that menu is still open
  window.addEventListener('keydown', closeOnEscape, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', closeOnEscape, true)
})

function closeOnEscape(event: KeyboardEvent) {
  // An open menu or chart hides the dialog from assistive tech, that Escape belongs to the menu
  if (event.key === 'Escape' && dialogElement.value?.closest('[data-content-container]')?.getAttribute('aria-hidden') !== 'true') {
    emit('close')
  }
}

const CHART_POINT_LIMIT = 60

function getHistory() {
  const range = timestamps.filter((value) => value >= reference.value && value <= timestamp.value).reverse()
  const step = (range.length - 1) / (CHART_POINT_LIMIT - 1)
  const picked = range.length <= CHART_POINT_LIMIT ? range : Array.from({ length: CHART_POINT_LIMIT }, (_, index) => range[Math.round(index * step)])

  return picked.map((value) => DatabaseManager.getPlayer(props.identifier, value) as PlayerModel)
}
</script>
