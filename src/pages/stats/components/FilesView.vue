<template>
  <div class="grid grid-cols-16 gap-x-[28px]">
    <section class="col-span-3 self-start rounded-md bg-surface p-[1em]" :aria-labelledby="filtersTitleId">
      <SFHeading :id="filtersTitleId" level="3" class="mb-4">{{ localize('titles.filters') }}</SFHeading>
      <div v-if="advanced" class="flex flex-col gap-3 text-xs">
        <SFSelect v-model="typeFilter" :label="localize('filters.type')" :options="typeOptions" search />
        <SFMultiSelect v-model="timestampFilter" :label="`${localize('filters.timestamp')} (${timestampOptions.length} ${localize('filters.n_unique')})`" :options="timestampOptions" :placeholder="localize('filters.any')" search />
        <SFMultiSelect v-model="playerFilter" :label="`${localize('filters.player')} (${playerOptions.length} ${localize('filters.n_unique')})`" :options="playerOptions" :placeholder="localize('filters.any')" search />
        <SFMultiSelect v-model="groupFilter" :label="`${localize('filters.group')} (${groupOptions.length - 1} ${localize('filters.n_unique')})`" :options="groupOptions" :placeholder="localize('filters.any')" search />
        <SFMultiSelect v-model="prefixFilter" :label="`${localize('filters.prefix')} (${prefixOptions.length} ${localize('filters.n_unique')})`" :options="prefixOptions" :placeholder="localize('filters.any')" search />
        <SFMultiSelect v-model="tagsFilter" :label="`${localize('filters.tags')} (${tagOptions.length - 1} ${localize('filters.n_unique')})`" :options="tagOptions" :placeholder="localize('filters.any')" search />
        <SFSelect v-model="ownershipFilter" :label="localize('filters.ownership')" :options="ownershipOptions" search />
        <SFMultiSelect v-if="showHidden" v-model="hiddenFilter" :label="localize('filters.hidden')" :options="hiddenOptions" :placeholder="localize('filters.any')" search />
      </div>
      <SFExpressionInput v-else v-model="expressionText" :label="localize('filters.expression')" :placeholder="localize('filters.expression_placeholder')" :highlight="highlightExpression" :class="{ 'border-red-400!': expressionText && !expressionFilter }" @change="updateFileResults" />
    </section>
    <div class="col-span-10">
      <FilesAdvancedList v-if="advanced" :entries="entryList" :selected="selectedEntryKeys" @mark="markEntry" @mark-all="markAll" />
      <FilesSimpleList v-else v-model:tag-filter="tagFilter" :files="fileList" :selected="selectedFiles" :tags="fileTags" @mark="markFile" @mark-all="markAll" @edit="editFile" />
    </div>
    <section class="col-span-3 flex flex-col gap-2 self-start rounded-md bg-surface p-[1em]" :aria-labelledby="ioTitleId">
      <SFHeading :id="ioTitleId" level="3" class="mb-2">{{ localize('titles.io') }}</SFHeading>
      <SFButton variant="outline" block :disabled="isImporting && 'loading'" @click="importFiles">
        <SFIcon name="file" />
        {{ localize('import.file') }}
      </SFButton>
      <SFButton variant="outline" block @click="importShared">
        <SFIcon name="share-nodes" />
        {{ localize('import.shared') }}
      </SFButton>
      <SFButton variant="outline" block @click="importEndpoint">
        <SFIcon name="desktop" />
        {{ localize('import.game') }}
      </SFButton>
      <hr class="my-4 border-line" />
      <SFButton variant="outline" block @click="exportAll">
        <SFIcon name="download" />
        {{ localize('export.all') }}
      </SFButton>
      <hr class="my-4 border-line" />
      <div class="text-center">{{ selectedCount === 0 ? localize('selected.no') : selectedCount }} {{ localize('selected.text') }}</div>
      <SFButton variant="outline" block @click="exportSelected">
        <SFIcon name="download" />
        {{ localize('export.selected') }}
      </SFButton>
      <SFButton variant="outline" block @click="tagSelected">
        <SFIcon name="tags" />
        {{ localize('tags.multiple') }}
      </SFButton>
      <div class="flex gap-1">
        <SFTooltip :content="localize('hide.tooltip')">
          <SFButton variant="outline" block @click="hideSelected">
            <SFIcon name="eye-slash" />
            {{ localize('hide.label') }}
          </SFButton>
        </SFTooltip>
        <SFTooltip v-if="advanced && showHidden" :content="localize('hide.migrate')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5 shrink-0" :aria-label="localize('hide.migrate')" @click="migrateHidden">
            <SFIcon name="expand" />
          </SFButton>
        </SFTooltip>
      </div>
      <SFButton variant="outline" block @click="mergeSelected">
        <SFIcon name="clone" />
        {{ localize('merge.selected') }}
      </SFButton>
      <SFButton variant="outline" block class="border-red-400! text-red-400!" @click="deleteSelected">
        <SFIcon name="clone" />
        {{ localize('delete.selected') }}
      </SFButton>
      <hr class="my-4 border-line" />
      <SFButton variant="outline" block class="border-red-400! text-red-400!" @click="deleteAll">
        <SFIcon name="trash-can" />
        {{ localize('delete.all') }}
      </SFButton>
      <SFHeading level="5" class="mt-4 text-center">{{ localize('options.title') }}</SFHeading>
      <div class="flex flex-col gap-2 pl-8">
        <SFTooltip :content="localize('options.advanced_title')">
          <SFCheckbox v-model="advanced" :label="localize('options.advanced')" />
        </SFTooltip>
        <SFCheckbox v-model="showHidden" :label="localize('options.hidden')" />
        <SFTooltip :content="localize('options.export_public_only_title')">
          <SFCheckbox v-model="exportPublicOnly" :label="localize('options.export_public_only')" />
        </SFTooltip>
        <SFTooltip :content="localize('options.export_bundle_groups_title')">
          <SFCheckbox v-model="exportBundleGroups" :label="localize('options.export_bundle_groups')" />
        </SFTooltip>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, useId, watch } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFCheckbox from '@library/SFCheckbox.vue'
import SFExpressionInput from '@library/SFExpressionInput.vue'
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import SFMultiSelect from '@library/SFMultiSelect.vue'
import SFSelect from '@library/SFSelect.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { type SelectOption } from '@utils/components'
import { useDialog, useFilePicker } from '@utils/dialogs'
import { formatDate, formatPrefix } from '@utils/formatting'
import { useLoader } from '@utils/loader'
import { useLocalize } from '@utils/localization'
import { useErrorToast } from '@utils/toasts'
import { getErrorMessage, toArray, toRecord, unique, useSubmit } from '@utils/utils'
import { DatabaseManager, getEntryKey } from '~/data/database-manager'
import { type RawEntity, type RawGroup, type RawPlayer } from '~/data/types'
import EndpointDialog from '~/dialogs/EndpointDialog.vue'
import FilesAdvancedList from '~/pages/stats/components/FilesAdvancedList.vue'
import FilesSimpleList from '~/pages/stats/components/FilesSimpleList.vue'
import DeleteAllDialog from '~/pages/stats/dialogs/DeleteAllDialog.vue'
import ExportFileDialog from '~/pages/stats/dialogs/ExportFileDialog.vue'
import FileEditDialog from '~/pages/stats/dialogs/FileEditDialog.vue'
import ImportFileDialog from '~/pages/stats/dialogs/ImportFileDialog.vue'
import TagDialog from '~/pages/stats/dialogs/TagDialog.vue'
import { createAccessorConfig, safeRemove, type EntryListEntry, type FileListEntry, type StatsShowParams } from '~/pages/stats/stats'
import { Expression, ExpressionScope } from '~/script/expression'
import { Highlighter } from '~/script/highlighter'
import { Logger } from '~/site/logger'
import { Site } from '~/site/site'

defineOptions({
  name: 'FilesView'
})

defineExpose({
  show
})

const localize = useLocalize('stats.files')

const loader = useLoader()

const filtersTitleId = useId()
const ioTitleId = useId()

const EXPRESSION_CONFIG = createAccessorConfig(['timestamp', 'players', 'groups', 'version', 'tags'])

const advanced = ref(Site.options.advanced)
const showHidden = ref(Site.options.hidden)
const exportPublicOnly = ref(Site.options.export_public_only)
const exportBundleGroups = ref(Site.options.export_bundle_groups)

// Shallow, so the selected entries stay plain objects that IndexedDB can store
const selectedFiles = shallowRef(new Set<number>())
const selectedEntries = shallowRef(new Map<string, RawEntity>())

const fileList = shallowRef<FileListEntry[]>([])
const fileTags = ref<string[]>([])
const tagFilter = ref<string | undefined>(undefined)
const expressionText = ref('')

const entryList = shallowRef<EntryListEntry[]>([])
const typeFilter = ref('0')
const timestampFilter = ref<string[]>([])
const playerFilter = ref<string[]>([])
const groupFilter = ref<string[]>([])
const prefixFilter = ref<string[]>([])
const tagsFilter = ref<string[]>([])
const ownershipFilter = ref('0')
const hiddenFilter = ref<string[]>([])

const timestampOptions = shallowRef<SelectOption[]>([])
const playerOptions = shallowRef<SelectOption[]>([])
const groupOptions = shallowRef<SelectOption[]>([])
const prefixOptions = shallowRef<SelectOption[]>([])
const tagOptions = shallowRef<SelectOption[]>([])

let currentEntries: Record<string, RawEntity> = {}
let lastSelectedTimestamp: number | null = null
let lastSelectedEntry: string | null = null
let lastChange: number | undefined

const expressionFilter = computed(() => Expression.create(expressionText.value))

const selectedEntryKeys = computed(() => new Set(selectedEntries.value.keys()))

const selectedCount = computed(() => (advanced.value ? selectedEntries.value.size : selectedFiles.value.size))

const typeOptions = computed<SelectOption[]>(() => [
  { value: '0', label: localize('filters.any') },
  { value: '1', label: localize('filters.player') },
  { value: '2', label: localize('filters.group') }
])

const ownershipOptions = computed<SelectOption[]>(() => [
  { value: '0', label: localize('filters.ownership_all') },
  { value: '1', label: localize('filters.ownership_own') },
  { value: '2', label: localize('filters.ownership_other') }
])

const hiddenOptions = computed<SelectOption[]>(() => [
  { value: 'yes', label: localize.global('general.yes') },
  { value: 'no', label: localize.global('general.no') }
])

const { submit: readFiles, isSubmitting: isImporting } = useSubmit(async (files: File[]) => {
  loader.start({ progress: true })

  let filesDone = 0

  try {
    await DatabaseManager.importCollection(
      files,
      async (file) => {
        loader.progress(++filesDone / files.length)

        return { text: await file.text(), timestamp: file.lastModified }
      },
      (error) => {
        useErrorToast(localize.global('database.import_error'), getErrorMessage(error))
        Logger.error(error, 'Error occured while trying to import a file!')
      }
    )
  } finally {
    loader.stop()
  }

  show()
})

watch(advanced, (value) => {
  Site.options.advanced = value

  window.scrollTo({ top: 0 })

  show({ forceUpdate: true })
})

watch(showHidden, async (value) => {
  Site.options.hidden = value

  await DatabaseManager.reloadHidden()

  show({ forceUpdate: true })
})

watch(exportPublicOnly, (value) => {
  Site.options.export_public_only = value
})

watch(exportBundleGroups, (value) => {
  Site.options.export_bundle_groups = value
})

watch(tagFilter, () => {
  updateFileResults()
})

watch([typeFilter, timestampFilter, playerFilter, groupFilter, prefixFilter, tagsFilter, ownershipFilter, hiddenFilter], () => {
  updateEntryResults()
})

function importFiles() {
  useFilePicker({ accept: '.har,.json', multiple: true, callback: (files) => void readFiles(files) })
}

function show(params: StatsShowParams = {}) {
  selectedEntries.value = new Map()
  selectedFiles.value = new Set()

  lastSelectedTimestamp = null
  lastSelectedEntry = null

  if (lastChange != DatabaseManager.LastChange || params.forceUpdate) {
    lastChange = DatabaseManager.LastChange

    if (advanced.value) {
      updateEntryLists()
    } else {
      updateFileList()
    }
  }
}

function highlightExpression(value: string) {
  return { html: Highlighter.expression(value, undefined, EXPRESSION_CONFIG).text }
}

function updateFileList() {
  const currentTags = Object.keys(DatabaseManager.getTagsForTimestamp())

  if (currentTags.length > 1 || (currentTags.length == 1 && currentTags[0] !== 'undefined')) {
    fileTags.value = currentTags.filter((name) => name !== 'undefined')

    if (tagFilter.value !== '' && tagFilter.value !== undefined && !currentTags.includes(tagFilter.value)) {
      tagFilter.value = undefined
    }
  } else {
    fileTags.value = []
    tagFilter.value = undefined
  }

  updateFileResults()
}

function updateFileResults() {
  const timestamps = Site.options.groups_empty ? Array.from(DatabaseManager.Timestamps.keys()) : DatabaseManager.PlayerTimestamps

  let files = timestamps
    .map((timestamp): FileListEntry => {
      let playerCount = 0
      let groupCount = 0

      for (const identifier of DatabaseManager.Timestamps.values(timestamp)) {
        if (DatabaseManager.isPlayer(identifier)) {
          playerCount++
        } else {
          groupCount++
        }
      }

      const tagMap = DatabaseManager.getTagsForTimestamp([timestamp])
      const tags = Object.entries(tagMap)
        .sort(([, a], [, b]) => b - a)
        .map(([name, count]) => ({ name, label: `${count !== playerCount + groupCount ? `${count}x ` : ''}${name}` }))

      return {
        timestamp,
        date: formatDate(timestamp),
        playerCount,
        groupCount,
        version: DatabaseManager.findDataFieldFor(timestamp, 'version'),
        tagList: Object.keys(tagMap),
        tags,
        hidden: Boolean(DatabaseManager.isHidden({ timestamp } as RawEntity))
      }
    })
    .filter(({ tagList }) => tagFilter.value === undefined || tagList.includes(tagFilter.value) || (tagList.length === 0 && tagFilter.value === ''))

  const expression = expressionFilter.value

  if (expression && expression.isValid()) {
    files = files.filter(({ tagList, timestamp, version }) => expression.eval(new ExpressionScope().addSelf(Object.assign(DatabaseManager.getFile(null, [timestamp]), { timestamp, version, tags: tagList }))))
  }

  fileList.value = files.sort((a, b) => b.timestamp - a.timestamp)
}

function updateEntryLists() {
  const prefixMap = toRecord(DatabaseManager.Prefixes, (prefix) => [prefix, formatPrefix(prefix)])
  const timeMap = toRecord(Array.from(DatabaseManager.Timestamps.keys()), (timestamp) => [timestamp, formatDate(timestamp)])
  const playerMap = DatabaseManager.PlayerNames
  const groupMap: Record<string, string> = { 0: localize('filters.none'), ...DatabaseManager.GroupNames }

  const tags = Object.keys(DatabaseManager.getTagsForTimestamp()).filter((tag) => tag !== 'undefined')

  const playerNameFrequency = countNames(Object.values(playerMap))
  const groupNameFrequency = countNames(Object.entries(groupMap).flatMap(([id, name]) => (id == '0' ? [] : [name])))

  timestampOptions.value = Object.entries(timeMap)
    .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
    .map(([value, label]) => ({ value, label }))

  playerOptions.value = Object.entries(playerMap).map(([value, name]) => ({ value, label: `${name}${playerNameFrequency[name] > 1 ? ` - ${formatPrefix(value)}` : ''}` }))
  groupOptions.value = Object.entries(groupMap).map(([value, name]) => ({ value, label: `${name}${groupNameFrequency[name] > 1 ? ` - ${formatPrefix(value)}` : ''}` }))
  prefixOptions.value = Object.entries(prefixMap).map(([value, label]) => ({ value, label }))
  tagOptions.value = [{ value: 'undefined', label: localize('tags.none') }, ...tags.map((tag) => ({ value: tag, label: tag }))]

  typeFilter.value = '0'
  timestampFilter.value = []
  playerFilter.value = []
  groupFilter.value = []
  prefixFilter.value = []
  tagsFilter.value = []
  ownershipFilter.value = '0'
  hiddenFilter.value = []

  updateEntryResults()
}

function countNames(names: string[]) {
  const frequency: Record<string, number> = {}

  for (const name of names) {
    frequency[name] = (frequency[name] ?? 0) + 1
  }

  return frequency
}

function updateEntryResults() {
  const prefixes = prefixFilter.value
  const groupIdentifiers = groupFilter.value.map((value) => (value !== '0' ? value : undefined))
  const playerIdentifiers = playerFilter.value
  const timestamps = timestampFilter.value.map((value) => parseInt(value))
  const ownership = parseInt(ownershipFilter.value)
  const hidden = hiddenFilter.value
  const hiddenAllowed = Site.options.hidden
  const tags = tagsFilter.value
  const type = parseInt(typeFilter.value)

  const { players, groups } = DatabaseManager.getFile(null, null, (data) => {
    const isPlayer = DatabaseManager.isPlayer(data.identifier)

    return (
      (prefixes.length === 0 || prefixes.includes(data.prefix)) &&
      (playerIdentifiers.length === 0 || (isPlayer && playerIdentifiers.includes(DatabaseManager.getLink(data.identifier) as string))) &&
      (groupIdentifiers.length === 0 || groupIdentifiers.includes(DatabaseManager.getLink(isPlayer ? data.group : data.identifier))) &&
      (timestamps.length === 0 || timestamps.includes(data.timestamp)) &&
      (tags.length === 0 || toArray(data.tag).some((tag) => tags.includes(tag))) &&
      (!ownership || Number(data.own) != ownership - 1) &&
      (!type || Number(isPlayer) != type - 1) &&
      (!hiddenAllowed || hidden.length === 0 || (Boolean(data.hidden) && hidden.includes('yes')) || (!data.hidden && hidden.includes('no')))
    )
  })

  const entries: RawEntity[] = [...players, ...groups]

  currentEntries = toRecord(entries, (entry) => [getEntryKey(entry), entry])

  const groupNames: Record<string, string> = { 0: localize('filters.none'), ...DatabaseManager.GroupNames }

  entryList.value = entries
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((entry) => {
      const isPlayer = DatabaseManager.isPlayer(entry.identifier)

      return {
        key: getEntryKey(entry),
        date: formatDate(entry.timestamp),
        prefix: formatPrefix(entry.prefix),
        player: isPlayer,
        name: entry.name,
        group: isPlayer ? groupNames[entry.group ?? ''] || '' : '',
        tags: toArray(entry.tag),
        hidden: Boolean(entry.hidden)
      }
    })
}

function markFile(timestamp: number, range: boolean) {
  const selection = new Set(selectedFiles.value)

  if (range && lastSelectedTimestamp && lastSelectedTimestamp != timestamp) {
    const change = getRange(
      fileList.value.map((file) => file.timestamp),
      lastSelectedTimestamp,
      timestamp
    )

    if (selection.has(timestamp)) {
      change.forEach((value) => selection.delete(value))
    } else {
      change.forEach((value) => selection.add(value))
    }
  } else if (selection.has(timestamp)) {
    selection.delete(timestamp)
  } else {
    selection.add(timestamp)
  }

  lastSelectedTimestamp = timestamp
  selectedFiles.value = selection
}

function markEntry(key: string, range: boolean) {
  const selection = new Map(selectedEntries.value)

  if (range && lastSelectedEntry && lastSelectedEntry != key) {
    const change = getRange(
      entryList.value.map((entry) => entry.key),
      lastSelectedEntry,
      key
    )

    if (selection.has(key)) {
      change.forEach((value) => selection.delete(value))
    } else {
      change.forEach((value) => selection.set(value, currentEntries[value]))
    }
  } else if (selection.has(key)) {
    selection.delete(key)
  } else {
    selection.set(key, currentEntries[key])
  }

  lastSelectedEntry = key
  selectedEntries.value = selection
}

function getRange<TValue>(values: TValue[], from: TValue, to: TValue) {
  const start = values.indexOf(from)
  const end = values.indexOf(to)

  return values.slice(Math.min(start, end), Math.max(start, end) + 1)
}

function markAll() {
  if (advanced.value) {
    const keys = Object.keys(currentEntries)
    const toMark = keys.filter((key) => !selectedEntries.value.has(key))

    if (toMark.length === 0) {
      selectedEntries.value = new Map([...selectedEntries.value].filter(([key]) => !keys.includes(key)))
    } else {
      selectedEntries.value = new Map([...selectedEntries.value, ...toMark.map((key): [string, RawEntity] => [key, currentEntries[key]])])
    }
  } else {
    const timestamps = fileList.value.map((file) => file.timestamp)
    const toMark = timestamps.filter((timestamp) => !selectedFiles.value.has(timestamp))

    if (toMark.length === 0) {
      selectedFiles.value = new Set([...selectedFiles.value].filter((timestamp) => !timestamps.includes(timestamp)))
    } else {
      selectedFiles.value = new Set([...selectedFiles.value, ...toMark])
    }
  }
}

function editFile(timestamp: number) {
  useDialog(
    FileEditDialog,
    { timestamp },
    {
      callback: (changed) => {
        if (changed) show()
      }
    }
  )
}

function importShared() {
  useDialog(
    ImportFileDialog,
    {},
    {
      callback: (imported) => {
        if (imported) show()
      }
    }
  )
}

function importEndpoint() {
  useDialog(
    EndpointDialog,
    { allowTemporary: false },
    {
      callback: (imported) => {
        if (imported) show()
      }
    }
  )
}

function exportAll() {
  useDialog(ExportFileDialog, { files: () => DatabaseManager.export(), filesPrefix: 'files' })
}

function exportSelected() {
  if (!advanced.value) {
    if (selectedFiles.value.size === 0) return

    const timestamps = Array.from(selectedFiles.value)

    useDialog(ExportFileDialog, { files: () => DatabaseManager.export(undefined, timestamps), filesPrefix: 'files' })
  } else {
    if (selectedEntries.value.size === 0) return

    const players: RawPlayer[] = []
    const groups: RawGroup[] = []

    for (const entry of selectedEntries.value.values()) {
      if (DatabaseManager.isPlayer(entry.identifier)) {
        players.push(entry as RawPlayer)
      } else {
        groups.push(entry as RawGroup)
      }
    }

    useDialog(ExportFileDialog, { files: () => ({ players, groups: DatabaseManager.relatedGroupData(players, groups, Site.options.export_bundle_groups) }), filesPrefix: 'files' })
  }
}

function tagSelected() {
  const callback = (changed: boolean) => {
    if (changed) show()
  }

  if (!advanced.value) {
    if (selectedFiles.value.size > 0) {
      useDialog(TagDialog, { timestamps: Array.from(selectedFiles.value) }, { callback })
    }
  } else if (selectedEntries.value.size > 0) {
    const instances = Array.from(selectedEntries.value.values())

    if (instances.some((entry) => DatabaseManager.isPlayer(entry.identifier))) {
      useDialog(TagDialog, { instances }, { callback })
    }
  }
}

async function runWithLoader(action: () => Promise<unknown>) {
  loader.start()

  try {
    await action()
  } finally {
    loader.stop()
  }

  show()
}

function deleteAll() {
  useDialog(
    DeleteAllDialog,
    {},
    {
      callback: (accepted) => {
        if (accepted) void runWithLoader(() => DatabaseManager.purge())
      }
    }
  )
}

async function deleteSelected() {
  if (!advanced.value) {
    if (selectedFiles.value.size > 0 && (await safeRemove({ timestamps: Array.from(selectedFiles.value) }))) {
      show()
    }
  } else if (selectedEntries.value.size > 0 && (await safeRemove({ instances: Array.from(selectedEntries.value.values()) }))) {
    show()
  }
}

function mergeSelected() {
  const timestamps = advanced.value ? unique(Array.from(selectedEntries.value.values()).map((entry) => entry.timestamp)) : Array.from(selectedFiles.value)

  if (timestamps.length > 1) {
    void runWithLoader(() => DatabaseManager.merge(timestamps))
  }
}

function hideSelected() {
  if (advanced.value) {
    void runWithLoader(() => DatabaseManager.hide(Array.from(selectedEntries.value.values())))
  } else {
    void runWithLoader(() => DatabaseManager.hideTimestamps(...Array.from(selectedFiles.value)))
  }
}

function migrateHidden() {
  void runWithLoader(() => DatabaseManager.migrateHiddenFiles())
}
</script>
