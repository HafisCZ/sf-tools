<template>
  <Page>
    <template #nav-left>
      <StatisticsIntegration type="players" :profile="SELF_PROFILE" :scope="listPlayers" cheats @select="insertPlayer" />
      <span class="mx-1.5 h-5 w-px bg-white/12" />
      <SFButton variant="ghost" @click="openOptions">
        <SFIcon name="gear" />
        {{ localize.global('analyzer.topbar.options') }}
      </SFButton>
      <a
        href="https://github.com/HafisCZ/sf-tools/wiki/%5BWIP%5D-Tools-Overview#dungeon-simulator"
        target="_blank"
        class="inline-flex min-h-9.5 items-center gap-2 rounded-md px-4 py-2 leading-5 font-bold text-white/90 transition hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <SFIcon name="book" />
        Wiki - How to use
      </a>
      <SimulatorDebug logs copy @log="runLogged" @copy="copyAll" />
    </template>

    <SimulatorPasteTarget @paste="handlePaste" />

    <div class="grid gap-7 md:grid-cols-2">
      <PlayerEditor ref="editor-ref" v-model:fighter="fighter" name-readonly :fighters="fighterTabs" :companion="selectedIndex > 0" :equipment="source !== null" @copy="copyPlayer" @view="changeItemView">
        <template #equipment>
          <EquipmentEditor v-if="source" :source="source" :index="selectedIndex" :swaps="swaps[selectedIndex]" :character="characterState" @change="applySwaps" />
        </template>
      </PlayerEditor>

      <div>
        <div class="grid grid-cols-16 items-center gap-[14px]">
          <SimulatorSettings ref="settings-ref" storage-key="dungeon_sim" :default-threads="4" :default-iterations="50000" class="col-span-16 sm:col-span-6" />
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

        <div class="mt-[18px] flex flex-col gap-[14px]">
          <div class="relative">
            <SFSelect ref="dungeon-ref" :model-value="dungeonId" :label="localize('enemy')" :options="dungeonOptions" search size="lg" @update:model-value="selectDungeon" />
            <DungeonBossFinder :dungeon-id="dungeonId" :boss-id="bossId" class="absolute top-2.5 right-0 -translate-y-1/2" @select="findBoss" />
          </div>
          <SFSelect ref="boss-ref" :model-value="bossId" :options="bossOptions" search size="lg" @update:model-value="selectBoss" />
          <SFSelect ref="open-ref" :model-value="openIndex" :label="localize('open')" :options="openBossOptions" search size="lg" :readonly="openBosses.length === 0" @update:model-value="selectOpenBoss" />
        </div>

        <DungeonChart ticks :result="chartResult" :decimals="decimals" class="mt-14 h-[17.75em] transition-opacity" :class="{ 'opacity-50': isChartOutdated }" />
        <div class="relative h-[1.5em] text-[80%] opacity-50">
          <span class="absolute left-[0.5em]">{{ localize('graph.y') }}</span>
          <span class="absolute left-[37%]">{{ localize('graph.x') }}</span>
        </div>
      </div>
    </div>

    <template #footer-right>
      <PageFooterLinks tool="dungeons" />
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
import { compact, copyJson, getClassImageUrl, sum, useSubmit } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import { PlayerModel } from '~/core/models/player'
import { ModelUtils } from '~/core/models/utils'
import { OptionsHandler } from '~/core/options'
import { SELF_PROFILE } from '~/core/profiles'
import { Site } from '~/core/site'
import { DatabaseManager } from '~/data/database-manager'
import { type Cheats } from '~/integration/cheats'
import StatisticsIntegration from '~/integration/StatisticsIntegration.vue'
import PageFooterLinks from '~/pages/components/PageFooterLinks.vue'
import Page from '~/pages/Page.vue'
import EquipmentEditor from '~/sim/components/EquipmentEditor.vue'
import PlayerEditor from '~/sim/components/PlayerEditor.vue'
import SimulatorDebug from '~/sim/components/SimulatorDebug.vue'
import SimulatorPasteTarget from '~/sim/components/SimulatorPasteTarget.vue'
import SimulatorSettings from '~/sim/components/SimulatorSettings.vue'
import {
  copyDungeonSharedValues,
  createDungeonFight,
  createSimulatorBoss,
  DUNGEON_COMPANION_CLASSES,
  DUNGEON_DATA,
  DUNGEON_SHARED_PATHS,
  formatRunes,
  getBossName,
  getDungeonExperience,
  getDungeonName,
  getOpenBosses,
  getRemainingBosses,
  PREVIOUS_DUNGEONS,
  SANDSTORM,
  TWISTER,
  type Dungeon,
  type DungeonEntry,
  type DungeonResult
} from '~/sim/data/dungeons'
import { copySimulatorData, handleSimulatorPaste, preparePlayerData, type SimulatorLogTarget } from '~/sim/debug'
import { useDungeonSimulator } from '~/sim/dungeons'
import { applyEquipmentSwaps, createCharacterState, LIFE_POTION_TYPE, type CharacterState, type EquipmentSwaps } from '~/sim/equipment'
import { WARRIOR } from '~/sim/workers/base'
import DungeonBossFinder from './components/DungeonBossFinder.vue'
import DungeonChart from './components/DungeonChart.vue'
import DungeonOptionsDialog from './dialogs/DungeonOptionsDialog.vue'
import DungeonResultsDialog from './dialogs/DungeonResultsDialog.vue'

defineOptions({
  name: 'DungeonsPage'
})

type DungeonsOptions = {
  threshold_min: number
  threshold_max: number
  include_twister: boolean
  include_sandstorm: boolean
  twister_floors: number
  sandstorm_floors: number
  decimals: number
  show_mushrooms: boolean
  image_background: 'dark' | 'white'
}

const SHADOW_COLOR = '#dec0ff'

const localize = useLocalize('dungeons')

const dungeonSimulator = useDungeonSimulator()

const options = new OptionsHandler<DungeonsOptions>('dungeons', { threshold_min: 5, threshold_max: 100, include_twister: false, include_sandstorm: false, twister_floors: 1000, sandstorm_floors: 1000, decimals: 2, show_mushrooms: false, image_background: 'dark' })

const dungeonId = ref('1')
const bossId = ref(getFirstBossId('1'))
const openIndex = ref('')

const openBosses = shallowRef<DungeonEntry[]>([])

const players = shallowRef<(PlayerModel | null)[]>([null, null, null, null])
const selectedIndex = ref(0)

const source = shallowRef<PlayerModel | null>(null)
const swaps = shallowRef<EquipmentSwaps[]>([{}, {}, {}, {}])
const characterState = shallowRef<CharacterState>(createCharacterState(new PlayerModel()))
const isItemView = ref(false)

const chartResult = shallowRef<DungeonResult | null>(null)
const isChartOutdated = ref(false)
const decimals = ref(options.decimals)

let filledSnapshot = ''
let isFillPending = false

const editor = useTemplateRef('editor-ref')
const settings = useTemplateRef('settings-ref')

const isEditorValid = useComponentValidation(editor)

const isSettingsValid = useComponentValidation(settings, useTemplateRef('dungeon-ref'), useTemplateRef('boss-ref'), useTemplateRef('open-ref'))

const FIGHTER_NAME_KEYS = ['dungeons.player', 'general.companion1', 'general.companion2', 'general.companion3']

const fighterNames = computed(() => FIGHTER_NAME_KEYS.map((key) => localize.global(key)))

const fighterTabs = computed(() => fighterNames.value.map((name, index) => ({ index, name })))

const fighter = computed({
  get: () => selectedIndex.value,
  set: (index) => {
    void selectFighter(index)
  }
})

const selectedDungeon = computed(() => DUNGEON_DATA[dungeonId.value])

const selectedEntry = computed((): DungeonEntry => ({ dungeon: selectedDungeon.value, boss: selectedDungeon.value.floors[bossId.value] }))

const canSimulateSelected = computed(() => isEditorValid.value && isSettingsValid.value && hasFighters([selectedDungeon.value]))

const canSimulateOpen = computed(() => isEditorValid.value && isSettingsValid.value && openBosses.value.length > 0 && hasFighters(openBosses.value.map(({ dungeon }) => dungeon)))

const { submit: simulate, isSubmitting: isSimulating } = useSubmit(runSelected)
const { submit: simulateRemaining, isSubmitting: isSimulatingRemaining } = useSubmit(runRemaining)
const { submit: simulateAll, isSubmitting: isSimulatingAll } = useSubmit(runAll)
const { submit: simulateNext, isSubmitting: isSimulatingNext } = useSubmit(runNext)

const { submit: runLogged, isSubmitting: isLogging } = useSubmit(async (target: SimulatorLogTarget) => {
  await runBoss(1, 50, target)
})

const isRunning = computed(() => isSimulating.value || isSimulatingRemaining.value || isSimulatingAll.value || isSimulatingNext.value || isLogging.value)

const DUNGEONS = Object.values(DUNGEON_DATA)
  .filter((dungeon) => Object.keys(dungeon.floors).length > 0)
  .sort((a, b) => a.pos - b.pos)

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

function updatePlayers(list: (PlayerModel | null)[]) {
  const [player] = list

  players.value = list.map((entry, index) => {
    if (entry) {
      entry.Name = fighterNames.value[index]

      if (index > 0) {
        entry.Class = DUNGEON_COMPANION_CLASSES[index - 1]

        if (player) {
          copyDungeonSharedValues(entry, player)
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
    data.Class = DUNGEON_COMPANION_CLASSES[index - 1]

    if (player) {
      copyDungeonSharedValues(data, player)
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

  if (isItemView.value) {
    applySwaps(swaps.value[index], characterState.value)
  }
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

function findBoss(dungeon: string, boss: string) {
  selectDungeon(dungeon)
  selectBoss(boss)
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

  source.value = null
  swaps.value = [{}, {}, {}, {}]
  isItemView.value = false

  fillEditor()

  isChartOutdated.value = true
}

function insertPlayer(entry: PlayerModel, cheats?: Cheats) {
  insertFighters(ModelUtils.toSimulatorData(entry, true))

  // Cheats are applied on top of the raw data the swap rebuilds from, so the two can not be combined
  source.value = cheats || !entry.Inventory ? null : entry

  characterState.value = createCharacterState(entry)

  openBosses.value = entry.Dungeons ? getOpenBosses(entry.Dungeons) : []
  openIndex.value = ''
}

function changeItemView(open: boolean) {
  isItemView.value = open

  if (open) {
    applySwaps(swaps.value[selectedIndex.value], withLifePotion(characterState.value, players.value[selectedIndex.value]))
  }
}

function withLifePotion(state: CharacterState, fighter: PlayerModel | null) {
  const size = fighter?.Potions?.Life ?? 0
  const free = state.potions.findIndex((potion) => potion.type === 0)

  if (!size || free === -1 || state.potions.some((potion) => potion.type === LIFE_POTION_TYPE)) return state

  return { ...state, potions: state.potions.map((potion, index) => (index === free ? { type: LIFE_POTION_TYPE, size } : potion)) }
}

const REBUILD_PATHS = DUNGEON_SHARED_PATHS.filter((path) => path !== 'Potions.Life')

function applySwaps(entries: EquipmentSwaps, character: CharacterState) {
  const player = source.value

  if (!player) return

  const index = selectedIndex.value

  swaps.value = swaps.value.map((entry, position) => (position === index ? entries : entry))
  characterState.value = character

  const rebuilt = applyEquipmentSwaps(player, swaps.value, character)
  const list = ModelUtils.toSimulatorData(rebuilt, true)
  const fighter = preparePlayerData(Array.isArray(list) ? list[index] : list)

  const current = players.value[index]

  if (current) {
    copyDungeonSharedValues(fighter, current, REBUILD_PATHS)
  }

  updatePlayers(players.value.map((entry, position) => (position === index ? fighter : entry)))

  fillEditor()

  isChartOutdated.value = true
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

function prepareFights(entries: DungeonEntry[]) {
  return compact(entries.map((entry) => createDungeonFight(entry, players.value)))
}

function readSettings() {
  return {
    instances: Math.max(1, settings.value?.threads || 4),
    iterations: Math.max(1, settings.value?.iterations || 5000)
  }
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
    playerClass: players.value[0]?.Class ?? WARRIOR,
    decimals: decimals.value,
    showMushrooms: options.show_mushrooms,
    imageBackground: options.image_background,
    onToggleMushrooms: (shown) => {
      options.show_mushrooms = shown
    }
  })
}

async function runBoss(instances: number, iterations: number, log?: SimulatorLogTarget) {
  const fight = createDungeonFight(selectedEntry.value, players.value)

  if (!canSimulateSelected.value || !fight) return

  const boss = await dungeonSimulator.simulateBoss(fight, { instances, iterations }, log)

  if (!boss) return

  chartResult.value = boss.result

  isChartOutdated.value = false
}

async function runBosses(entries: DungeonEntry[]) {
  const bosses = await dungeonSimulator.simulateBosses(prepareFights(entries), readSettings())

  return bosses ? bosses.results : null
}

function getLimitedRemainingBosses(entry: DungeonEntry) {
  const entries = getRemainingBosses(entry)

  if (entry.dungeon.id === TWISTER) return entries.slice(0, options.twister_floors)
  if (entry.dungeon.id === SANDSTORM) return entries.slice(0, options.sandstorm_floors)

  return entries
}

async function runSelected() {
  const { instances, iterations } = readSettings()

  await runBoss(instances, iterations)
}

async function runRemaining() {
  if (!canSimulateSelected.value) return

  const results = await runBosses(getLimitedRemainingBosses(selectedEntry.value))

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

  const entries = openBosses.value.filter(({ dungeon }) => (dungeon.id !== TWISTER || options.include_twister) && (dungeon.id !== SANDSTORM || options.include_sandstorm)).flatMap(getLimitedRemainingBosses)

  const next = await dungeonSimulator.simulateNext(prepareFights(entries), { min: thresholdMin, max: thresholdMax }, { instances, iterations })

  if (!next) return

  const found = next.results

  if (found.length > 0) {
    showResults(sortByDungeonOrder(found))
  } else {
    useToast({ title: localize('simulate_next_info.title', { threshold_min: thresholdMin, threshold_max: thresholdMax }), message: localize('simulate_next_info.message#').replace(/<[^>]+>/g, '') })
  }
}

function openOptions() {
  useDialog(
    DungeonOptionsDialog,
    {
      thresholdMin: options.threshold_min,
      thresholdMax: options.threshold_max,
      includeTwister: options.include_twister,
      includeSandstorm: options.include_sandstorm,
      twisterFloors: options.twister_floors,
      sandstormFloors: options.sandstorm_floors,
      decimals: options.decimals,
      imageBackground: options.image_background
    },
    {
      callback: (values) => {
        if (values) {
          options.threshold_min = values.thresholdMin
          options.threshold_max = values.thresholdMax
          options.include_twister = values.includeTwister
          options.include_sandstorm = values.includeSandstorm
          options.twister_floors = values.twisterFloors
          options.sandstorm_floors = values.sandstormFloors
          options.decimals = values.decimals
          options.image_background = values.imageBackground

          decimals.value = values.decimals
        }
      }
    }
  )
}
</script>
