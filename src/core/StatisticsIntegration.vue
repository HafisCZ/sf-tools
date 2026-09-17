<template>
  <div class="absolute top-[70px] left-7 z-[2] flex w-[300px] flex-col rounded-md bg-surface/60 shadow-xl backdrop-blur-md">
    <SFButton variant="ghost" block :aria-expanded="open" :aria-controls="panelId" @click="toggle">
      <SFIcon name="rotate" />
      {{ localize(`poll.${props.type}`) }}
      <SFIcon name="chevron-down" class="ml-auto text-white/60" :class="{ 'rotate-180': open }" />
    </SFButton>
    <div v-if="open" :id="panelId" class="flex max-h-96 flex-col overflow-y-auto border-t border-line p-1">
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
      <div v-if="entries.length > 0" class="my-1 border-t border-line" />
      <div class="flex items-center">
        <SFButton variant="ghost" size="sm" class="flex-1" @click="importEndpoint">
          {{ localize('game') }}
        </SFButton>
        <SFButton variant="ghost" size="sm" class="flex-1" @click="importFiles">
          {{ localize('file') }}
        </SFButton>
        <SFButton variant="ghost" icon :title="localize('tooltip.options')" :aria-label="localize('tooltip.options')" @click="showOptions">
          <SFIcon name="gear" />
        </SFButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="TEntry extends PlayerEntry | DatabaseEntry">
import { ref, shallowRef, useId } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFIcon from '@library/SFIcon.vue'
import { useDialog, useFilePicker, useSimpleDialog } from '@utils/dialogs'
import { useLoader } from '@utils/loader'
import { useLocalize } from '@utils/localization'
import { useErrorToast } from '@utils/toasts'
import { getErrorMessage } from '@utils/utils'
import EndpointDialog from '~/dialogs/EndpointDialog.vue'
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
  emit('select', entry)
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
