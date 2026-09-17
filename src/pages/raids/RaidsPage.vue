<template>
  <Page>
    <template #nav>
      <SimulatorDebug logs copy @log="runLogged" @copy="copyAll" />
    </template>

    <StatisticsIntegration type="guilds" :profile="PROFILE" :scope="listCompleteGroups" @select="insertGroup" />
    <SimulatorPasteTarget @paste="handlePaste" />

    <div class="grid gap-7 md:grid-cols-2">
      <PlayerEditor ref="editor-ref" snacks @copy="copyPlayer" />

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
          <SimulatorSettings ref="settings-ref" storage-key="guild_sim" :default-threads="4" :default-iterations="2500" class="col-span-6" />
          <div class="col-span-2 flex justify-end">
            <SFTooltip :content="localize.global('guilds.gladiator_mode')">
              <SFButton variant="outline" icon :aria-label="localize.global('guilds.gladiator_mode')" :aria-pressed="gladiatorMode" :class="{ 'bg-accent text-black': gladiatorMode }" @click="toggleGladiatorMode">
                <SFIcon name="bolt" />
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
            <SFTooltip :content="localize.global('simulator.snack_apply_all')">
              <SFButton variant="outline" icon class="flex-1" :aria-label="localize.global('simulator.snack_apply_all')" @click="applySnackToAll">
                <SFIcon name="bone" />
              </SFButton>
            </SFTooltip>
          </div>
          <div class="col-span-7">
            <SFSelect ref="raid-ref" v-model="raid" :options="raidOptions" search />
          </div>
          <SFButton variant="outline" block :disabled="!canSimulate" class="col-span-5" @click="simulate">
            {{ localize.global('simulator.simulate') }}
          </SFButton>
        </div>

        <SFHeading v-if="score !== null" level="5" class="mt-[14px] text-center leading-[1.2857]">
          {{ localize('result', { chance: score.toFixed(2) }) }}
        </SFHeading>

        <SFTable fixed dense class="mt-[14px]">
          <template #header>
            <SFTableRow>
              <SFTableHeader align="center" class="w-12">#</SFTableHeader>
              <SFTableHeader align="center" class="w-20">{{ localize.global('editor.class') }}</SFTableHeader>
              <SFTableHeader align="center" class="w-16">{{ localize.global('editor.level') }}</SFTableHeader>
              <SFTableHeader>{{ localize.global('editor.name') }}</SFTableHeader>
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
            <SFTableCell align="center">
              <SFButton variant="ghost" size="sm" icon class="hover:text-red-400 focus-visible:text-red-400" @click="removePlayer(entry)">
                <SFIcon name="trash-can" />
              </SFButton>
            </SFTableCell>
          </SFTableRow>
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
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import SFParagraph from '@library/SFParagraph.vue'
import SFSelect from '@library/SFSelect.vue'
import SFTable from '@library/SFTable.vue'
import SFTableCell from '@library/SFTableCell.vue'
import SFTableHeader from '@library/SFTableHeader.vue'
import SFTableRow from '@library/SFTableRow.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { type SelectOption } from '@utils/components'
import { useDialog } from '@utils/dialogs'
import { useLocalize } from '@utils/localization'
import { useToast } from '@utils/toasts'
import { compact, copyJson, formatDuration, getClassImageUrl, getValueAtPath, sequence, setValueAtPath, sortDescending, sum } from '@utils/utils'
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
import { getRaidEnemies, scaleRaidPlayers } from '~/sim/data/raids'
import { copySimulatorData, handleSimulatorPaste, preparePlayerData, saveSimulatorLog, simulatorConfig, type SimulatorConfig, type SimulatorLogTarget } from '~/sim/debug'

defineOptions({
  name: 'RaidsPage'
})

// One player of the list
type ListPlayer = {
  player: PlayerModel
  // Stays the same when other players are removed
  index: number
}

// What the analyzer reads from a simulation log
type SimulatorLog = {
  fights: unknown[]
  players: unknown[]
  config: SimulatorConfig | null
}

const PROFILE = HYDRA_PROFILE

const GLADIATOR_MODE_KEY = 'guild_sim/gladiator'

// Hellevator raids, one for every 100 levels
const HELLEVATOR_TIERS = 12

const RAIDS = 150

// Raid names repeat every 50 raids
const RAID_NAMES = 50

const localize = useLocalize('raids')

const raid = ref('hellevator_1')

const pasteMode = ref(false)
const gladiatorMode = ref(Store.shared.get<string>(GLADIATOR_MODE_KEY, 'false', true) === 'true')

const players = shallowRef<ListPlayer[]>([])
const selectedIndex = ref(-1)

// Chance to win from 0 to 100, null until simulated
const score = ref<number | null>(null)

let nextIndex = 0

const editor = useTemplateRef('editor-ref')
const settings = useTemplateRef('settings-ref')

const isEditorValid = useComponentValidation(editor)

const isSimulationValid = useComponentValidation(settings, useTemplateRef('raid-ref'))

const canSimulate = computed(() => isSimulationValid.value && players.value.length > 0)

const raidOptions = computed<SelectOption<string>[]>(() => [
  ...sequence(HELLEVATOR_TIERS, 1).map((tier) => ({ value: `hellevator_${tier}`, label: localize(`raids.hellevator_${tier}`) })),
  ...sequence(RAIDS, 1).map((number) => ({ value: `raid_${number}`, label: `${number} - ${localize.global(`general.guild_raid_${((number - 1) % RAID_NAMES) + 1}`)}` }))
])

// The newest saved state of every guild that has all of its members saved too
function listCompleteGroups() {
  return compact(Object.values(DatabaseManager.Groups).map((group) => group.List.filter((entry) => entry.MembersTotal === entry.MembersPresent)[0]))
}

function setPlayers(list: ListPlayer[]) {
  players.value = sortDescending(list, (entry) => entry.player.Level)
}

function clearEditor() {
  editor.value?.fill(undefined)

  selectedIndex.value = -1
}

function toggleGladiatorMode() {
  gladiatorMode.value = !gladiatorMode.value

  Store.shared.set(GLADIATOR_MODE_KEY, gladiatorMode.value, true)
}

// The name is only filled in for a player added by hand, like on the legacy page
function addPlayer() {
  if (!editor.value) return

  const player = editor.value.read()

  if (player.Name === '') {
    player.Name = `Player ${players.value.length + 1}`
  }

  setPlayers([{ player, index: nextIndex++ }, ...players.value])

  clearEditor()
}

// Without a selected player the editor is added as a new one, like on the legacy page
function savePlayer() {
  if (!editor.value) return

  const player = editor.value.read()

  setPlayers(players.value.map((entry) => (entry.index === selectedIndex.value ? { ...entry, player } : entry)))
}

function selectPlayer(entry: ListPlayer) {
  selectedIndex.value = entry.index

  editor.value?.fill(entry.player)
}

function removePlayer(entry: ListPlayer) {
  setPlayers(players.value.filter((item) => item !== entry))

  if (entry.index === selectedIndex.value) {
    clearEditor()
  }
}

// Clicks on the remove button don't select the row
function handleRowClick(event: MouseEvent, entry: ListPlayer) {
  if (event.target instanceof Element && event.target.closest('button')) return

  selectPlayer(entry)
}

function handleRowKeydown(event: KeyboardEvent, entry: ListPlayer) {
  if (event.key === 'Enter' && event.target === event.currentTarget) {
    selectPlayer(entry)
  }
}

function applySnackToAll() {
  if (!editor.value) return

  const current = editor.value.read()

  for (const { player } of players.value) {
    setValueAtPath(player, 'Snack', getValueAtPath(current, 'Snack'))
    setValueAtPath(player, 'SnackPotency', getValueAtPath(current, 'SnackPotency'))
  }

  useToast({ title: localize.global('simulator.snack_apply_all_toast_title'), message: localize.global('simulator.snack_apply_all_toast_message') })
}

// Every member saved at the time the guild was saved replaces the list
function insertGroup(group: GroupEntry) {
  const members = compact(group.Members.map((identifier) => DatabaseManager.getPlayer(identifier, group.Timestamp)))

  setPlayers(members.map((data) => ({ player: ModelUtils.toSimulatorData(data), index: nextIndex++ })))

  clearEditor()
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
      const entries = data.map((item: unknown) => ({ player: preparePlayerData(item), index: nextIndex++ }))

      if (pasteMode.value) {
        setPlayers([...players.value, ...entries])
      } else {
        setPlayers(entries)

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

  const enemies = getRaidEnemies(raid.value).map((player) => ({ player }))

  const scaledPlayers = scaleRaidPlayers(
    raid.value,
    players.value.map(({ player }) => player)
  ).map((player) => ({ player }))

  const scores: number[] = []

  let logs: unknown[] = []

  const batch = new WorkerBatch<{ results: { score: number }; logs: unknown[] }>('raids')

  sequence(instances).forEach(() => {
    batch.add(
      (data) => {
        scores.push(data.results.score)

        if (onLogs) {
          logs = logs.concat(data.logs)
        }
      },
      {
        flags: { Gladiator15: gladiatorMode.value },
        players: scaledPlayers,
        enemies,
        iterations,
        config: simulatorConfig.value,
        log: !!onLogs
      }
    )
  })

  const duration = await batch.run(instances)

  useToast({ title: localize.global('simulator.toast.title'), message: localize.global('simulator.toast.message', { duration: formatDuration(duration) }) })

  score.value = (100 * sum(scores)) / (instances * iterations)

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
  void runSimulation(1, 50, (log) => saveSimulatorLog(target, log))
}

function openFeedback() {
  useDialog(FeedbackDialog, { tool: 'raids' })
}
</script>
