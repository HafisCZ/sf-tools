<template>
  <Page>
    <template #nav-left>
      <SFButton variant="ghost" @click="openOptions">
        <SFIcon name="gear" />
        {{ localize.global('analyzer.topbar.options') }}
      </SFButton>
      <a :href="WIKI_URL" target="_blank" class="inline-flex min-h-9.5 items-center gap-2 rounded-md px-4 py-2 leading-5 font-bold text-white/90 transition hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        <SFIcon name="book" />
        Wiki - How to use
      </a>
      <SimulatorDebug logs copy @log="runLogged" @copy="copyAll" />
    </template>

    <StatisticsIntegration type="players" :profile="PROFILE" :scope="listPlayers" cheats @select="insertPlayer" />
    <SimulatorPasteTarget @paste="handlePaste" />

    <div class="grid gap-7 md:grid-cols-2">
      <PlayerEditor ref="editor-ref" name-readonly :companion="selectedIndex > 0" @copy="copyPlayer" />

      <div>
        <div class="grid grid-cols-16 items-center gap-[14px]">
          <SimulatorSettings ref="settings-ref" storage-key="dungeon_sim" :default-threads="4" :default-iterations="5000" class="col-span-16 sm:col-span-6" />
          <div class="col-span-16 flex gap-1 sm:col-span-10">
            <SFButton variant="outline" block :disabled="isSimulating ? 'loading' : isRunning || !canSimulateSelected" @click="simulate">
              {{ localize('simulate_one') }}
            </SFButton>
            <SFButton variant="outline" block :disabled="isSimulatingRemaining ? 'loading' : isRunning || !canSimulateSelected" @click="simulateRemaining">
              {{ localize('simulate_remaining') }}
            </SFButton>
            <SFButton variant="outline" block :disabled="isSimulatingAll ? 'loading' : isRunning || !canSimulateOpen" @click="simulateAll">
              {{ localize('simulate_all') }}
            </SFButton>
            <SFButton variant="outline" block :disabled="isSimulatingNext ? 'loading' : isRunning || !canSimulateOpen" @click="simulateNext">
              {{ localize('simulate_next') }}
            </SFButton>
          </div>
        </div>

        <div class="mt-[25px] grid grid-cols-2 border-b border-white/50 pb-1.5 text-center">
          <span>{{ localize('player') }}</span>
          <span>{{ localize('enemy') }}</span>
        </div>

        <div class="mt-2 grid grid-cols-2 gap-[28px]">
          <div class="-mx-[14px] flex flex-col">
            <button
              v-for="(name, index) in fighterNames"
              :key="index"
              type="button"
              class="grid h-[4em] cursor-pointer grid-cols-4 items-center text-center font-bold outline-none select-none"
              :class="index === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5 focus-visible:bg-white/5'"
              :aria-pressed="index === selectedIndex"
              @click="selectFighter(index)"
            >
              <img :src="`/res/portrait${index || ''}.png`" alt="" class="mx-auto w-[50px] opacity-75" />
              <span class="col-span-2">{{ name }}</span>
            </button>
          </div>
          <div class="flex flex-col pt-[9px]">
            <SFSelect ref="dungeon-ref" :model-value="dungeonId" :options="dungeonOptions" search @update:model-value="selectDungeon" />
            <SFSelect ref="boss-ref" :model-value="bossId" :options="bossOptions" search class="mt-[1.25em]" @update:model-value="selectBoss" />
            <SFSelect ref="open-ref" :model-value="openIndex" :label="localize('open')" :options="openBossOptions" search :readonly="openBosses.length === 0" class="mt-[3.5em]" @update:model-value="selectOpenBoss" />
          </div>
        </div>

        <DungeonChart ticks :result="chartResult" class="mt-[11px] h-[17.75em] transition-opacity" :class="{ 'opacity-50': isChartOutdated }" />
        <div class="relative h-[1.5em] text-[80%] opacity-50">
          <span class="absolute left-[0.5em]">{{ localize('graph.y') }}</span>
          <span class="absolute left-[37%]">{{ localize('graph.x') }}</span>
        </div>
      </div>
    </div>

    <template #footer-right>
      <FooterLink icon="message" @click="openFeedback">
        {{ localize.global('index.footer.report') }}
      </FooterLink>
      <FooterLink icon="basket-shopping" href="https://home.sfgame.net">
        <span v-html="localize.global('index.footer.webshop#')" />
      </FooterLink>
      <FooterCopyright />
    </template>
  </Page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFIcon from '@library/SFIcon.vue'
import SFSelect from '@library/SFSelect.vue'
import { type SelectOption } from '@utils/components'
import { useDialog } from '@utils/dialogs'
import { useLocalize } from '@utils/localization'
import { useToast } from '@utils/toasts'
import { compact, copyJson, getClassImageUrl, getValueAtPath, sequence, setValueAtPath, sum, useSubmit } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import { PlayerModel } from '~/core/models/player'
import { ModelUtils } from '~/core/models/utils'
import { OptionsHandler } from '~/core/options'
import { SELF_PROFILE } from '~/core/profiles'
import { Site } from '~/core/site'
import { DatabaseManager } from '~/data/database-manager'
import FeedbackDialog from '~/dialogs/FeedbackDialog.vue'
import StatisticsIntegration from '~/integration/StatisticsIntegration.vue'
import FooterCopyright from '~/pages/components/FooterCopyright.vue'
import FooterLink from '~/pages/components/FooterLink.vue'
import Page from '~/pages/Page.vue'
import { WARRIOR } from '~/sim/base'
import PlayerEditor from '~/sim/components/PlayerEditor.vue'
import SimulatorDebug from '~/sim/components/SimulatorDebug.vue'
import SimulatorPasteTarget from '~/sim/components/SimulatorPasteTarget.vue'
import SimulatorSettings from '~/sim/components/SimulatorSettings.vue'
import { createBoss, createDungeonPlayers, createSimulatorBoss, DUNGEON_DATA, getBossName, getDungeonExperience, getDungeonName, getOpenBosses, getRemainingBosses, NEXT_DUNGEONS, PREVIOUS_DUNGEONS, SANDSTORM, TWISTER, type Dungeon, type DungeonEntry, type DungeonResult, type DungeonRunes } from '~/sim/data/dungeons'
import { copySimulatorData, handleSimulatorPaste, preparePlayerData, saveSimulatorLog, simulatorConfig, type SimulatorConfig, type SimulatorLogTarget } from '~/sim/debug'
import { WorkerBatch } from '~/sim/workers'
import DungeonChart from './components/DungeonChart.vue'
import DungeonOptionsDialog from './dialogs/DungeonOptionsDialog.vue'
import DungeonResultsDialog from './dialogs/DungeonResultsDialog.vue'

defineOptions({
  name: 'DungeonsPage'
})

type DungeonsOptions = {
  threshold_min: number
  threshold_max: number
}

type DungeonFight = {
  players: PlayerModel[]
  boss: ReturnType<typeof createBoss>
}

type DungeonWorkerParams = DungeonFight & {
  iterations: number
  config: SimulatorConfig | null
  hpcap?: number
  log?: boolean
}

type DungeonWorkerResult = {
  results: {
    score: number
    iterations: number
    enemyHealths: number[]
    playersHealths: number[]
  }
  logs: unknown[]
}

type SimulatorLog = {
  fights: unknown[]
  players: unknown[]
  config: SimulatorConfig | null
}

const PROFILE = SELF_PROFILE

const WIKI_URL = 'https://github.com/HafisCZ/sf-tools/wiki/%5BWIP%5D-Tools-Overview#dungeon-simulator'

const FIGHTER_NAME_KEYS = ['dungeons.player', 'general.companion1', 'general.companion2', 'general.companion3']

const COMPANION_CLASSES: CharacterClass[] = [1, 2, 3]

const SHARED_PATHS = ['Level', 'Fortress.Gladiator', 'Dungeons.Player', 'Dungeons.Group', 'Potions.Life']

const SHADOW_COLOR = '#dec0ff'

const RUNE_LETTERS = ['F', 'C', 'L']

const HEALTH_CAP = 500

const DUNGEONS = Object.values(DUNGEON_DATA)
  .filter((dungeon) => Object.keys(dungeon.floors).length > 0)
  .sort((a, b) => a.pos - b.pos)

const localize = useLocalize('dungeons')

const options = new OptionsHandler<DungeonsOptions>('dungeons', { threshold_min: 5, threshold_max: 100 })

const dungeonId = ref('1')
const bossId = ref(getFirstBossId('1'))
const openIndex = ref('')

const openBosses = shallowRef<DungeonEntry[]>([])

const players = shallowRef<(PlayerModel | null)[]>([null, null, null, null])
const selectedIndex = ref(0)

const chartResult = shallowRef<DungeonResult | null>(null)
const isChartOutdated = ref(false)

let filledSnapshot = ''
let isFillPending = false

const editor = useTemplateRef('editor-ref')
const settings = useTemplateRef('settings-ref')

const isEditorValid = useComponentValidation(editor)

const isSettingsValid = useComponentValidation(settings, useTemplateRef('dungeon-ref'), useTemplateRef('boss-ref'), useTemplateRef('open-ref'))

const fighterNames = computed(() => FIGHTER_NAME_KEYS.map((key) => localize.global(key)))

const selectedDungeon = computed(() => DUNGEON_DATA[dungeonId.value])

const selectedEntry = computed((): DungeonEntry => ({ dungeon: selectedDungeon.value, boss: selectedDungeon.value.floors[bossId.value] }))

const canSimulateSelected = computed(() => isEditorValid.value && isSettingsValid.value && hasFighters([selectedDungeon.value]))

const canSimulateOpen = computed(() => isEditorValid.value && isSettingsValid.value && openBosses.value.length > 0 && hasFighters(openBosses.value.map(({ dungeon }) => dungeon)))

const { submit: simulate, isSubmitting: isSimulating } = useSubmit(runSelected)
const { submit: simulateRemaining, isSubmitting: isSimulatingRemaining } = useSubmit(runRemaining)
const { submit: simulateAll, isSubmitting: isSimulatingAll } = useSubmit(runAll)
const { submit: simulateNext, isSubmitting: isSimulatingNext } = useSubmit(runNext)

const { submit: runLogged, isSubmitting: isLogging } = useSubmit(async (target: SimulatorLogTarget) => {
  await runBoss(1, 50, (log) => saveSimulatorLog(target, log))
})

const isRunning = computed(() => isSimulating.value || isSimulatingRemaining.value || isSimulatingAll.value || isSimulatingNext.value || isLogging.value)

const dungeonOptions = computed<SelectOption[]>(() => DUNGEONS.map((dungeon) => ({ value: String(dungeon.id), label: getDungeonName(dungeon), color: dungeon.companions ? SHADOW_COLOR : undefined })))

const bossOptions = computed<SelectOption[]>(() => Object.entries(selectedDungeon.value.floors).map(([id, boss]) => createBossOption(id, { dungeon: selectedDungeon.value, boss }, formatRunes(boss.runes))))

const openBossOptions = computed<SelectOption[]>(() => openBosses.value.map((entry, index) => createBossOption(String(index), entry, compact([getDungeonName(entry.dungeon), formatRunes(entry.boss.runes)]).join(' · '))))

const editedPlayer = computed((): PlayerModel | null => (editor.value?.isValid ? editor.value.read() : null))

watch(editedPlayer, (player) => {
  if (!player || isFillPending) return

  const snapshot = JSON.stringify(player)

  if (snapshot === filledSnapshot) return

  filledSnapshot = snapshot

  updatePlayers(players.value.map((entry, index) => (index === selectedIndex.value ? player : entry)))

  isChartOutdated.value = true
})

onMounted(() => {
  fillEditor()
})

Site.data = {
  currentBoss: () => createSimulatorBoss(selectedEntry.value, getMainPlayer()),
  currentDungeon: () => Object.values(selectedDungeon.value.floors).map((boss) => createSimulatorBoss({ dungeon: selectedDungeon.value, boss }, getMainPlayer()))
}

function getFirstBossId(id: string) {
  return Object.keys(DUNGEON_DATA[id].floors)[0]
}

function getMainPlayer() {
  return players.value[0] ?? new PlayerModel()
}

function formatRunes(runes: DungeonRunes | undefined) {
  if (!runes) return ''

  const damage = `${runes.damage} ${RUNE_LETTERS[runes.type - 40]}`
  const resistances = RUNE_LETTERS.flatMap((letter, index) => (runes.res?.[index] ? [`${runes.res[index]} ${letter}`] : [])).join(' ')

  return resistances ? `${damage} / ${resistances}` : damage
}

function createBossOption(value: string, entry: DungeonEntry, description: string): SelectOption {
  return {
    value,
    label: `${entry.boss.pos}. ${getBossName(entry)}`,
    image: entry.boss.class === undefined ? undefined : getClassImageUrl(entry.boss.class),
    imagePosition: 'right',
    description,
    color: entry.dungeon.companions ? SHADOW_COLOR : undefined
  }
}

function hasFighters(dungeons: Dungeon[]) {
  const [player, ...companions] = players.value

  return player !== null && (dungeons.every((dungeon) => !dungeon.companions) || companions.every((companion) => companion !== null))
}

function copySharedValues(target: PlayerModel, source: PlayerModel) {
  for (const path of SHARED_PATHS) {
    setValueAtPath(target, path, getValueAtPath(source, path))
  }
}

function updatePlayers(list: (PlayerModel | null)[]) {
  const [player] = list

  players.value = list.map((entry, index) => {
    if (entry) {
      entry.Name = fighterNames.value[index]

      if (index > 0) {
        entry.Class = COMPANION_CLASSES[index - 1]

        if (player) {
          copySharedValues(entry, player)
        }
      }
    }

    return entry
  })
}

function fillEditor() {
  if (!editor.value) return

  const index = selectedIndex.value
  const player = players.value[0]

  const data = structuredClone(players.value[index]) ?? new PlayerModel()

  if (index > 0) {
    data.Class = COMPANION_CLASSES[index - 1]

    if (player) {
      copySharedValues(data, player)
    }
  }

  data.Name = fighterNames.value[index]

  editor.value.fill(data)

  filledSnapshot = JSON.stringify(editor.value.read())
}

// The companion prop has to reach the editor before it is filled, and the editor still holds the previous fighter until then
async function selectFighter(index: number) {
  isFillPending = true

  selectedIndex.value = index

  await nextTick()

  fillEditor()

  isFillPending = false
}

function selectDungeon(value: string) {
  dungeonId.value = value
  bossId.value = getFirstBossId(value)
  openIndex.value = ''

  isChartOutdated.value = true
}

function selectBoss(value: string) {
  bossId.value = value
  openIndex.value = ''

  isChartOutdated.value = true
}

function selectOpenBoss(value: string) {
  const entry = openBosses.value[Number(value)]

  openIndex.value = value
  dungeonId.value = String(entry.dungeon.id)
  bossId.value = Object.keys(entry.dungeon.floors).find((id) => entry.dungeon.floors[id] === entry.boss) ?? getFirstBossId(dungeonId.value)

  isChartOutdated.value = true
}

function listPlayers() {
  return DatabaseManager.getLatestPlayers(true)
}

function hasClass(value: unknown) {
  return typeof value === 'object' && value !== null && 'Class' in value && Boolean(value.Class)
}

function insertFighters(data: unknown) {
  if (Array.isArray(data)) {
    const list = data.map((item: unknown) => preparePlayerData(item))

    updatePlayers(players.value.map((player, index) => list.at(index) ?? player))
  } else if (hasClass(data)) {
    const player = preparePlayerData(data)

    updatePlayers(players.value.map((entry, index) => (index === selectedIndex.value ? player : entry)))
  } else {
    return
  }

  fillEditor()

  isChartOutdated.value = true
}

function insertPlayer(entry: PlayerModel) {
  insertFighters(ModelUtils.toSimulatorData(entry, true))

  openBosses.value = entry.Dungeons ? getOpenBosses(entry.Dungeons) : []
  openIndex.value = ''
}

function handlePaste(value: unknown) {
  try {
    insertFighters(handleSimulatorPaste(value))
  } catch (e) {
    console.info(e)
  }
}

function copyPlayer(player: PlayerModel) {
  void copyJson(player)
}

function copyAll() {
  copySimulatorData(players.value.map((player) => ModelUtils.toSimulatorData(player ?? new PlayerModel())))
}

function prepareFight(entry: DungeonEntry): DungeonFight | null {
  const [player, ...companions] = players.value
  const ready = compact(companions)

  if (!player || (entry.dungeon.companions && ready.length < companions.length)) return null

  return {
    players: createDungeonPlayers(entry.dungeon, player, ready),
    boss: createBoss(entry, player)
  }
}

function readSettings() {
  return {
    instances: Math.max(1, settings.value?.threads || 4),
    iterations: Math.max(1, settings.value?.iterations || 5000)
  }
}

function averageHealths(healths: number[][]) {
  return (healths.at(0) ?? []).map((_, index) => sum(healths.map((values) => values[index])) / healths.length).sort((a, b) => a - b)
}

function sortByDungeonOrder(results: DungeonResult[]) {
  const sorted: DungeonResult[] = []

  for (const result of results) {
    const { score, boss, dungeon } = result

    const lowerChanceIndex = sorted.findIndex((other) => other.score < score)

    let index = sorted.length

    if (lowerChanceIndex !== -1) {
      let sameDungeonIndex = -1

      for (let i = sorted.length - 1; i >= 0; i--) {
        const other = sorted[i]

        if ((other.dungeon.id === dungeon.id && other.boss.pos < boss.pos) || (dungeon.id in PREVIOUS_DUNGEONS && other.dungeon.id === PREVIOUS_DUNGEONS[dungeon.id])) {
          sameDungeonIndex = i

          break
        }
      }

      index = sameDungeonIndex === -1 ? lowerChanceIndex : Math.max(lowerChanceIndex, sameDungeonIndex + 1)
    }

    sorted.splice(index, 0, result)
  }

  return sorted
}

function showResults(results: DungeonResult[]) {
  useDialog(DungeonResultsDialog, {
    results,
    experience: sum(results.map(getDungeonExperience)),
    playerClass: players.value[0]?.Class ?? WARRIOR
  })
}

async function runBoss(instances: number, iterations: number, onLogs?: (log: SimulatorLog) => void) {
  const entry = selectedEntry.value
  const fight = prepareFight(entry)

  if (!canSimulateSelected.value || !fight) return

  const enemyHealths: number[][] = []
  const playersHealths: number[][] = []

  let score = 0
  let logs: unknown[] = []

  const batch = new WorkerBatch<DungeonWorkerResult, DungeonWorkerParams>('dungeons')

  sequence(instances).forEach(() => {
    batch.add(
      (data) => {
        enemyHealths.push(data.results.enemyHealths)
        playersHealths.push(data.results.playersHealths)

        score += data.results.score
        logs = logs.concat(data.logs)
      },
      {
        ...fight,
        config: simulatorConfig.value,
        log: !!onLogs,
        iterations
      }
    )
  })

  const duration = await batch.run(instances)

  if (duration === null) return

  chartResult.value = { ...entry, score, iterations: instances * iterations, enemyHealths: averageHealths(enemyHealths), playersHealths: averageHealths(playersHealths) }

  isChartOutdated.value = false

  if (onLogs && logs.length > 0) {
    onLogs({ fights: logs, players: [...fight.players, fight.boss], config: simulatorConfig.value })
  }
}

async function runBosses(entries: DungeonEntry[]) {
  const { instances, iterations } = readSettings()

  const results: DungeonResult[] = []

  const batch = new WorkerBatch<DungeonWorkerResult, DungeonWorkerParams>('dungeons')

  entries.forEach((entry, index) => {
    const fight = prepareFight(entry)

    if (!fight) return

    batch.add(
      (data) => {
        results[index] = { ...entry, ...data.results }
      },
      {
        ...fight,
        iterations,
        hpcap: HEALTH_CAP,
        config: simulatorConfig.value
      }
    )
  })

  const duration = await batch.run(instances)

  if (duration === null) return null

  return compact(results)
}

async function runSelected() {
  const { instances, iterations } = readSettings()

  await runBoss(instances, iterations)
}

async function runRemaining() {
  if (!canSimulateSelected.value) return

  const results = await runBosses(getRemainingBosses(selectedEntry.value))

  if (!results) return

  showResults(results)
}

async function runAll() {
  if (!canSimulateOpen.value) return

  const results = await runBosses(openBosses.value)

  if (!results) return

  showResults(results.sort((a, b) => b.score - a.score))
}

async function runNext() {
  if (!canSimulateOpen.value) return

  const { instances, iterations } = readSettings()

  const thresholdMin = Math.min(Math.max(options.threshold_min, 0), 100)
  const thresholdMax = Math.min(Math.max(options.threshold_max, thresholdMin), 100)

  const entries = openBosses.value.filter(({ dungeon }) => dungeon.id !== TWISTER && dungeon.id !== SANDSTORM).flatMap(getRemainingBosses)

  const results: DungeonResult[] = []

  const batch = new WorkerBatch<DungeonWorkerResult, DungeonWorkerParams & { id: number }>('dungeons')

  entries.forEach((entry, index) => {
    const fight = prepareFight(entry)

    if (!fight) return

    batch.add(
      (data) => {
        const score = data.results.score

        if (score < (thresholdMin * iterations) / 100 || score > (thresholdMax * iterations) / 100) {
          batch.skip(({ id }) => id === entry.dungeon.id || id === NEXT_DUNGEONS[entry.dungeon.id])
        } else {
          results[index] = { ...entry, ...data.results }
        }
      },
      {
        ...fight,
        iterations,
        hpcap: HEALTH_CAP,
        config: simulatorConfig.value,
        id: entry.dungeon.id
      }
    )
  })

  // Execute instance only if there is none running with the same dungeon id
  const duration = await batch.run(instances, ({ id }, { id: running }) => id !== running && PREVIOUS_DUNGEONS[id] !== running)

  if (duration === null) return

  const found = compact(results)

  if (found.length > 0) {
    showResults(sortByDungeonOrder(found))
  } else {
    useToast({ title: localize('simulate_next_info.title', { threshold_min: thresholdMin, threshold_max: thresholdMax }), message: localize('simulate_next_info.message#').replace(/<[^>]+>/g, '') })
  }
}

function openOptions() {
  useDialog(
    DungeonOptionsDialog,
    { thresholdMin: options.threshold_min, thresholdMax: options.threshold_max },
    {
      callback: (threshold) => {
        if (threshold) {
          options.threshold_min = threshold[0]
          options.threshold_max = threshold[1]
        }
      }
    }
  )
}

function openFeedback() {
  useDialog(FeedbackDialog, { tool: 'dungeons' })
}
</script>
