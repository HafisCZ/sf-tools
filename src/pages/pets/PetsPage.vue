<template>
  <Page>
    <template #nav>
      <SimulatorDebug logs @log="runLogged" />
    </template>

    <StatisticsIntegration type="players" :profile="PROFILE" :scope="listPlayers" @select="fillFromPlayer" />

    <div class="grid grid-cols-16 items-center gap-[14px]">
      <div class="col-span-4 flex items-center gap-[5px]">
        <SimulatorSettings ref="settings-ref" storage-key="pet_sim" :default-threads="4" :default-iterations="2500000" class="flex-[2]" />
        <span>/</span>
        <div class="min-w-0 flex-1">
          <SFTooltip :content="localize('generate.iterations')">
            <SFNumber ref="map-iterations-ref" v-model="mapIterations" :aria-label="localize('generate.iterations')" :min="1" :step="1" centered />
          </SFTooltip>
        </div>
      </div>
      <SFHeading level="1" class="col-span-4 col-start-7 text-center">Pet Simulator</SFHeading>
      <div class="col-span-3 text-center">{{ result }}</div>
      <div class="col-span-3 flex justify-end gap-2">
        <SFButton variant="outline" :disabled="!canSimulate" @click="simulate">
          {{ localize('simulate') }}
        </SFButton>
        <SFDropdown :items="generateItems" :label="localize('generate.one')" variant="outline" float="left" :disabled="!canGenerate">
          <SFIcon name="table-cells" />
        </SFDropdown>
        <SFTooltip :content="localize('simulate_dungeons')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('simulate_dungeons')" :disabled="!canSimulateDungeons" @click="simulateDungeons">
            <SFIcon name="dungeon" />
          </SFButton>
        </SFTooltip>
      </div>
    </div>

    <div class="mt-[23px] grid gap-7 md:grid-cols-2">
      <PetEditor ref="editor-a-ref" :model="models[0]" :fight-stats="models[1] !== null" />
      <PetEditor ref="editor-b-ref" :model="models[1]" :fight-stats="models[0] !== null" />
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
import { computed, ref, shallowRef, useTemplateRef, watch } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDropdown from '@library/SFDropdown.vue'
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import SFNumber from '@library/SFNumber.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { type DropdownItem } from '@utils/components'
import { useDialog } from '@utils/dialogs'
import { useLocalize } from '@utils/localization'
import { useToast } from '@utils/toasts'
import { sequence, sortDescending, sum } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import StatisticsIntegration from '~/core/StatisticsIntegration.vue'
import FeedbackDialog from '~/dialogs/FeedbackDialog.vue'
import FooterCopyright from '~/pages/components/FooterCopyright.vue'
import FooterLink from '~/pages/components/FooterLink.vue'
import PageFooter from '~/pages/components/PageFooter.vue'
import Page from '~/pages/Page.vue'
import SimulatorDebug from '~/sim/components/SimulatorDebug.vue'
import SimulatorSettings from '~/sim/components/SimulatorSettings.vue'
import { saveSimulatorLog, simulatorConfig, type SimulatorConfig, type SimulatorLogTarget } from '~/sim/debug'
import PetEditor from './components/PetEditor.vue'
import PetMapDialog from './dialogs/PetMapDialog.vue'
import PetResultsDialog from './dialogs/PetResultsDialog.vue'

defineOptions({
  name: 'PetsPage'
})

// What the analyzer reads from a simulation log
type SimulatorLog = {
  fights: unknown[]
  players: unknown[]
  config: SimulatorConfig | null
}

// Win chances from js/sim/pets.js, see PetMapDialog
type PetMap = {
  name: string
  data: (number[] | undefined)[]
}

type PetResult = {
  chance: number
  pet: SimulatorPet
  boss: SimulatorPet
}

const PROFILE = SELF_PROFILE

const MAP_ITERATIONS_KEY = 'pet_sim/map_iterations'

// Habitats in the order of their type
const HABITATS: PetHabitat[] = ['Shadow', 'Light', 'Earth', 'Fire', 'Water']

const localize = useLocalize('pets')

const mapIterations = ref(readMapIterations())

const result = ref('')

// Player picked in the statistics integration, whose remaining dungeons can be simulated
const player = shallowRef<PlayerEntry | null>(null)

const models = shallowRef<[SimulatorModel | null, SimulatorModel | null]>([null, null])

const editorA = useTemplateRef('editor-a-ref')
const editorB = useTemplateRef('editor-b-ref')
const settings = useTemplateRef('settings-ref')

const isSettingsValid = useComponentValidation(settings)

const isMapSettingsValid = useComponentValidation(settings, useTemplateRef('map-iterations-ref'))

const petA = computed((): SimulatorPet | null => (editorA.value?.isValid ? editorA.value.read() : null))
const petB = computed((): SimulatorPet | null => (editorB.value?.isValid ? editorB.value.read() : null))

const canSimulate = computed(() => isSettingsValid.value && petA.value !== null && petB.value !== null)

// A map is only made for your own pet against a dungeon boss
const canGenerate = computed(() => isMapSettingsValid.value && petA.value?.Boss === 0 && petB.value?.Boss === 1)

const canSimulateDungeons = computed(() => isSettingsValid.value && hasDungeonsLeft(player.value))

const generateItems = computed<DropdownItem[]>(() => [
  { label: localize('generate.one'), action: () => void generateMaps(1) },
  { label: localize('generate.five'), action: () => void generateMaps(5) },
  { label: localize('generate.ten'), action: () => void generateMaps(10) }
])

// Only a value of 1 or more is saved, like DOM.input in js/plugins.js
watch(mapIterations, (value) => {
  if (value !== null && value >= 1) {
    Store.shared.set(MAP_ITERATIONS_KEY, String(value), true)
  }
})

// Like refreshModels in legacy: each valid pet is initialized against the other one, or against itself while the other one is invalid.
// The stats are calculated on this page, so the debug config is applied here too.
watch([petA, petB, simulatorConfig], ([a, b, config]) => {
  CONFIG.set(config)

  const modelA = a && PetModel.getModel(a)
  const modelB = b && PetModel.getModel(b)

  if (modelA && modelB) {
    modelA.initialize(modelB)
    modelB.initialize(modelA)
  } else {
    modelA?.initialize(modelA)
    modelB?.initialize(modelB)
  }

  models.value = [modelA, modelB]
})

function readMapIterations() {
  const value = Number(Store.shared.get(MAP_ITERATIONS_KEY, 1e5, true))

  return Number.isFinite(value) ? value : null
}

function hasDungeonsLeft(entry: PlayerEntry | null) {
  return entry?.Pets?.Dungeons.some((pet) => pet < 20) ?? false
}

function listPlayers() {
  return DatabaseManager.getLatestPlayers(true).filter((entry) => (entry.Pets?.TotalLevel ?? 0) > 0)
}

// Your strongest pet of the habitat and the habitat's next dungeon boss, null when there is none
function getPetsFor(entry: PlayerEntry, type: number): [pet: SimulatorPet | null, boss: SimulatorPet | null] {
  if (!entry.Pets) return [null, null]

  const habitat = HABITATS[type]
  const levels = entry.Pets[`${habitat}Levels`]

  const values = {
    Type: type,
    Boss: 0,
    Pack: entry.Pets[`${habitat}Count`],
    At100: levels.filter((level) => level >= 100 && level < 150).length,
    At150: levels.filter((level) => level >= 150 && level < 200).length,
    At200: levels.filter((level) => level === 200).length,
    Gladiator: entry.Fortress?.Gladiator ?? 0
  }

  const pets = levels.flatMap((level, index) => (level > 0 ? [{ ...values, Pet: index, Level: level }] : []))

  const strongest = sortDescending(
    pets.map((pet) => ({ pet, power: ModelUtils.estimatePower(PetModel.getModel(pet).Player) })),
    (item) => item.power
  ).at(0)

  const dungeonPet = entry.Pets.Dungeons[type]
  const boss = dungeonPet < 20 ? { Type: type, Pet: dungeonPet, Boss: 1, Level: 0, Pack: 0, At100: 0, At150: 0, At200: 0, Gladiator: 0 } : null

  return [strongest?.pet ?? null, boss]
}

function fillFromPlayer(entry: PlayerEntry) {
  player.value = entry

  if (!editorA.value || !editorB.value) return

  const [pet, boss] = getPetsFor(entry, editorA.value.read().Type)

  editorA.value.fill(pet)
  editorB.value.fill(boss)
}

// Such as `Shadow 1 - Name of the pet`
function getPetName(pet: SimulatorPet) {
  return `${localize(`types.${pet.Type}`)} ${pet.Pet + 1} - ${localize.global(`monsters.${800 + 20 * pet.Type + pet.Pet}`)}`
}

async function runSimulation(instances: number, iterations: number, onLogs?: (log: SimulatorLog) => void) {
  const a = petA.value
  const b = petB.value

  if (!a || !b) return

  const chances: number[] = []

  let logs: unknown[] = []

  const batch = new WorkerBatch<{ results: number; logs: unknown[] }>('pets')

  for (let index = 0; index < instances; index++) {
    batch.add(
      (data) => {
        chances.push(data.results)

        if (onLogs) {
          logs = logs.concat(data.logs)
        }
      },
      {
        mode: 'pet',
        players: [a, b],
        iterations,
        config: simulatorConfig.value,
        log: !!onLogs
      }
    )
  }

  await batch.run(instances)

  const chance = sum(chances) / instances

  result.value = `${chance.toFixed(chance < 0.01 ? 5 : 2)}%`

  if (onLogs && logs.length > 0) {
    onLogs({ fights: logs, players: [a, b].map((pet) => SimulatorModel.normalize(PetModel.getPlayer(pet))), config: simulatorConfig.value })
  }
}

function simulate() {
  if (!settings.value) return

  const instances = Math.max(1, settings.value.threads || 4)
  const iterations = Math.max(1, settings.value.iterations || 2.5e6)

  void runSimulation(instances, iterations)
}

function runLogged(target: SimulatorLogTarget) {
  void runSimulation(1, 50, (log) => saveSimulatorLog(target, log))
}

// Maps of pet A against the boss of pet B and the bosses after it, up to `count` of them
async function generateMaps(count: number) {
  const a = petA.value
  const b = petB.value

  if (!settings.value || !canGenerate.value || !a || !b) return

  const instances = Math.max(1, settings.value.threads || 4)
  const iterations = Math.max(1, mapIterations.value || 1e5)

  const maps: PetMap[] = []

  const batch = new WorkerBatch<{ results: PetMap['data'] }>('pets')

  for (let bossPet = b.Pet; bossPet < Math.min(20, b.Pet + count); bossPet++) {
    const boss = { ...b, Pet: bossPet }

    batch.add(
      (data) => {
        maps[bossPet - b.Pet] = { data: data.results, name: `${getPetName(a)} (${a.Pack}, ${a.At100}, ${a.At150}, ${a.At200}) vs ${getPetName(boss)}` }
      },
      {
        mode: 'map',
        players: [a, boss],
        iterations,
        config: simulatorConfig.value
      }
    )
  }

  await batch.run(instances)

  useDialog(PetMapDialog, { maps })
}

async function simulateDungeons() {
  const entry = player.value

  if (!settings.value || !entry || !hasDungeonsLeft(entry)) return

  const instances = Math.max(1, settings.value.threads || 4)
  const iterations = Math.max(1, settings.value.iterations || 2.5e6)

  const matches = sequence(5).flatMap((type) => {
    const [pet, boss] = getPetsFor(entry, type)

    return pet && boss ? [{ pet, boss }] : []
  })

  const results: PetResult[] = []

  const batch = new WorkerBatch<{ results: number }>('pets')

  for (const { pet, boss } of matches) {
    batch.add(
      (data) => {
        results.push({ chance: data.results, pet, boss })
      },
      {
        mode: 'pet',
        players: [pet, boss],
        iterations,
        config: simulatorConfig.value
      }
    )
  }

  useToast({ title: localize('bulk.toast.title'), message: `${localize('bulk.toast.matches')} ${matches.length}` })

  await batch.run(instances)

  useDialog(PetResultsDialog, { results: sortDescending(results, (item) => item.chance) })
}

function openFeedback() {
  useDialog(FeedbackDialog, { tool: 'pets' })
}
</script>
