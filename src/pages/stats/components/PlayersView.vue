<template>
  <div ref="root-ref">
    <div class="mb-[0.25rem] grid grid-cols-16 gap-x-[28px] pb-[14px]">
      <div class="col-span-5">
        <TimestampSelect v-model:timestamp="timestamp" v-model:reference="reference" :options="timestampOptions" @change="recalculateFilter" />
      </div>
      <div class="col-span-8">
        <FilterInput v-model="filter" :placeholder="localize('filters.types.players')" :language="language" @change="applyFilter" />
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
        <SFTooltip :content="localize('copy.fight')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('copy.fight')" @click="copySimulator">
            <SFIcon name="copy" />
          </SFButton>
        </SFTooltip>
        <SFTooltip :content="localize('browse.hidden')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('browse.hidden')" :aria-pressed="hidden" :class="{ 'text-accent!': hidden }" @click="toggleHidden">
            <SFIcon name="eye-low-vision" />
          </SFButton>
        </SFTooltip>
        <ScriptButton identifier="players" table="players" :assigned="assigned" :override="scriptOverride" @swap="swapScript" />
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
import { copyElement, copyJson, unique, useSubmit } from '@utils/utils'
import { SiteAPI } from '~/core/api'
import { Exporter } from '~/core/exporter'
import { type PlayerModel } from '~/core/models/player'
import { ModelUtils } from '~/core/models/utils'
import { Site } from '~/core/site'
import { DatabaseManager, type RemovalData } from '~/data/database-manager'
import ContextMenu from '~/pages/stats/components/ContextMenu.vue'
import FilterInput from '~/pages/stats/components/FilterInput.vue'
import ScriptButton from '~/pages/stats/components/ScriptButton.vue'
import TimestampSelect from '~/pages/stats/components/TimestampSelect.vue'
import ExportFileDialog from '~/pages/stats/dialogs/ExportFileDialog.vue'
import PlayerDetailDialog from '~/pages/stats/dialogs/PlayerDetailDialog.vue'
import { createPlayerQueryLanguage, createPlayerQueryTarget, safeRemove, useStatsNavigation, type ContextMenuItem, type StatsShowParams } from '~/pages/stats/stats'
import { TableType } from '~/script/commands'
import { ExpressionScope } from '~/script/expression'
import { matchesQuery, parseQuery } from '~/script/query'
import { type ScriptEntity } from '~/script/script'
import { Scripts } from '~/script/scripts'
import { BrowseTableArray, TableController } from '~/script/table'

defineOptions({
  name: 'PlayersView'
})

defineExpose({
  show,
  reload,
  identifier: 'players'
})

const localize = useLocalize('stats')

const navigation = useStatsNavigation()

const rootElement = useTemplateRef('root-ref')
const baseTableElement = useTemplateRef('base-table-ref')
const queryTableElement = useTemplateRef('query-table-ref')
const menu = useTemplateRef('menu-ref')

const filter = ref('')
const hidden = ref(Site.options.browse_hidden)
const assigned = ref(false)
const scriptOverride = ref<string | null>(null)
const timestamp = ref(0)
const reference = ref(0)
const timestampOptions = ref<SelectOption<number>[]>([])

const language = createPlayerQueryLanguage(true)

const scriptCache: Record<string, string> = {}

let baseTable: TableController
let queryTable: TableController
let table: TableController

let recalculate = false
let showHiddenOverride = false
let lastDatabaseChange: number | undefined
let lastScriptChange: number | undefined

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
    label: localize('copy.player'),
    action: (source) => {
      const selected = getSelectedElements()

      void copyJson(selected.length ? selected.map((element) => ModelUtils.toSimulatorData(getElementPlayer(element))) : ModelUtils.toSimulatorData(getElementPlayer(source)))
    }
  },
  {
    label: localize('copy.player_companions'),
    action: (source) => void copyJson(ModelUtils.toSimulatorData(getElementPlayer(source), true))
  },
  {
    label: localize('share.title_short'),
    action: (source) => {
      const identifiers = unique([...getSelectedElements().map((element) => element.dataset.id as string), source.dataset.id as string])

      useDialog(ExportFileDialog, { files: () => DatabaseManager.export(identifiers), filesPrefix: 'players' })
    }
  },
  {
    label: localize('context.remove_current'),
    action: (source) => {
      const selected = getSelectedElements()
      const instances = (selected.length ? selected : [source]).map((element) => getElementPlayer(element).Data)

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
    Exporter.png(blob, `players.${timestamp.value}`)
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
  const controller = new TableController(element, TableType.Players)

  controller.subscribe('inject', (node) => {
    for (const clickableElement of node.querySelectorAll<HTMLElement>('[data-id]')) {
      clickableElement.addEventListener('click', (event) => {
        if (event.ctrlKey) {
          clickableElement.classList.toggle('css-op-select')
        } else {
          useDialog(PlayerDetailDialog, { identifier: clickableElement.dataset.id as string, timestamp: timestamp.value, reference: reference.value || timestamp.value })
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
  if (event.key === 'Control' && navigation.current === 'players') {
    for (const element of getSelectedElements()) {
      element.classList.remove('css-op-select')
    }
  }
}

function getSelectedElements() {
  return Array.from(rootElement.value?.querySelectorAll<HTMLElement>('[data-id].css-op-select') ?? [])
}

function getElementPlayer(element: HTMLElement) {
  return DatabaseManager.getPlayer(element.dataset.id as string, element.dataset.ts) as PlayerModel
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
  const { root, options } = parseQuery(filter.value, language)

  let externalSort: ((current: ScriptEntity, compare: ScriptEntity) => number) | undefined
  let queryEnabled = false

  showHiddenOverride = Boolean(options.hidden || options.own)

  if (options.latest || options.recalculate || options.own) {
    recalculate = true
  }

  if (options.sort) {
    const { expression, descending } = options.sort

    externalSort = (player, compare) => (descending ? 1 : -1) * (expression.eval(new ExpressionScope().with(player, compare)) as number)
  }

  if (options.columns) {
    queryEnabled = true
    recalculate = true

    table.clearSorting()

    table = queryTable
    table.setScript(`category${options.columns.map((header) => `\nheader ${header}`).join('')}`)
  }

  if (options.template) {
    const script = await getRemoteScript(options.template)

    if (script) {
      queryEnabled = true
      recalculate = true

      table.clearSorting()

      table = queryTable
      table.setScript(script)
    }
  }

  if (!queryEnabled) {
    table = baseTable
  }

  const entries = new BrowseTableArray({
    entryLimit: options.first,
    timestamp: timestamp.value,
    reference: reference.value,
    externalSort,
    suppressUpdate: !recalculate
  })

  for (const [identifier, { List: list }] of Object.entries(DatabaseManager.Players)) {
    const isHidden = DatabaseManager.isIdentifierHidden(identifier)

    if (hidden.value || showHiddenOverride || !isHidden) {
      const currentPlayer = list.find((entry) => entry.Timestamp <= timestamp.value)

      if (currentPlayer) {
        const currentTimestamp = currentPlayer.Timestamp

        const comparePlayer = [...list].reverse().find((entry) => entry.Timestamp >= reference.value && entry.Timestamp <= currentTimestamp) || currentPlayer
        const compareTimestamp = comparePlayer.Timestamp

        const player = DatabaseManager.loadPlayer(currentPlayer)

        if (
          (!options.latest || currentTimestamp == timestamp.value) &&
          (!options.own || DatabaseManager.getPlayer(player.LinkId)?.Own) &&
          matchesQuery(
            root,
            createPlayerQueryTarget(player, (expression) => expression.eval(new ExpressionScope().with(player, compareTimestamp)))
          )
        ) {
          entries.add(player, DatabaseManager.loadPlayer(comparePlayer), currentTimestamp == timestamp.value, isHidden)
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

function show(params: StatsShowParams) {
  const unchanged = lastDatabaseChange === DatabaseManager.LastChange && lastScriptChange === Scripts.LastChange

  if (params.origin?.view !== 'players' && unchanged) {
    return
  }

  lastDatabaseChange = DatabaseManager.LastChange
  lastScriptChange = Scripts.LastChange

  timestamp.value = DatabaseManager.LatestPlayer
  reference.value = DatabaseManager.LatestPlayer

  baseTable.resetInjector()
  queryTable.resetInjector()

  timestampOptions.value = [...DatabaseManager.PlayerTimestamps].sort((a, b) => b - a).map((value) => ({ value, label: formatDate(value) }))

  load()
}

function load() {
  assigned.value = Scripts.isAssigned('players')

  table.setScript(Scripts.getAssignedContent('players', 'players'))

  scriptOverride.value = null

  recalculateFilter()
}

function reload() {
  load()
}

function swapScript(key: string) {
  if (scriptOverride.value == key) {
    scriptOverride.value = null

    table.setScript(Scripts.getAssignedContent('players', 'players'))
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

function copyTable() {
  table.forceInject()

  copyElement(table.element)
}

function copySimulator() {
  let entries = table.getInternalEntries()

  const limit = table.getArray().entryLimit || table.getEntryLimit()
  if (limit) {
    entries = entries.slice(0, limit)
  }

  void copyJson(entries.map((entry) => ModelUtils.toSimulatorData(entry.current as PlayerModel)))
}

async function saveCSV() {
  Exporter.csv(await table.toCSV(), `players.${timestamp.value}`)
}
</script>
