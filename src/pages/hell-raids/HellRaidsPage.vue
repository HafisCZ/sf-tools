<template>
  <Page width="1703px">
    <template #nav-left>
      <StatisticsIntegration type="guilds" :profile="HYDRA_PROFILE" :scope="listCompleteGroups" @select="insertGroup" />
      <template v-if="guild">
        <span class="mx-1.5 h-5 w-px bg-white/12" />
        <SFButton variant="ghost" :disabled="isSetupSaved" @click="saveSetup">
          <SFIcon name="floppy-disk" />
          {{ localize('setup.save') }}
        </SFButton>
        <SFButton variant="ghost" :disabled="!storedSetup || isSetupSaved || isBusy" @click="loadSetup">
          <SFIcon name="rotate-left" />
          {{ localize('setup.load') }}
        </SFButton>
        <SFButton variant="ghost" :disabled="!storedSetup" @click="clearSetup">
          <SFIcon name="trash-can" />
          {{ localize('setup.clear') }}
        </SFButton>
      </template>
      <span v-if="isSimulatorDebug" class="mx-1.5 h-5 w-px bg-white/12" />
      <SimulatorDebug copy @copy="copyWithConfig" />
    </template>

    <SimulatorPasteTarget use-drag-drop class="invisible" @paste="handlePaste" />

    <div ref="ghost-ref" class="pointer-events-none fixed top-0 -left-[1000px]">
      <div v-if="draggedEntry" class="flex w-[360px] items-center gap-2.5 rounded-[4px] border border-line bg-surface-hover px-3 py-1.5">
        <img :src="getClassImageUrl(draggedEntry.player.Class)" alt="" class="size-8 shrink-0" />
        <div class="min-w-0 flex-1">
          <div class="truncate font-bold">{{ draggedEntry.player.Name }}</div>
          <div class="grid w-40 max-w-full grid-cols-2 gap-x-2 text-xs text-white/60">
            <span class="truncate">{{ localize.global('simulator.player_level', { level: draggedEntry.player.Level }) }}</span>
            <span class="truncate">{{ localize('item_level', { level: draggedEntry.itemLevel ?? '-' }) }}</span>
          </div>
        </div>
        <div class="text-[15px] leading-5 font-bold" :class="{ 'text-white/60': !floors.has(draggedEntry.index) }">{{ floors.get(draggedEntry.index) ?? '-' }}</div>
      </div>
    </div>

    <div class="grid gap-7 md:grid-cols-2 xl:grid-cols-3" @dragover="clearDropTarget">
      <div>
        <SimulatorSettings ref="settings-ref" storage-key="hell_raids" :default-threads="4" :default-iterations="25000" />

        <div class="mt-[14px] grid grid-cols-3 items-end gap-[14px]">
          <SFNumber ref="floor-chance-ref" v-model="floorChance" :label="localize('floor_chance')" suffix="%" required :min="1" :max="100" :step="1" centered />
          <SFNumber ref="raid-chance-ref" v-model="raidChance" :label="localize('raid_chance')" suffix="%" required :min="1" :max="100" :step="1" centered />
          <SFSelect v-model="raidLimit" :label="localize('raid_limit')" :options="RAID_LIMIT_OPTIONS" />
        </div>

        <div class="mt-[14px] grid grid-cols-3 gap-[14px]">
          <SFButton variant="outline" block :disabled="isClimbing ? 'loading' : !canSimulate || isBusy" @click="simulateFloors">
            {{ localize('simulate_floors') }}
          </SFButton>
          <SFButton variant="outline" block :disabled="isOrganizing ? 'loading' : !canSimulate || isBusy" @click="organizeRaids">
            {{ localize('organize') }}
          </SFButton>
          <SFButton variant="outline" block :disabled="isSimulatingRaids ? 'loading' : !canSimulateRaids || isBusy" @click="simulateRaids">
            {{ localize('simulate_raids') }}
          </SFButton>
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

      <SFTable v-for="table in tables" :key="table.key" v-model:sorting="sorting" dense class="self-start md:max-h-[calc(100dvh-134px)] md:overflow-y-auto md:[scrollbar-gutter:stable]">
        <template #header>
          <SFTableRow>
            <SFTableHeader align="center" class="w-12 min-w-12">#</SFTableHeader>
            <SFTableHeader v-if="table.key === 'groups'" class="w-full">{{ localize.global('simulator.player') }}</SFTableHeader>
            <SFTableHeader v-else class="w-full">
              {{ localize('unallocated') }}
              <span class="ml-1 font-normal text-white/60">{{ formatMembers(unallocated.length) }}</span>
            </SFTableHeader>
            <SFTableHeader align="right" class="whitespace-nowrap">
              <SFTableSort column="floor">{{ localize('top_floor') }}</SFTableSort>
            </SFTableHeader>
            <SFTableHeader align="center" class="w-12 min-w-12">
              <SFTooltip v-if="table.key === 'groups'" :content="localize('results.copy')">
                <SFButton variant="ghost" size="sm" icon :aria-label="localize('results.copy')" :class="{ invisible: !hasGroups }" @click="copyResults">
                  <SFIcon name="copy" />
                </SFButton>
              </SFTooltip>
            </SFTableHeader>
          </SFTableRow>
        </template>
        <template v-for="section in table.sections" :key="section.target">
          <SFTableRow v-if="section.group" @dragover="(event: DragEvent) => overDrag(event, section.target)" @drop="(event: DragEvent) => dropMember(event, section.target)">
            <SFTableCell colspan="4">
              <div class="relative -mx-[8.4px] -my-[5.6px] flex h-[52px] items-center gap-2.5 overflow-hidden px-3">
                <img :src="getRaidPicture(section.group.raid)" alt="" class="absolute inset-0 size-full object-cover" :class="{ 'brightness-50 grayscale': !section.group.beaten && dropTarget !== section.target }" />
                <span class="absolute inset-0 bg-linear-to-r from-dialog/90 via-dialog/55 to-dialog/85" />
                <span class="relative min-w-0 flex-1 text-shadow-[0_1px_2px_rgb(0_0_0/0.8)]">
                  <span class="block truncate text-[15px] font-bold" :class="section.group.result?.outdated ? 'text-white/60' : 'text-white'">{{ getRaidName(section.group.raid) }}</span>
                  <span class="block truncate text-xs text-white/80">{{ getGroupStatus(section.group.raid, section.members.length) }}</span>
                </span>
                <span class="relative text-lg font-bold" :class="section.group.beaten ? 'text-accent' : 'text-white/70'">{{ section.group.result ? `${formatChance(section.group.result.chance)}%` : '-' }}</span>
                <span v-if="dropTarget === section.target" class="pointer-events-none absolute inset-0 ring-2 ring-accent ring-inset" />
              </div>
            </SFTableCell>
          </SFTableRow>
          <SFTableRow
            v-for="(entry, position) in section.members"
            :key="entry.index"
            draggable="true"
            tabindex="0"
            class="cursor-pointer outline-none"
            :class="getRowClass(entry, section.target)"
            @click="(event: MouseEvent) => handleRowClick(event, entry)"
            @keydown="(event: KeyboardEvent) => handleRowKeydown(event, entry)"
            @dragstart="(event: DragEvent) => startDrag(event, entry)"
            @dragend="endDrag"
            @dragover="(event: DragEvent) => overDrag(event, section.target)"
            @drop="(event: DragEvent) => dropMember(event, section.target)"
          >
            <SFTableCell align="center">{{ position + 1 }}</SFTableCell>
            <SFTableCell class="w-full max-w-0">
              <div class="flex items-center gap-2.5">
                <img :src="getClassImageUrl(entry.player.Class)" :alt="localize.global(`general.class${entry.player.Class}`)" class="size-8 shrink-0" />
                <div class="min-w-0">
                  <SFTooltip :content="entry.player.Name">
                    <div class="truncate font-bold">{{ entry.player.Name }}</div>
                  </SFTooltip>
                  <div class="grid w-40 max-w-full grid-cols-2 gap-x-2 text-xs text-white/60">
                    <span class="truncate">{{ localize.global('simulator.player_level', { level: entry.player.Level }) }}</span>
                    <span class="truncate">{{ localize('item_level', { level: entry.itemLevel ?? '-' }) }}</span>
                  </div>
                </div>
              </div>
            </SFTableCell>
            <SFTableCell align="right" class="whitespace-nowrap">
              <div class="text-[15px] leading-5 font-bold" :class="{ 'text-white/60': !floors.has(entry.index) }">{{ floors.get(entry.index) ?? '-' }}</div>
            </SFTableCell>
            <SFTableCell align="center">
              <SFButton v-if="section.target === UNALLOCATED" variant="ghost" size="sm" icon class="hover:text-red-400 focus-visible:text-red-400" @click="removePlayer(entry)">
                <SFIcon name="trash-can" />
              </SFButton>
              <SFButton v-else variant="ghost" size="sm" icon @click="moveMember(entry.index, UNALLOCATED)">
                <SFIcon name="xmark" />
              </SFButton>
            </SFTableCell>
          </SFTableRow>
          <SFTableRow v-if="section.members.length === 0" @dragover="(event: DragEvent) => overDrag(event, section.target)" @drop="(event: DragEvent) => dropMember(event, section.target)">
            <SFTableCell colspan="4">
              <div class="flex h-9 items-center justify-center rounded-[4px] border border-dashed text-[13px]" :class="dropTarget === section.target ? 'border-accent text-accent' : 'border-white/20 text-white/50'">
                {{ localize('drop') }}
              </div>
            </SFTableCell>
          </SFTableRow>
        </template>
      </SFTable>
    </div>

    <template #footer-left>
      <SimulatorDebugLink />
    </template>

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
import SFSelect from '@library/SFSelect.vue'
import SFTable from '@library/SFTable.vue'
import SFTableCell from '@library/SFTableCell.vue'
import SFTableHeader from '@library/SFTableHeader.vue'
import SFTableRow from '@library/SFTableRow.vue'
import SFTableSort from '@library/SFTableSort.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { type SelectOption, type TableSorting } from '@utils/components'
import { useLocalize } from '@utils/localization'
import { useToast } from '@utils/toasts'
import { compact, copyJson, copyText, formatDuration, getClassImageUrl, getValueAtPath, sequence, setValueAtPath, useSubmit } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import { type GroupModel } from '~/core/models/group'
import { ItemModel } from '~/core/models/item'
import { PlayerModel } from '~/core/models/player'
import { ModelUtils, type SimulatorData } from '~/core/models/utils'
import { HYDRA_PROFILE } from '~/core/profiles'
import { Store } from '~/core/store'
import { DatabaseManager } from '~/data/database-manager'
import { type RawPlayer } from '~/data/types'
import StatisticsIntegration from '~/integration/StatisticsIntegration.vue'
import PageFooterLinks from '~/pages/components/PageFooterLinks.vue'
import Page from '~/pages/Page.vue'
import PlayerEditor from '~/sim/components/PlayerEditor.vue'
import SimulatorDebug from '~/sim/components/SimulatorDebug.vue'
import SimulatorDebugLink from '~/sim/components/SimulatorDebugLink.vue'
import SimulatorPasteTarget from '~/sim/components/SimulatorPasteTarget.vue'
import SimulatorSettings from '~/sim/components/SimulatorSettings.vue'
import { copySimulatorData, handleSimulatorPaste, hasClass, isSimulatorDebug, preparePlayerData } from '~/sim/debug'
import { EQUIPMENT_SLOTS } from '~/sim/equipment'
import { HELL_RAID_FLOORS, HELL_RAIDS, useHellRaidPlanner } from '~/sim/hell-raids'
import { ASSASSIN, WARRIOR } from '~/sim/workers/base'

defineOptions({
  name: 'HellRaidsPage'
})

type ListPlayer = {
  player: PlayerModel | SimulatorData
  itemLevel: number | null
  index: number
  identifier: string | null
}

type HellRaidSetup = {
  floorChance: number | null
  raidChance: number | null
  raidLimit: number
  assignments: Record<string, number>
}

type RaidResult = {
  chance: number
  outdated: boolean
}

type RaidGroup = {
  raid: number
  members: ListPlayer[]
  result: RaidResult | undefined
  beaten: boolean
}

type Section = {
  target: number
  group?: RaidGroup
  members: ListPlayer[]
}

const UNALLOCATED = 0

const localize = useLocalize('hell_raids')

const planner = useHellRaidPlanner()

const raidChance = ref<number | null>(100)
const floorChance = ref<number | null>(10)

const RAID_LIMIT_OPTIONS: SelectOption<number>[] = sequence(HELL_RAIDS, 1).map((raid) => ({ value: raid, label: String(raid) }))

const raidLimit = ref(HELL_RAIDS)

const pasteMode = ref(false)

const SETUPS_KEY = 'hell_raids/setups'

const setups = shallowRef(Store.shared.get<Record<string, HellRaidSetup>>(SETUPS_KEY, {}))
const guild = ref<string | null>(null)

const players = shallowRef<ListPlayer[]>([])
const selectedIndex = ref(-1)

const descending = ref(false)

const sorting = computed<TableSorting | undefined>({
  get: (): TableSorting => ({ column: 'floor', direction: descending.value ? 'desc' : 'asc' }),
  set: (value) => {
    descending.value = value?.direction === 'desc'
  }
})

const floors = shallowRef(new Map<number, number>())
const assignments = shallowRef(new Map<number, number>())
const results = shallowRef(new Map<number, RaidResult>())

// Raids to clear of the last climb, top floors stop at its last floor
let floorLimit = 0

const dragIndex = shallowRef<number | null>(null)
const dropTarget = shallowRef<number | null>(null)

const draggedEntry = computed(() => players.value.find((entry) => entry.index === dragIndex.value))

let nextIndex = 0

const editor = useTemplateRef('editor-ref')
const settings = useTemplateRef('settings-ref')
const ghost = useTemplateRef('ghost-ref')

const isEditorValid = useComponentValidation(editor)

const isPlanValid = useComponentValidation(settings, useTemplateRef('raid-chance-ref'), useTemplateRef('floor-chance-ref'))

const raidGroups = computed<RaidGroup[]>(() =>
  sequence(raidLimit.value, 1).map((raid) => {
    const result = results.value.get(raid)

    return {
      raid,
      members: listMembers(players.value.filter((entry) => getRaid(entry.index) === raid)),
      result,
      beaten: result !== undefined && !result.outdated && result.chance >= (raidChance.value ?? 100)
    }
  })
)

const unallocated = computed(() => listMembers(players.value.filter((entry) => getRaid(entry.index) === UNALLOCATED)))

const tables = computed<{ key: string; sections: Section[] }[]>(() => [
  { key: 'groups', sections: raidGroups.value.map((group) => ({ target: group.raid, group, members: group.members })) },
  { key: 'unallocated', sections: [{ target: UNALLOCATED, members: unallocated.value }] }
])

const hasGroups = computed(() => raidGroups.value.some((group) => group.members.length > 0))

const canSimulate = computed(() => isPlanValid.value && players.value.length > 0)
const canSimulateRaids = computed(() => isPlanValid.value && hasGroups.value)

const climbSubmit = useSubmit(async () => {
  if (!canSimulate.value) return

  const timestamp = Date.now()

  if (!(await climbMembers(players.value))) return

  floorLimit = raidLimit.value

  notifyFinished(timestamp)
})

const organizeSubmit = useSubmit(async () => {
  if (!canSimulate.value) return

  const timestamp = Date.now()

  const entries = players.value

  // A higher Raids to clear than the last climb needs everyone climbed again
  const climbing = raidLimit.value > floorLimit ? entries : entries.filter((entry) => !floors.value.has(entry.index))

  if (climbing.length > 0) {
    if (!(await climbMembers(climbing))) return

    floorLimit = climbing === entries ? raidLimit.value : Math.min(floorLimit, raidLimit.value)
  }

  const result = await planner.organize(
    entries.map((entry) => entry.player),
    entries.map((entry) => floors.value.get(entry.index) ?? 0),
    { raidChance: raidChance.value ?? 100, floorChance: floorChance.value ?? 10, raidLimit: raidLimit.value },
    getRun()
  )

  if (!result) return

  const nextAssignments = new Map<number, number>()
  const nextResults = new Map<number, RaidResult>()

  for (const group of result.groups) {
    for (const position of group.members) {
      nextAssignments.set(entries[position].index, group.raid)
    }

    if (group.chance !== null) {
      nextResults.set(group.raid, { chance: group.chance, outdated: false })
    }
  }

  assignments.value = nextAssignments
  results.value = nextResults

  notifyFinished(timestamp)
})

const raidSubmit = useSubmit(async () => {
  if (!canSimulateRaids.value) return

  const timestamp = Date.now()

  const groups = raidGroups.value.filter((group) => group.members.length > 0)

  const chances = await planner.simulateGroups(
    groups.map((group) => ({ raid: group.raid, players: group.members.map((entry) => entry.player) })),
    getRun()
  )

  if (!chances) return

  results.value = new Map<number, RaidResult>(groups.map((group, position) => [group.raid, { chance: chances[position], outdated: false }]))

  notifyFinished(timestamp)
})

const simulateFloors = climbSubmit.submit
const organizeRaids = organizeSubmit.submit
const simulateRaids = raidSubmit.submit

const isClimbing = climbSubmit.isSubmitting
const isOrganizing = organizeSubmit.isSubmitting
const isSimulatingRaids = raidSubmit.isSubmitting

const isBusy = computed(() => isClimbing.value || isOrganizing.value || isSimulatingRaids.value)

const currentSetup = computed<HellRaidSetup>(() => {
  const setupAssignments: Record<string, number> = {}

  for (const entry of players.value) {
    const raid = assignments.value.get(entry.index)

    if (entry.identifier && raid !== undefined) {
      setupAssignments[entry.identifier] = raid
    }
  }

  return { floorChance: floorChance.value, raidChance: raidChance.value, raidLimit: raidLimit.value, assignments: setupAssignments }
})

const storedSetup = computed(() => (guild.value ? setups.value[guild.value] : undefined))

const isSetupSaved = computed(() => {
  const stored = storedSetup.value
  const current = currentSetup.value

  if (!stored || stored.floorChance !== current.floorChance || stored.raidChance !== current.raidChance || stored.raidLimit !== current.raidLimit) return false

  return players.value.every((entry) => !entry.identifier || stored.assignments[entry.identifier] === current.assignments[entry.identifier])
})

function getRun() {
  return { instances: Math.max(1, settings.value?.threads || 4), iterations: Math.max(1, settings.value?.iterations || 25000) }
}

// False when cancelled
async function climbMembers(entries: ListPlayer[]) {
  const climbed = await planner.climb(
    entries.map((entry) => entry.player),
    floorChance.value ?? 10,
    raidLimit.value,
    getRun()
  )

  if (climbed === null) return false

  const next = new Map(floors.value)

  entries.forEach((entry, position) => next.set(entry.index, climbed[position]))

  floors.value = next

  return true
}

function notifyFinished(timestamp: number) {
  useToast({ title: localize.global('simulator.toast.title'), message: localize.global('simulator.toast.message', { duration: formatDuration(Date.now() - timestamp) }) })
}

// Members of a raid above Raids to clear count as unallocated
function getRaid(index: number) {
  const raid = assignments.value.get(index) ?? UNALLOCATED

  return raid <= raidLimit.value ? raid : UNALLOCATED
}

// Lowest top floor first, highest first when the Top floor header is flipped
function listMembers(entries: ListPlayer[]) {
  const direction = descending.value ? -1 : 1

  return entries.sort((a, b) => direction * ((floors.value.get(a.index) ?? 0) - (floors.value.get(b.index) ?? 0) || a.player.Level - b.player.Level))
}

function getRowClass(entry: ListPlayer, target: number) {
  if (entry.index === dragIndex.value) return 'opacity-35'
  if (dropTarget.value === target) return 'bg-accent/7'
  if (entry.index === selectedIndex.value) return 'bg-white/10'

  return 'hover:bg-white/5 focus-visible:bg-white/5'
}

function markOutdated(raids: number[]) {
  const next = new Map<number, RaidResult>()

  results.value.forEach((result, raid) => next.set(raid, raids.includes(raid) ? { ...result, outdated: true } : result))

  results.value = next
}

function startDrag(event: DragEvent, entry: ListPlayer) {
  dragIndex.value = entry.index

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', entry.player.Name)

    // The card renders before the browser takes its picture
    if (ghost.value) {
      event.dataTransfer.setDragImage(ghost.value, 16, 22)
    }
  }
}

function overDrag(event: DragEvent, target: number) {
  // Leaving the default in place shows the drop as not allowed
  if (dragIndex.value === null || getRaid(dragIndex.value) === target) return

  event.preventDefault()

  dropTarget.value = target
}

function clearDropTarget(event: DragEvent) {
  if (!event.defaultPrevented) {
    dropTarget.value = null
  }
}

function dropMember(event: DragEvent, target: number) {
  event.preventDefault()

  const index = dragIndex.value

  if (index !== null && getRaid(index) !== target) {
    moveMember(index, target)
  }

  endDrag()
}

function endDrag() {
  dragIndex.value = null
  dropTarget.value = null
}

function moveMember(index: number, target: number) {
  const source = getRaid(index)

  const next = new Map(assignments.value)

  if (target === UNALLOCATED) {
    next.delete(index)
  } else {
    next.set(index, target)
  }

  assignments.value = next

  markOutdated([source, target])
}

function getRaidName(raid: number) {
  return localize.global(`raids.raids.hellevator_${raid}`)
}

const RAID_PICTURES = ['highway_to_hell', 'limbo', 'lust', 'gluttony', 'greed', 'wrath', 'heresy', 'violence', 'fraud', 'treachery', 'limbo', 'highway_to_hell']

function getRaidPicture(raid: number) {
  return `/res/hellevator/${RAID_PICTURES[raid - 1]}.webp`
}

function getGroupStatus(raid: number, count: number) {
  const floor = raid * HELL_RAID_FLOORS

  if (count > 0) {
    return localize('status.beaten', { floor, members: formatMembers(count) })
  }

  return localize('status.lost', { floor })
}

function formatMembers(count: number) {
  return localize(count === 1 ? 'members.one' : 'members.many', { count })
}

function formatChance(chance: number) {
  // Rounding up would show 100% for a raid that lost a fight
  const shown = Math.floor(chance * 100 + 1e-6) / 100

  return Number.isInteger(shown) ? String(shown) : shown.toFixed(2)
}

function listCompleteGroups() {
  return compact(Object.values(DatabaseManager.Groups).map((group) => group.List.filter((entry) => entry.MembersTotal === entry.MembersPresent)[0]))
}

function setPlayers(list: ListPlayer[]) {
  players.value = [...list].sort((a, b) => a.player.Level - b.player.Level)

  if (players.value.some((entry) => floors.value.has(entry.index) || assignments.value.has(entry.index))) {
    markOutdated([...results.value.keys()])
  } else {
    floors.value = new Map()
    assignments.value = new Map()
    results.value = new Map()
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

  setPlayers([{ player, itemLevel: null, index: nextIndex++, identifier: null }, ...players.value])

  clearEditor()
}

function savePlayer() {
  if (!editor.value) return

  const player = editor.value.read()

  const next = new Map(floors.value)

  next.delete(selectedIndex.value)

  floors.value = next

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

function getItemLevel(player: PlayerModel) {
  if (player.Items.Wpn1?.Version !== ItemModel.MODERN) return null

  const slots = EQUIPMENT_SLOTS.filter((slot) => slot !== 'Wpn2' || player.Class === WARRIOR || player.Class === ASSASSIN)
  const total = slots.reduce((sum, slot) => sum + (player.Items[slot]?.ItemLevel ?? 0), 0)

  return Math.round(total / slots.length)
}

function insertGroup(group: GroupModel) {
  const members = compact(group.Members.map((identifier) => DatabaseManager.getPlayer(identifier, group.Timestamp)))

  setPlayers(members.map((data) => ({ player: ModelUtils.toSimulatorData(data), itemLevel: getItemLevel(data), index: nextIndex++, identifier: data.Identifier })))

  clearEditor()

  guild.value = group.Identifier

  if (storedSetup.value) {
    applySetup(storedSetup.value)
  }
}

function applySetup(setup: HellRaidSetup) {
  floorChance.value = setup.floorChance
  raidChance.value = setup.raidChance
  raidLimit.value = setup.raidLimit

  const next = new Map<number, number>()
  const changed: number[] = []

  for (const entry of players.value) {
    const current = assignments.value.get(entry.index)
    const raid = entry.identifier ? setup.assignments[entry.identifier] : current

    if (raid !== undefined) {
      next.set(entry.index, raid)
    }

    if (raid !== current) {
      changed.push(current ?? UNALLOCATED, raid ?? UNALLOCATED)
    }
  }

  assignments.value = next

  markOutdated(changed)
}

function saveSetup() {
  if (!guild.value) return

  setups.value = { ...setups.value, [guild.value]: currentSetup.value }

  Store.shared.set(SETUPS_KEY, setups.value)
}

function loadSetup() {
  if (storedSetup.value) {
    applySetup(storedSetup.value)
  }
}

function clearSetup() {
  if (!guild.value) return

  const next = { ...setups.value }

  delete next[guild.value]

  setups.value = next

  Store.shared.set(SETUPS_KEY, setups.value)

  markOutdated([...assignments.value.values()])

  assignments.value = new Map()
}

function isPlayer(value: unknown) {
  if (typeof value !== 'object' || value === null) return false

  return ('Class' in value && Boolean(value.Class)) || ('save' in value && Boolean(value.save))
}

function handlePaste(value: unknown) {
  try {
    const data = handleSimulatorPaste(value)

    if (Array.isArray(data)) {
      const entries = data.map((item: unknown) => {
        const model = hasClass(item) ? item : new PlayerModel(item as RawPlayer)

        // Item level first, preparePlayerData empties the shield of a warrior
        return { itemLevel: getItemLevel(model), player: preparePlayerData(model), index: nextIndex++, identifier: null }
      })

      if (pasteMode.value) {
        setPlayers([...players.value, ...entries])
      } else {
        setPlayers(entries)

        clearEditor()

        guild.value = null
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

function copyResults() {
  const lines: string[] = []

  for (const group of raidGroups.value) {
    if (group.members.length === 0) continue

    const names = group.members.map((entry) => entry.player.Name).join(' + ')

    if (!group.result || group.result.outdated) {
      lines.push(localize('results.members', { raid: group.raid, members: names }))
    } else {
      lines.push(localize('results.raid', { raid: group.raid, members: names, chance: formatChance(group.result.chance) }))
    }
  }

  if (unallocated.value.length > 0) {
    lines.push(localize('results.unallocated', { members: unallocated.value.map((entry) => entry.player.Name).join(' + ') }))
  }

  void copyText(lines.join('\n'))
}

function copyWithConfig() {
  copySimulatorData(players.value.map((entry) => ModelUtils.toSimulatorData(entry.player)))
}
</script>
