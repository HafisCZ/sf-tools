<template>
  <Page>
    <template #nav-left>
      <StatisticsIntegration type="players" :profile="FIGHT_SIMULATOR_PROFILE" :scope="listPlayers" cheats grouped @select="insertPlayer" />
      <span class="mx-1.5 h-5 w-px bg-white/12" />
      <SFButton variant="ghost" @click="openOptions">
        <SFIcon name="gear" />
        {{ localize.global('analyzer.topbar.options') }}
      </SFButton>
      <SimulatorDebug logs copy presets @log="runLogged" @copy="copyWithConfig" @insert="handlePaste" />
    </template>

    <SimulatorPasteTarget use-drag-drop @paste="handlePaste" />

    <div class="grid gap-7 md:grid-cols-2">
      <PlayerEditor ref="editor-ref" @copy="copyPlayer" />

      <div>
        <div class="grid grid-cols-16 items-center gap-[14px]">
          <SFButton variant="outline" block class="col-span-3" :disabled="!isEditorValid" @click="addPlayer">
            {{ localize('add') }}
          </SFButton>
          <SFButton variant="outline" block class="col-span-3" :disabled="!isEditorValid" @click="savePlayer">
            {{ localize('save') }}
          </SFButton>
          <SFSelect ref="mode-ref" v-model="mode" :options="modeOptions" class="col-span-5" />
          <div class="col-span-5 flex justify-end gap-2">
            <SFTooltip :content="localize.global('players.gladiator_mode')">
              <SFButton variant="outline" icon :aria-label="localize.global('players.gladiator_mode')" :aria-pressed="gladiatorMode" :class="{ 'bg-accent text-black': gladiatorMode }" @click="gladiatorMode = !gladiatorMode">
                <SFIcon name="bolt" />
              </SFButton>
            </SFTooltip>
            <SFTooltip :content="localize.global('players.ihof_mode')">
              <SFButton variant="outline" icon :aria-label="localize.global('players.ihof_mode')" :aria-pressed="ihofMode" :class="{ 'bg-accent text-black': ihofMode }" @click="ihofMode = !ihofMode">
                <SFIcon name="trophy" />
              </SFButton>
            </SFTooltip>
            <SFTooltip :content="localize.global('players.no_attribute_reduction_mode')">
              <SFButton variant="outline" icon :aria-label="localize.global('players.no_attribute_reduction_mode')" :aria-pressed="noAttributeReductionMode" :class="{ 'bg-accent text-black': noAttributeReductionMode }" @click="noAttributeReductionMode = !noAttributeReductionMode">
                <SFIcon name="fire-flame-curved" />
              </SFButton>
            </SFTooltip>
          </div>
        </div>

        <div class="mt-[14px] grid grid-cols-16 items-center gap-[14px]">
          <div class="col-span-4 flex gap-2">
            <SFTooltip :content="localize('clipboard.paste_mode')">
              <SFButton variant="outline" icon class="flex-1" :aria-label="localize('clipboard.paste_mode')" :aria-pressed="pasteMode" :class="{ 'bg-accent text-black': pasteMode }" @click="pasteMode = !pasteMode">
                <SFIcon name="paste" />
              </SFButton>
            </SFTooltip>
            <SFTooltip :content="localize('clipboard.copy_all')">
              <SFButton variant="outline" icon class="flex-1" :aria-label="localize('clipboard.copy_all')" @click="copyAll">
                <SFIcon name="copy" />
              </SFButton>
            </SFTooltip>
            <SFTooltip :content="localize.global('stats.copy.image')">
              <SFButton variant="outline" icon class="flex-1" :aria-label="localize.global('stats.copy.image')" :disabled="screenshot && 'loading'" @click="saveScreenshot">
                <SFIcon name="download" />
              </SFButton>
            </SFTooltip>
          </div>
          <SimulatorSettings ref="settings-ref" storage-key="player_sim" :default-threads="4" :default-iterations="2500" class="col-span-7" />
          <SFButton variant="outline" block :disabled="isSimulating ? 'loading' : isLogging || !canSimulate" class="col-span-5" @click="simulate">
            {{ localize('simulate') }}
          </SFButton>
        </div>

        <div ref="table-ref" :class="{ 'bg-white text-black [&_*]:!border-[rgba(0,0,0,0.2)] [&_*]:!bg-transparent [&_*]:!text-black [&_*]:!outline-none': screenshot }">
          <SFTable v-model:sorting="sorting" dense class="mt-[14px]">
            <template #header>
              <SFTableRow>
                <SFTableHeader align="center" class="w-12">#</SFTableHeader>
                <SFTableHeader class="w-full">
                  <SFTableSort column="name">{{ localize('player') }}</SFTableSort>
                  <div class="text-xs font-normal text-white/60">
                    <SFTableSort column="class" arrow-side="left">{{ localize.global('editor.class') }}</SFTableSort> · <SFTableSort column="level" descending>{{ localize.global('editor.level') }}</SFTableSort>
                  </div>
                </SFTableHeader>
                <SFTableHeader align="right">
                  <SFTableSort column="avg" descending>{{ localize('win_chance') }}</SFTableSort>
                  <div v-if="showRange" class="text-xs font-normal text-white/60">
                    <SFTableSort column="min" descending arrow-side="left">{{ localize.global('general.min') }}</SFTableSort> - <SFTableSort column="max" descending>{{ localize.global('general.max') }}</SFTableSort>
                  </div>
                  <span aria-hidden="true" class="invisible block h-0 overflow-hidden whitespace-nowrap" :class="showRange ? 'text-xs font-normal' : 'text-[15px]'">{{ widestChance }}</span>
                </SFTableHeader>
                <SFTableHeader v-if="isSingleTarget && !screenshot" class="w-12" />
                <SFTableHeader v-if="!screenshot" class="w-12" />
              </SFTableRow>
            </template>
            <SFTableRow
              v-for="(entry, position) in sortedPlayers"
              :key="entry.index"
              tabindex="0"
              class="cursor-pointer"
              :class="[entry.index === selectedIndex && !screenshot ? 'bg-white/10' : 'hover:bg-white/5 focus-visible:bg-white/5', isSingleTarget && entry.index === yourselfIndex ? 'outline-1 outline-solid -outline-offset-1 outline-[purple]' : 'outline-none']"
              @click="(event: MouseEvent) => handleRowClick(event, entry)"
              @keydown="(event: KeyboardEvent) => handleRowKeydown(event, entry)"
            >
              <SFTableCell align="center">{{ position + 1 }}</SFTableCell>
              <SFTableCell class="w-full max-w-0">
                <div class="flex items-center gap-2.5">
                  <img :src="getClassImageUrl(entry.player.Class)" :alt="localize.global(`general.class${entry.player.Class}`)" class="size-8 shrink-0" />
                  <div class="min-w-0">
                    <SFTooltip :content="entry.player.Name">
                      <div class="font-bold" :class="screenshot ? 'wrap-anywhere' : 'truncate'">{{ entry.player.Name }}</div>
                    </SFTooltip>
                    <div class="text-xs text-white/60" :class="screenshot ? 'wrap-anywhere' : 'truncate'">{{ formatDetails(entry.player) }}</div>
                  </div>
                </div>
              </SFTableCell>
              <SFTableCell align="right" class="whitespace-nowrap">
                <div class="text-[15px] leading-5 font-bold">{{ formatChance(isSingleTarget && entry.index === yourselfIndex ? undefined : entry.score?.avg) }}</div>
                <div v-if="showRange && entry.score" class="text-xs text-white/60">{{ formatRange(entry.score.min, entry.score.max) }}</div>
              </SFTableCell>
              <SFTableCell v-if="isSingleTarget && !screenshot" align="center">
                <SFButton v-if="entry.index !== yourselfIndex" variant="ghost" size="sm" icon :aria-label="localize('fight_as_player')" class="hover:text-accent focus-visible:text-accent" @click="yourselfIndex = entry.index">
                  <SFIcon name="circle-user" />
                </SFButton>
              </SFTableCell>
              <SFTableCell v-if="!screenshot" align="center">
                <SFButton variant="ghost" size="sm" icon class="hover:text-red-400 focus-visible:text-red-400" @click="removePlayer(entry)">
                  <SFIcon name="trash-can" />
                </SFButton>
              </SFTableCell>
            </SFTableRow>
          </SFTable>
        </div>
      </div>
    </div>

    <template #footer-right>
      <PageFooterLinks />
    </template>
  </Page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFIcon from '@library/SFIcon.vue'
import SFSelect from '@library/SFSelect.vue'
import SFTable from '@library/SFTable.vue'
import SFTableCell from '@library/SFTableCell.vue'
import SFTableHeader from '@library/SFTableHeader.vue'
import SFTableRow from '@library/SFTableRow.vue'
import SFTableSort from '@library/SFTableSort.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { type SelectOption, type TableSorting } from '@utils/components'
import { useDialog } from '@utils/dialogs'
import { useLocalize } from '@utils/localization'
import { useToast } from '@utils/toasts'
import { copyJson, formatDuration, getClassImageUrl, useSubmit } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import { Exporter } from '~/core/exporter'
import { type PlayerModel } from '~/core/models/player'
import { ModelUtils } from '~/core/models/utils'
import { OptionsHandler } from '~/core/options'
import { FIGHT_SIMULATOR_PROFILE } from '~/core/profiles'
import { Store } from '~/core/store'
import { DatabaseManager } from '~/data/database-manager'
import StatisticsIntegration from '~/integration/StatisticsIntegration.vue'
import PageFooterLinks from '~/pages/components/PageFooterLinks.vue'
import Page from '~/pages/Page.vue'
import PlayerEditor from '~/sim/components/PlayerEditor.vue'
import SimulatorDebug from '~/sim/components/SimulatorDebug.vue'
import SimulatorPasteTarget from '~/sim/components/SimulatorPasteTarget.vue'
import SimulatorSettings from '~/sim/components/SimulatorSettings.vue'
import { copySimulatorData, handleSimulatorPaste, preparePlayerData, receiveSimulatorBroadcast, type SimulatorLogTarget } from '~/sim/debug'
import { usePlayerSimulator } from '~/sim/players'
import SimulatorOptionsDialog from './dialogs/SimulatorOptionsDialog.vue'

defineOptions({
  name: 'SimulatorPage'
})

type SimulatorMode = 'all' | 'attack' | 'defend' | 'tournament'

type PlayerScore = {
  player: PlayerModel
  score: { avg: number; min?: number; max?: number } | null
  index: number
}

type SimulatorOptions = {
  decimals: number
}

const MODE_KEY = 'player_sim/mode'

const MODES: SimulatorMode[] = ['all', 'attack', 'defend', 'tournament']

const localize = useLocalize('simulator')

const playerSimulator = usePlayerSimulator()

const options = new OptionsHandler<SimulatorOptions>('simulator', { decimals: 2 })

const mode = ref(readMode())

const pasteMode = ref(false)
const gladiatorMode = useStoredToggle('player_sim/gladiator')
const ihofMode = useStoredToggle('player_sim/ihof')
const noAttributeReductionMode = ref(false)

const decimals = ref(options.decimals)

const players = shallowRef<PlayerScore[]>([])
const selectedIndex = ref(-1)
const yourselfIndex = ref(-1)

const sorting = ref<TableSorting>()

let nextIndex = 0

const editor = useTemplateRef('editor-ref')
const settings = useTemplateRef('settings-ref')
const tableElement = useTemplateRef('table-ref')

const isEditorValid = useComponentValidation(editor)

const isSettingsValid = useComponentValidation(useTemplateRef('mode-ref'), settings)

const modeOptions = computed<SelectOption<SimulatorMode>[]>(() => MODES.map((value) => ({ value, label: localize.global(`players.mode.${value}`) })))

const isSingleTarget = computed(() => mode.value === 'attack' || mode.value === 'defend')

const showRange = computed(() => mode.value === 'all')

const widestChance = computed(() => (showRange.value ? formatRange(100, 100) : formatChance(100)))

const COMPARATORS: Record<string, (a: PlayerScore, b: PlayerScore) => number> = {
  class: (a, b) => a.player.Class - b.player.Class,
  level: (a, b) => a.player.Level - b.player.Level,
  name: (a, b) => a.player.Name.localeCompare(b.player.Name),
  avg: (a, b) => (a.score?.avg ?? 0) - (b.score?.avg ?? 0),
  min: (a, b) => (a.score?.min ?? 0) - (b.score?.min ?? 0),
  max: (a, b) => (a.score?.max ?? 0) - (b.score?.max ?? 0)
}

const sortedPlayers = computed(() => {
  const sort = sorting.value

  if (!sort) return players.value

  const compare = COMPARATORS[sort.column]

  return [...players.value].sort((a, b) => (sort.direction === 'asc' ? compare(a, b) : compare(b, a)))
})

const canSimulate = computed(() => isSettingsValid.value && players.value.length > 0 && (!isSingleTarget.value || players.value.some((entry) => entry.index === yourselfIndex.value)))

const { submit: simulate, isSubmitting: isSimulating } = useSubmit(async () => {
  if (!settings.value) return

  const instances = Math.max(1, settings.value.threads || 4)
  const iterations = Math.max(1, settings.value.iterations || 2500)

  await runSimulation(instances, iterations)
})

const { submit: runLogged, isSubmitting: isLogging } = useSubmit(async (target: SimulatorLogTarget) => {
  await runSimulation(1, 500, target)
})

// Plain colours while saving, html2canvas can't read Tailwind's oklch() colours
const { submit: saveScreenshot, isSubmitting: screenshot } = useSubmit(async () => {
  await nextTick()

  if (!tableElement.value) return

  const canvas = await html2canvas(tableElement.value, { logging: false, backgroundColor: '#ffffff' })
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve))

  if (blob) {
    Exporter.download(`simulator_${Date.now()}.png`, blob)
  }
})

watch(mode, (value) => {
  if (isSingleTarget.value) {
    if (selectedIndex.value !== -1 && yourselfIndex.value === -1) {
      yourselfIndex.value = selectedIndex.value
    }
  } else {
    yourselfIndex.value = -1
  }

  players.value = players.value.map((entry) => ({ ...entry, score: null }))

  Store.shared.set(MODE_KEY, value, true)

  sorting.value = undefined
})

watch([mode, players], () => {
  if (isSingleTarget.value && yourselfIndex.value === -1 && sortedPlayers.value.length > 0) {
    yourselfIndex.value = sortedPlayers.value[0].index
  }
})

onMounted(() => {
  receiveSimulatorBroadcast(handlePaste)
})

function readMode() {
  const value = Store.shared.get<SimulatorMode>(MODE_KEY, 'all', true)

  return MODES.includes(value) ? value : 'all'
}

function useStoredToggle(key: string) {
  const value = ref(Store.shared.get<string>(key, 'false', true) === 'true')

  watch(value, (active) => Store.shared.set(key, active, true))

  return value
}

function formatChance(value: number | undefined) {
  return value === undefined ? '' : `${value.toFixed(decimals.value)}%`
}

function formatRange(min: number | undefined, max: number | undefined) {
  return `${formatChance(min)} - ${formatChance(max)}`
}

function formatDetails(player: PlayerModel) {
  const level = localize('player_level', { level: player.Level })

  return ihofMode.value && player.Prefix ? `${level} · ${player.Prefix}` : level
}

function listPlayers() {
  return DatabaseManager.getLatestPlayers()
}

function clearEditor() {
  editor.value?.fill(undefined)
}

function addPlayer() {
  if (!editor.value) return

  const player = editor.value.read()

  if (player.Name === '') {
    player.Name = `Player ${players.value.length + 1}`
  }

  addEntry(player)
}

function addEntry(player: PlayerModel) {
  selectedIndex.value = nextIndex++

  players.value = [{ player, score: null, index: selectedIndex.value }, ...players.value]

  clearEditor()
}

function savePlayer() {
  if (!editor.value) return

  if (selectedIndex.value === -1) {
    addPlayer()

    return
  }

  const player = editor.value.read()

  players.value = players.value.map((entry) => (entry.index === selectedIndex.value ? { ...entry, player, score: null } : entry))
}

function selectPlayer(entry: PlayerScore) {
  selectedIndex.value = entry.index

  editor.value?.fill(entry.player)
}

function removePlayer(entry: PlayerScore) {
  players.value = players.value.filter((item) => item !== entry)

  if (entry.index === selectedIndex.value) {
    clearEditor()

    selectedIndex.value = -1
  }

  if (entry.index === yourselfIndex.value) {
    yourselfIndex.value = -1
  }
}

function handleRowClick(event: MouseEvent, entry: PlayerScore) {
  if (event.target instanceof Element && event.target.closest('button')) return

  selectPlayer(entry)
}

function handleRowKeydown(event: KeyboardEvent, entry: PlayerScore) {
  if (event.key === 'Enter' && event.target === event.currentTarget) {
    selectPlayer(entry)
  }
}

function insertPlayer(entry: PlayerModel) {
  addEntry(preparePlayerData(ModelUtils.toSimulatorData(entry)))
}

function isPlayer(value: unknown) {
  if (typeof value !== 'object' || value === null) return false

  return ('Class' in value && Boolean(value.Class)) || ('save' in value && Boolean(value.save))
}

function handlePaste(value: unknown) {
  try {
    const data = handleSimulatorPaste(value)

    if (Array.isArray(data)) {
      const entries = data.map((item: unknown) => ({ player: preparePlayerData(item), score: null, index: nextIndex++ }))

      if (pasteMode.value) {
        players.value = [...players.value, ...entries]
      } else {
        players.value = entries

        selectedIndex.value = -1
        yourselfIndex.value = -1

        clearEditor()
      }
    } else if (isPlayer(data)) {
      editor.value?.fill(preparePlayerData(data))
    }
  } catch (e) {
    console.info(e)
  }
}

function copyPlayer(player: PlayerModel) {
  void copyJson(player)
}

function copyAll() {
  void copyJson(players.value.map(({ player }) => ModelUtils.toSimulatorData(player)))
}

function copyWithConfig() {
  copySimulatorData(players.value.map(({ player }) => ModelUtils.toSimulatorData(player)))
}

async function runSimulation(instances: number, iterations: number, log?: SimulatorLogTarget) {
  if (!canSimulate.value) return

  const entries = players.value.map((entry): PlayerScore => ({ ...entry, score: null }))

  players.value = entries

  const yourself = entries.find((entry) => entry.index === yourselfIndex.value)

  const flags = {
    Gladiator15: gladiatorMode.value,
    NoGladiatorReduction: ihofMode.value,
    NoAttributeReduction: noAttributeReductionMode.value
  }

  const result = await playerSimulator.simulate(mode.value, entries, yourself, flags, { instances, iterations }, log)

  if (!result) return

  useToast({ title: localize('toast.title'), message: localize('toast.message', { duration: formatDuration(result.duration) }) })

  players.value = result.entries

  sorting.value = { column: 'avg', direction: 'desc' }
}

function openOptions() {
  useDialog(
    SimulatorOptionsDialog,
    {
      decimals: options.decimals
    },
    {
      callback: (values) => {
        if (values) {
          options.decimals = values.decimals

          decimals.value = values.decimals
        }
      }
    }
  )
}
</script>
