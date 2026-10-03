<template>
  <div>
    <div class="mb-[0.25rem] grid grid-cols-16 gap-x-[28px] pb-[14px]">
      <div class="col-span-10 col-start-4">
        <FilterInput v-model="filter" :placeholder="localize('filters.types.groups')" :language="language" @change="applyFilter" />
      </div>
      <div class="col-span-3 flex items-start gap-1">
        <SFTooltip :content="localize('guilds.hidden')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('guilds.hidden')" :aria-pressed="hidden" :class="{ 'text-accent!': hidden }" @click="toggleOption('groups_hidden')">
            <SFIcon name="eye-low-vision" />
          </SFButton>
        </SFTooltip>
        <SFTooltip :content="localize('guilds.other')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('guilds.other')" :aria-pressed="others" :class="{ 'text-accent!': others }" @click="toggleOption('groups_other')">
            <SFIcon name="circle-user" />
          </SFButton>
        </SFTooltip>
        <SFTooltip :content="localize('guilds.empty')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('guilds.empty')" :aria-pressed="empty" :class="{ 'text-accent!': empty }" @click="toggleOption('groups_empty')">
            <SFIcon name="eraser" />
          </SFButton>
        </SFTooltip>
      </div>
    </div>
    <div class="mt-7 grid grid-cols-1 gap-[28px] sm:grid-cols-3 lg:grid-cols-5">
      <button
        type="button"
        class="flex h-[270px] w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-md border border-line bg-surface transition hover:border-white/30 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        @click="navigation.show('groups')"
      >
        <SFIcon name="table" class="text-[4em]" />
        <span>{{ localize('guilds.browse') }}</span>
      </button>
      <GridCard
        v-for="group in visibleItems"
        :key="group.Latest.LinkId"
        v-model:selected="selection[group.Latest.LinkId]"
        image="/res/group.png"
        :date="formatDate(getDisplayTimestamp(group))"
        :prefix="group.Latest.Prefix"
        :name="group.Latest.Name"
        :outdated="latestPlayerTimestamp != getDisplayTimestamp(group)"
        :hidden="DatabaseManager.isIdentifierHidden(group.Latest.LinkId)"
        @open="navigation.show('group', { identifier: group.Latest.LinkId })"
      >
        <span class="flex items-center gap-1">
          <SFIcon name="users" />
          {{ group.Latest.MembersTotal }}
        </span>
      </GridCard>
    </div>
    <div ref="sentinel-ref" />
    <GridActions v-if="selectedIdentifiers.length > 0" :actions="actions" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFIcon from '@library/SFIcon.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { useDialog } from '@utils/dialogs'
import { formatDate } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { copyJson, unique } from '@utils/utils'
import { type PlayerModel } from '~/core/models/player'
import { ModelUtils } from '~/core/models/utils'
import { Site } from '~/core/site'
import { DatabaseManager, type GroupHistory } from '~/data/database-manager'
import FilterInput from '~/pages/stats/components/FilterInput.vue'
import GridActions from '~/pages/stats/components/GridActions.vue'
import GridCard from '~/pages/stats/components/GridCard.vue'
import ExportFileDialog from '~/pages/stats/dialogs/ExportFileDialog.vue'
import ManageLinkDialog from '~/pages/stats/dialogs/ManageLinkDialog.vue'
import { createGroupQueryLanguage, createGroupQueryTarget, safeRemove, useIncrementalList, useStatsNavigation, type GridAction } from '~/pages/stats/stats'
import { ExpressionScope } from '~/script/expression'
import { matchesQuery, parseQuery } from '~/script/query'

defineOptions({
  name: 'GroupsGridView'
})

defineExpose({
  show,
  identifier: 'group'
})

const localize = useLocalize('stats')

const navigation = useStatsNavigation()

const filter = ref('')
const hidden = ref(Site.options.groups_hidden)
const others = ref(Site.options.groups_other)
const empty = ref(Site.options.groups_empty)
const hiddenOverride = ref(false)
const othersOverride = ref(false)

const entries = shallowRef<GroupHistory[]>([])
const selection = ref<Record<string, boolean>>({})

const language = createGroupQueryLanguage(false)

const latestPlayerTimestamp = computed(() => (empty.value ? DatabaseManager.Latest : DatabaseManager.LatestPlayer))

const filteredEntries = computed(() =>
  entries.value.filter((group) => {
    const visible = !DatabaseManager.isIdentifierHidden(group.Latest.LinkId)

    return (visible || hidden.value || hiddenOverride.value) && (group.Own || others.value || othersOverride.value) && (empty.value || group.LatestDisplayTimestamp)
  })
)

const { visibleItems } = useIncrementalList(filteredEntries, 20, useTemplateRef('sentinel-ref'))

const selectedIdentifiers = computed(() => Object.keys(selection.value).filter((identifier) => selection.value[identifier]))

const actions = computed((): GridAction[] => {
  const identifiers = selectedIdentifiers.value

  return [
    { label: localize('context.unselect'), icon: 'check', action: clearSelection },
    { label: localize('context.hide'), icon: 'eye-slash', action: hideSelected },
    { label: localize('copy.player'), icon: 'copy-solid', action: copySelected },
    { label: localize('share.title_short'), icon: 'share-nodes', action: shareSelected },
    { label: localize('context.link_groups'), icon: 'link', disabled: identifiers.length === 1 && DatabaseManager.getLinkedIdentifiers(identifiers[0]).length <= 1, action: linkSelected },
    { label: localize('context.remove'), icon: 'trash-can', action: () => void removeSelected() }
  ]
})

function getDisplayTimestamp(group: GroupHistory) {
  return empty.value ? group.LatestTimestamp : group.LatestDisplayTimestamp
}

function show() {
  const groups = Object.entries(DatabaseManager.Groups)

  if (Site.options.skip_grid_if_single_entry_present && groups.length == 1 && (Site.options.groups_empty || groups[0][1].List.filter((group) => group.MembersPresent).length > 0)) {
    navigation.show('group', { identifier: groups[0][0] })
  } else {
    applyFilter()
  }
}

function toggleOption(option: 'groups_hidden' | 'groups_other' | 'groups_empty') {
  Site.options[option] = !Site.options[option]

  hidden.value = Site.options.groups_hidden
  others.value = Site.options.groups_other
  empty.value = Site.options.groups_empty

  show()
}

function applyFilter() {
  const { root, options } = parseQuery(filter.value, language)

  hiddenOverride.value = Boolean(options.hidden)
  othersOverride.value = Boolean(options.others)

  const list = Object.values(DatabaseManager.Groups).filter(
    ({ Latest: latest }) =>
      (!options.latest || latest.Timestamp == DatabaseManager.Latest) &&
      matchesQuery(
        root,
        createGroupQueryTarget(latest, (expression) => expression.eval(new ExpressionScope().with(latest, latest).addSelf(latest)))
      )
  )

  if (empty.value) {
    list.sort((a, b) => b.LatestTimestamp - a.LatestTimestamp)
  } else {
    list.sort((a, b) => b.LatestDisplayTimestamp - a.LatestDisplayTimestamp)
  }

  selection.value = {}
  entries.value = list
}

function clearSelection() {
  selection.value = {}
}

function hideSelected() {
  for (const identifier of selectedIdentifiers.value) {
    DatabaseManager.hideIdentifier(identifier)
  }

  show()
}

function copySelected() {
  const players = selectedIdentifiers.value.flatMap((identifier) => {
    const group = (DatabaseManager.getGroup(identifier) as GroupHistory).Latest

    return group.Players.filter((player) => DatabaseManager.hasPlayer(player.LinkId as string, group.Timestamp)).map((player) => ModelUtils.toSimulatorData(DatabaseManager.getPlayer(player.LinkId as string, group.Timestamp) as PlayerModel))
  })

  void copyJson(players)

  clearSelection()
}

function shareSelected() {
  const identifiers = unique(selectedIdentifiers.value.flatMap((identifier) => [identifier, ...DatabaseManager.Groups[identifier].List.flatMap((group) => group.Players.flatMap((player) => player.LinkId ?? []))]))

  useDialog(ExportFileDialog, { files: () => DatabaseManager.export(identifiers), filesPrefix: 'groups' })

  clearSelection()
}

function linkSelected() {
  useDialog(
    ManageLinkDialog,
    { linkIds: selectedIdentifiers.value },
    {
      callback: (changed) => {
        if (changed) show()
      }
    }
  )

  clearSelection()
}

async function removeSelected() {
  if (await safeRemove({ identifiers: selectedIdentifiers.value })) {
    show()
  }
}
</script>
