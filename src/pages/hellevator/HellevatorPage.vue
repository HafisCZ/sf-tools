<template>
  <Page>
    <template #nav-left>
      <StatisticsIntegration type="players" :profile="SELF_PROFILE" :scope="listOwnPlayers" cheats @select="insertPlayer" />
      <span v-if="isSimulatorDebug" class="mx-1.5 h-5 w-px bg-white/12" />
      <SimulatorDebug logs @log="runLogged" />
    </template>

    <SimulatorPasteTarget @paste="fillFromPaste" />

    <div class="grid gap-7 md:grid-cols-2">
      <PlayerEditor ref="editor-ref" snacks name-readonly :equipment="source !== null" @copy="copyPlayer" @view="changeItemView">
        <template #equipment>
          <EquipmentEditor v-if="source" :source="source" :index="0" :swaps="swaps" :character="characterState" @change="applySwaps" />
        </template>
      </PlayerEditor>

      <div>
        <div class="grid grid-cols-3 gap-[14px]">
          <SimulatorSettings ref="settings-ref" storage-key="hellevator_sim" :default-threads="4" :default-iterations="5000" class="col-span-2" />
          <SFButton variant="outline" block :disabled="isSimulating ? 'loading' : isLogging || !isValid" @click="simulate">
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

    <template #footer-left>
      <SimulatorDebugLink />
      <SFParagraph>
        <span v-html="localize('footer#')" />
      </SFParagraph>
    </template>

    <template #footer-right>
      <PageFooterLinks />
    </template>
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
import { useLocalize } from '@utils/localization'
import { useToast } from '@utils/toasts'
import { copyJson, formatDuration, getClassImageUrl, getValueAtPath, setValueAtPath, useSubmit } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import { PlayerModel } from '~/core/models/player'
import { SELF_PROFILE } from '~/core/profiles'
import { DatabaseManager } from '~/data/database-manager'
import { type Cheats } from '~/integration/cheats'
import StatisticsIntegration from '~/integration/StatisticsIntegration.vue'
import PageFooterLinks from '~/pages/components/PageFooterLinks.vue'
import Page from '~/pages/Page.vue'
import EquipmentEditor from '~/sim/components/EquipmentEditor.vue'
import PlayerEditor from '~/sim/components/PlayerEditor.vue'
import SimulatorDebug from '~/sim/components/SimulatorDebug.vue'
import SimulatorDebugLink from '~/sim/components/SimulatorDebugLink.vue'
import SimulatorPasteTarget from '~/sim/components/SimulatorPasteTarget.vue'
import SimulatorSettings from '~/sim/components/SimulatorSettings.vue'
import { getHellevatorEnemies, type HellevatorEnemy } from '~/sim/data/hellevator'
import { isSimulatorDebug, preparePlayerData, type SimulatorLogTarget } from '~/sim/debug'
import { applyEquipmentSwaps, createCharacterState, LIFE_POTION_TYPE, type CharacterState, type EquipmentSwaps } from '~/sim/equipment'
import { useHellevatorSimulator } from '~/sim/hellevator'
import { RUNE_FIRE_DAMAGE } from '~/sim/workers/base'

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

const ELEMENT_KEYS = ['fire', 'cold', 'lightning']

const localize = useLocalize('hellevator')

const hellevatorSimulator = useHellevatorSimulator()

const rangeStart = ref<number | null>(1)
const rangeEnd = ref<number | null>(600)

const enemies = shallowRef<HellevatorEnemy[]>([])
const scores = shallowRef<number[]>([])

const source = shallowRef<PlayerModel | null>(null)
const swaps = shallowRef<EquipmentSwaps>({})
const characterState = shallowRef<CharacterState>(createCharacterState(new PlayerModel()))

const editor = useTemplateRef('editor-ref')
const settings = useTemplateRef('settings-ref')

const isValid = useComponentValidation(editor, useTemplateRef('range-start-ref'), useTemplateRef('range-end-ref'), settings)

const { submit: simulate, isSubmitting: isSimulating } = useSubmit(async () => {
  if (!settings.value) return

  const instances = Math.max(1, settings.value.threads || 4)
  const iterations = Math.max(1, settings.value.iterations || 5000)

  await runSimulation(instances, iterations)
})

const { submit: runLogged, isSubmitting: isLogging } = useSubmit(async (target: SimulatorLogTarget) => {
  await runSimulation(1, 50, target)
})

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
  return enemy.Items.Wpn1.AttributeTypes[2] - RUNE_FIRE_DAMAGE
}

function listOwnPlayers() {
  return DatabaseManager.getLatestPlayers(true)
}

function insertPlayer(entry: PlayerModel, cheats?: Cheats) {
  fillPlayer(entry)

  // Cheats are applied on top of the raw data the swap rebuilds from, so the two can not be combined
  source.value = cheats || !entry.Inventory ? null : entry

  characterState.value = createCharacterState(entry)
}

function fillPlayer(data: unknown) {
  source.value = null
  swaps.value = {}

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

function changeItemView(open: boolean) {
  if (open && editor.value) {
    applySwaps(swaps.value, withLifePotion(characterState.value, editor.value.read()))
  }
}

function withLifePotion(state: CharacterState, fighter: PlayerModel | null) {
  const size = fighter?.Potions?.Life ?? 0
  const free = state.potions.findIndex((potion) => potion.type === 0)

  if (!size || free === -1 || state.potions.some((potion) => potion.type === LIFE_POTION_TYPE)) return state

  return { ...state, potions: state.potions.map((potion, index) => (index === free ? { type: LIFE_POTION_TYPE, size } : potion)) }
}

const REBUILD_PATHS = ['Level', 'Fortress.Gladiator', 'Dungeons.Player', 'Dungeons.Group', 'Snack', 'SnackPotency']

function applySwaps(entries: EquipmentSwaps, character: CharacterState) {
  const player = source.value

  if (!player || !editor.value) return

  swaps.value = entries
  characterState.value = character

  const current = editor.value.read()
  const rebuilt = applyEquipmentSwaps(player, [entries], character)

  for (const path of REBUILD_PATHS) {
    setValueAtPath(rebuilt, path, getValueAtPath(current, path))
  }

  editor.value.fill(rebuilt)
}

async function runSimulation(instances: number, iterations: number, log?: SimulatorLogTarget) {
  if (!isValid.value || !editor.value) return

  enemies.value = []
  scores.value = []

  const player = new PlayerModel()

  writeRange(player)

  editor.value.read(player)

  const start = rangeStart.value || 1
  const end = rangeEnd.value ?? 0

  const floorEnemies = getHellevatorEnemies(start, Math.max(start, end))

  const result = await hellevatorSimulator.simulate(player, floorEnemies, { instances, iterations }, log)

  if (!result) return

  useToast({ title: localize.global('simulator.toast.title'), message: localize.global('simulator.toast.message', { duration: formatDuration(result.duration) }) })

  enemies.value = floorEnemies
  scores.value = result.scores
}
</script>
