<template>
  <Page>
    <template #nav>
      <SimulatorDebug logs copy presets @log="runLogged" @copy="copyAll" @insert="handlePaste" />
    </template>

    <StatisticsIntegration type="players" :profile="PROFILE" :scope="listPlayers" cheats grouped @select="insertPlayer" />
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
              <SFButton variant="outline" icon class="flex-1" :aria-label="localize.global('stats.copy.image')" @click="saveScreenshot">
                <SFIcon name="download" />
              </SFButton>
            </SFTooltip>
          </div>
          <SimulatorSettings ref="settings-ref" storage-key="player_sim" :default-threads="4" :default-iterations="2500" class="col-span-7" />
          <SFButton variant="outline" block :disabled="!canSimulate" class="col-span-5" @click="simulate">
            {{ localize('simulate') }}
          </SFButton>
        </div>

        <div ref="table-ref" :class="{ 'bg-white text-black [&_*]:!border-[rgba(0,0,0,0.2)] [&_*]:!bg-transparent [&_*]:!text-black [&_*]:!outline-none': screenshot }">
          <SFTable v-model:sorting="sorting" fixed dense class="mt-[14px]">
            <template #header>
              <SFTableRow>
                <SFTableHeader align="center" class="w-12">#</SFTableHeader>
                <SFTableHeader column="class" align="center" class="w-20">{{ localize.global('editor.class') }}</SFTableHeader>
                <SFTableHeader column="level" descending align="center" class="w-16">{{ localize.global('editor.level') }}</SFTableHeader>
                <SFTableHeader column="name">{{ localize.global('editor.name') }}</SFTableHeader>
                <SFTableHeader column="avg" descending align="center">{{ localize('win_chance') }}</SFTableHeader>
                <SFTableHeader v-if="showRange" column="min" descending align="center">{{ localize('min_chance') }}</SFTableHeader>
                <SFTableHeader v-if="showRange" column="max" descending align="center">{{ localize('max_chance') }}</SFTableHeader>
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
              <SFTableCell align="center">
                <img :src="getClassImageUrl(entry.player.Class)" :alt="localize.global(`general.class${entry.player.Class}`)" class="mx-auto size-8" />
              </SFTableCell>
              <SFTableCell align="center">{{ entry.player.Level }}</SFTableCell>
              <SFTableCell>
                <span class="font-bold">{{ entry.player.Name }}</span>
                <span v-if="ihofMode && entry.player.Prefix" class="block text-white/60">{{ entry.player.Prefix }}</span>
              </SFTableCell>
              <SFTableCell align="center">{{ formatChance(isSingleTarget && entry.index === yourselfIndex ? undefined : entry.score?.avg) }}</SFTableCell>
              <SFTableCell v-if="showRange" align="center">{{ formatChance(entry.score?.min) }}</SFTableCell>
              <SFTableCell v-if="showRange" align="center">{{ formatChance(entry.score?.max) }}</SFTableCell>
              <SFTableCell v-if="isSingleTarget && !screenshot" align="center">
                <SFButton v-if="entry.index !== yourselfIndex" variant="ghost" size="sm" icon :aria-label="YOURSELF_LABEL" class="hover:text-green-400 focus-visible:text-green-400" @click="yourselfIndex = entry.index">
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

    <PageFooter>
      <template #links>
        <FooterLink icon="message" @click="openFeedback">
          {{ localize.global('index.footer.report') }}
        </FooterLink>
        <FooterLink icon="basket-shopping" href="https://home.sfgame.net">
          <span v-html="localize.global('index.footer.webshop#')" />
        </FooterLink>
        <FooterCopyright />
      </template>
    </PageFooter>
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
import SFTooltip from '@library/SFTooltip.vue'
import { type SelectOption, type TableSorting } from '@utils/components'
import { useDialog } from '@utils/dialogs'
import { useLocalize } from '@utils/localization'
import { useToast } from '@utils/toasts'
import { copyJson, formatDuration, getClassImageUrl } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import StatisticsIntegration from '~/core/StatisticsIntegration.vue'
import FeedbackDialog from '~/dialogs/FeedbackDialog.vue'
import FooterCopyright from '~/pages/components/FooterCopyright.vue'
import FooterLink from '~/pages/components/FooterLink.vue'
import PageFooter from '~/pages/components/PageFooter.vue'
import Page from '~/pages/Page.vue'
import PlayerEditor from '~/sim/components/PlayerEditor.vue'
import SimulatorDebug from '~/sim/components/SimulatorDebug.vue'
import SimulatorPasteTarget from '~/sim/components/SimulatorPasteTarget.vue'
import SimulatorSettings from '~/sim/components/SimulatorSettings.vue'
import { copySimulatorData, handleSimulatorPaste, preparePlayerData, receiveSimulatorBroadcast, saveSimulatorLog, simulatorConfig, type SimulatorConfig, type SimulatorLogTarget } from '~/sim/debug'

defineOptions({
  name: 'SimulatorPage'
})

// Who fights whom: everyone against everyone, one player against the others, the others against one player, or a ladder
type SimulatorMode = 'all' | 'attack' | 'defend' | 'tournament'

// One player of the list, the same object the simulator sends back with its score filled
type PlayerScore = {
  player: PlayerModel
  // Win chances from 0 to 100, null until simulated. The lowest and highest chance are only filled in the All vs All mode.
  score: { avg: number; min?: number; max?: number } | null
  // Stays the same when other players are removed
  index: number
}

// What the analyzer reads from a simulation log
type SimulatorLog = {
  fights: unknown[]
  players: unknown[]
  config: SimulatorConfig | null
}

const PROFILE = FIGHT_SIMULATOR_PROFILE

const MODE_KEY = 'player_sim/mode'

const MODES: SimulatorMode[] = ['all', 'attack', 'defend', 'tournament']

// The button that moves the crown had no tooltip on the legacy page, so its label was never translated
const YOURSELF_LABEL = 'Fight as this player'

// Legacy order of every sorted column, which its first click sorts in
const COMPARATORS: Record<string, (a: PlayerScore, b: PlayerScore) => number> = {
  class: (a, b) => a.player.Class - b.player.Class,
  level: (a, b) => a.player.Level - b.player.Level,
  name: (a, b) => a.player.Name.localeCompare(b.player.Name),
  avg: (a, b) => (a.score?.avg ?? 0) - (b.score?.avg ?? 0),
  min: (a, b) => (a.score?.min ?? 0) - (b.score?.min ?? 0),
  max: (a, b) => (a.score?.max ?? 0) - (b.score?.max ?? 0)
}

const localize = useLocalize('simulator')

const mode = ref(readMode())

const pasteMode = ref(false)
const gladiatorMode = useStoredToggle('player_sim/gladiator')
const ihofMode = useStoredToggle('player_sim/ihof')
const noAttributeReductionMode = ref(false)

const players = shallowRef<PlayerScore[]>([])
const selectedIndex = ref(-1)
const yourselfIndex = ref(-1)

const sorting = ref<TableSorting>()

// Renders the list in plain colours for the screenshot, without the buttons and the selection
const screenshot = ref(false)

let nextIndex = 0

const editor = useTemplateRef('editor-ref')
const settings = useTemplateRef('settings-ref')
const tableElement = useTemplateRef('table-ref')

const isEditorValid = useComponentValidation(editor)

const isSettingsValid = useComponentValidation(useTemplateRef('mode-ref'), settings)

const modeOptions = computed<SelectOption<SimulatorMode>[]>(() => MODES.map((value) => ({ value, label: localize.global(`players.mode.${value}`) })))

// Only one player fights in these modes, and it is the one the crown is on
const isSingleTarget = computed(() => mode.value === 'attack' || mode.value === 'defend')

// Every player fights every other one, so their best and worst fight is worth showing
const showRange = computed(() => mode.value === 'all')

const sortedPlayers = computed(() => {
  const sort = sorting.value

  if (!sort) return players.value

  const compare = COMPARATORS[sort.column]

  return [...players.value].sort((a, b) => (sort.direction === 'asc' ? compare(a, b) : compare(b, a)))
})

const canSimulate = computed(() => isSettingsValid.value && players.value.length > 0 && (!isSingleTarget.value || players.value.some((entry) => entry.index === yourselfIndex.value)))

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

// The first player of the list fights when no crown is set, like on the legacy page
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
  return value === undefined ? '' : `${value.toFixed(2)}%`
}

function listPlayers() {
  return DatabaseManager.getLatestPlayers()
}

function clearEditor() {
  editor.value?.fill(undefined)
}

// The name is only filled in for a player added by hand, like on the legacy page
function addPlayer() {
  if (!editor.value) return

  const player = editor.value.read()

  if (player.Name === '') {
    player.Name = `Player ${players.value.length + 1}`
  }

  addEntry(player)
}

// A new player is selected right away, so it can be edited and saved back
function addEntry(player: PlayerModel) {
  selectedIndex.value = nextIndex++

  players.value = [{ player, score: null, index: selectedIndex.value }, ...players.value]

  clearEditor()
}

// Without a selected player the editor is added as a new one, like on the legacy page
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

// Clicks on the buttons of a row don't select it
function handleRowClick(event: MouseEvent, entry: PlayerScore) {
  if (event.target instanceof Element && event.target.closest('button')) return

  selectPlayer(entry)
}

function handleRowKeydown(event: KeyboardEvent, entry: PlayerScore) {
  if (event.key === 'Enter' && event.target === event.currentTarget) {
    selectPlayer(entry)
  }
}

function insertPlayer(data: unknown) {
  addEntry(preparePlayerData(data))
}

function isPlayer(value: unknown) {
  if (typeof value !== 'object' || value === null) return false

  return ('Class' in value && Boolean(value.Class)) || ('save' in value && Boolean(value.save))
}

// A list of players replaces the list, or is added to it in paste mode, a single player fills the editor
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
  copySimulatorData(players.value.map(({ player }) => ModelUtils.toSimulatorData(player)))
}

async function saveScreenshot() {
  if (!tableElement.value) return

  screenshot.value = true

  await nextTick()

  try {
    const canvas = await html2canvas(tableElement.value, { logging: false, backgroundColor: '#ffffff' })

    canvas.toBlob((blob) => {
      if (blob) {
        Exporter.download(`simulator_${Date.now()}.png`, blob)
      }
    })
  } finally {
    screenshot.value = false
  }
}

async function runSimulation(instances: number, iterations: number, onLogs?: (log: SimulatorLog) => void) {
  if (!canSimulate.value) return

  const entries = players.value.map((entry) => ({ ...entry, score: null }))

  players.value = entries

  const yourself = entries.find((entry) => entry.index === yourselfIndex.value)

  const collected: PlayerScore[] = []

  let logs: unknown[] = []

  const batch = new WorkerBatch<{ results: PlayerScore; logs: unknown[] }>('players')

  entries.forEach((entry, index) => {
    batch.add(
      (data) => {
        collected[index] = data.results

        if (onLogs) {
          logs = logs.concat(data.logs)
        }
      },
      {
        player: isSingleTarget.value ? yourself : entry,
        target: isSingleTarget.value ? entry : entries,
        flags: {
          Gladiator15: gladiatorMode.value,
          NoGladiatorReduction: ihofMode.value,
          NoAttributeReduction: noAttributeReductionMode.value
        },
        config: simulatorConfig.value,
        mode: mode.value,
        log: !!onLogs,
        iterations
      }
    )
  })

  const duration = await batch.run(instances)

  useToast({ title: localize('toast.title'), message: localize('toast.message', { duration: formatDuration(duration) }) })

  players.value = collected

  sorting.value = { column: 'avg', direction: 'desc' }

  if (onLogs && logs.length > 0) {
    onLogs({ fights: logs, players: players.value.map(({ player }) => player), config: simulatorConfig.value })
  }
}

function simulate() {
  if (!settings.value) return

  const instances = Math.max(1, settings.value.threads || 4)
  const iterations = Math.max(1, settings.value.iterations || 2500)

  void runSimulation(instances, iterations)
}

function runLogged(target: SimulatorLogTarget) {
  void runSimulation(1, 500, (log) => saveSimulatorLog(target, log))
}

function openFeedback() {
  useDialog(FeedbackDialog, { tool: 'simulator' })
}
</script>
