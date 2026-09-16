<template>
  <div ref="container-ref" class="absolute top-[70px] left-7 z-[2] w-[300px]">
    <SFButton block aria-haspopup="menu" :aria-expanded="open" @click="toggle">
      <SFIcon name="rotate" />
      {{ localize(`poll.${props.type}`) }}
      <SFIcon name="chevron-down" class="ml-auto text-white/60" />
    </SFButton>
    <Teleport to="body">
      <SFDropdownMenu v-if="open && position" :anchor="position" :width="position.right - position.left" float="right" @close="close">
        <div role="menu" class="flex flex-col">
          <div v-for="entry in entries" :key="entry.LinkId" role="none" class="group relative">
            <button type="button" role="menuitem" class="w-full cursor-pointer rounded py-2 pr-10 pl-3 text-left outline-none hover:bg-surface-hover focus-visible:bg-surface-hover" @click="selectEntry(entry)">
              <span class="group-hover:hidden group-has-[:focus-visible]:hidden">{{ entry.Name }} @ {{ entry.Prefix }}</span>
              <span class="hidden text-white/60 group-hover:inline group-has-[:focus-visible]:inline">{{ describeEntry(entry) }}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              class="absolute top-1/2 right-1 -translate-y-1/2 cursor-pointer rounded p-1.5 text-white/60 opacity-0 outline-none group-hover:opacity-100 group-has-[:focus-visible]:opacity-100 hover:bg-page hover:text-white focus-visible:bg-page focus-visible:text-white"
              @click="hideEntry(entry)"
            >
              <SFIcon name="eye-slash" />
            </button>
          </div>
          <div v-if="entries.length > 0" role="separator" class="my-1 border-t border-line" />
          <div role="none" class="flex">
            <button type="button" role="menuitem" class="flex-1 cursor-pointer rounded px-3 py-2 outline-none hover:bg-surface-hover focus-visible:bg-surface-hover" @click="importEndpoint">
              {{ localize('game') }}
            </button>
            <button type="button" role="menuitem" class="flex-1 cursor-pointer rounded px-3 py-2 outline-none hover:bg-surface-hover focus-visible:bg-surface-hover" @click="importFiles">
              {{ localize('file') }}
            </button>
            <button type="button" role="menuitem" class="cursor-pointer rounded px-3 py-2 outline-none hover:bg-surface-hover focus-visible:bg-surface-hover" :title="localize('tooltip.options')" :aria-label="localize('tooltip.options')" @click="showOptions">
              <SFIcon name="gear" />
            </button>
          </div>
        </div>
      </SFDropdownMenu>
    </Teleport>
  </div>
</template>

<script setup lang="ts" generic="TEntry extends PlayerEntry | DatabaseEntry">
import { ref, shallowRef, useTemplateRef, watch } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDropdownMenu from '@library/SFDropdownMenu.vue'
import SFIcon from '@library/SFIcon.vue'
import { useDialog, useFilePicker, useSimpleDialog } from '@utils/dialogs'
import { useInert } from '@utils/interactions'
import { useLoader } from '@utils/loader'
import { useLocalize } from '@utils/localization'
import { useAnimationFramePosition } from '@utils/position'
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

const open = ref(false)
const entries = shallowRef<TEntry[]>([])

const containerElement = useTemplateRef('container-ref')

const position = useAnimationFramePosition(open, () => containerElement.value?.getBoundingClientRect())

useInert(open)

// Return focus to the trigger unless the user already moved it somewhere else
watch(
  open,
  (value) => {
    if (!value && document.activeElement === document.body) {
      containerElement.value?.querySelector('button')?.focus()
    }
  },
  { flush: 'post' }
)

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

  close()
}

// The menu closes for the confirmation and comes back once it is answered
function hideEntry(entry: TEntry) {
  close()

  useSimpleDialog(
    {
      title: localize('hide.title'),
      message: localize('hide.message')
    },
    {
      onAccept: () => {
        options.ignored_identifiers = [...options.ignored_identifiers, entry.LinkId]
        entries.value = entries.value.filter((item) => item !== entry)
      },
      callback: () => {
        open.value = true
      }
    }
  )
}

function importEndpoint() {
  close()

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
  close()

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
  close()

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

    open.value = true
  }
}
</script>
