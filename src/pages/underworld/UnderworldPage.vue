<template>
  <Page>
    <template #nav-left>
      <SimulatorDebug logs copy presets @log="runLogged" @copy="copyAll" @insert="handlePaste" />
    </template>

    <StatisticsIntegration type="players" :profile="PROFILE" :scope="listPlayers" cheats grouped @select="insertPlayer" />
    <SimulatorPasteTarget @paste="handlePaste" />

    <div class="grid gap-7 md:grid-cols-2">
      <div class="flex flex-col gap-2">
        <PlayerEditor ref="editor-ref" @copy="copyPlayer" />

        <div class="flex flex-col gap-[14px] rounded-md border border-line bg-surface p-2">
          <div class="grid grid-cols-2 gap-[14px]">
            <SFNumber ref="building-refs" v-model="goblin" :label="localize('goblin_pit')" placeholder="0 - 15" :min="0" :max="15" :step="1" centered />
            <SFNumber ref="building-refs" v-model="goblinUpgrades" :label="localize('goblin_upgrades')" :min="0" :step="1" centered />
          </div>
          <div class="grid grid-cols-2 gap-[14px]">
            <SFNumber ref="building-refs" v-model="troll" :label="localize('troll_block')" placeholder="0 - 15" :min="0" :max="15" :step="1" centered />
            <SFNumber ref="building-refs" v-model="trollUpgrades" :label="localize('troll_upgrades')" :min="0" :step="1" centered />
          </div>
          <div class="grid grid-cols-2 gap-[14px]">
            <SFNumber ref="building-refs" v-model="keeper" :label="localize('keeper')" placeholder="0 - 15" :min="0" :max="15" :step="1" centered />
            <SFNumber ref="building-refs" v-model="keeperUpgrades" :label="localize('keeper_upgrades')" :min="0" :step="1" centered />
          </div>
        </div>
      </div>

      <div>
        <div class="grid grid-cols-16 items-center gap-[14px]">
          <SFButton variant="outline" block class="col-span-4" :disabled="!isEditorValid" @click="addPlayer">
            {{ localize.global('simulator.add') }}
          </SFButton>
          <div class="col-span-4">
            <SFButton v-if="selectedIndex >= 0" variant="outline" block :disabled="!isEditorValid" @click="savePlayer">
              {{ localize.global('simulator.save') }}
            </SFButton>
          </div>
          <div class="col-span-8 flex justify-end gap-2">
            <SFTooltip :content="localize.global('players.gladiator_mode')">
              <SFButton variant="outline" icon :aria-label="localize.global('players.gladiator_mode')" :aria-pressed="gladiatorMode" :class="{ 'bg-accent text-black': gladiatorMode }" @click="toggleGladiatorMode">
                <SFIcon name="bolt" />
              </SFButton>
            </SFTooltip>
            <SFTooltip :content="localize('shield_mode')">
              <SFButton variant="outline" icon :aria-label="localize('shield_mode')" :aria-pressed="shieldMode" :class="{ 'bg-accent text-black': shieldMode }" @click="shieldMode = !shieldMode">
                <SFIcon name="shield-halved" />
              </SFButton>
            </SFTooltip>
          </div>
        </div>

        <div class="mt-[14px] grid grid-cols-16 items-center gap-[14px]">
          <div class="col-span-4 flex gap-2">
            <SFTooltip :content="localize.global('simulator.clipboard.paste_mode')">
              <SFButton variant="outline" icon class="flex-1" :aria-label="localize.global('simulator.clipboard.paste_mode')" :aria-pressed="pasteMode" :class="{ 'bg-accent text-black': pasteMode }" @click="pasteMode = !pasteMode">
                <SFIcon name="paste" />
              </SFButton>
            </SFTooltip>
            <SFTooltip :content="localize.global('simulator.clipboard.copy_all')">
              <SFButton variant="outline" icon class="flex-1" :aria-label="localize.global('simulator.clipboard.copy_all')" @click="copyAll">
                <SFIcon name="copy" />
              </SFButton>
            </SFTooltip>
          </div>
          <SimulatorSettings ref="settings-ref" storage-key="underworld_sim" :default-threads="4" :default-iterations="2500" class="col-span-7" />
          <SFButton variant="outline" block :disabled="isSimulating ? 'loading' : isLogging || !canSimulate" class="col-span-5" @click="simulate">
            {{ localize.global('simulator.simulate') }}
          </SFButton>
        </div>

        <SFTable fixed dense class="mt-[14px]">
          <template #header>
            <SFTableRow>
              <SFTableHeader align="center" class="w-12">#</SFTableHeader>
              <SFTableHeader align="center" class="w-20">{{ localize.global('editor.class') }}</SFTableHeader>
              <SFTableHeader align="center" class="w-16">{{ localize.global('editor.level') }}</SFTableHeader>
              <SFTableHeader>{{ localize.global('editor.name') }}</SFTableHeader>
              <SFTableHeader align="center">{{ localize.global('simulator.win_chance') }}</SFTableHeader>
              <SFTableHeader class="w-12" />
            </SFTableRow>
          </template>
          <SFTableRow
            v-for="(entry, position) in players"
            :key="entry.index"
            tabindex="0"
            class="cursor-pointer outline-none"
            :class="entry.index === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5 focus-visible:bg-white/5'"
            @click="(event: MouseEvent) => handleRowClick(event, entry)"
            @keydown="(event: KeyboardEvent) => handleRowKeydown(event, entry)"
          >
            <SFTableCell align="center">{{ position + 1 }}</SFTableCell>
            <SFTableCell align="center">
              <img :src="getClassImageUrl(entry.player.Class)" :alt="localize.global(`general.class${entry.player.Class}`)" class="mx-auto size-8" />
            </SFTableCell>
            <SFTableCell align="center">{{ entry.player.Level }}</SFTableCell>
            <SFTableCell>{{ entry.player.Name }}</SFTableCell>
            <SFTableCell align="center">{{ entry.score === null ? '' : `${entry.score.toFixed(2)}%` }}</SFTableCell>
            <SFTableCell align="center">
              <SFButton variant="ghost" size="sm" icon class="hover:text-red-400 focus-visible:text-red-400" @click="removePlayer(entry)">
                <SFIcon name="trash-can" />
              </SFButton>
            </SFTableCell>
          </SFTableRow>
        </SFTable>
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
import { computed, ref, shallowRef, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFIcon from '@library/SFIcon.vue'
import SFNumber from '@library/SFNumber.vue'
import SFTable from '@library/SFTable.vue'
import SFTableCell from '@library/SFTableCell.vue'
import SFTableHeader from '@library/SFTableHeader.vue'
import SFTableRow from '@library/SFTableRow.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { useDialog } from '@utils/dialogs'
import { useLocalize } from '@utils/localization'
import { useToast } from '@utils/toasts'
import { copyJson, formatDuration, getClassImageUrl, sortDescending, useSubmit } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import { type PlayerModel } from '~/core/models/player'
import { ModelUtils } from '~/core/models/utils'
import { FIGHT_SIMULATOR_PROFILE } from '~/core/profiles'
import { Store } from '~/core/store'
import { DatabaseManager } from '~/data/database-manager'
import FeedbackDialog from '~/dialogs/FeedbackDialog.vue'
import StatisticsIntegration from '~/integration/StatisticsIntegration.vue'
import FooterCopyright from '~/pages/components/FooterCopyright.vue'
import FooterLink from '~/pages/components/FooterLink.vue'
import Page from '~/pages/Page.vue'
import PlayerEditor from '~/sim/components/PlayerEditor.vue'
import SimulatorDebug from '~/sim/components/SimulatorDebug.vue'
import SimulatorPasteTarget from '~/sim/components/SimulatorPasteTarget.vue'
import SimulatorSettings from '~/sim/components/SimulatorSettings.vue'
import { createUnderworldUnits, type UnderworldValues } from '~/sim/data/underworld'
import { copySimulatorData, handleSimulatorPaste, preparePlayerData, saveSimulatorLog, simulatorConfig, type SimulatorConfig, type SimulatorLogTarget } from '~/sim/debug'
import { WorkerBatch } from '~/sim/workers'

defineOptions({
  name: 'UnderworldPage'
})

type PlayerScore = {
  player: PlayerModel
  // 0 to 100
  score: number | null
  index: number
}

type SimulatorLog = {
  fights: unknown[]
  players: unknown[]
  config: SimulatorConfig | null
}

const PROFILE = FIGHT_SIMULATOR_PROFILE

const GLADIATOR_MODE_KEY = 'underworld_sim/gladiator'

const localize = useLocalize('underworld')

const goblin = ref<number | null>(null)
const goblinUpgrades = ref<number | null>(null)
const troll = ref<number | null>(null)
const trollUpgrades = ref<number | null>(null)
const keeper = ref<number | null>(null)
const keeperUpgrades = ref<number | null>(null)

const pasteMode = ref(false)
const shieldMode = ref(false)
const gladiatorMode = ref(Store.shared.get<string>(GLADIATOR_MODE_KEY, 'false', true) === 'true')

const players = shallowRef<PlayerScore[]>([])
const selectedIndex = ref(-1)

let nextIndex = 0

const editor = useTemplateRef('editor-ref')
const settings = useTemplateRef('settings-ref')

const isEditorValid = useComponentValidation(editor)

const isUnderworldValid = useComponentValidation(useTemplateRef('building-refs'))

const isSettingsValid = useComponentValidation(settings)

const canSimulate = computed(() => isUnderworldValid.value && isSettingsValid.value && (goblin.value ?? 0) + (troll.value ?? 0) + (keeper.value ?? 0) > 0 && players.value.length > 0)

const { submit: simulate, isSubmitting: isSimulating } = useSubmit(async () => {
  if (!settings.value) return

  const instances = Math.max(1, settings.value.threads || 4)
  const iterations = Math.max(1, settings.value.iterations || 2500)

  await runSimulation(instances, iterations)
})

const { submit: runLogged, isSubmitting: isLogging } = useSubmit(async (target: SimulatorLogTarget) => {
  await runSimulation(1, 50, (log) => saveSimulatorLog(target, log))
})

function listPlayers() {
  return DatabaseManager.getLatestPlayers()
}

function readUnderworldValues(): UnderworldValues {
  return {
    goblin: goblin.value ?? 0,
    goblinUpgrades: goblinUpgrades.value ?? 0,
    troll: troll.value ?? 0,
    trollUpgrades: trollUpgrades.value ?? 0,
    keeper: keeper.value ?? 0,
    keeperUpgrades: keeperUpgrades.value ?? 0
  }
}

function clearEditor() {
  editor.value?.fill(undefined)
}

function toggleGladiatorMode() {
  gladiatorMode.value = !gladiatorMode.value

  Store.shared.set(GLADIATOR_MODE_KEY, gladiatorMode.value, true)
}

function addPlayer() {
  if (!editor.value) return

  const player = editor.value.read()

  if (player.Name === '') {
    player.Name = `Player ${players.value.length + 1}`
  }

  players.value = [{ player, score: null, index: nextIndex++ }, ...players.value]

  selectedIndex.value = -1

  clearEditor()
}

function savePlayer() {
  if (!editor.value) return

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

function insertPlayer(data: unknown) {
  selectedIndex.value = nextIndex++

  players.value = [{ player: preparePlayerData(data), score: null, index: selectedIndex.value }, ...players.value]

  clearEditor()
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

async function runSimulation(instances: number, iterations: number, onLogs?: (log: SimulatorLog) => void) {
  if (!canSimulate.value) return

  const units = createUnderworldUnits(readUnderworldValues(), shieldMode.value)

  const entries = players.value.map((entry) => ({ ...entry, score: null }))

  players.value = entries

  const collected: PlayerScore[] = []

  let logs: unknown[] = []

  const batch = new WorkerBatch<{ results: PlayerScore; logs: unknown[] }>('underworld')

  entries.forEach((entry, index) => {
    batch.add(
      (data) => {
        collected[index] = data.results

        if (onLogs) {
          logs = logs.concat(data.logs)
        }
      },
      {
        units,
        player: entry,
        iterations,
        flags: { Gladiator15: gladiatorMode.value },
        config: simulatorConfig.value,
        log: !!onLogs
      }
    )
  })

  const duration = await batch.run(instances)

  if (duration === null) return

  useToast({ title: localize.global('simulator.toast.title'), message: localize.global('simulator.toast.message', { duration: formatDuration(duration) }) })

  players.value = sortDescending(collected, (entry) => entry.player.Level + 1000 * (entry.score ?? 0))

  if (onLogs && logs.length > 0) {
    onLogs({ fights: logs, players: players.value.map(({ player }) => player), config: simulatorConfig.value })
  }
}

function openFeedback() {
  useDialog(FeedbackDialog, { tool: 'underworld' })
}
</script>
