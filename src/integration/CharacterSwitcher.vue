<template>
  <SFButton ref="trigger-ref" variant="ghost" aria-haspopup="dialog" :aria-expanded="open" @click="toggle">
    <span class="size-[29px] shrink-0 overflow-hidden rounded bg-[#0c1a20] bg-[radial-gradient(closest-side,rgb(5_121_160/0.9),rgb(5_121_160/0))]">
      <CharacterRenderer :data="props.player" />
    </span>
    <span class="max-w-40 truncate">{{ props.player.Name }}</span>
    <span class="text-xs text-[#7fc8e0] uppercase">{{ formatWorldName(props.player.Data.prefix) }}</span>
  </SFButton>
  <Teleport to="body">
    <section
      v-if="open && position"
      ref="panel-ref"
      role="dialog"
      :aria-label="localize('choose')"
      class="fixed z-20 flex max-h-[calc(100dvh-70px)] w-[min(340px,calc(100vw-32px))] flex-col overflow-y-auto rounded-lg border border-line bg-surface text-white/90 shadow-xl"
      :style="{ top: `${position.bottom + 14}px`, left: `${getPanelLeft(position)}px` }"
    >
      <div class="relative shrink-0">
        <img src="/res/backgrounds/classselect.webp" alt="" class="absolute inset-0 size-full object-cover object-[center_35%]" />
        <div class="absolute inset-0 bg-linear-to-b from-page/50 to-surface" />
        <div class="relative grid grid-cols-2 gap-2 p-3">
          <button type="button" class="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-line bg-black/50 text-[13px] font-bold text-white/90 outline-none hover:border-accent focus-visible:border-accent" @click="importInlineSelectorEndpoint">
            <img src="/res/endpoint/account.webp" alt="" class="h-5 opacity-90" />
            {{ localize('login') }}
          </button>
          <button type="button" class="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-line bg-black/50 text-[13px] font-bold text-white/90 outline-none hover:border-accent focus-visible:border-accent" @click="importInlineSelectorFiles">
            <SFIcon name="upload" class="text-lg" />
            {{ localize('import') }}
          </button>
        </div>
      </div>

      <div class="shrink-0 px-3 pb-2">
        <SFInput v-model="query" type="search" :aria-label="localize('search')" :placeholder="localize('search')" />
      </div>
      <div ref="scroller-ref" class="flex max-h-[420px] shrink-0 flex-col overflow-y-auto px-1.5 pb-1.5" @scroll="loadMore">
        <ul v-if="matchingEntries.length > 0" ref="list-ref" class="flex flex-col">
          <StatisticsIntegrationEntry v-for="entry in renderedEntries" :key="entry.LinkId" :entry="entry" @select="select(entry)" />
        </ul>
        <SFParagraph v-else type="muted" size="sm" class="px-3 py-4 text-center">{{ localize('no_match') }}</SFParagraph>
      </div>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onScopeDispose, ref, useTemplateRef, watch } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFIcon from '@library/SFIcon.vue'
import SFInput from '@library/SFInput.vue'
import SFParagraph from '@library/SFParagraph.vue'
import { usePagedList } from '@utils/components'
import { formatWorldName } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { useAnimationFramePosition, type Rectangle } from '@utils/position'
import CharacterRenderer from '~/components/CharacterRenderer.vue'
import { type PlayerModel } from '~/core/models/player'
import { importInlineSelectorEndpoint, importInlineSelectorFiles, inlineSelectorPlayers } from './inline-selector'
import StatisticsIntegrationEntry from './StatisticsIntegrationEntry.vue'

defineOptions({
  name: 'CharacterSwitcher'
})

const props = defineProps<{
  /**
   * Character the page shows
   */
  player: PlayerModel
}>()

const emit = defineEmits<{
  /**
   * A saved character was picked, also the one already shown
   */
  select: [player: PlayerModel]
}>()

const localize = useLocalize('integration')

const triggerRef = useTemplateRef('trigger-ref')
const panelElement = useTemplateRef('panel-ref')
const scrollerElement = useTemplateRef('scroller-ref')
const listElement = useTemplateRef('list-ref')

const open = ref(false)

const query = ref('')

const triggerElement = computed((): HTMLElement | undefined => triggerRef.value?.$el)

const position = useAnimationFramePosition(open, () => triggerElement.value?.getBoundingClientRect())

const matchingEntries = computed(() => {
  const search = query.value.trim().toLowerCase()

  return search ? inlineSelectorPlayers.value.filter((entry) => entry.Name.toLowerCase().includes(search)) : inlineSelectorPlayers.value
})

const PAGE_SIZE = 25

const { renderedItems: renderedEntries, showPage, loadMore } = usePagedList(matchingEntries, PAGE_SIZE, listElement)

watch(matchingEntries, () => {
  showPage(0)
  scrollerElement.value?.scrollTo({ top: 0 })
})

watch(
  panelElement,
  (element) => {
    // Phones would open their keyboard over the list
    if (element && window.matchMedia('(pointer: fine)').matches) {
      element.querySelector<HTMLInputElement>('input[type="search"]')?.focus()
    }
  },
  { flush: 'post' }
)

const PANEL_WIDTH = 340

const PANEL_EDGE = 16

function getPanelLeft({ left, right }: Rectangle) {
  const width = Math.min(PANEL_WIDTH, window.innerWidth - 2 * PANEL_EDGE)

  return Math.max(PANEL_EDGE, Math.min((left + right - width) / 2, window.innerWidth - width - PANEL_EDGE))
}

function toggle() {
  if (open.value) {
    open.value = false
  } else {
    query.value = ''
    showPage(0)

    open.value = true
  }
}

function close() {
  if (panelElement.value?.contains(document.activeElement)) {
    triggerElement.value?.focus()
  }

  open.value = false
}

function handleKeydown(event: KeyboardEvent) {
  // A dialog or drop-down on top hides the page and gets this Esc instead
  if (event.key !== 'Escape' || !open.value || document.querySelector('main')?.getAttribute('aria-hidden') === 'true') return

  close()
}

window.addEventListener('keydown', handleKeydown, true)

onScopeDispose(() => window.removeEventListener('keydown', handleKeydown, true))

function select(entry: PlayerModel) {
  close()

  emit('select', entry)
}
</script>
