<template>
  <Page>
    <template #nav>
      <SimulatorDebug logs @log="runLogged" />
    </template>

    <StatisticsIntegration type="players" :profile="PROFILE" :scope="listOwnPlayers" cheats @select="fillPlayer" />
    <SimulatorPasteTarget @paste="fillFromPaste" />

    <div class="grid gap-7 md:grid-cols-2">
      <PlayerEditor ref="editor-ref" snacks name-readonly @copy="copyPlayer" />

      <div>
        <div class="grid grid-cols-3 gap-[14px]">
          <SimulatorSettings ref="settings-ref" storage-key="hellevator_sim" :default-threads="4" :default-iterations="5000" class="col-span-2" />
          <SFButton variant="outline" block :disabled="!isValid" @click="simulate">
            {{ localize.global('simulator.simulate') }}
          </SFButton>
        </div>
        <div class="mt-[14px] grid grid-cols-3 gap-[14px]">
          <SFNumber ref="range-start-ref" v-model="rangeStart" :label="localize('range.start')" placeholder="1 - 600" required :min="1" :max="600" :step="1" centered />
          <SFNumber ref="range-end-ref" v-model="rangeEnd" :label="localize('range.end')" placeholder="1 - 600" required :min="1" :max="600" :step="1" centered />
        </div>

        <SFTable fixed dense class="mt-[14px]">
          <template #header>
            <SFTableRow>
              <SFTableHeader align="center" class="w-[12.5%]">#</SFTableHeader>
              <SFTableHeader align="center" class="w-[18.75%]">{{ localize.global('editor.class') }}</SFTableHeader>
              <SFTableHeader align="center" class="w-[18.75%]">{{ localize('element') }}</SFTableHeader>
              <SFTableHeader align="center" class="w-[18.75%]">{{ localize.global('editor.level') }}</SFTableHeader>
              <SFTableHeader align="center">{{ localize.global('simulator.win_chance') }}</SFTableHeader>
            </SFTableRow>
          </template>
          <template v-for="row in resultRows" :key="row.key">
            <SFTableRow v-if="row.type === 'message'" class="odd:bg-black/15">
              <SFTableCell colspan="5" align="center" :class="row.won ? 'text-[#90ee90]' : 'text-accent'">
                <div class="py-2">{{ row.text }}</div>
              </SFTableCell>
            </SFTableRow>
            <SFTableRow v-else class="odd:bg-black/15">
              <SFTableCell align="center">{{ row.enemy.Floor }}</SFTableCell>
              <SFTableCell align="center">
                <img :src="getClassImageUrl(row.enemy.Class)" :alt="localize.global(`general.class${row.enemy.Class}`)" class="mx-auto size-8" />
              </SFTableCell>
              <SFTableCell align="center">
                <img :src="`/res/element${getElement(row.enemy)}.webp`" :alt="localize.global(`editor.${ELEMENT_KEYS[getElement(row.enemy)]}`)" class="mx-auto size-8" />
              </SFTableCell>
              <SFTableCell align="center">{{ row.enemy.Level }}</SFTableCell>
              <SFTableCell align="center">{{ row.score === 0 ? localize.global('pets.bulk.not_possible') : `${(100 * row.score).toFixed(2)}%` }}</SFTableCell>
            </SFTableRow>
          </template>
        </SFTable>
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
import { computed, ref, shallowRef, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFNumber from '@library/SFNumber.vue'
import SFParagraph from '@library/SFParagraph.vue'
import SFTable from '@library/SFTable.vue'
import SFTableCell from '@library/SFTableCell.vue'
import SFTableHeader from '@library/SFTableHeader.vue'
import SFTableRow from '@library/SFTableRow.vue'
import { useDialog } from '@utils/dialogs'
import { useLocalize } from '@utils/localization'
import { useToast } from '@utils/toasts'
import { copyJson, formatDuration, getClassImageUrl, getValueAtPath, setValueAtPath } from '@utils/utils'
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
import { getHellevatorEnemies, type HellevatorEnemy } from '~/sim/data/hellevator'
import { preparePlayerData, saveSimulatorLog, simulatorConfig, type SimulatorConfig, type SimulatorLogTarget } from '~/sim/debug'

defineOptions({
  name: 'HellevatorPage'
})

type ResultRow =
  | {
      type: 'message'
      key: string
      text: string
      won: boolean
    }
  | {
      type: 'enemy'
      key: string
      enemy: HellevatorEnemy
      // 0 to 1
      score: number
    }

type SimulatorLog = {
  fights: unknown[]
  players: unknown[]
  config: SimulatorConfig | null
}

const PROFILE = SELF_PROFILE

// Index is the rune type minus 40
const ELEMENT_KEYS = ['fire', 'cold', 'lightning']

const localize = useLocalize('hellevator')

const rangeStart = ref<number | null>(1)
const rangeEnd = ref<number | null>(600)

const enemies = shallowRef<HellevatorEnemy[]>([])
const scores = shallowRef<number[]>([])

const editor = useTemplateRef('editor-ref')
const settings = useTemplateRef('settings-ref')

const isValid = useComponentValidation(editor, useTemplateRef('range-start-ref'), useTemplateRef('range-end-ref'), settings)

const resultRows = computed(() => {
  const list = enemies.value
  const getScore = (index: number) => scores.value[index] || 0

  if (list.length === 0) return []

  let firstPossibleLoss = list.length

  for (let i = 0; i < list.length; i++) {
    if (getScore(i) !== 1) {
      firstPossibleLoss = i
      break
    }
  }

  let lastPossibleWin = -1

  for (let i = list.length - 1; i >= firstPossibleLoss; i--) {
    if (getScore(i) !== 0) {
      lastPossibleWin = i
      break
    }
  }

  if (lastPossibleWin === -1 && firstPossibleLoss === list.length) {
    lastPossibleWin = firstPossibleLoss
  }

  if (firstPossibleLoss === lastPossibleWin && lastPossibleWin === list.length && list.length > 10) {
    return [createMessageRow('all', list.length, true)]
  } else if (lastPossibleWin === -1 && list.length > 10) {
    return [createMessageRow('none', list.length, false)]
  }

  const rows: ResultRow[] = []

  if (firstPossibleLoss > 0) {
    rows.push(createMessageRow('first', firstPossibleLoss, true))
  }

  list.forEach((enemy, index) => {
    if (index >= firstPossibleLoss && index <= lastPossibleWin) {
      rows.push({ type: 'enemy', key: String(enemy.Floor), enemy, score: getScore(index) })
    }
  })

  if (lastPossibleWin < list.length - 1) {
    rows.push(createMessageRow('last', list.length - 1 - lastPossibleWin, false))
  }

  return rows
})

function createMessageRow(kind: 'all' | 'none' | 'first' | 'last', count: number, won: boolean): ResultRow {
  return { type: 'message', key: kind, text: localize(`win.${kind}`, { count }), won }
}

function getElement(enemy: HellevatorEnemy) {
  return enemy.Items.Wpn1.AttributeTypes[2] - 40
}

function listOwnPlayers() {
  return DatabaseManager.getLatestPlayers(true)
}

function fillPlayer(data: unknown) {
  rangeStart.value = readRangeValue(data, 'GroupTournament.Floor', 1)
  rangeEnd.value = readRangeValue(data, 'RangeEnd', 600)

  editor.value?.fill(data)
}

function readRangeValue(data: unknown, path: string, defaultValue: number) {
  const value = getValueAtPath(data, path)

  if (value === undefined) {
    return defaultValue
  }

  const number = Number(value)

  return Number.isFinite(number) ? number : null
}

function writeRange(player: PlayerModel) {
  setValueAtPath(player, 'GroupTournament.Floor', rangeStart.value ?? 0)
  setValueAtPath(player, 'RangeEnd', rangeEnd.value ?? 0)
}

function copyPlayer(player: PlayerModel) {
  writeRange(player)

  void copyJson(player)
}

function fillFromPaste(value: unknown) {
  try {
    if (Array.isArray(value)) {
      fillPlayer(preparePlayerData(value[0]))
    } else if (typeof value === 'object') {
      fillPlayer(preparePlayerData(value))
    }
  } catch (e) {
    console.info(e)
  }
}

async function runSimulation(instances: number, iterations: number, onLogs?: (log: SimulatorLog) => void) {
  if (!isValid.value || !editor.value) return

  enemies.value = []
  scores.value = []

  const player = new PlayerModel()

  writeRange(player)

  editor.value.read(player)

  const start = rangeStart.value || 1
  const end = rangeEnd.value ?? 0

  const floorEnemies = getHellevatorEnemies(start, Math.max(start, end))
  const floorScores: number[] = []

  let logs: unknown[] = []

  const batch = new WorkerBatch<{ score: number; logs: unknown[] }>('hellevator')

  floorEnemies.forEach((enemy, index) => {
    batch.add(
      (data) => {
        floorScores[index] = data.score

        if (onLogs) {
          logs = logs.concat(data.logs)
        }
      },
      {
        player,
        iterations,
        enemy,
        log: !!onLogs,
        config: simulatorConfig.value
      }
    )
  })

  const duration = await batch.run(instances)

  useToast({ title: localize.global('simulator.toast.title'), message: localize.global('simulator.toast.message', { duration: formatDuration(duration) }) })

  enemies.value = floorEnemies
  scores.value = floorScores

  if (onLogs && logs.length > 0) {
    onLogs({ fights: logs, players: [player, ...floorEnemies], config: simulatorConfig.value })
  }
}

function simulate() {
  if (!settings.value) return

  const instances = Math.max(1, settings.value.threads || 4)
  const iterations = Math.max(1, settings.value.iterations || 5000)

  void runSimulation(instances, iterations)
}

function runLogged(target: SimulatorLogTarget) {
  void runSimulation(1, 50, (log) => saveSimulatorLog(target, log))
}

function openFeedback() {
  useDialog(FeedbackDialog, { tool: 'hellevator' })
}
</script>
