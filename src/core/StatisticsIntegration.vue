<template>
  <div class="absolute top-[70px] left-7 z-[2] flex w-[300px] flex-col rounded-md bg-surface/60 shadow-xl backdrop-blur-md">
    <SFButton variant="ghost" block :aria-expanded="open" :aria-controls="panelId" @click="toggle">
      <SFIcon name="rotate" />
      {{ localize(`poll.${props.type}`) }}
      <SFIcon name="chevron-down" class="ml-auto text-white/60" :class="{ 'rotate-180': open }" />
    </SFButton>
    <div v-if="open" :id="panelId" class="flex flex-col border-t border-line p-1">
      <div v-if="entries.length > 0" class="flex max-h-96 flex-col overflow-y-auto">
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
        <SFButton variant="ghost" icon :title="localize('tooltip.options')" :aria-label="localize('tooltip.options')" @click="showOptions">
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

<script setup lang="ts" generic="TEntry extends PlayerEntry | DatabaseEntry">
import { computed, ref, shallowRef, useId } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFCheckbox from '@library/SFCheckbox.vue'
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import SFSelect from '@library/SFSelect.vue'
import { type SelectOption } from '@utils/components'
import { useDialog, useFilePicker, useSimpleDialog } from '@utils/dialogs'
import { useLoader } from '@utils/loader'
import { useLocalize } from '@utils/localization'
import { useErrorToast } from '@utils/toasts'
import { getClassImageUrl, getErrorMessage } from '@utils/utils'
import EndpointDialog from '~/dialogs/EndpointDialog.vue'
import { applyCheats, type Cheats } from './cheats'
import StatisticsIntegrationOptionsDialog from './dialogs/StatisticsIntegrationOptionsDialog.vue'

defineOptions({
  name: 'StatisticsIntegration'
})

const props = defineProps<{
  /**
   * What the entries are, which picks the button text and the details shown on hover
   */
  type: 'players' | 'guilds'
  /**
   * Which saved players and groups the database loads
   */
  profile: DatabaseProfile
  /**
   * Picks the entries to list once the database is loaded
   */
  scope: () => TEntry[]
  /**
   * Shows a toggle for cheats, which are applied to a copy of a player before it is selected
   */
  cheats?: boolean
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

// Saved for every page that shows this panel
const options = new OptionsHandler<IntegrationOptions>('integration', {
  limit: 0,
  slot: 0,
  ignored_identifiers: [],
  ignored_duration: 0
})

const panelId = useId()

const open = ref(false)
const entries = shallowRef<TEntry[]>([])

// Null while cheats are turned off
const cheats = ref<Cheats | null>(null)

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

// Newest first, without the entries the options leave out
function listEntries() {
  let scope = props.scope().sort((a, b) => b.Timestamp - a.Timestamp)

  if (options.ignored_duration) {
    scope = scope.filter((entry) => entry.Timestamp > Date.now() - options.ignored_duration)
  }

  scope = scope.filter((entry) => !options.ignored_identifiers.includes(entry.LinkId))

  if (options.limit) {
    scope = scope.slice(0, options.limit)
  }

  entries.value = scope
}

function describeEntry(entry: TEntry) {
  if (props.type === 'players') {
    const player = entry as PlayerEntry

    return `${localize.global('editor.level')} ${player.Level} ${localize.global(`general.class${player.Class}`)}`
  } else {
    return _formatDate(entry.Timestamp)
  }
}

function selectEntry(entry: TEntry) {
  if (cheats.value) {
    // Saved players are player models, so the copy has the same fields as the entry
    const player = applyCheats(new PlayerModel(entry.Data), cheats.value)

    emit('select', player as unknown as TEntry)
  } else {
    emit('select', entry)
  }
}

// Turning cheats off forgets the picked cheats
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

  // Another slot is another database, the same one only needs listing again
  if (slotChanged) {
    await poll()
  } else {
    listEntries()
  }
}
</script>
