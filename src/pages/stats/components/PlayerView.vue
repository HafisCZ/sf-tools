<template>
  <div>
    <div class="mb-[0.25rem] grid grid-cols-16 gap-x-[28px] pb-[14px]">
      <div class="col-span-10 col-start-4 text-center">
        <SFHeading level="2" class="leading-none">{{ name }}</SFHeading>
        <span class="opacity-50">{{ links }}</span>
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
        <SFTooltip :content="localize('share.title_short')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('share.title_short')" @click="exportFile">
            <SFIcon name="share-nodes" />
          </SFButton>
        </SFTooltip>
        <SFTooltip :content="localize('copy.basic')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('copy.basic')" @click="copyTable">
            <SFIcon name="copy-solid" />
          </SFButton>
        </SFTooltip>
        <ScriptButton :identifier="identifier" table="player" :assigned="assigned" :override="scriptOverride" @swap="swapScript" />
      </div>
    </div>
    <table ref="table-ref" class="sftools-table" />
    <ContextMenu ref="menu-ref" :items="menuItems" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { useDialog } from '@utils/dialogs'
import { useLocalize } from '@utils/localization'
import { copyElement, copyJson, useSubmit } from '@utils/utils'
import { DatabaseManager, type PlayerHistory } from '~/data/database-manager'
import { ModelUtils } from '~/data/model-utils'
import { type PlayerModel } from '~/data/player-model'
import ContextMenu from '~/pages/stats/components/ContextMenu.vue'
import ScriptButton from '~/pages/stats/components/ScriptButton.vue'
import ExportFileDialog from '~/pages/stats/dialogs/ExportFileDialog.vue'
import PlayerDetailDialog from '~/pages/stats/dialogs/PlayerDetailDialog.vue'
import { type ContextMenuItem, type StatsShowParams } from '~/pages/stats/stats'
import { TableType } from '~/script/commands'
import { Scripts } from '~/script/scripts'
import { PlayerTableArray, TableController } from '~/script/table'
import { Exporter } from '~/site/exporter'

defineOptions({
  name: 'PlayerView'
})

defineExpose({
  show,
  reload,
  get identifier() {
    return identifier.value
  }
})

const localize = useLocalize('stats')

const tableElement = useTemplateRef('table-ref')
const menu = useTemplateRef('menu-ref')

const identifier = ref('')
const name = ref('')
const links = ref('')
const assigned = ref(false)
const scriptOverride = ref<string | null>(null)

let table: TableController
let list: PlayerModel[] = []
let player: PlayerModel | undefined
let array = new PlayerTableArray()

const menuItems = computed((): ContextMenuItem[] => [
  { label: localize('copy.player'), action: (source) => void copyJson(ModelUtils.toSimulatorData(getSourcePlayer(source))) },
  { label: localize('copy.player_companions'), action: (source) => void copyJson(ModelUtils.toSimulatorData(getSourcePlayer(source), true)) }
])

const { submit: saveImage, isSubmitting: isSaving } = useSubmit(async () => {
  const blob = await table.toImage()

  if (blob) {
    Exporter.png(blob, `${player?.Name}.${Exporter.time}`)
  }
})

onMounted(() => {
  table = new TableController(tableElement.value as HTMLTableElement, TableType.Player)
  table.subscribe('inject', (element) => {
    const clickableElements = Array.from(element.querySelectorAll<HTMLElement>('[data-id]'))

    for (const clickableElement of clickableElements) {
      clickableElement.addEventListener('click', () => {
        const { id, ts } = clickableElement.dataset

        useDialog(PlayerDetailDialog, { identifier: id as string, timestamp: Number(ts), reference: Number(ts) })
      })

      clickableElement.addEventListener('contextmenu', (event) => {
        event.preventDefault()
        event.stopPropagation()

        menu.value?.open(clickableElement)
      })
    }
  })
})

function getSourcePlayer(source: HTMLElement) {
  return DatabaseManager.getPlayer(source.dataset.id as string, source.dataset.ts) as PlayerModel
}

function show(params: StatsShowParams) {
  identifier.value = params.identifier as string

  const history = DatabaseManager.getPlayer(identifier.value) as PlayerHistory

  list = history.List
  player = history.Latest

  array = new PlayerTableArray()
  for (let i = 0; i < list.length; i++) {
    array.add(list[i], list[i + 1] || list[i])
  }

  name.value = player.Name

  const linkedIdentifiers = DatabaseManager.getLinkedIdentifiers(identifier.value)
  links.value = linkedIdentifiers.length === 1 ? linkedIdentifiers[0] : linkedIdentifiers.join(' / ')

  load()
}

function load() {
  scriptOverride.value = null

  table.setScript(Scripts.getAssignedContent(identifier.value, 'player'))

  for (const entry of array) {
    DatabaseManager.loadPlayer(entry.current as PlayerModel)
  }

  assigned.value = Scripts.isAssigned(identifier.value)

  refresh()
}

function refresh() {
  table.setEntries(array)
  table.refresh()
}

function reload() {
  load()
}

function swapScript(key: string) {
  if (scriptOverride.value == key) {
    scriptOverride.value = ''

    table.setScript(Scripts.getAssignedContent(identifier.value, 'player'))
  } else {
    scriptOverride.value = key

    table.setScript(Scripts.getContent(key))
  }

  refresh()
}

function copyTable() {
  table.forceInject()

  copyElement(table.element)
}

async function saveCSV() {
  Exporter.csv(await table.toCSV(), `${player?.Name}.${Exporter.time}`)
}

function exportFile() {
  const createExport = (timestamps?: number[]) => () => DatabaseManager.export([identifier.value], timestamps)

  useDialog(ExportFileDialog, {
    files: {
      last: createExport(list.slice(0, 1).map((entry) => entry.Timestamp)),
      last5: createExport(list.slice(0, 5).map((entry) => entry.Timestamp)),
      all: createExport()
    },
    filesPrefix: (DatabaseManager.getAny(identifier.value) as PlayerHistory).Latest.Identifier
  })
}
</script>
