<template>
  <Page>
    <template #nav-left>
      <StatisticsIntegration type="guilds" :profile="HYDRA_PROFILE" :scope="listCompleteGroups" @select="insertGroup" />
      <span v-if="isSimulatorDebug" class="mx-1.5 h-5 w-px bg-white/12" />
      <SimulatorDebug copy @copy="copyWithConfig" />
    </template>

    <SimulatorPasteTarget use-drag-drop @paste="handlePaste" />

    <div class="grid gap-7 md:grid-cols-2">
      <div>
        <div class="grid grid-cols-3 gap-[14px]">
          <SimulatorSettings ref="settings-ref" storage-key="hell_raids" :default-threads="4" :default-iterations="25000" class="col-span-2" />
          <SFButton variant="outline" block :disabled="isPlanning ? 'loading' : !canPlan" @click="planRaids">
            {{ localize('plan') }}
          </SFButton>
        </div>

        <div class="mt-[14px] grid grid-cols-2 gap-[14px]">
          <SFNumber ref="raid-chance-ref" v-model="raidChance" :label="localize('raid_chance')" suffix="%" required :min="1" :max="100" :step="1" centered />
          <SFNumber ref="floor-chance-ref" v-model="floorChance" :label="localize('floor_chance')" suffix="%" required :min="1" :max="100" :step="1" centered />
        </div>

        <div class="mt-10 grid grid-cols-16 items-center gap-[14px]">
          <SFButton variant="outline" block class="col-span-5" :disabled="!isEditorValid" @click="addPlayer">
            {{ localize.global('simulator.add') }}
          </SFButton>
          <div class="col-span-5">
            <SFButton v-if="selectedIndex >= 0" variant="outline" block :disabled="!isEditorValid" @click="savePlayer">
              {{ localize.global('simulator.save') }}
            </SFButton>
          </div>
          <div class="col-span-6 flex justify-end gap-2">
            <SFTooltip :content="localize.global('simulator.clipboard.paste_mode')">
              <SFButton variant="outline" icon class="size-9.5" :aria-label="localize.global('simulator.clipboard.paste_mode')" :aria-pressed="pasteMode" :class="{ 'bg-accent text-black': pasteMode }" @click="pasteMode = !pasteMode">
                <SFIcon name="paste" />
              </SFButton>
            </SFTooltip>
            <SFTooltip :content="localize.global('simulator.clipboard.copy_all')">
              <SFButton variant="outline" icon class="size-9.5" :aria-label="localize.global('simulator.clipboard.copy_all')" @click="copyAll">
                <SFIcon name="copy" />
              </SFButton>
            </SFTooltip>
            <SFTooltip :content="localize.global('simulator.snack_apply_all')">
              <SFButton variant="outline" icon class="size-9.5" :aria-label="localize.global('simulator.snack_apply_all')" @click="applySnackToAll">
                <SFIcon name="bone" />
              </SFButton>
            </SFTooltip>
          </div>
        </div>

        <PlayerEditor ref="editor-ref" snacks class="mt-[14px]" @copy="copyPlayer" />
      </div>

      <SFTable dense class="self-start md:max-h-[calc(100dvh-134px)] md:overflow-y-auto md:[scrollbar-gutter:stable]">
        <template #header>
          <SFTableRow>
            <SFTableHeader align="center" class="w-12 min-w-12">#</SFTableHeader>
            <SFTableHeader class="w-full">{{ localize.global('simulator.player') }}</SFTableHeader>
            <SFTableHeader align="right" class="whitespace-nowrap">{{ localize('top_floor') }}</SFTableHeader>
            <SFTableHeader class="w-12 min-w-12" />
          </SFTableRow>
        </template>
        <template v-for="section in sections" :key="section.key">
          <SFTableRow v-if="section.title">
            <SFTableCell colspan="4">
              <div class="relative -mx-[8.4px] -my-[5.6px] flex h-[52px] items-center gap-2.5 overflow-hidden px-3">
                <img v-if="section.picture" :src="section.picture" alt="" class="absolute inset-0 size-full object-cover" :class="{ 'brightness-50 grayscale': !section.beaten || isPlanOutdated }" />
                <span v-if="section.picture" class="absolute inset-0 bg-linear-to-r from-dialog/90 via-dialog/55 to-dialog/85" />
                <span class="relative min-w-0 flex-1 text-shadow-[0_1px_2px_rgb(0_0_0/0.8)]">
                  <span class="block truncate text-[15px] font-bold" :class="isPlanOutdated ? 'text-white/60' : 'text-white'">{{ section.title }}</span>
                  <span class="block truncate text-xs text-white/80">{{ section.status }}</span>
                </span>
                <span v-if="section.chance" class="relative text-lg font-bold" :class="section.beaten && !isPlanOutdated ? 'text-accent' : 'text-white/70'">{{ section.chance }}</span>
              </div>
            </SFTableCell>
          </SFTableRow>
          <SFTableRow
            v-for="(entry, position) in section.members"
            :key="entry.index"
            tabindex="0"
            class="cursor-pointer outline-none"
            :class="entry.index === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5 focus-visible:bg-white/5'"
            @click="(event: MouseEvent) => handleRowClick(event, entry)"
            @keydown="(event: KeyboardEvent) => handleRowKeydown(event, entry)"
          >
            <SFTableCell align="center">{{ position + 1 }}</SFTableCell>
            <SFTableCell class="w-full max-w-0">
              <div class="flex items-center gap-2.5">
                <img :src="getClassImageUrl(entry.player.Class)" :alt="localize.global(`general.class${entry.player.Class}`)" class="size-8 shrink-0" />
                <div class="min-w-0">
                  <SFTooltip :content="entry.player.Name">
                    <div class="truncate font-bold">{{ entry.player.Name }}</div>
                  </SFTooltip>
                  <div class="truncate text-xs text-white/60">{{ localize.global('simulator.player_level', { level: entry.player.Level }) }}</div>
                </div>
              </div>
            </SFTableCell>
            <SFTableCell align="right" class="whitespace-nowrap">
              <div class="text-[15px] leading-5 font-bold" :class="{ 'text-white/60': !plan?.floors.has(entry.index) }">{{ plan?.floors.get(entry.index) ?? '-' }}</div>
            </SFTableCell>
            <SFTableCell align="center">
              <SFButton variant="ghost" size="sm" icon class="hover:text-red-400 focus-visible:text-red-400" @click="removePlayer(entry)">
                <SFIcon name="trash-can" />
              </SFButton>
            </SFTableCell>
          </SFTableRow>
        </template>
      </SFTable>
    </div>

    <template #footer-right>
      <PageFooterLinks />
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
import { useLocalize } from '@utils/localization'
import { useToast } from '@utils/toasts'
import { compact, copyJson, formatDuration, getClassImageUrl, getValueAtPath, setValueAtPath, useSubmit } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import { type GroupModel } from '~/core/models/group'
import { type PlayerModel } from '~/core/models/player'
import { ModelUtils, type SimulatorData } from '~/core/models/utils'
import { HYDRA_PROFILE } from '~/core/profiles'
import { DatabaseManager } from '~/data/database-manager'
import StatisticsIntegration from '~/integration/StatisticsIntegration.vue'
import PageFooterLinks from '~/pages/components/PageFooterLinks.vue'
import Page from '~/pages/Page.vue'
import PlayerEditor from '~/sim/components/PlayerEditor.vue'
import SimulatorDebug from '~/sim/components/SimulatorDebug.vue'
import SimulatorPasteTarget from '~/sim/components/SimulatorPasteTarget.vue'
import SimulatorSettings from '~/sim/components/SimulatorSettings.vue'
import { copySimulatorData, handleSimulatorPaste, isSimulatorDebug, preparePlayerData } from '~/sim/debug'
import { HELL_RAID_FLOORS, useHellRaidPlanner } from '~/sim/hell-raids'

defineOptions({
  name: 'HellRaidsPage'
})

type ListPlayer = {
  player: PlayerModel | SimulatorData
  index: number
}

type PlannedGroup = {
  raid: number
  beaten: boolean
  chance: number | null
  /**
   * `index` of each member
   */
  members: number[]
}

type Plan = {
  /**
   * Top floor by member `index`
   */
  floors: Map<number, number>
  groups: PlannedGroup[]
  /**
   * `index` of each member no group needed
   */
  overhead: number[]
}

type Section = {
  key: string
  title?: string
  status?: string
  chance?: string
  picture?: string
  beaten?: boolean
  members: ListPlayer[]
}

const localize = useLocalize('hell_raids')

const planner = useHellRaidPlanner()

const raidChance = ref<number | null>(100)
const floorChance = ref<number | null>(25)

const pasteMode = ref(false)

const players = shallowRef<ListPlayer[]>([])
const selectedIndex = ref(-1)

const plan = shallowRef<Plan | null>(null)
const isPlanOutdated = ref(false)

let nextIndex = 0

const editor = useTemplateRef('editor-ref')
const settings = useTemplateRef('settings-ref')

const isEditorValid = useComponentValidation(editor)

const isPlanValid = useComponentValidation(settings, useTemplateRef('raid-chance-ref'), useTemplateRef('floor-chance-ref'))

const canPlan = computed(() => isPlanValid.value && players.value.length > 0)

const planSubmit = useSubmit(async () => {
  if (!settings.value || !canPlan.value) return

  const planned = players.value

  const run = { instances: Math.max(1, settings.value.threads || 4), iterations: Math.max(1, settings.value.iterations || 25000) }

  const planSettings = {
    raidChance: raidChance.value ?? 100,
    floorChance: floorChance.value ?? 25
  }

  const result = await planner.plan(
    planned.map((entry) => entry.player),
    planSettings,
    run
  )

  if (!result) return

  plan.value = {
    floors: new Map(planned.map((entry, position) => [entry.index, result.floors[position]])),
    groups: result.groups.map((group) => ({ ...group, members: group.members.map((position) => planned[position].index) })),
    overhead: result.overhead.map((position) => planned[position].index)
  }

  isPlanOutdated.value = false

  useToast({ title: localize.global('simulator.toast.title'), message: localize.global('simulator.toast.message', { duration: formatDuration(result.duration) }) })
})

const planRaids = planSubmit.submit
const isPlanning = planSubmit.isSubmitting

const sections = computed<Section[]>(() => {
  if (!plan.value) {
    return [{ key: 'members', members: players.value }]
  }

  const floors = plan.value.floors

  // Members added after the plan, they are in no group yet
  const list: Section[] = [{ key: 'members', members: players.value.filter((entry) => !floors.has(entry.index)) }]

  for (const group of plan.value.groups) {
    list.push({
      key: `raid_${group.raid}`,
      title: getRaidName(group.raid),
      status: getGroupStatus(group),
      chance: group.chance === null ? '-' : `${formatChance(group.chance)}%`,
      picture: getRaidPicture(group.raid),
      beaten: group.beaten,
      members: listMembers(group.members)
    })
  }

  if (plan.value.overhead.length > 0) {
    list.push({ key: 'overhead', title: localize('unallocated'), status: formatMembers(plan.value.overhead.length), members: listMembers(plan.value.overhead) })
  }

  return list
})

// Members still in the list, lowest top floor first
function listMembers(members: number[]) {
  const floors = plan.value?.floors

  return players.value.filter((entry) => members.includes(entry.index)).sort((a, b) => (floors?.get(a.index) ?? 0) - (floors?.get(b.index) ?? 0) || a.player.Level - b.player.Level)
}

function getRaidName(raid: number) {
  return localize.global(`raids.raids.hellevator_${raid}`)
}

const RAID_PICTURES = ['highway_to_hell', 'limbo', 'lust', 'gluttony', 'greed', 'wrath', 'heresy', 'violence', 'fraud', 'treachery', 'limbo', 'highway_to_hell']

function getRaidPicture(raid: number) {
  return `/res/hellevator/${RAID_PICTURES[raid - 1]}.webp`
}

function getGroupStatus(group: PlannedGroup) {
  const floor = group.raid * HELL_RAID_FLOORS

  if (group.members.length > 0) {
    return localize('status.beaten', { floor, members: formatMembers(group.members.length) })
  }

  return localize('status.lost', { floor })
}

function formatMembers(count: number) {
  return localize(count === 1 ? 'members.one' : 'members.many', { count })
}

function formatChance(chance: number) {
  return Number.isInteger(chance) ? String(chance) : chance.toFixed(2)
}

function listCompleteGroups() {
  return compact(Object.values(DatabaseManager.Groups).map((group) => group.List.filter((entry) => entry.MembersTotal === entry.MembersPresent)[0]))
}

function setPlayers(list: ListPlayer[]) {
  players.value = [...list].sort((a, b) => a.player.Level - b.player.Level)

  const floors = plan.value?.floors

  if (floors && players.value.some((entry) => floors.has(entry.index))) {
    isPlanOutdated.value = true
  } else {
    plan.value = null
  }
}

function clearEditor() {
  editor.value?.fill(undefined)

  selectedIndex.value = -1
}

function addPlayer() {
  if (!editor.value) return

  const player = editor.value.read()

  if (player.Name === '') {
    player.Name = `Player ${players.value.length + 1}`
  }

  setPlayers([{ player, index: nextIndex++ }, ...players.value])

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

  for (const entry of players.value) {
    setValueAtPath(entry.player, 'Snack', getValueAtPath(current, 'Snack'))
    setValueAtPath(entry.player, 'SnackPotency', getValueAtPath(current, 'SnackPotency'))
  }

  setPlayers([...players.value])

  useToast({ title: localize.global('simulator.snack_apply_all_toast_title'), message: localize.global('simulator.snack_apply_all_toast_message') })
}

function insertGroup(group: GroupModel) {
  const members = compact(group.Members.map((identifier) => DatabaseManager.getPlayer(identifier, group.Timestamp)))

  setPlayers(members.map((data) => ({ player: ModelUtils.toSimulatorData(data), index: nextIndex++ })))

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
  void copyJson(players.value.map((entry) => ModelUtils.toSimulatorData(entry.player)))
}

function copyWithConfig() {
  copySimulatorData(players.value.map((entry) => ModelUtils.toSimulatorData(entry.player)))
}
</script>
