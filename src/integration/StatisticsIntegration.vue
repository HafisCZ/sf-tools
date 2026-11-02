<template>
  <SFButton ref="trigger-ref" variant="ghost" aria-haspopup="dialog" :aria-expanded="open" @click="toggle">
    <img src="/res/endpoint/account.webp" alt="" class="h-5 opacity-90" />
    {{ title }}
  </SFButton>
  <Teleport to="body">
    <section
      v-if="open && position"
      ref="panel-ref"
      role="dialog"
      :aria-label="title"
      class="fixed z-20 flex max-h-[calc(100dvh-70px)] w-[min(340px,calc(100vw-32px))] flex-col overflow-y-auto rounded-lg border border-line bg-surface text-white/90 shadow-xl"
      :style="{ top: `${position.bottom + 14}px`, left: `${getPanelLeft(position)}px` }"
    >
      <div class="relative shrink-0">
        <img src="/res/backgrounds/classselect.webp" alt="" class="absolute inset-0 size-full object-cover object-[center_35%]" />
        <div class="absolute inset-0 bg-linear-to-b from-page/50 to-surface" />
        <div class="relative grid grid-cols-2 gap-2 p-3">
          <button type="button" class="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-line bg-black/50 text-[13px] font-bold text-white/90 outline-none hover:border-accent focus-visible:border-accent" @click="importEndpoint">
            <img src="/res/endpoint/account.webp" alt="" class="h-5 opacity-90" />
            {{ localize('login') }}
          </button>
          <button type="button" class="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-line bg-black/50 text-[13px] font-bold text-white/90 outline-none hover:border-accent focus-visible:border-accent" @click="importFiles">
            <SFIcon name="upload" class="text-lg" />
            {{ localize('import') }}
          </button>
        </div>
      </div>

      <div v-if="props.grouped" class="flex max-h-[420px] shrink-0 flex-col overflow-y-auto px-1.5 pb-1.5">
        <template v-for="world in worlds" :key="world.value">
          <button
            type="button"
            class="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left outline-none hover:bg-surface-hover focus-visible:bg-surface-hover"
            :class="{ 'bg-surface-hover': openWorld === world.value }"
            :aria-expanded="openWorld === world.value"
            @click="toggleWorld(world.value, $event)"
          >
            <span class="font-bold text-white">{{ world.label }}</span>
            <span class="ml-auto text-xs text-white/55">{{ world.entries.length }}</span>
            <SFIcon name="chevron-down" class="text-xs text-white/40" :class="isPhone ? { 'rotate-180': openWorld === world.value } : '-rotate-90'" />
          </button>
          <StatisticsIntegrationWorld v-if="isPhone && openWorld === world.value" :entries="world.entries" :search-label="localize('search_world', { world: world.label })" class="mb-1 rounded-md border border-line p-1" @select="selectWorldEntry" />
        </template>
        <SFParagraph v-if="worlds.length === 0" type="muted" size="sm" class="px-3 py-4 text-center">{{ localize('empty') }}</SFParagraph>
      </div>

      <template v-else>
        <div class="shrink-0 px-3 pb-2">
          <SFInput v-model="query" type="search" :aria-label="searchLabel" :placeholder="searchLabel" />
        </div>
        <div ref="scroller-ref" class="flex max-h-[420px] shrink-0 flex-col overflow-y-auto px-1.5 pb-1.5" @scroll="loadMore">
          <ul v-if="matchingEntries.length > 0" ref="list-ref" class="flex flex-col">
            <StatisticsIntegrationEntry v-for="entry in renderedEntries" :key="entry.LinkId" :entry="entry" :guild="props.type === 'guilds'" hideable @select="selectEntry(entry)" @hide="hideEntry(entry)" />
          </ul>
          <SFParagraph v-else type="muted" size="sm" class="px-3 py-4 text-center">{{ localize(entries.length > 0 ? 'no_match' : 'empty') }}</SFParagraph>
        </div>
      </template>

      <div class="flex shrink-0 items-center justify-end gap-1.5 border-t border-white/10 px-3 py-2">
        <SFButton v-if="props.cheats" variant="ghost" size="sm" :title="localize('tooltip.cheats')" :aria-pressed="!!cheats" @click="toggleCheats">
          <SFIcon name="fire-flame-curved" :class="{ 'text-accent': cheats }" />
          {{ localize('modify') }}
        </SFButton>
        <SFButton v-if="!props.grouped" variant="ghost" size="sm" icon :title="localize('tooltip.options')" :aria-label="localize('tooltip.options')" @click="showOptions">
          <SFIcon name="gear" />
        </SFButton>
      </div>

      <div v-if="cheats" class="flex shrink-0 flex-col gap-3 border-t border-white/10 px-3.5 pt-3 pb-3.5">
        <span class="font-bold text-white">{{ localize('modify_title') }}</span>
        <div class="flex flex-col gap-2">
          <SFHeading level="6" type="muted">{{ localize.global('dungeons.cheats.general') }}</SFHeading>
          <SFCheckbox v-model="cheats.enchantments" :label="localize.global('dungeons.cheats.enchantments')" />
          <SFCheckbox v-model="cheats.runes" :label="localize.global('dungeons.cheats.runes')" />
          <SFCheckbox v-model="cheats.pets" :label="localize.global('dungeons.cheats.pets')" />
        </div>
        <div class="flex flex-col gap-2">
          <SFHeading level="6" type="muted">{{ localize.global('dungeons.cheats.potions') }}</SFHeading>
          <div class="grid grid-cols-2 gap-2">
            <SFCheckbox v-model="cheats.strength" :label="localize.global('general.attribute1')" />
            <SFCheckbox v-model="cheats.dexterity" :label="localize.global('general.attribute2')" />
            <SFCheckbox v-model="cheats.intelligence" :label="localize.global('general.attribute3')" />
            <SFCheckbox v-model="cheats.constitution" :label="localize.global('general.attribute4')" />
            <SFCheckbox v-model="cheats.luck" :label="localize.global('general.attribute5')" />
            <SFCheckbox v-model="cheats.life" :label="localize.global('general.life_potion')" />
          </div>
        </div>
        <SFSelect v-model="cheats.class" :label="localize.global('dungeons.cheats.class')" :options="cheatClassOptions" />
      </div>
    </section>
    <SFDropdownMenu v-if="!isPhone && openedWorld && worldPosition" :anchor="worldPosition" float="right" position="right" :width="PANEL_WIDTH" @close="closeWorld">
      <StatisticsIntegrationWorld :key="openedWorld.value" :entries="openedWorld.entries" :search-label="localize('search_world', { world: openedWorld.label })" menu @select="selectWorldEntry" />
    </SFDropdownMenu>
  </Teleport>
</template>

<script setup lang="ts" generic="TEntry extends PlayerModel | GroupModel">
import { computed, onScopeDispose, ref, shallowRef, useTemplateRef, watch } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFCheckbox from '@library/SFCheckbox.vue'
import SFDropdownMenu from '@library/SFDropdownMenu.vue'
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import SFInput from '@library/SFInput.vue'
import SFParagraph from '@library/SFParagraph.vue'
import SFSelect from '@library/SFSelect.vue'
import { usePagedList, type SelectOption } from '@utils/components'
import { useDialog, useFilePicker, useSimpleDialog } from '@utils/dialogs'
import { formatWorldName } from '@utils/formatting'
import { useLoader } from '@utils/loader'
import { useLocalize } from '@utils/localization'
import { useAnimationFramePosition, type Rectangle } from '@utils/position'
import { useErrorToast } from '@utils/toasts'
import { getClassImageUrl, getErrorMessage } from '@utils/utils'
import { Logger } from '~/core/logger'
import { type GroupModel } from '~/core/models/group'
import { PlayerModel } from '~/core/models/player'
import { OptionsHandler } from '~/core/options'
import { type DatabaseProfile } from '~/core/profiles'
import { DatabaseManager } from '~/data/database-manager'
import { type RawPlayer } from '~/data/types'
import EndpointDialog from '~/dialogs/EndpointDialog.vue'
import { CONFIG } from '~/sim/workers/base'
import { applyCheats, type Cheats } from './cheats'
import StatisticsIntegrationOptionsDialog from './dialogs/StatisticsIntegrationOptionsDialog.vue'
import StatisticsIntegrationEntry from './StatisticsIntegrationEntry.vue'
import StatisticsIntegrationWorld from './StatisticsIntegrationWorld.vue'

defineOptions({
  name: 'StatisticsIntegration'
})

const props = defineProps<{
  /**
   * Kind of entries listed
   */
  type: 'players' | 'guilds'
  /**
   * Which saved players and groups the database loads
   */
  profile: DatabaseProfile
  /**
   * Picks the entries to list
   */
  scope: () => TEntry[]
  /**
   * Shows a toggle for cheats
   */
  cheats?: boolean
  /**
   * Lists everyone with world filters and hides the options
   */
  grouped?: boolean
}>()

const emit = defineEmits<{
  /**
   * An entry was picked, together with the cheats that were applied to it
   */
  select: [entry: TEntry, cheats?: Cheats]
}>()

type IntegrationOptions = {
  limit: number
  slot: number
  ignored_identifiers: string[]
  ignored_duration: number
}

const localize = useLocalize('integration')

const loader = useLoader()

const options = new OptionsHandler<IntegrationOptions>('integration', {
  limit: 0,
  slot: 0,
  ignored_identifiers: [],
  ignored_duration: 0
})

const triggerRef = useTemplateRef('trigger-ref')
const panelElement = useTemplateRef('panel-ref')
const scrollerElement = useTemplateRef('scroller-ref')
const listElement = useTemplateRef('list-ref')

const open = ref(false)
const entries = shallowRef<TEntry[]>([])

const query = ref('')

const openWorld = ref<string | null>(null)

let worldElement: HTMLElement | null = null
let closedWorld: string | null = null

const cheats = ref<Cheats | null>(null)

const phoneQuery = window.matchMedia('(width < 48rem)')

const isPhone = ref(phoneQuery.matches)

const position = useAnimationFramePosition(open, () => (triggerRef.value?.$el as HTMLElement | undefined)?.getBoundingClientRect())

const title = computed(() => localize(`load.${props.type === 'guilds' ? 'guild' : props.grouped ? 'player' : 'character'}`))

const searchLabel = computed(() => localize(props.type === 'guilds' ? 'search_guild' : 'search'))

const worlds = computed(() => {
  const map = new Map<string, { label: string; entries: PlayerModel[] }>()

  for (const entry of entries.value as PlayerModel[]) {
    const current = map.get(entry.Prefix)

    if (current) {
      current.entries.push(entry)
    } else {
      map.set(entry.Prefix, { label: formatWorldName(entry.Data.prefix).toUpperCase(), entries: [entry] })
    }
  }

  return Array.from(map, ([value, { label, entries }]) => ({ value, label, entries: entries.sort((a, b) => Number(b.Own) - Number(a.Own)) })).sort((a, b) => b.entries.length - a.entries.length)
})

const openedWorld = computed(() => worlds.value.find((world) => world.value === openWorld.value))

const worldPosition = useAnimationFramePosition(
  computed(() => openWorld.value !== null && !isPhone.value),
  () => {
    const row = worldElement?.getBoundingClientRect()
    const panel = panelElement.value?.getBoundingClientRect()

    // Opens beside the card, level with the clicked world
    return row && panel ? { top: row.top, bottom: row.bottom, left: panel.left, right: panel.right + 4 } : undefined
  }
)

const matchingEntries = computed(() => {
  const search = query.value.trim().toLowerCase()

  return search ? entries.value.filter((entry) => entry.Name.toLowerCase().includes(search)) : entries.value
})

const PAGE_SIZE = 25

const { renderedItems: renderedEntries, showPage, loadMore } = usePagedList(matchingEntries, PAGE_SIZE, listElement)

const cheatClassOptions = computed<SelectOption<Cheats['class']>[]>(() => [{ value: 0, label: localize.global('dungeons.cheats.keep_original') }, ...CONFIG.ids().map((id) => ({ value: id, label: localize.global(`general.class${id}`), image: getClassImageUrl(id) }))])

watch(query, () => {
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

function toggleWorld(value: string, event: MouseEvent) {
  // The world's menu closes on any click outside it, the click on its own world must not open it again
  if (closedWorld === value) return

  worldElement = event.currentTarget as HTMLElement

  openWorld.value = openWorld.value === value ? null : value
}

function closeWorld() {
  closedWorld = openWorld.value
  openWorld.value = null

  setTimeout(() => {
    closedWorld = null
  })
}

function selectWorldEntry(entry: PlayerModel) {
  selectEntry(entry as TEntry)
}

function updatePhone(event: MediaQueryListEvent) {
  isPhone.value = event.matches
}

phoneQuery.addEventListener('change', updatePhone)

onScopeDispose(() => phoneQuery.removeEventListener('change', updatePhone))

function toggle() {
  if (open.value) {
    close()
  } else {
    void poll()
  }
}

function close() {
  open.value = false
  openWorld.value = null
}

function handleKeydown(event: KeyboardEvent) {
  // A dialog or drop-down on top hides the page and gets this Esc instead
  if (event.key !== 'Escape' || !open.value || document.querySelector('main')?.getAttribute('aria-hidden') === 'true') return

  if (openWorld.value) {
    closeWorld()
    return
  }

  if (panelElement.value?.contains(document.activeElement)) {
    ;(triggerRef.value?.$el as HTMLElement | undefined)?.focus()
  }

  close()
}

window.addEventListener('keydown', handleKeydown, true)

onScopeDispose(() => window.removeEventListener('keydown', handleKeydown, true))

async function poll() {
  loader.start()

  try {
    await DatabaseManager.load({ slot: options.slot, ...props.profile })

    listEntries()

    open.value = true
  } catch (e) {
    useErrorToast(localize.global('database.open_error.title'), localize.global('database.open_error.message'))
    Logger.error(e, `Database could not be opened! Reason: ${getErrorMessage(e)}`)

    open.value = false
  } finally {
    loader.stop()
  }
}

function listEntries() {
  let scope = props.scope().sort((a, b) => b.Timestamp - a.Timestamp)

  if (!props.grouped) {
    if (options.ignored_duration) {
      scope = scope.filter((entry) => entry.Timestamp > Date.now() - options.ignored_duration)
    }

    scope = scope.filter((entry) => !options.ignored_identifiers.includes(entry.LinkId))

    if (options.limit) {
      scope = scope.slice(0, options.limit)
    }
  }

  entries.value = scope

  showPage(0)
}

function selectEntry(entry: TEntry) {
  if (cheats.value) {
    const player = applyCheats(new PlayerModel(entry.Data as RawPlayer), cheats.value)

    emit('select', player as unknown as TEntry, cheats.value)
  } else if (props.type === 'players') {
    // The database lists lazy proxies, which can't be cloned into a worker
    emit('select', (DatabaseManager.getPlayer(entry.LinkId, entry.Timestamp) ?? entry) as unknown as TEntry)
  } else {
    emit('select', entry)
  }
}

function toggleCheats() {
  cheats.value = cheats.value
    ? null
    : {
        enchantments: false,
        runes: false,
        pets: false,
        strength: false,
        dexterity: false,
        intelligence: false,
        constitution: false,
        luck: false,
        life: false,
        class: 0
      }
}

function hideEntry(entry: TEntry) {
  useSimpleDialog(
    {
      title: localize('hide.title'),
      message: localize('hide.message')
    },
    {
      onAccept: () => {
        options.ignored_identifiers = [...options.ignored_identifiers, entry.LinkId]
        entries.value = entries.value.filter((item) => item !== entry)
      }
    }
  )
}

function importEndpoint() {
  useDialog(
    EndpointDialog,
    { allowTemporary: true },
    {
      callback: (imported) => {
        if (imported) {
          void poll()
        }
      }
    }
  )
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

  await poll()
}

function showOptions() {
  useDialog(
    StatisticsIntegrationOptionsDialog,
    {
      options: {
        limit: options.limit,
        slot: options.slot,
        ignored_identifiers: options.ignored_identifiers,
        ignored_duration: options.ignored_duration
      }
    },
    {
      callback: (values) => {
        if (values) {
          void saveOptions(values)
        }
      }
    }
  )
}

async function saveOptions(values: IntegrationOptions) {
  const slotChanged = options.slot !== values.slot

  options.limit = values.limit
  options.slot = values.slot
  options.ignored_duration = values.ignored_duration
  options.ignored_identifiers = values.ignored_identifiers

  if (slotChanged) {
    await poll()
  } else {
    listEntries()
  }
}
</script>
