<template>
  <div>
    <div class="mb-[0.25rem] grid grid-cols-16 gap-x-[28px] pb-[14px]">
      <div class="col-span-10 col-start-4">
        <FilterInput v-model="filter" :placeholder="localize('filters.types.players')" :filters="filterDescriptions" @change="applyFilter" />
      </div>
      <div class="col-span-3 flex items-start gap-1">
        <SFTooltip :content="localize('players.hidden')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('players.hidden')" :aria-pressed="hidden" :class="{ 'text-accent!': hidden }" @click="toggleOption('players_hidden')">
            <SFIcon name="eye-low-vision" />
          </SFButton>
        </SFTooltip>
        <SFTooltip :content="localize('players.other')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('players.other')" :aria-pressed="others" :class="{ 'text-accent!': others }" @click="toggleOption('players_other')">
            <SFIcon name="circle-user" />
          </SFButton>
        </SFTooltip>
      </div>
    </div>
    <div class="mt-7 grid grid-cols-1 gap-[28px] sm:grid-cols-3 lg:grid-cols-5">
      <GridCard
        v-for="player in visibleItems"
        :key="player.Latest.LinkId"
        v-model:selected="selection[player.Latest.LinkId]"
        :image="getClassImageUrl(player.Latest.Class)"
        :date="formatDate(player.LatestTimestamp)"
        :prefix="player.Latest.Prefix"
        :name="player.Latest.Name"
        :outdated="DatabaseManager.Latest != player.LatestTimestamp"
        :hidden="DatabaseManager.isIdentifierHidden(player.Latest.LinkId)"
        @open="navigation.show('player', { identifier: player.Latest.LinkId })"
      >
        <span>{{ localize.global('general.level') }} {{ player.Latest.Level }} · {{ localize.global(`general.class${player.Latest.Class}`) }}</span>
        <span v-if="player.Latest.hasGuild()" class="flex max-w-full items-center gap-1">
          <SFIcon name="shield-halved" class="shrink-0" />
          <span class="truncate">{{ player.Latest.Group.Name }}</span>
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
import { copyJson, getClassImageUrl, toRecord } from '@utils/utils'
import { type PlayerModel } from '~/core/models/player'
import { ModelUtils } from '~/core/models/utils'
import { Site } from '~/core/site'
import { DatabaseManager, type PlayerHistory } from '~/data/database-manager'
import FilterInput from '~/pages/stats/components/FilterInput.vue'
import GridActions from '~/pages/stats/components/GridActions.vue'
import GridCard from '~/pages/stats/components/GridCard.vue'
import ExportFileDialog from '~/pages/stats/dialogs/ExportFileDialog.vue'
import ManageLinkDialog from '~/pages/stats/dialogs/ManageLinkDialog.vue'
import { PLAYER_CLASS_SEARCH, safeRemove, useIncrementalList, useStatsNavigation, type GridAction } from '~/pages/stats/stats'
import { Expression, ExpressionScope } from '~/script/expression'

defineOptions({
  name: 'PlayersGridView'
})

defineExpose({
  show,
  identifier: 'player'
})

type Term = (player: PlayerModel) => boolean

const FILTER_KEYS = ['c', 'p', 'g', 's', 'e', 'l', 'a', 'h', 'd']

const localize = useLocalize('stats')

const navigation = useStatsNavigation()

const filter = ref('')
const hidden = ref(Site.options.players_hidden)
const others = ref(Site.options.players_other)
const hiddenOverride = ref(false)
const othersOverride = ref(false)

const entries = shallowRef<PlayerHistory[]>([])
const selection = ref<Record<string, boolean>>({})

const filterDescriptions = computed(() => toRecord(FILTER_KEYS, (key) => [key, localize(`filters.${key}`)]))

const filteredEntries = computed(() =>
  entries.value.filter((player) => {
    const visible = !DatabaseManager.isIdentifierHidden(player.Latest.LinkId)

    return (visible || hidden.value || hiddenOverride.value) && (player.Own || others.value || othersOverride.value)
  })
)

const { visibleItems } = useIncrementalList(filteredEntries, 20, useTemplateRef('sentinel-ref'))

const selectedIdentifiers = computed(() => Object.keys(selection.value).filter((identifier) => selection.value[identifier]))

const actions = computed((): GridAction[] => {
  const identifiers = selectedIdentifiers.value

  return [
    { label: localize('context.unselect'), icon: 'check', action: clearSelection },
    { label: localize('context.hide'), icon: 'eye-slash', action: hideSelected },
    { label: localize('copy.player'), icon: 'copy-solid', action: () => copySelected(false) },
    { label: localize('copy.player_companions'), icon: 'copy-solid', disabled: identifiers.length > 1, action: () => copySelected(true) },
    { label: localize('share.title_short'), icon: 'share-nodes', action: shareSelected },
    { label: localize('context.link_players'), icon: 'link', disabled: identifiers.length === 1 && DatabaseManager.getLinkedIdentifiers(identifiers[0]).length <= 1, action: linkSelected },
    { label: localize('context.remove'), icon: 'trash-can', action: () => void removeSelected() }
  ]
})

function show() {
  const identifiers = Object.keys(DatabaseManager.Players)

  if (Site.options.skip_grid_if_single_entry_present && identifiers.length == 1) {
    navigation.show('player', { identifier: identifiers[0] })
  } else {
    applyFilter()
  }
}

function toggleOption(option: 'players_hidden' | 'players_other') {
  Site.options[option] = !Site.options[option]

  hidden.value = Site.options.players_hidden
  others.value = Site.options.players_other

  show()
}

function createTerms(value: string) {
  const parts = value.split(/(?:\s|\b)(c|p|g|s|e|l|a|h|d):/)

  const baseTerms = parts[0]
    .toLowerCase()
    .split('&')
    .map((term) => term.trim())

  const terms: Term[] = [(player) => baseTerms.every((term) => term.split('|').some((subterm) => matchesPlayer(player, subterm.trim())))]

  hiddenOverride.value = false
  othersOverride.value = false

  for (let i = 1; i < parts.length; i += 2) {
    const key = parts[i]
    const arg = (parts[i + 1] || '').trim()
    const args = arg
      .toLowerCase()
      .split('|')
      .map((term) => term.trim())

    if (key == 'c') {
      terms.push((player) => args.some((term) => PLAYER_CLASS_SEARCH[player.Class] == term))
    } else if (key == 'p') {
      terms.push((player) => args.some((term) => player.Name.toLowerCase().includes(term)))
    } else if (key == 'g') {
      terms.push((player) => args.some((term) => player.hasGuild() && (player.Group.Name ?? '').toLowerCase().includes(term)))
    } else if (key == 's') {
      terms.push((player) => args.some((term) => player.Prefix.toLowerCase().includes(term)))
    } else if (key == 'l') {
      terms.push((player) => player.Timestamp == DatabaseManager.Latest)
    } else if (key == 'e') {
      const expression = Expression.create(arg)

      if (expression) {
        terms.push((player) => Boolean(expression.eval(new ExpressionScope().with(player, player).addSelf(player))))
      }
    } else if (key == 'a') {
      hiddenOverride.value = true
      othersOverride.value = true
    } else if (key == 'h') {
      hiddenOverride.value = true
    } else if (key == 'd') {
      othersOverride.value = true
    }
  }

  return terms
}

function matchesPlayer(player: PlayerModel, term: string) {
  return player.Name.toLowerCase().includes(term) || player.Prefix.toLowerCase().includes(term) || PLAYER_CLASS_SEARCH[player.Class].includes(term) || (player.hasGuild() && (player.Group.Name ?? '').toLowerCase().includes(term))
}

function applyFilter() {
  const terms = createTerms(filter.value)

  const list: PlayerHistory[] = []

  for (const player of Object.values(DatabaseManager.Players)) {
    const isHidden = DatabaseManager.isIdentifierHidden(player.Latest.LinkId)

    if ((hidden.value || !isHidden || hiddenOverride.value) && terms.every((term) => term(player.Latest))) {
      list.push(player)
    }
  }

  list.sort((a, b) => b.LatestTimestamp - a.LatestTimestamp)

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

function copySelected(companions: boolean) {
  void copyJson(selectedIdentifiers.value.flatMap((identifier) => ModelUtils.toSimulatorData((DatabaseManager.getPlayer(identifier) as PlayerHistory).Latest, companions)))

  clearSelection()
}

function shareSelected() {
  const identifiers = selectedIdentifiers.value

  useDialog(ExportFileDialog, { files: () => DatabaseManager.export(identifiers), filesPrefix: 'players' })

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
