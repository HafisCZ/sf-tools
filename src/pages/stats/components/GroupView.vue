<template>
  <div>
    <div class="mb-[0.25rem] grid grid-cols-16 gap-x-[28px] pb-[14px]">
      <div class="col-span-5">
        <TimestampSelect v-model:timestamp="timestamp" v-model:reference="reference" :options="timestampOptions" @change="load" />
      </div>
      <div class="col-span-6 text-center">
        <SFHeading level="2" class="leading-none">{{ name }}</SFHeading>
        <span class="opacity-50">{{ links }}</span>
      </div>
      <div class="col-span-3 col-start-14 flex items-start gap-1">
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
        <SFTooltip :content="localize('copy.fight')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('copy.fight')" @click="copySimulator">
            <SFIcon name="copy" />
          </SFButton>
        </SFTooltip>
        <ScriptButton :identifier="identifier" table="group" :assigned="assigned" :override="scriptOverride" @swap="swapScript" />
      </div>
    </div>
    <table ref="table-ref" class="sftools-table" />
    <ContextMenu ref="menu-ref" :items="menuItems" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { type SelectOption } from '@utils/components'
import { useDialog } from '@utils/dialogs'
import { formatDate } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { copyJson, useSubmit } from '@utils/utils'
import { Exporter } from '~/core/exporter'
import { type GroupModel } from '~/core/models/group'
import { type PlayerModel } from '~/core/models/player'
import { ModelUtils } from '~/core/models/utils'
import { Site } from '~/core/site'
import { DatabaseManager, type GroupHistory } from '~/data/database-manager'
import ContextMenu from '~/pages/stats/components/ContextMenu.vue'
import ScriptButton from '~/pages/stats/components/ScriptButton.vue'
import TimestampSelect from '~/pages/stats/components/TimestampSelect.vue'
import ExportFileDialog from '~/pages/stats/dialogs/ExportFileDialog.vue'
import PlayerDetailDialog from '~/pages/stats/dialogs/PlayerDetailDialog.vue'
import { type ContextMenuItem, type StatsShowParams } from '~/pages/stats/stats'
import { TableType } from '~/script/commands'
import { Scripts } from '~/script/scripts'
import { GroupTableArray, TableController } from '~/script/table'

defineOptions({
  name: 'GroupView'
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
const timestamp = ref(0)
const reference = ref(0)
const list = shallowRef<GroupModel[]>([])

let table: TableController
let group: GroupHistory | undefined

const timestampOptions = computed((): SelectOption<number>[] =>
  list.value.map((entry) => ({
    value: entry.Timestamp,
    label: formatDate(entry.Timestamp),
    description: entry.MembersPresent >= entry.MembersTotal ? undefined : `${entry.MembersPresent} / ${entry.MembersTotal}`
  }))
)

const menuItems = computed((): ContextMenuItem[] => [
  { label: localize('copy.player'), action: (source) => void copyJson(ModelUtils.toSimulatorData(getSourcePlayer(source))) },
  { label: localize('copy.player_companions'), action: (source) => void copyJson(ModelUtils.toSimulatorData(getSourcePlayer(source), true)) }
])

const { submit: saveImage, isSubmitting: isSaving } = useSubmit(async () => {
  const blob = await table.toImage((element) => {
    const body = element.querySelector('tbody') as HTMLTableSectionElement

    const row = document.createElement('tr')
    row.style.height = '2em'
    row.innerHTML = `<td colspan="${element.dataset.columnCount}" class="text-left" style="padding-left: 8px;">${formatDate(timestamp.value)}${timestamp.value != reference.value ? ` - ${formatDate(reference.value)}` : ''}</td>`

    if (element.classList.contains('sftools-table-fixed')) {
      body.firstElementChild?.after(row)
    } else {
      body.prepend(row)
    }
  })

  if (blob) {
    Exporter.png(blob, getFileName())
  }
})

onMounted(() => {
  table = new TableController(tableElement.value as HTMLTableElement, TableType.Group)
  table.subscribe('change', () => {
    table.bodyElement.insertAdjacentHTML('beforeend', '<tr style="height: 2em;"></tr>')
  })
  table.subscribe('inject', (element) => {
    const clickableElements = Array.from(element.querySelectorAll<HTMLElement>('[data-id]'))

    for (const clickableElement of clickableElements) {
      clickableElement.addEventListener('click', () => {
        useDialog(PlayerDetailDialog, { identifier: clickableElement.dataset.id as string, timestamp: timestamp.value, reference: reference.value || timestamp.value })
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
  return DatabaseManager.getPlayer(source.dataset.id as string, timestamp.value) as PlayerModel
}

function getFileName() {
  return `${group?.Latest.Name}.${timestamp.value}${timestamp.value != reference.value ? `.${reference.value}` : ''}`
}

function getPlayerName(id: string) {
  return DatabaseManager.getPlayer(id, timestamp.value)?.Name ?? (DatabaseManager.getPlayer(id)?.Latest.Name || id)
}

function show(params: StatsShowParams) {
  identifier.value = params.identifier as string
  group = DatabaseManager.getGroup(identifier.value) as GroupHistory

  name.value = group.Latest.Name

  const linkedIdentifiers = DatabaseManager.getLinkedIdentifiers(identifier.value)
  links.value = linkedIdentifiers.length === 1 ? linkedIdentifiers[0] : linkedIdentifiers.join(' / ')

  list.value = Site.options.groups_empty ? group.List : group.List.filter((entry) => entry.MembersPresent)

  timestamp.value = list.value[0]?.Timestamp as number
  reference.value = (Site.options.always_prev ? list.value[1]?.Timestamp : undefined) || timestamp.value

  table.clearSorting()

  load()
}

function load() {
  const history = group as GroupHistory

  scriptOverride.value = null
  assigned.value = Scripts.isAssigned(identifier.value)

  table.setScript(Scripts.getAssignedContent(identifier.value, 'group'))

  const current = history[timestamp.value]
  const compare = history[reference.value]

  const joined = current.Members.filter((id) => !compare.Members.includes(id)).map(getPlayerName)
  const kicked = compare.Members.filter((id) => !current.Members.includes(id)).map(getPlayerName)

  const members: PlayerModel[] = []
  const missing: string[] = []

  for (const { LinkId: linkId, Name: memberName } of current.Players) {
    const player = DatabaseManager.getPlayer(linkId as string, timestamp.value)

    if (player) {
      members.push(player)
    } else {
      missing.push(memberName)
    }
  }

  const membersReferences: PlayerModel[] = []

  for (const member of members) {
    const player = DatabaseManager.getPlayer(member.LinkId)

    if (player) {
      const playerReference = DatabaseManager.getPlayer(member.LinkId, reference.value)

      if (playerReference && playerReference.Group.LinkId == identifier.value) {
        membersReferences.push(playerReference)
      } else {
        const entry = [...player.List].reverse().find((entry) => entry.Timestamp >= reference.value && entry.Timestamp <= member.Timestamp && entry.Group.LinkId == identifier.value)

        if (entry) {
          membersReferences.push(entry)
        }
      }
    } else {
      membersReferences.push(member)
    }
  }

  const entries = new GroupTableArray({
    joined,
    kicked,
    missing,
    timestamp: timestamp.value,
    reference: reference.value
  })

  for (const player of members) {
    entries.add(
      player,
      membersReferences.find((entry) => entry.LinkId == player.LinkId)
    )
  }

  table.setEntries(entries)

  refresh()
}

function refresh() {
  table.refresh()
}

function reload() {
  scriptOverride.value = ''

  load()
}

function swapScript(key: string) {
  if (scriptOverride.value == key) {
    scriptOverride.value = ''

    table.setScript(Scripts.getAssignedContent(identifier.value, 'group'))
  } else {
    scriptOverride.value = key

    table.setScript(Scripts.getContent(key))
  }

  refresh()
}

function copyTable() {
  const node = document.createElement('div')
  node.innerHTML = `${formatDate(timestamp.value)} - ${formatDate(reference.value)}`

  document.body.prepend(node)

  const range = document.createRange()
  range.selectNode(node)

  const tableRange = document.createRange()
  tableRange.selectNode(table.element)

  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
  selection?.addRange(tableRange)

  document.execCommand('copy')

  selection?.removeAllRanges()

  node.remove()
}

function copySimulator() {
  void copyJson(table.getArray().map((entry) => ModelUtils.toSimulatorData(entry.current as PlayerModel)))
}

async function saveCSV() {
  Exporter.csv(await table.toCSV(), getFileName())
}

function exportFile() {
  const createExport = (timestamps: number[]) => () => DatabaseManager.export(null, timestamps, (player) => player.group == identifier.value)

  useDialog(ExportFileDialog, {
    files: {
      currentWithReference: createExport([timestamp.value, reference.value]),
      current: createExport([timestamp.value]),
      last: createExport(list.value.slice(0, 1).map((entry) => entry.Timestamp)),
      last5: createExport(list.value.slice(0, 5).map((entry) => entry.Timestamp)),
      all: createExport(list.value.map((entry) => entry.Timestamp))
    },
    filesPrefix: (DatabaseManager.getAny(identifier.value) as GroupHistory).Latest.Identifier
  })
}
</script>
