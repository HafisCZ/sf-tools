<template>
  <div class="absolute top-[70px] left-7 z-[2] flex w-[300px] flex-col rounded-md bg-surface/60 shadow-xl backdrop-blur-md">
    <SFButton variant="ghost" block :aria-expanded="open" :aria-controls="panelId" @click="toggle">
      <SFIcon name="rotate" />
      {{ localize(`poll.${props.type}`) }}
      <SFIcon name="chevron-down" class="ml-auto text-white/60" :class="{ 'rotate-180': open }" />
    </SFButton>
    <div v-if="open" :id="panelId" class="flex flex-col border-t border-line p-1">
      <div v-if="props.grouped" class="flex max-h-96 flex-col overflow-y-auto">
        <button v-for="group in groups" :key="group.prefix" type="button" class="w-full cursor-pointer rounded px-3 py-2 text-center outline-none hover:bg-surface-hover focus-visible:bg-surface-hover" :aria-expanded="openPrefix === group.prefix" @click="toggleGroup(group.prefix, $event)">
          {{ group.prefix }}
        </button>
      </div>
      <div v-else-if="entries.length > 0" class="flex max-h-96 flex-col overflow-y-auto">
        <div v-for="entry in entries" :key="entry.LinkId" class="group relative">
          <button type="button" class="w-full cursor-pointer rounded py-2 pr-10 pl-3 text-left outline-none hover:bg-surface-hover focus-visible:bg-surface-hover" @click="selectEntry(entry)">
            <span class="group-hover:hidden group-has-[:focus-visible]:hidden">{{ entry.Name }} @ {{ entry.Prefix }}</span>
            <span class="hidden text-white/60 group-hover:inline group-has-[:focus-visible]:inline">{{ describeEntry(entry) }}</span>
          </button>
          <span class="absolute top-1/2 right-1 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100">
            <SFButton variant="ghost" size="sm" icon @click="hideEntry(entry)">
              <SFIcon name="eye-slash" />
            </SFButton>
          </span>
        </div>
      </div>
      <Teleport to="body">
        <SFDropdownMenu v-if="openGroup && groupPosition" :anchor="groupPosition" float="right" position="right" :width="PANEL_WIDTH" @close="closeGroup">
          <SFInput v-model="search" :aria-label="SEARCH_LABEL" :placeholder="SEARCH_LABEL" />
          <ul role="menu" class="mt-1 flex flex-col">
            <li v-for="entry in filterGroup(openGroup.entries)" :key="entry.LinkId" role="none">
              <button type="button" role="menuitem" class="flex w-full cursor-pointer items-center gap-3 rounded px-3 py-2 text-left outline-none hover:bg-surface-hover focus-visible:bg-surface-hover" @click="selectGroupEntry(entry)">
                <img :src="getClassImageUrl(entry.Class)" alt="" class="size-5 object-contain" />
                {{ entry.Level }} - {{ entry.Name }}
              </button>
            </li>
          </ul>
        </SFDropdownMenu>
      </Teleport>
      <div v-if="entries.length > 0" class="my-1 border-t border-line" />
      <div class="flex items-center">
        <SFButton variant="ghost" size="sm" class="flex-1" @click="importEndpoint">
          {{ localize('game') }}
        </SFButton>
        <SFButton variant="ghost" size="sm" class="flex-1" @click="importFiles">
          {{ localize('file') }}
        </SFButton>
        <SFButton v-if="props.cheats" variant="ghost" icon :title="localize('tooltip.cheats')" :aria-label="localize('tooltip.cheats')" :aria-pressed="!!cheats" @click="toggleCheats">
          <SFIcon name="fire-flame-curved" :class="{ 'text-accent': cheats }" />
        </SFButton>
        <SFButton v-if="!props.grouped" variant="ghost" icon :title="localize('tooltip.options')" :aria-label="localize('tooltip.options')" @click="showOptions">
          <SFIcon name="gear" />
        </SFButton>
      </div>
      <div v-if="cheats" class="mt-1 flex flex-col gap-3 border-t border-line p-2">
        <div class="flex flex-col gap-2">
          <SFHeading level="6">{{ localize.global('dungeons.cheats.general') }}</SFHeading>
          <SFCheckbox v-model="cheats.enchantments" :label="localize.global('dungeons.cheats.enchantments')" />
          <SFCheckbox v-model="cheats.runes" :label="localize.global('dungeons.cheats.runes')" />
          <SFCheckbox v-model="cheats.pets" :label="localize.global('dungeons.cheats.pets')" />
        </div>
        <div class="flex flex-col gap-2">
          <SFHeading level="6">{{ localize.global('dungeons.cheats.potions') }}</SFHeading>
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
    </div>
  </div>
</template>

<script setup lang="ts" generic="TEntry extends PlayerModel | GroupModel">
import { computed, ref, shallowRef, useId } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFCheckbox from '@library/SFCheckbox.vue'
import SFHeading from '@library/SFHeading.vue'
import SFDropdownMenu from '@library/SFDropdownMenu.vue'
import SFIcon from '@library/SFIcon.vue'
import SFInput from '@library/SFInput.vue'
import SFSelect from '@library/SFSelect.vue'
import { type SelectOption } from '@utils/components'
import { useDialog, useFilePicker, useSimpleDialog } from '@utils/dialogs'
import { formatDate } from '@utils/formatting'
import { useLoader } from '@utils/loader'
import { useLocalize } from '@utils/localization'
import { useAnimationFramePosition } from '@utils/position'
import { useErrorToast } from '@utils/toasts'
import { getClassImageUrl, getErrorMessage } from '@utils/utils'
import { DatabaseManager } from '~/data/database-manager'
import { type RawPlayer } from '~/data/types'
import EndpointDialog from '~/dialogs/EndpointDialog.vue'
import { applyCheats, type Cheats } from './cheats'
import StatisticsIntegrationOptionsDialog from './dialogs/StatisticsIntegrationOptionsDialog.vue'
import { Logger } from './logger'
import { type GroupModel } from './models/group'
import { PlayerModel } from './models/player'
import { OptionsHandler } from './options'
import { type DatabaseProfile } from './profiles'

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
   * Lists the players by server and hides the options
   */
  grouped?: boolean
}>()

const emit = defineEmits<{
  select: [entry: TEntry]
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

const SEARCH_LABEL = 'Search player...'

const PANEL_WIDTH = 300

const panelId = useId()

const open = ref(false)
const entries = shallowRef<TEntry[]>([])

const openPrefix = ref<string | null>(null)
const search = ref('')

let groupElement: HTMLElement | null = null

const cheats = ref<Cheats | null>(null)

const groups = computed(() => {
  const map = new Map<string, PlayerModel[]>()

  for (const entry of entries.value as PlayerModel[]) {
    map.set(entry.Prefix, [...(map.get(entry.Prefix) ?? []), entry])
  }

  return Array.from(map, ([prefix, list]) => ({ prefix, entries: list.sort((a, b) => Number(b.Own) - Number(a.Own) || b.Timestamp - a.Timestamp) }))
})

const openGroup = computed(() => groups.value.find((group) => group.prefix === openPrefix.value))

const groupPosition = useAnimationFramePosition(
  computed(() => openPrefix.value !== null),
  () => groupElement?.getBoundingClientRect()
)

const cheatClassOptions = computed<SelectOption<Cheats['class']>[]>(() => [{ value: 0, label: localize.global('dungeons.cheats.keep_original') }, ...CONFIG.ids().map((id) => ({ value: id, label: localize.global(`general.class${id}`), image: getClassImageUrl(id) }))])

function toggle() {
  if (open.value) {
    close()
  } else {
    void poll()
  }
}

function close() {
  open.value = false
}

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
}

function toggleGroup(prefix: string, event: MouseEvent) {
  if (event.currentTarget instanceof HTMLElement) {
    groupElement = event.currentTarget
  }

  openPrefix.value = openPrefix.value === prefix ? null : prefix

  search.value = ''
}

function closeGroup() {
  openPrefix.value = null

  search.value = ''
}

function selectGroupEntry(entry: PlayerModel) {
  selectEntry(entry as TEntry)
}

function filterGroup(list: PlayerModel[]) {
  const query = search.value.trim().toLowerCase()

  return query ? list.filter((entry) => `${entry.Level} - ${entry.Name}`.toLowerCase().includes(query)) : list
}

function describeEntry(entry: TEntry) {
  if (props.type === 'players') {
    const player = entry as PlayerModel

    return `${localize.global('editor.level')} ${player.Level} ${localize.global(`general.class${player.Class}`)}`
  } else {
    return formatDate(entry.Timestamp)
  }
}

function selectEntry(entry: TEntry) {
  if (cheats.value) {
    const player = applyCheats(new PlayerModel(entry.Data as RawPlayer), cheats.value)

    emit('select', player as unknown as TEntry)
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
