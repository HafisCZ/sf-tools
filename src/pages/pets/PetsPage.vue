<template>
  <Page>
    <template #nav-left>
      <SimulatorDebug logs @log="runLogged" />
    </template>

    <StatisticsIntegration type="players" :profile="SELF_PROFILE" :scope="listPlayers" @select="fillFromPlayer" />

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
        <SFButton variant="outline" :disabled="isSimulating ? 'loading' : isRunning || !canSimulate" @click="simulate">
          {{ localize('simulate') }}
        </SFButton>
        <SFDropdown :items="generateItems" :label="localize('generate.one')" variant="outline" float="left" :disabled="isGenerating ? 'loading' : isRunning || !canGenerate">
          <SFIcon name="table-cells" />
        </SFDropdown>
        <SFTooltip :content="localize('simulate_dungeons')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('simulate_dungeons')" :disabled="isSimulatingDungeons ? 'loading' : isRunning || !canSimulateDungeons" @click="simulateDungeons">
            <SFIcon name="dungeon" />
          </SFButton>
        </SFTooltip>
      </div>
    </div>

    <div class="mt-[23px] grid gap-7 md:grid-cols-2">
      <PetEditor ref="editor-a-ref" :model="models[0]" :fight-stats="models[1] !== null" />
      <PetEditor ref="editor-b-ref" :model="models[1]" :fight-stats="models[0] !== null" />
    </div>

    <template #footer-right>
      <PageFooterLinks tool="pets" />
    </template>
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
import { sequence, sortDescending, useSubmit } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import { type PetHabitat, type PlayerModel } from '~/core/models/player'
import { ModelUtils } from '~/core/models/utils'
import { SELF_PROFILE } from '~/core/profiles'
import { Store } from '~/core/store'
import { DatabaseManager } from '~/data/database-manager'
import StatisticsIntegration from '~/integration/StatisticsIntegration.vue'
import PageFooterLinks from '~/pages/components/PageFooterLinks.vue'
import Page from '~/pages/Page.vue'
import SimulatorDebug from '~/sim/components/SimulatorDebug.vue'
import SimulatorSettings from '~/sim/components/SimulatorSettings.vue'
import { simulatorConfig, type SimulatorLogTarget } from '~/sim/debug'
import { usePetSimulator } from '~/sim/pets'
import { CONFIG, type SimulatorModel } from '~/sim/workers/base'
import { PetModel, type SimulatorPet } from '~/sim/workers/pets'
import PetEditor from './components/PetEditor.vue'
import PetMapDialog from './dialogs/PetMapDialog.vue'
import PetResultsDialog from './dialogs/PetResultsDialog.vue'

defineOptions({
  name: 'PetsPage'
})

const MAP_ITERATIONS_KEY = 'pet_sim/map_iterations'

// Index is the pet type
const HABITATS: PetHabitat[] = ['Shadow', 'Light', 'Earth', 'Fire', 'Water']

const localize = useLocalize('pets')

const petSimulator = usePetSimulator()

const mapIterations = ref(readMapIterations())

const result = ref('')

const player = shallowRef<PlayerModel | null>(null)

const models = shallowRef<[SimulatorModel | null, SimulatorModel | null]>([null, null])

const editorA = useTemplateRef('editor-a-ref')
const editorB = useTemplateRef('editor-b-ref')
const settings = useTemplateRef('settings-ref')

const isSettingsValid = useComponentValidation(settings)

const isMapSettingsValid = useComponentValidation(settings, useTemplateRef('map-iterations-ref'))

const petA = computed((): SimulatorPet | null => (editorA.value?.isValid ? editorA.value.read() : null))
const petB = computed((): SimulatorPet | null => (editorB.value?.isValid ? editorB.value.read() : null))

const canSimulate = computed(() => isSettingsValid.value && petA.value !== null && petB.value !== null)

const canGenerate = computed(() => isMapSettingsValid.value && petA.value?.Boss === 0 && petB.value?.Boss === 1)

const canSimulateDungeons = computed(() => isSettingsValid.value && hasDungeonsLeft(player.value))

const { submit: simulate, isSubmitting: isSimulating } = useSubmit(async () => {
  if (!settings.value) return

  const instances = Math.max(1, settings.value.threads || 4)
  const iterations = Math.max(1, settings.value.iterations || 2.5e6)

  await runSimulation(instances, iterations)
})

const { submit: runLogged, isSubmitting: isLogging } = useSubmit(async (target: SimulatorLogTarget) => {
  await runSimulation(1, 50, target)
})

const { submit: generate, isSubmitting: isGenerating } = useSubmit(generateMaps)

const { submit: simulateDungeons, isSubmitting: isSimulatingDungeons } = useSubmit(runDungeonSimulation)

const isRunning = computed(() => isSimulating.value || isLogging.value || isGenerating.value || isSimulatingDungeons.value)

const generateItems = computed<DropdownItem[]>(() => [
  { label: localize('generate.one'), action: () => void generate(1) },
  { label: localize('generate.five'), action: () => void generate(5) },
  { label: localize('generate.ten'), action: () => void generate(10) }
])

watch(mapIterations, (value) => {
  if (value !== null && value >= 1) {
    Store.shared.set(MAP_ITERATIONS_KEY, String(value), true)
  }
})

// The stats are calculated with the global CONFIG, so the debug config is applied to it
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

function hasDungeonsLeft(entry: PlayerModel | null) {
  return entry?.Pets?.Dungeons?.some((pet) => pet < 20) ?? false
}

function listPlayers() {
  return DatabaseManager.getLatestPlayers(true).filter((entry) => (entry.Pets?.TotalLevel ?? 0) > 0)
}

function getPetsFor(entry: PlayerModel, type: number): [pet: SimulatorPet | null, boss: SimulatorPet | null] {
  if (!entry.Pets) return [null, null]

  const habitat = HABITATS[type]
  const levels = entry.Pets[`${habitat}Levels`] as number[]

  const values = {
    Type: type,
    Boss: 0,
    Pack: entry.Pets[`${habitat}Count`] as number,
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

  const dungeonPet = (entry.Pets.Dungeons as number[])[type]
  const boss = dungeonPet < 20 ? { Type: type, Pet: dungeonPet, Boss: 1, Level: 0, Pack: 0, At100: 0, At150: 0, At200: 0, Gladiator: 0 } : null

  return [strongest?.pet ?? null, boss]
}

function fillFromPlayer(entry: PlayerModel) {
  player.value = entry

  if (!editorA.value || !editorB.value) return

  const [pet, boss] = getPetsFor(entry, editorA.value.read().Type)

  editorA.value.fill(pet)
  editorB.value.fill(boss)
}

function getPetName(pet: SimulatorPet) {
  return `${localize(`types.${pet.Type}`)} ${pet.Pet + 1} - ${localize.global(`monsters.${800 + 20 * pet.Type + pet.Pet}`)}`
}

async function runSimulation(instances: number, iterations: number, log?: SimulatorLogTarget) {
  const a = petA.value
  const b = petB.value

  if (!a || !b) return

  const fight = await petSimulator.simulateFight(a, b, { instances, iterations }, log)

  if (!fight) return

  result.value = `${fight.chance.toFixed(fight.chance < 0.01 ? 5 : 2)}%`
}

async function generateMaps(count: number) {
  const a = petA.value
  const b = petB.value

  if (!settings.value || !canGenerate.value || !a || !b) return

  const instances = Math.max(1, settings.value.threads || 4)
  const iterations = Math.max(1, mapIterations.value || 1e5)

  const generated = await petSimulator.generateMaps(a, b, count, { instances, iterations })

  if (!generated) return

  useDialog(PetMapDialog, { maps: generated.maps.map(({ boss, data }) => ({ data, name: `${getPetName(a)} (${a.Pack}, ${a.At100}, ${a.At150}, ${a.At200}) vs ${getPetName(boss)}` })) })
}

async function runDungeonSimulation() {
  const entry = player.value

  if (!settings.value || !entry || !hasDungeonsLeft(entry)) return

  const instances = Math.max(1, settings.value.threads || 4)
  const iterations = Math.max(1, settings.value.iterations || 2.5e6)

  const matches = sequence(5).flatMap((type) => {
    const [pet, boss] = getPetsFor(entry, type)

    return pet && boss ? [{ pet, boss }] : []
  })

  useToast({ title: localize('bulk.toast.title'), message: `${localize('bulk.toast.matches')} ${matches.length}` })

  const dungeons = await petSimulator.simulateDungeons(matches, { instances, iterations })

  if (!dungeons) return

  useDialog(PetResultsDialog, { results: sortDescending(dungeons.results, (item) => item.chance) })
}
</script>
