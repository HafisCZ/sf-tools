<template>
  <div ref="root-ref">
    <div class="mb-[0.25rem] grid grid-cols-16 gap-x-[28px] pb-[14px]">
      <div class="col-span-5">
        <TimestampSelect v-model:timestamp="timestamp" v-model:reference="reference" :options="timestampOptions" @change="recalculateFilter" />
      </div>
      <div class="col-span-8">
        <FilterInput v-model="filter" :placeholder="localize('filters.types.groups')" :filters="filterDescriptions" @change="applyFilter" />
      </div>
      <div class="col-span-3 flex items-start gap-1">
        <SFTooltip :content="localize('copy.image')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('copy.image')" :disabled="isSaving && 'loading'" @click="saveImage">
            <SFIcon name="file-image" />
          </SFButton>
        </SFTooltip>
        <SFTooltip :content="localize('copy.csv')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('copy.csv')" @click="saveCSV">
            <SFIcon name="file-excel" />
          </SFButton>
        </SFTooltip>
        <SFTooltip :content="localize('copy.basic')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('copy.basic')" @click="copyTable">
            <SFIcon name="copy-solid" />
          </SFButton>
        </SFTooltip>
        <SFTooltip :content="localize('guilds.empty')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('guilds.empty')" :aria-pressed="empty" :class="{ 'text-accent!': empty }" @click="toggleEmpty">
            <SFIcon name="eraser" />
          </SFButton>
        </SFTooltip>
        <SFTooltip :content="localize('browse.hidden')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('browse.hidden')" :aria-pressed="hidden" :class="{ 'text-accent!': hidden }" @click="toggleHidden">
            <SFIcon name="eye-low-vision" />
          </SFButton>
        </SFTooltip>
        <ScriptButton identifier="groups" table="groups" :assigned="assigned" :override="scriptOverride" @swap="swapScript" />
      </div>
    </div>
    <table ref="base-table-ref" class="sftools-table" />
    <table ref="query-table-ref" class="sftools-table" />
    <ContextMenu ref="menu-ref" :items="menuItems" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFIcon from '@library/SFIcon.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { type SelectOption } from '@utils/components'
import { useDialog } from '@utils/dialogs'
import { formatDate } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { copyElement, toArray, toRecord, unique, useSubmit } from '@utils/utils'
import { SiteAPI } from '~/core/api'
import { Exporter } from '~/core/exporter'
import { type GroupModel } from '~/core/models/group'
import { Site } from '~/core/site'
import { DatabaseManager, type RemovalData } from '~/data/database-manager'
import ContextMenu from '~/pages/stats/components/ContextMenu.vue'
import FilterInput from '~/pages/stats/components/FilterInput.vue'
import ScriptButton from '~/pages/stats/components/ScriptButton.vue'
import TimestampSelect from '~/pages/stats/components/TimestampSelect.vue'
import ExportFileDialog from '~/pages/stats/dialogs/ExportFileDialog.vue'
import { safeRemove, useStatsNavigation, type ContextMenuItem } from '~/pages/stats/stats'
import { TableType } from '~/script/commands'
import { Expression, ExpressionScope } from '~/script/expression'
import { type ScriptEntity } from '~/script/script'
import { Scripts } from '~/script/scripts'
import { BrowseTableArray, TableController } from '~/script/table'

defineOptions({
  name: 'GroupsView'
})

defineExpose({
  show,
  reload,
  identifier: 'groups'
})

type Term = (group: GroupModel, timestamp: number, reference: number) => unknown

const FILTER_KEYS = ['g', 's', 'e', '#', 'l', 'f', 'r', 'h', 'o', 'sr', 'q', 't']

const localize = useLocalize('stats')

const navigation = useStatsNavigation()

const rootElement = useTemplateRef('root-ref')
const baseTableElement = useTemplateRef('base-table-ref')
const queryTableElement = useTemplateRef('query-table-ref')
const menu = useTemplateRef('menu-ref')

const filter = ref('')
const hidden = ref(Site.options.browse_hidden)
const empty = ref(Site.options.groups_empty)
const assigned = ref(false)
const scriptOverride = ref<string | null>(null)
const timestamp = ref(0)
const reference = ref(0)
const timestampOptions = ref<SelectOption<number>[]>([])

const scriptCache: Record<string, string> = {}

let baseTable: TableController
let queryTable: TableController
let table: TableController

let recalculate = false
let showHiddenOverride = false

const filterDescriptions = computed(() => toRecord(FILTER_KEYS, (key) => [key, localize(`filters.${key}`)]))

const menuItems = computed((): ContextMenuItem[] => [
  {
    label: localize('context.hide'),
    action: (source) => {
      const selected = getSelectedElements()

      for (const element of selected.length ? selected : [source]) {
        DatabaseManager.hideIdentifier(element.dataset.id as string)
      }

      void applyFilter()
    }
  },
  {
    label: localize('share.title_short'),
    action: (source) => {
      const identifiers = unique([...getSelectedElements().map((element) => element.dataset.id as string), source.dataset.id as string])
      const members = identifiers.flatMap((identifier) => DatabaseManager.Groups[identifier].List.flatMap((group) => group.Members))

      useDialog(ExportFileDialog, { files: () => DatabaseManager.export(unique([...identifiers, ...members])), filesPrefix: 'groups' })
    }
  },
  {
    label: localize('context.remove_current'),
    action: (source) => {
      const selected = getSelectedElements()
      const instances = (selected.length ? selected : [source]).map((element) => (DatabaseManager.getGroup(element.dataset.id, element.dataset.ts) as GroupModel).Data)

      void removeEntries({ instances })
    }
  },
  {
    label: localize('context.remove'),
    action: (source) => {
      const selected = getSelectedElements()
      const identifiers = (selected.length ? selected : [source]).map((element) => element.dataset.id as string)

      void removeEntries({ identifiers })
    }
  }
])

const { submit: saveImage, isSubmitting: isSaving } = useSubmit(async () => {
  const blob = await table.toImage()

  if (blob) {
    Exporter.png(blob, `groups.${timestamp.value}`)
  }
})

onMounted(() => {
  baseTable = createTable(baseTableElement.value as HTMLTableElement)
  queryTable = createTable(queryTableElement.value as HTMLTableElement)
  table = baseTable

  document.addEventListener('keyup', clearSelectionOnControl)
})

onBeforeUnmount(() => {
  document.removeEventListener('keyup', clearSelectionOnControl)
})

function createTable(element: HTMLTableElement) {
  const controller = new TableController(element, TableType.Groups)

  controller.subscribe('inject', (node) => {
    for (const clickableElement of node.querySelectorAll<HTMLElement>('[data-id]')) {
      clickableElement.addEventListener('click', (event) => {
        if (event.ctrlKey) {
          clickableElement.classList.toggle('css-op-select')
        } else {
          navigation.show('group', { identifier: clickableElement.dataset.id })
        }
      })

      clickableElement.addEventListener('mousedown', (event) => {
        event.preventDefault()
      })

      clickableElement.addEventListener('contextmenu', (event) => {
        event.preventDefault()
        event.stopPropagation()

        menu.value?.open(clickableElement)
      })
    }
  })

  return controller
}

function clearSelectionOnControl(event: KeyboardEvent) {
  if (event.key === 'Control' && navigation.current === 'groups') {
    for (const element of getSelectedElements()) {
      element.classList.remove('css-op-select')
    }
  }
}

function getSelectedElements() {
  return Array.from(rootElement.value?.querySelectorAll<HTMLElement>('[data-id].css-op-select') ?? [])
}

async function removeEntries(data: RemovalData) {
  if (await safeRemove(data)) {
    await applyFilter()
  }
}

async function getRemoteScript(code: string) {
  if (!(code in scriptCache)) {
    scriptCache[code] = (await SiteAPI.get<{ script: { content: string } }>('script_get', { key: code.trim() })).script.content
  }

  return scriptCache[code]
}

async function applyFilter() {
  const parts = filter.value.split(/(?:\s|\b|^)(g|s|e|l|f|r|h|o|sr|q|t|#):/)

  const baseTerms = parts[0]
    .toLowerCase()
    .split('&')
    .map((term) => term.trim())

  const terms: Term[] = [(group) => baseTerms.every((term) => term.split('|').some((subterm) => group.Name.toLowerCase().includes(subterm.trim()) || group.Prefix.toLowerCase().includes(subterm.trim())))]

  let entryLimit: number | undefined
  let externalSort: ((current: ScriptEntity, compare: ScriptEntity) => number) | undefined
  let queryEnabled = false

  showHiddenOverride = false

  for (let i = 1; i < parts.length; i += 2) {
    const key = parts[i]
    const arg = (parts[i + 1] || '').trim()
    const args = arg
      .toLowerCase()
      .split('|')
      .map((term) => term.trim())

    if (key == 'g') {
      terms.push((group) => args.some((term) => group.Name.toLowerCase().includes(term)))
    } else if (key == 's') {
      terms.push((group) => args.some((term) => group.Prefix.toLowerCase().includes(term)))
    } else if (key == '#') {
      const tags = arg.split('|').map((term) => term.trim())

      terms.push((group) => group.Data.tag && toArray(group.Data.tag).some((tag) => tags.includes(tag)))
    } else if (key == 'l') {
      terms.push((group, currentTimestamp) => group.Timestamp == currentTimestamp)

      recalculate = true
    } else if (key == 'e') {
      const expression = Expression.create(arg)

      if (expression) {
        terms.push((group, currentTimestamp, compare) => expression.eval(new ExpressionScope().with(group, compare)))
      }
    } else if (key == 'sr') {
      const expression = Expression.create(arg)

      if (expression) {
        externalSort = (group, compare) => expression.eval(new ExpressionScope().with(group, compare)) as number
      }
    } else if (key == 'f') {
      entryLimit = isNaN(Number(arg)) ? 1 : Math.max(1, Number(arg))
    } else if (key == 'r') {
      recalculate = true
    } else if (key == 'h') {
      showHiddenOverride = true
    } else if (key == 'o') {
      terms.push((group) => DatabaseManager.getPlayer(group.LinkId)?.Own)

      recalculate = true
      showHiddenOverride = true
    } else if (key == 'q' && arg.length) {
      queryEnabled = true
      recalculate = true

      table.clearSorting()

      table = queryTable
      table.setScript(`category${arg.split(',').reduce((content, header) => `${content}\nheader ${header.trim()}`, '')}`)
    } else if (key == 't' && arg.length) {
      const script = await getRemoteScript(arg.trim())

      if (script) {
        queryEnabled = true
        recalculate = true

        table.clearSorting()

        table = queryTable
        table.setScript(script)
      }
    }
  }

  if (!queryEnabled) {
    table = baseTable
  }

  const entries = new BrowseTableArray({
    entryLimit,
    timestamp: timestamp.value,
    reference: reference.value,
    externalSort,
    suppressUpdate: !recalculate
  })

  for (const [identifier, { List: inputList }] of Object.entries(DatabaseManager.Groups)) {
    const list = Site.options.groups_empty ? inputList : inputList.filter((group) => group.MembersPresent)

    const isHidden = DatabaseManager.isIdentifierHidden(identifier)

    if (hidden.value || showHiddenOverride || !isHidden) {
      const current = list.find((entry) => entry.Timestamp <= timestamp.value)

      if (current) {
        const currentTimestamp = current.Timestamp

        const compare = [...list].reverse().find((entry) => entry.Timestamp >= reference.value && entry.Timestamp <= currentTimestamp) || current
        const compareTimestamp = compare.Timestamp

        if (terms.every((term) => term(current, timestamp.value, compareTimestamp))) {
          entries.add(current, compare, currentTimestamp == timestamp.value, isHidden)
        }
      }
    }
  }

  table.setEntries(entries)

  refresh()

  recalculate = false
}

function recalculateFilter() {
  recalculate = true

  void applyFilter()
}

function refresh() {
  baseTable.element.style.display = table === baseTable ? '' : 'none'
  queryTable.element.style.display = table === queryTable ? '' : 'none'

  table.refresh()
}

function show() {
  timestamp.value = DatabaseManager.LatestGroup
  reference.value = DatabaseManager.LatestGroup

  baseTable.resetInjector()
  queryTable.resetInjector()

  timestampOptions.value = DatabaseManager.GroupTimestamps.map(Number)
    .sort((a, b) => b - a)
    .map((value) => ({ value, label: formatDate(value) }))

  load()
}

function load() {
  assigned.value = Scripts.isAssigned('groups')

  table.setScript(Scripts.getAssignedContent('groups', 'groups'))

  scriptOverride.value = null

  recalculateFilter()
}

function reload() {
  load()
}

function swapScript(key: string) {
  if (scriptOverride.value == key) {
    scriptOverride.value = null

    table.setScript(Scripts.getAssignedContent('groups', 'groups'))
  } else {
    scriptOverride.value = key

    table.setScript(Scripts.getContent(key))
  }

  recalculateFilter()
}

function toggleHidden() {
  Site.options.browse_hidden = hidden.value = !hidden.value

  recalculateFilter()
}

function toggleEmpty() {
  Site.options.groups_empty = !Site.options.groups_empty
  empty.value = Site.options.groups_empty

  recalculateFilter()
}

function copyTable() {
  table.forceInject()

  copyElement(table.element)
}

async function saveCSV() {
  Exporter.csv(await table.toCSV(), `groups.${timestamp.value}`)
}
</script>
