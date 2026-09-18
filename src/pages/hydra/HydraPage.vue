<template>
  <Page>
    <StatisticsIntegration type="guilds" :profile="PROFILE" :scope="listCompleteGroups" @select="fillFromGroup" />
    <SimulatorPasteTarget @paste="fillFromPaste" />

    <div class="grid gap-7 md:grid-cols-2">
      <div class="flex flex-col gap-2">
        <div class="flex flex-col gap-[14px] rounded-md border border-line bg-surface p-2">
          <div class="grid grid-cols-2 gap-[14px]">
            <SFNumber ref="player-count-ref" v-model="playerCount" :label="localize('player_count')" placeholder="10 - 50" required :min="10" :max="50" :step="1" centered />
            <SFNumber ref="level-ref" v-model="level" :label="localize.global('editor.level')" placeholder="1 - 600" required :min="1" :max="600" :step="1" centered />
          </div>
          <div class="grid grid-cols-5 gap-[14px]">
            <SFNumber ref="main-ref" v-model="main" :label="localize('main')" required :min="1" :step="1" centered />
            <SFNumber ref="side1-ref" v-model="side1" :label="localize('side1')" required :min="1" :step="1" centered />
            <SFNumber ref="side2-ref" v-model="side2" :label="localize('side2')" required :min="1" :step="1" centered />
            <SFNumber ref="constitution-ref" v-model="constitution" :label="localize.global('general.attribute4')" required :min="1" :step="1" centered />
            <SFNumber ref="luck-ref" v-model="luck" :label="localize.global('general.attribute5')" required :min="1" :step="1" centered />
          </div>
        </div>
        <div class="rounded-md border border-line bg-surface p-2">
          <SFSelect ref="hydra-ref" v-model="hydra" :label="localize('hydra')" :options="hydraOptions" search required />
        </div>
      </div>

      <div>
        <div class="grid grid-cols-2 gap-[14px]">
          <SimulatorSettings ref="settings-ref" storage-key="hydra_sim" :default-threads="4" :default-iterations="10000" />
          <SFButton variant="outline" block :disabled="isSimulating ? 'loading' : !isValid" @click="simulate">
            {{ localize.global('simulator.simulate') }}
          </SFButton>
        </div>
        <hr class="my-[21px] border-y border-line" />
        <div class="flex items-center justify-center px-[14px]">
          <div v-for="result in results" :key="result.pet.Class" class="m-[7px] flex-[1_1_32%]" :class="{ 'opacity-60': result.score === 0 }">
            <SFHeading level="5" class="mb-[14px] text-center leading-[1.2857]">
              <img :src="getClassImageUrl(result.pet.Class)" alt="" class="-mt-[18px] -mb-[11.88px] -ml-[11.88px] inline-block w-[72px]" />
              {{ ((100 * result.score) / result.iterations).toFixed(2) }}%
            </SFHeading>
            <hr class="my-[7px] border-y border-line" />
            <SFParagraph class="px-[3.5px]">
              <span class="text-[80%]">&Delta;</span>
              {{ localize('result.health', { health: Math.trunc(100 * Math.max(0, result.avg_health / result.hydra.Health)) }) }}
            </SFParagraph>
            <SFParagraph class="px-[3.5px]">
              <span class="text-[80%]">&Delta;</span>
              {{ localize(`result.fights_${Math.ceil(result.avg_fights) > 1 ? 'multiple' : 'single'}`, { count: Math.ceil(result.avg_fights) }) }}
            </SFParagraph>
          </div>
        </div>
      </div>
    </div>

    <PageFooter>
      <SFParagraph>
        <span v-html="localize('footer#')" />
      </SFParagraph>

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
import SFHeading from '@library/SFHeading.vue'
import SFNumber from '@library/SFNumber.vue'
import SFParagraph from '@library/SFParagraph.vue'
import SFSelect from '@library/SFSelect.vue'
import { useDialog } from '@utils/dialogs'
import { useLocalize } from '@utils/localization'
import { useToast } from '@utils/toasts'
import { compact, dig, formatDuration, getClassImageUrl, sliceLength, sortDescending, sum, useSubmit } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import { type GroupModel } from '~/core/models/group'
import { PlayerModel } from '~/core/models/player'
import { HYDRA_PROFILE } from '~/core/profiles'
import StatisticsIntegration from '~/core/StatisticsIntegration.vue'
import { DatabaseManager } from '~/data/database-manager'
import FeedbackDialog from '~/dialogs/FeedbackDialog.vue'
import FooterCopyright from '~/pages/components/FooterCopyright.vue'
import FooterLink from '~/pages/components/FooterLink.vue'
import PageFooter from '~/pages/components/PageFooter.vue'
import Page from '~/pages/Page.vue'
import SimulatorPasteTarget from '~/sim/components/SimulatorPasteTarget.vue'
import SimulatorSettings from '~/sim/components/SimulatorSettings.vue'
import { HYDRA_MAP } from '~/sim/data/hydra'
import { WorkerBatch } from '~/sim/workers'

defineOptions({
  name: 'HydraPage'
})

type HydraResult = {
  pet: {
    Class: CharacterClass
  }
  hydra: {
    Health: number
  }
  iterations: number
  score: number
  avg_health: number
  avg_fights: number
}

type EditorValues = {
  hydra: number
  playerCount: number
  level: number
  main: number
  side1: number
  side2: number
  constitution: number
  luck: number
}

const PROFILE = HYDRA_PROFILE

// By class ID minus one
const ATTRIBUTE_MAP = CONFIG.classes().map((data) => PlayerModel.ATTRIBUTE_ORDER_BY_ATTRIBUTE[data.Attribute])

const localize = useLocalize('hydra')

const playerCount = ref<number | null>(null)
const level = ref<number | null>(null)
const main = ref<number | null>(null)
const side1 = ref<number | null>(null)
const side2 = ref<number | null>(null)
const constitution = ref<number | null>(null)
const luck = ref<number | null>(null)
const hydra = ref('1')

const results = shallowRef<HydraResult[]>([])

const settings = useTemplateRef('settings-ref')

const isValid = useComponentValidation(useTemplateRef('player-count-ref'), useTemplateRef('level-ref'), useTemplateRef('main-ref'), useTemplateRef('side1-ref'), useTemplateRef('side2-ref'), useTemplateRef('constitution-ref'), useTemplateRef('luck-ref'), useTemplateRef('hydra-ref'), settings)

const { submit: simulate, isSubmitting: isSimulating } = useSubmit(runSimulation)

const hydraOptions = computed(() => Object.entries(HYDRA_MAP).map(([id, data]) => ({ value: id, label: localize(`names.${id}`), image: getClassImageUrl(data.class) })))

watch([playerCount, level, main, side1, side2, constitution, luck, hydra], () => {
  results.value = []
})

function getHydraData() {
  const data = HYDRA_MAP[Number(hydra.value)]

  return {
    Armor: data.armor,
    Level: data.level,
    Class: data.class,
    Strength: {
      Total: data.str
    },
    Dexterity: {
      Total: data.dex
    },
    Intelligence: {
      Total: data.int
    },
    Constitution: {
      Total: data.con
    },
    Luck: {
      Total: data.lck
    },
    Items: {
      Wpn1: {
        DamageMin: data.min,
        DamageMax: data.max
      }
    },
    Health: data.health
  }
}

function getMainOrSideAttribute(attribute: MainAttribute, classId: CharacterClass) {
  return [main.value, side1.value, side2.value][ATTRIBUTE_MAP[classId - 1].indexOf(attribute)]
}

function getPlayerData(classId: CharacterClass) {
  const playerLevel = level.value ?? 0

  return {
    Level: level.value,
    Class: classId,
    Armor: playerLevel * CONFIG.fromID(classId).MaximumDamageReduction,
    Strength: {
      Total: getMainOrSideAttribute('Strength', classId)
    },
    Dexterity: {
      Total: getMainOrSideAttribute('Dexterity', classId)
    },
    Intelligence: {
      Total: getMainOrSideAttribute('Intelligence', classId)
    },
    Constitution: {
      Total: constitution.value
    },
    Luck: {
      Total: luck.value
    },
    Attacks: playerCount.value
  }
}

function playersToData(players: PlayerModel[], hydraId?: number): EditorValues {
  const sortedPlayers = sortDescending(players, (player) => Number(dig(player, ATTRIBUTE_MAP[player.Class - 1][0], 'Total')))
  const hydraPlayers = sliceLength(sortedPlayers, 0, 25)

  const getAttributeSum = (index: number) => Math.ceil(sum(hydraPlayers.map((player) => Number(dig(player, ATTRIBUTE_MAP[player.Class - 1][index], 'Total')))) / 10)

  return {
    hydra: hydraId || Number(hydra.value),
    playerCount: players.length,
    level: Math.min(Math.trunc(sum(hydraPlayers.map((player) => player.Level)) / 25), 600),
    constitution: Math.ceil(sum(hydraPlayers.map((player) => Number(dig(player, 'Constitution', 'Total')))) / 10),
    luck: Math.ceil(sum(hydraPlayers.map((player) => Number(dig(player, 'Luck', 'Total')))) / 10),
    main: getAttributeSum(0),
    side1: getAttributeSum(1),
    side2: getAttributeSum(2)
  }
}

function fill(values: EditorValues) {
  hydra.value = String(values.hydra)
  playerCount.value = values.playerCount
  level.value = values.level
  main.value = values.main
  side1.value = values.side1
  side2.value = values.side2
  constitution.value = values.constitution
  luck.value = values.luck
}

function listCompleteGroups() {
  return compact(Object.values(DatabaseManager.Groups).map((group) => group.List.filter((entry) => entry.MembersTotal === entry.MembersPresent && entry.MembersTotal >= 10)[0]))
}

function fillFromGroup(group: GroupModel) {
  fill(playersToData(compact(group.Members.map((identifier) => DatabaseManager.getPlayer(identifier, group.Timestamp))), (group.Hydra || 0) + 1))
}

function isPlayerList(value: unknown): value is PlayerModel[] {
  return Array.isArray(value)
}

function fillFromPaste(value: unknown) {
  try {
    if (isPlayerList(value)) {
      fill(playersToData(value))
    }
  } catch (e) {
    console.info(e)
  }
}

async function runSimulation() {
  if (!settings.value) return

  const instances = Math.max(1, settings.value.threads || 4)
  const iterations = Math.max(1, settings.value.iterations || 2500)

  const hydraData = getHydraData()
  const pets = ([1, 2, 3] as const).map((classId) => getPlayerData(classId))

  const collected: HydraResult[] = []
  const batch = new WorkerBatch<{ results: HydraResult }>('hydra')

  pets.forEach((pet, index) => {
    batch.add(
      (data) => {
        collected[index] = data.results
      },
      {
        iterations,
        hydra: hydraData,
        pet
      }
    )
  })

  const duration = await batch.run(instances)

  useToast({ title: localize.global('simulator.toast.title'), message: localize.global('simulator.toast.message', { duration: formatDuration(duration) }) })

  results.value = collected
}

function openFeedback() {
  useDialog(FeedbackDialog, { tool: 'hydra' })
}
</script>
