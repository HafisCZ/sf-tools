<template>
  <Page>
    <template #nav>
      <SimulatorDebug logs @log="runLogged" />
    </template>

    <StatisticsIntegration type="guilds" :profile="PROFILE" :scope="listCompleteGroups" @select="insertGroup" />
    <SimulatorPasteTarget @paste="handlePaste" />

    <div class="grid gap-7 md:grid-cols-2">
      <PlayerEditor ref="editor-ref" @copy="copyPlayer" />

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
          <div class="col-span-8 flex justify-end">
            <SFTooltip :content="localize('gladiator_mode')">
              <SFButton variant="outline" icon :aria-label="localize('gladiator_mode')" :aria-pressed="gladiatorMode" :class="{ 'bg-accent text-black': gladiatorMode }" @click="toggleGladiatorMode">
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
          </div>
          <SimulatorSettings ref="settings-ref" storage-key="guild_sim" :default-threads="4" :default-iterations="2500" class="col-span-7" />
          <SFButton variant="outline" block :disabled="isSimulating ? 'loading' : isLogging || !canSimulate" class="col-span-5" @click="simulate">
            {{ localize.global('simulator.simulate') }}
          </SFButton>
        </div>

        <SFToggleGroup ref="guild-ref" v-model="selectedGuild" :options="guildOptions" class="mt-[14px]" />

        <div v-if="score !== null" class="mt-[14px] flex items-center justify-center">
          <SFHeading level="5" class="flex-1 text-center leading-[1.2857]">{{ score.toFixed(2) }}%</SFHeading>
          <SFHeading level="5" class="flex-1 text-center leading-[1.2857]">{{ (100 - score).toFixed(2) }}%</SFHeading>
        </div>

        <SFTable fixed dense class="mt-[14px]">
          <template #header>
            <SFTableRow>
              <SFTableHeader align="center" class="w-12">#</SFTableHeader>
              <SFTableHeader align="center" class="w-20">{{ localize.global('editor.class') }}</SFTableHeader>
              <SFTableHeader align="center" class="w-16">{{ localize.global('editor.level') }}</SFTableHeader>
              <SFTableHeader>{{ localize.global('editor.name') }}</SFTableHeader>
              <SFTableHeader class="w-12" />
              <SFTableHeader class="w-12" />
            </SFTableRow>
          </template>
          <SFTableRow
            v-for="(entry, position) in players"
            :key="entry.index"
            tabindex="0"
            class="cursor-pointer outline-none"
            :class="[entry.index === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5 focus-visible:bg-white/5', { 'opacity-50': entry.inactive > 0 }]"
            @click="(event: MouseEvent) => handleRowClick(event, entry)"
            @keydown="(event: KeyboardEvent) => handleRowKeydown(event, entry)"
          >
            <SFTableCell align="center">{{ position + 1 }}</SFTableCell>
            <SFTableCell align="center">
              <img :src="getClassImageUrl(entry.player.Class)" :alt="localize.global(`general.class${entry.player.Class}`)" class="mx-auto size-8" />
            </SFTableCell>
            <SFTableCell align="center">{{ entry.player.Level }}</SFTableCell>
            <SFTableCell>{{ entry.player.Name }}{{ INACTIVE_SUFFIXES[entry.inactive] }}</SFTableCell>
            <SFTableCell align="center">
              <SFButton variant="ghost" size="sm" icon class="hover:text-green-400 focus-visible:text-green-400" @click="cycleInactive(entry)" @contextmenu.prevent="resetInactive(entry)">
                <SFIcon name="calendar-xmark" />
              </SFButton>
            </SFTableCell>
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
import SFTable from '@library/SFTable.vue'
import SFTableCell from '@library/SFTableCell.vue'
import SFTableHeader from '@library/SFTableHeader.vue'
import SFTableRow from '@library/SFTableRow.vue'
import SFToggleGroup from '@library/SFToggleGroup.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { type SelectOption } from '@utils/components'
import { useDialog } from '@utils/dialogs'
import { useLocalize } from '@utils/localization'
import { useToast } from '@utils/toasts'
import { compact, copyJson, formatDuration, getClassImageUrl, sequence, sortDescending, sum, useSubmit } from '@utils/utils'
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
import { copySimulatorData, handleSimulatorPaste, preparePlayerData, saveSimulatorLog, simulatorConfig, type SimulatorConfig, type SimulatorLogTarget } from '~/sim/debug'

defineOptions({
  name: 'GuildsPage'
})

type ListPlayer = {
  player: PlayerModel
  // 0 active, 1 inactive, 2 inactive for longer
  inactive: number
  index: number
}

type SimulatorLog = {
  fights: unknown[]
  players: unknown[]
  config: SimulatorConfig | null
}

const PROFILE = HYDRA_PROFILE

const GLADIATOR_MODE_KEY = 'guild_sim/gladiator'

const INACTIVE_SUFFIXES = ['', ' (Inactive)', ' (Inactive 14+ days)']

const localize = useLocalize('guilds')

const pasteMode = ref(false)
const gladiatorMode = ref(Store.shared.get<string>(GLADIATOR_MODE_KEY, 'false', true) === 'true')

const guilds = shallowRef<[ListPlayer[], ListPlayer[]]>([[], []])
const currentGuild = ref(0)
const selectedIndex = ref(-1)

const score = ref<number | null>(null)

let nextIndex = 0

const editor = useTemplateRef('editor-ref')
const settings = useTemplateRef('settings-ref')

const isEditorValid = useComponentValidation(editor)

const isSimulationValid = useComponentValidation(settings, useTemplateRef('guild-ref'))

const canSimulate = computed(() => isSimulationValid.value && guilds.value[0].length > 0 && guilds.value[1].length > 0)

const { submit: simulate, isSubmitting: isSimulating } = useSubmit(async () => {
  if (!settings.value) return

  const instances = Math.max(1, settings.value.threads || 4)
  const iterations = Math.max(1, settings.value.iterations || 2500)

  await runSimulation(instances, iterations)
})

const { submit: runLogged, isSubmitting: isLogging } = useSubmit(async (target: SimulatorLogTarget) => {
  await runSimulation(1, 50, (log) => saveSimulatorLog(target, log))
})

const players = computed(() => guilds.value[currentGuild.value])

const guildOptions = computed<SelectOption[]>(() => [
  { value: '0', label: localize('guild1') },
  { value: '1', label: localize('guild2') }
])

// Ignores the toggle group's deselect, so the open guild stays selected
const selectedGuild = computed({
  get: () => String(currentGuild.value),
  set: (value) => {
    if (value !== null) {
      selectGuild(Number(value))
    }
  }
})

function listCompleteGroups() {
  return compact(Object.values(DatabaseManager.Groups).map((group) => group.List.filter((entry) => entry.MembersTotal === entry.MembersPresent)[0]))
}

function setPlayers(list: ListPlayer[]) {
  const sorted = sortDescending(list, (entry) => entry.player.Level)

  guilds.value = currentGuild.value === 0 ? [sorted, guilds.value[1]] : [guilds.value[0], sorted]
}

function clearEditor() {
  editor.value?.fill(undefined)

  selectedIndex.value = -1
}

function selectGuild(index: number) {
  currentGuild.value = index

  clearEditor()
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

  setPlayers([{ player, inactive: 0, index: nextIndex++ }, ...players.value])

  clearEditor()
}

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

function cycleInactive(entry: ListPlayer) {
  setPlayers(players.value.map((item) => (item === entry ? { ...item, inactive: (item.inactive + 1) % INACTIVE_SUFFIXES.length } : item)))
}

function resetInactive(entry: ListPlayer) {
  setPlayers(players.value.map((item) => (item === entry ? { ...item, inactive: 0 } : item)))
}

function handleRowClick(event: MouseEvent, entry: ListPlayer) {
  if (event.target instanceof Element && event.target.closest('button')) return

  selectPlayer(entry)
}

function handleRowKeydown(event: KeyboardEvent, entry: ListPlayer) {
  if (event.key === 'Enter' && event.target === event.currentTarget) {
    selectPlayer(entry)
  }
}

function insertGroup(group: GroupEntry) {
  const members = compact(group.Members.map((identifier) => DatabaseManager.getPlayer(identifier, group.Timestamp)))

  setPlayers(members.map((data) => ({ player: ModelUtils.toSimulatorData(data), inactive: 0, index: nextIndex++ })))

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
      const entries = data.map((item: unknown) => ({ player: preparePlayerData(item), inactive: 0, index: nextIndex++ }))

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

  const scores: number[] = []

  let logs: unknown[] = []

  const batch = new WorkerBatch<{ results: { score: number }; logs: unknown[] }>('guilds')

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
        guildA: guilds.value[0],
        guildB: guilds.value[1],
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
    onLogs({ fights: logs, players: guilds.value.flatMap((list) => list.map(({ player }) => player)), config: simulatorConfig.value })
  }
}

function openFeedback() {
  useDialog(FeedbackDialog, { tool: 'guilds' })
}
</script>
