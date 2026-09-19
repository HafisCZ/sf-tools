<template>
  <Page width="65vw">
    <template #nav-left>
      <SFButton variant="ghost" :disabled="isImporting && 'loading'" @click="openImport">
        <SFIcon name="upload" />
        {{ localize('topbar.import') }}
      </SFButton>
      <SFButton variant="ghost" :disabled="!hasFights" @click="exportAll">
        <SFIcon name="download" />
        {{ localize('topbar.export') }}
      </SFButton>
      <SFButton variant="ghost" :disabled="!hasFights" @click="clear">
        <SFIcon name="recycle" />
        {{ localize('topbar.clear') }}
      </SFButton>
      <SFButton variant="ghost" @click="openOptions">
        <SFIcon name="gear" />
        {{ localize('topbar.options') }}
      </SFButton>
      <SimulatorDebug />
    </template>

    <template #nav-right>
      <SFTooltip :content="localize('clear_changes')">
        <SFButton variant="ghost" icon :aria-label="localize('clear_changes')" :disabled="!hasFights" @click="resetGroup">
          <SFIcon name="eraser" />
        </SFButton>
      </SFTooltip>
      <SFTooltip :content="localize('simulate')">
        <SFButton variant="ghost" icon :aria-label="localize('simulate')" :disabled="!hasFights" @click="simulateGroup">
          <SFIcon name="play" />
        </SFButton>
      </SFTooltip>
      <SFTooltip :content="localize('analyze')">
        <SFButton variant="ghost" icon :aria-label="localize('analyze')" :disabled="!hasFights" @click="openAnalysis">
          <SFIcon name="chalkboard" />
        </SFButton>
      </SFTooltip>
      <SFTooltip :content="localize('sidebar.toggles.damages')">
        <SFButton variant="ghost" icon :aria-label="localize('sidebar.toggles.damages')" :aria-pressed="damagesSidebar" :class="{ 'text-accent!': damagesSidebar }" @click="toggleDamages">
          <SFIcon name="bars-staggered" />
        </SFButton>
      </SFTooltip>
      <SFTooltip :content="localize('gladiator')">
        <SFButton variant="ghost" icon :aria-label="localize('gladiator')" :aria-pressed="noGladiatorReduction" :class="{ 'text-accent!': noGladiatorReduction }" @click="toggleGladiator">
          <SFIcon name="heart-crack" />
        </SFButton>
      </SFTooltip>
      <SFTooltip :content="localize('armor')">
        <SFButton variant="ghost" icon :aria-label="localize('armor')" :aria-pressed="maximumDamageReduction" :class="{ 'text-accent!': maximumDamageReduction }" @click="toggleArmor">
          <SFIcon name="shield" />
        </SFButton>
      </SFTooltip>
    </template>

    <div class="flex items-end gap-2">
      <div class="min-w-0 flex-1">
        <SFSelect :model-value="currentGroup" :label="localize('form.fight_group')" :options="groupOptions" @update:model-value="selectGroup">
          <template #option="{ option }">
            <span v-if="option.value" class="flex min-w-0 flex-1 items-center gap-2">
              <img :src="getClassImageUrl(option.value.fighterA.Class)" alt="" class="size-5 object-contain" />
              <span class="truncate">{{ getFighterName(option.value.fighterA) }}</span>
              <span>-</span>
              <img :src="getClassImageUrl(option.value.fighterB.Class)" alt="" class="size-5 object-contain" />
              <span class="truncate">{{ getFighterName(option.value.fighterB) }} ({{ option.value.fights.length }})</span>
            </span>
          </template>
        </SFSelect>
      </div>
      <SFTooltip :content="localize.global('editor.copy')">
        <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize.global('editor.copy')" :disabled="!hasFights" @click="copyGroup">
          <SFIcon name="copy" />
        </SFButton>
      </SFTooltip>
      <SFTooltip :content="localize('export')">
        <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('export')" :disabled="!hasFights" @click="exportGroup">
          <SFIcon name="download" />
        </SFButton>
      </SFTooltip>
    </div>

    <div v-show="currentGroup" class="mt-6">
      <SFHeading level="3" class="text-center">{{ localize('players') }}</SFHeading>
      <div class="mt-[14px] grid grid-cols-2 gap-7">
        <FighterEditor ref="editor-a-ref" @change="updatePreview" @autofill="openAutofill(0)" />
        <FighterEditor ref="editor-b-ref" @change="updatePreview" @autofill="openAutofill(1)" />
      </div>

      <SFHeading level="3" class="mt-6 text-center">{{ localize('preview') }}</SFHeading>
      <div class="mt-[14px] flex items-end gap-2">
        <div class="min-w-0 flex-1">
          <SFSelect :model-value="currentFight" :label="localize('form.fight_list')" :options="fightOptions" @update:model-value="selectFight" />
        </div>
        <SFTooltip :content="localize.global('editor.copy')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize.global('editor.copy')" :disabled="isCopying && 'loading'" @click="copyFight">
            <SFIcon name="copy" />
          </SFButton>
        </SFTooltip>
        <SFTooltip :content="localize('export')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('export')" @click="exportFight">
            <SFIcon name="download" />
          </SFButton>
        </SFTooltip>
      </div>

      <div ref="table-ref" class="mt-8">
        <SFTable fixed class="[&_td]:overflow-hidden [&_td]:text-ellipsis">
          <template #header>
            <SFTableRow>
              <SFTableHeader align="center" class="w-[5%]">#</SFTableHeader>
              <SFTableHeader align="center" class="w-[10%]">{{ localize('table.rage') }}</SFTableHeader>
              <SFTableHeader align="center" class="w-[15%]">{{ localize('table.attacker') }}</SFTableHeader>
              <SFTableHeader align="center" class="w-[5%]" />
              <SFTableHeader align="center" class="w-[15%]">{{ localize('table.target') }}</SFTableHeader>
              <SFTableHeader align="center" class="w-[5%]" />
              <SFTableHeader align="center" class="w-[15%]">{{ localize('table.type') }}</SFTableHeader>
              <SFTableHeader align="center" class="w-[10%]">{{ localize('table.damage') }}</SFTableHeader>
              <SFTableHeader align="center" class="w-[10%]">{{ localize('table.health') }}</SFTableHeader>
              <SFTableHeader align="center" class="w-[10%]">{{ localize('table.damage_base') }}</SFTableHeader>
            </SFTableRow>
          </template>
          <template v-if="analysis">
            <SFTableRow v-for="(round, index) in analysis.rounds" :key="index" :class="{ 'bg-[#202020] text-[darkgray]': round.attacker.ID === analysis.group.fighterA.ID }">
              <SFTableCell align="center">{{ index + 1 }}</SFTableCell>
              <template v-if="isRevive(round)">
                <SFTableCell align="center" />
                <SFTableCell align="center" class="truncate">{{ getFighterName(round.attacker) }}</SFTableCell>
                <SFTableCell align="center">
                  <FighterState v-if="round.attackerSpecialDisplay" :state="round.attackerSpecialDisplay" :copy="isCopying" />
                </SFTableCell>
                <SFTableCell align="center" />
                <SFTableCell align="center" />
                <SFTableCell align="center" class="text-[violet]">{{ formatAttackType(round.attackType) }}</SFTableCell>
                <SFTableCell align="center" />
                <SFTableCell align="center">{{ formatHealth(round.attackerHealth, round.attacker) }}</SFTableCell>
                <SFTableCell align="center" />
              </template>
              <template v-else>
                <SFTableCell align="center">{{ RAGE_FORMATS[rageDisplayMode](round.attackRage) }}</SFTableCell>
                <SFTableCell align="center" class="truncate">{{ getFighterName(round.attacker) }}</SFTableCell>
                <SFTableCell align="center">
                  <FighterState v-if="round.attackerSpecialDisplay" :state="round.attackerSpecialDisplay" :copy="isCopying" />
                </SFTableCell>
                <SFTableCell align="center" class="truncate">{{ getFighterName(round.target) }}</SFTableCell>
                <SFTableCell align="center">
                  <FighterState v-if="round.targetSpecialDisplay" :state="round.targetSpecialDisplay" :copy="isCopying" />
                </SFTableCell>
                <SFTableCell align="center" :class="getAttackClass(round)">{{ formatAttackType(round.attackType) }}{{ round.defenseType ? ` - ${formatDefenseType(round.defenseType)}` : '' }}</SFTableCell>
                <SFTableCell align="center" :class="getAttackClass(round)">{{ round.hasDamage ? formatSpacedNumber(Math.abs(round.attackDamage), ' ') : '' }}</SFTableCell>
                <SFTableCell align="center">{{ formatHealth(round.targetHealth, round.target) }}</SFTableCell>
                <SFTableCell align="center">
                  {{ round.hasBase && round.attackBase !== undefined ? formatSpacedNumber(round.attackBase, ' ') : '' }}
                  <span v-if="round.hasError" class="text-[orangered]">!</span>
                </SFTableCell>
              </template>
            </SFTableRow>
          </template>
        </SFTable>
      </div>
    </div>

    <div v-if="damagesSidebar && analysis" class="absolute top-[calc(50px+9.7em)] right-0 z-[2] w-[300px] rounded-l border border-r-0 border-line bg-page pb-1">
      <div class="flex flex-col gap-[2.5em] p-4">
        <div v-for="fighter in [analysis.group.fighterA, analysis.group.fighterB]" :key="fighter.ID" class="flex flex-col gap-4">
          <SFHeading level="3" class="flex items-center justify-center gap-2">
            <img :src="getClassImageUrl(fighter.Class)" alt="" class="size-[30px]" />
            <span class="mt-1">{{ getFighterName(fighter) }}</span>
          </SFHeading>
          <SFInput v-for="range in getRanges(fighter)" :key="range.type" :model-value="`${range.min} - ${range.max}`" readonly class="text-center" :class="{ 'text-[orangered]!': range.err }">
            <template #label>
              <span class="flex" :class="{ 'text-[orangered]': range.err }">
                <span>{{ formatRangeLabel(range) }}</span>
                <span v-if="range.cnt !== undefined" class="ml-auto">({{ range.cnt }} / {{ fighter.damages?.samples }})</span>
              </span>
            </template>
          </SFInput>
        </div>
      </div>
    </div>
  </Page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import SFInput from '@library/SFInput.vue'
import SFSelect from '@library/SFSelect.vue'
import SFTable from '@library/SFTable.vue'
import SFTableCell from '@library/SFTableCell.vue'
import SFTableHeader from '@library/SFTableHeader.vue'
import SFTableRow from '@library/SFTableRow.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { type SelectOption } from '@utils/components'
import { useDialog, useFilePicker } from '@utils/dialogs'
import { formatSpacedNumber } from '@utils/formatting'
import { useLoader } from '@utils/loader'
import { useLocalize } from '@utils/localization'
import { useToast } from '@utils/toasts'
import { copyElement, flattenObject, getClassImageUrl, mergeDeep, useSubmit } from '@utils/utils'
import { Broadcast } from '~/core/broadcast'
import { ModelUtils } from '~/core/models/utils'
import { OptionsHandler } from '~/core/options'
import { Site } from '~/core/site'
import Page from '~/pages/Page.vue'
import { ATTACK_TYPE_FIREBALL, ATTACK_TYPE_REVIVE, CONFIG, DEFENSE_TYPE_BLOCK_HEAL, FLAGS } from '~/sim/base'
import SimulatorDebug from '~/sim/components/SimulatorDebug.vue'
import { receiveSimulatorBroadcast, simulatorConfig, type SimulatorConfig } from '~/sim/debug'
import { analyzeGroup, exportFights, getFighterName, groupFights, importHar, prepareImportedFights, RANGE_TYPES, type AnalyzerOptions, type AnalyzerPlayer, type DamageRange, type Fight, type Fighter, type FightFile, type FightGroup, type FightRound, type GroupFight, type RageDisplayMode } from './analyzer'
import FighterEditor from './components/FighterEditor.vue'
import FighterState from './components/FighterState.vue'
import AnalyzerAutofillDialog from './dialogs/AnalyzerAutofillDialog.vue'
import AnalyzerOptionsDialog from './dialogs/AnalyzerOptionsDialog.vue'
import FightAnalysisDialog from './dialogs/FightAnalysisDialog.vue'

defineOptions({
  name: 'AnalyzerPage'
})

type Analysis = {
  group: FightGroup
  rounds: FightRound[]
}

type SidebarRange = DamageRange & {
  type: string
}

const RAGE_FORMATS: Record<RageDisplayMode, (rage: number) => string> = {
  decimal: (rage) => rage.toFixed(2),
  percentage: (rage) => `${Math.trunc(100 * rage)}%`,
  fraction: (rage) => `${Math.round(rage * 6)}/6`
}

const localize = useLocalize('analyzer')

const options = new OptionsHandler<AnalyzerOptions>('analyzer', {
  rage_display_mode: 'decimal',
  type_display_mode: 'text',
  base_damage_error_margin: 1,
  damages_sidebar: false,
  group_sort: 'fight_count'
})

const rageDisplayMode = ref(options.rage_display_mode)
const typeDisplayMode = ref(options.type_display_mode)
const damagesSidebar = ref(options.damages_sidebar)

const noGladiatorReduction = ref(FLAGS.NoGladiatorReduction)
const maximumDamageReduction = ref(FLAGS.MaximumDamageReduction)

const fights = shallowRef<Fight[]>([])
const groups = shallowRef<FightGroup[]>([])

const currentGroup = shallowRef<FightGroup | null>(null)
const currentFight = shallowRef<GroupFight | null>(null)

const analysis = shallowRef<Analysis | null>(null)

let players: AnalyzerPlayer[] = []

let appliedConfig: SimulatorConfig | null = null

const loader = useLoader()

const editorA = useTemplateRef('editor-a-ref')
const editorB = useTemplateRef('editor-b-ref')
const tableElement = useTemplateRef('table-ref')

const hasFights = computed(() => fights.value.length > 0)

const groupOptions = computed<SelectOption<FightGroup | null>[]>(() => groups.value.map((group) => ({ value: group, label: `${getFighterName(group.fighterA)} - ${getFighterName(group.fighterB)} (${group.fights.length})` })))

const fightOptions = computed<SelectOption<GroupFight | null>[]>(() => {
  const group = currentGroup.value

  if (!group) return []

  const nameA = getFighterStatus(group.fighterA)
  const nameB = getFighterStatus(group.fighterB)

  return group.fights.map((fight, index) => ({
    value: fight,
    label: localize('table.select', { index: index + 1, rounds: fight.rounds.length, winner: getFighterName(fight.winner), nameA, nameB })
  }))
})

const { submit: importFiles, isSubmitting: isImporting } = useSubmit(async (files: File[]) => {
  loader.start()

  try {
    for (const text of await Promise.all(files.map((file) => file.text()))) {
      const json: unknown = JSON.parse(text)

      if (isHar(json)) {
        const result = importHar(json)

        fights.value = [...fights.value, ...result.fights]
        players = [...players, ...result.players]
      } else if (isFightFile(json)) {
        importFightFile(json)
      } else {
        useToast({ title: localize('toast_import_error.title'), message: localize('toast_import_error.message'), type: 'warning' })
      }
    }
  } finally {
    render()

    loader.stop()
  }
})

const { submit: copyFight, isSubmitting: isCopying } = useSubmit(async () => {
  await nextTick()

  if (tableElement.value) {
    copyElement(tableElement.value)
  }
})

// Imports apply their config before rendering, so only changes from the debug config dialog render here
watch(simulatorConfig, (config) => {
  if (config === appliedConfig) return

  applyConfig(config)

  render(true)
})

onMounted(() => {
  receiveSimulatorBroadcast((data) => {
    reset()

    if (isFightFile(data)) {
      importFightFile(data)
    }

    render()
  })
})

Site.data = {
  getPlayers: () => players,
  getFights: () => fights.value,
  getGroups: () => groups.value
}

function isHar(value: unknown) {
  return typeof value === 'object' && value !== null && 'log' in value && Boolean(value.log)
}

function isFightFile(value: unknown): value is FightFile {
  return typeof value === 'object' && value !== null && 'fights' in value && Boolean(value.fights)
}

function applyConfig(config: SimulatorConfig | null) {
  appliedConfig = config

  CONFIG.set(config)
}

function importFightFile(file: FightFile) {
  applyConfig(file.config ?? null)

  simulatorConfig.value = file.config ?? null

  players = [...players, ...file.players]
  fights.value = [...fights.value, ...prepareImportedFights(file.fights)]
}

function openImport() {
  useFilePicker({ accept: '.har,.json', multiple: true, callback: (files) => void importFiles(files) })
}

function reset() {
  fights.value = []
  groups.value = []
  players = []

  currentGroup.value = null
  currentFight.value = null
  analysis.value = null
}

function render(soft = false) {
  const result = groupFights(fights.value, players, options.group_sort)

  groups.value = result.groups
  players = result.players

  const group = groups.value.find((entry) => entry.hash === currentGroup.value?.hash) ?? groups.value.at(0)

  if (group) {
    showGroup(group, soft ? (fighter) => fighter.editor ?? fighter.player : (fighter) => fighter.player ?? fighter.editor)
  } else {
    currentGroup.value = null
    currentFight.value = null
    analysis.value = null
  }
}

function showGroup(group: FightGroup, getEditable: (fighter: Fighter) => object | undefined) {
  currentGroup.value = group

  editorA.value?.fill(group.fighterA, getEditable(group.fighterA))
  editorB.value?.fill(group.fighterB, getEditable(group.fighterB))

  currentFight.value = group.fights.find((fight) => fight.index === currentFight.value?.index) ?? group.fights[0]

  updatePreview()
}

function selectGroup(group: FightGroup | null) {
  if (group) {
    showGroup(group, (fighter) => fighter.player)
  }
}

function selectFight(fight: GroupFight | null) {
  currentFight.value = fight

  updatePreview()
}

function updatePreview() {
  const group = currentGroup.value
  const fight = currentFight.value

  if (!group || !fight || !editorA.value || !editorB.value) return

  // Process base damages within the group
  analyzeGroup(group, editorA.value.read(), editorB.value.read(), options.base_damage_error_margin)

  analysis.value = { group, rounds: [...fight.rounds] }
}

function getFighterStatus(fighter: Fighter) {
  const name = getFighterName(fighter)

  return fighter.Health === fighter.TotalHealth ? name : `${name} (${formatSpacedNumber(fighter.Health, ' ')})`
}

function formatType(kind: 'attack' | 'defense', type: number) {
  const text = localize.global(`general.${kind}${type}`)

  if (typeDisplayMode.value === 'text_with_id') {
    return `${text} #${type}`
  } else if (typeDisplayMode.value === 'id') {
    return String(type)
  }

  return text
}

function formatAttackType(type: number) {
  return formatType('attack', type)
}

function formatDefenseType(type: number) {
  return formatType('defense', type)
}

function formatHealth(health: number, fighter: Fighter) {
  return `${Math.max(0, (100 * health) / fighter.Health).toFixed(1)}%`
}

function isRevive(round: FightRound) {
  return round.attackType === ATTACK_TYPE_REVIVE
}

function getAttackClass(round: FightRound) {
  if (round.defenseType === DEFENSE_TYPE_BLOCK_HEAL) {
    return round.attackTypeCritical ? 'font-bold text-[green]' : 'text-[greenyellow]'
  } else if (round.attackTypeCritical) {
    return 'font-bold text-[orangered]'
  }

  return round.attackType === ATTACK_TYPE_FIREBALL ? 'text-[violet]' : ''
}

function getRanges(fighter: Fighter): SidebarRange[] {
  const ranges = fighter.damages?.ranges ?? {}

  return RANGE_TYPES.filter((type) => type in ranges).map((type) => ({ ...ranges[type], type }))
}

function formatRangeLabel(range: SidebarRange) {
  const error = range.err ?? 0

  return `${localize(`sidebar.damages.${range.type}`)}${error ? ' !' : ''}${error & 1 ? ' < min' : ''}${error & 2 ? ' > max' : ''}`
}

function clear() {
  reset()
  render()
}

function exportAll() {
  if (hasFights.value) {
    exportFights(fights.value)
  }
}

function exportGroup() {
  const group = currentGroup.value

  if (group) {
    exportFights(group.fights.map(({ rounds }) => ({ fighterA: group.fighterA, fighterB: group.fighterB, rounds })))
  }
}

function exportFight() {
  const group = currentGroup.value
  const fight = currentFight.value

  if (group && fight) {
    exportFights([{ fighterA: group.fighterA, fighterB: group.fighterB, rounds: fight.rounds }])
  }
}

function resetGroup() {
  const group = currentGroup.value

  if (group) {
    delete group.fighterA.editor
    delete group.fighterB.editor

    render()
  }
}

function copyGroup() {
  const group = currentGroup.value

  if (!group?.fighterA.editor || !group.fighterB.editor) return

  const playerA = flattenObject(group.fighterA.editor)
  const playerB = flattenObject(group.fighterB.editor)

  const element = document.createElement('table')
  const body = element.createTBody()

  for (const key of Object.keys(playerA)) {
    const row = body.insertRow()

    for (const value of [key, playerA[key], playerB[key]]) {
      row.insertCell().textContent = String(value)
    }
  }

  document.body.append(element)

  copyElement(element)

  element.remove()
}

function toSimulatorModel(fighter: Fighter) {
  return mergeDeep(mergeDeep({ Health: fighter.Health }, fighter.player ? ModelUtils.toSimulatorData(fighter.player) : {}), fighter.editor)
}

function simulateGroup() {
  const group = currentGroup.value

  if (!group) return

  const models = [toSimulatorModel(group.fighterA), toSimulatorModel(group.fighterB)]

  const broadcast = new Broadcast()

  broadcast.on('token', () => {
    broadcast.send('data', { data: models, config: simulatorConfig.value, type: 'custom' })
    broadcast.close()
  })

  window.open(`${window.location.origin}/simulator.html?debug&broadcast=${broadcast.token}`, '_blank')
}

function toggleDamages() {
  damagesSidebar.value = !damagesSidebar.value

  options.damages_sidebar = damagesSidebar.value
}

function toggleGladiator() {
  noGladiatorReduction.value = !noGladiatorReduction.value

  FLAGS.set({ NoGladiatorReduction: noGladiatorReduction.value })

  updatePreview()
}

function toggleArmor() {
  maximumDamageReduction.value = !maximumDamageReduction.value

  FLAGS.set({ MaximumDamageReduction: maximumDamageReduction.value })

  updatePreview()
}

function openOptions() {
  useDialog(
    AnalyzerOptionsDialog,
    {
      options: {
        rage_display_mode: options.rage_display_mode,
        type_display_mode: options.type_display_mode,
        base_damage_error_margin: options.base_damage_error_margin,
        group_sort: options.group_sort
      }
    },
    {
      callback: (values) => {
        if (!values) return

        const isSortChanged = values.group_sort !== options.group_sort
        const isMarginChanged = values.base_damage_error_margin !== options.base_damage_error_margin

        options.rage_display_mode = values.rage_display_mode
        options.type_display_mode = values.type_display_mode
        options.base_damage_error_margin = values.base_damage_error_margin
        options.group_sort = values.group_sort

        rageDisplayMode.value = values.rage_display_mode
        typeDisplayMode.value = values.type_display_mode

        if (isSortChanged) {
          render(true)
        } else if (isMarginChanged) {
          updatePreview()
        }
      }
    }
  )
}

function openAnalysis() {
  const group = currentGroup.value

  if (group) {
    useDialog(FightAnalysisDialog, { fights: group.fights, fighterA: group.fighterA, fighterB: group.fighterB })
  }
}

function openAutofill(index: 0 | 1) {
  const [target, other] = index === 0 ? [editorA.value, editorB.value] : [editorB.value, editorA.value]

  if (!currentGroup.value || !target || !other) return

  useDialog(
    AnalyzerAutofillDialog,
    { mirror: other.read() },
    {
      callback: (data) => {
        if (data) {
          target.autofill(data)

          updatePreview()
        }
      }
    }
  )
}
</script>
