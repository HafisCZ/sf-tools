<template>
  <Page>
    <template v-if="character" #nav-left>
      <CharacterSwitcher :player="character" @select="selectCharacter" />
    </template>

    <div v-if="character" class="flex flex-col gap-7">
      <section :aria-label="localize('setup')" class="grid items-start gap-7 md:grid-cols-2">
        <DungeonBreakZone :number="1" :title="localize('zones.current.title')" :description="localize('zones.current.description')">
          <DungeonBreakEditor ref="editor-ref" :key="selectionCount" v-model:fighters="fighters" v-model:fighter="selectedFighter" :character="character" />
        </DungeonBreakZone>

        <div class="flex flex-col gap-7 self-stretch">
          <DungeonBreakZone :number="2" :title="localize('zones.future.title')">
            <template #description>
              <span v-html="localize('zones.future.description#')" />
            </template>

            <div class="flex flex-col gap-3.5">
              <SFNumber ref="levels-ref" v-model="modifiers.levels" :label="localize('modifiers.levels')" :min="0" :step="1" placeholder="0" />
              <div role="group" :aria-label="localize('modifiers.attributes')" class="grid grid-cols-3 gap-3.5 lg:grid-cols-5">
                <SFNumber v-for="index in 5" ref="attributes-ref" :key="index" v-model="modifiers.attributes[index - 1]" :label="localize.global(`general.attribute${index}`)" :min="0" :step="1" placeholder="0" />
              </div>
              <SFCheckbox v-model="modifiers.enchantmentsAndPotions" :label="localize('modifiers.enchantments')" />
              <SFCheckbox v-model="modifiers.equipment" :label="localize('modifiers.equipment')" />
            </div>
          </DungeonBreakZone>

          <DungeonBreakZone :number="3" :title="localize('zones.budget.title')" :description="localize('zones.budget.description')" class="mt-auto">
            <div class="grid grid-cols-2 gap-3.5">
              <SFNumber ref="mushrooms-ref" v-model="mushrooms" :label="localize('mushrooms')" :min="0" :step="1" :placeholder="localize('mushrooms_all')" />
              <SFSelect ref="cost-ref" v-model="cost" :label="localize('cost.label')" :options="costOptions" />
              <SFNumber ref="threshold-ref" v-model="threshold" :label="localize('threshold')" :min="0" :max="100" suffix="%" />
              <div role="group" :aria-labelledby="simulationId" class="flex flex-col gap-1.5">
                <span :id="simulationId" class="font-bold text-white">{{ localize('simulation') }}</span>
                <SimulatorSettings ref="settings-ref" storage-key="dungeon_break_sim" :default-threads="4" :default-iterations="50000" />
              </div>
            </div>

            <SFButton variant="primary" block :disabled="isPlanning ? 'loading' : !canPlan || (isPlanned && runInputs === plannedInputs)" @click="plan">
              {{ localize('simulate') }}
            </SFButton>
          </DungeonBreakZone>
        </div>
      </section>

      <DungeonBreakZone :number="4" :title="localize('zones.outcome.title')" :description="localize('zones.outcome.description')">
        <div class="flex flex-col gap-5">
          <section :aria-label="localize('summary')" class="flex flex-col gap-6">
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-5 sm:gap-0">
              <div v-for="tile in tiles" :key="tile.key" class="flex flex-col gap-0.5 sm:border-l sm:border-line sm:pl-5 sm:first:border-l-0 sm:first:pl-0" :class="{ 'max-sm:col-span-2': tile.key === 'mushrooms' }">
                <span class="text-sm font-bold text-white/60">{{ tile.label }}</span>
                <span class="text-[26px] leading-tight font-bold" :class="tile.accent ? 'text-accent' : tile.pending ? 'text-white/35' : 'text-white'">{{ tile.value }}</span>
              </div>
            </div>
            <section :aria-labelledby="chartTitleId" class="flex min-w-0 flex-col">
              <SFHeading :id="chartTitleId" level="6" type="muted">{{ localize('chart.title') }}</SFHeading>
              <div class="relative pt-2">
                <DungeonBreakChart :curve="curve" :mushrooms="order.length > 0 ? mushrooms : null" :class="{ invisible: order.length === 0 }" />
                <SFParagraph v-if="order.length === 0" type="muted" class="absolute inset-0 flex items-center justify-center p-4 text-center">{{ localize(isPlanned ? 'chart.nothing' : 'chart.empty') }}</SFParagraph>
              </div>
            </section>
          </section>

          <section :aria-label="localize('groups_label')" class="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
            <DungeonBreakCard
              v-for="card in cards"
              :key="card.group"
              :group="card.group"
              :title="localize(`groups.${card.group}`)"
              :subtitle="card.subtitle"
              :selected="card.selected"
              :disabled="card.dungeons.length === 0"
              :included="card.included"
              @select="selectGroup(card.group)"
              @include="includeGroup(card.group, $event)"
            >
              <template v-if="card.dungeons.length > 0" #default>
                <span class="grid grid-cols-2 gap-2">
                  <span class="flex min-w-0 flex-col">
                    <span class="text-xs font-bold text-white/60">{{ localize('card.remaining') }}</span>
                    <span class="flex items-baseline gap-1">
                      <span class="text-xl leading-tight font-bold text-white">{{ card.remaining }}</span>
                      <span class="text-xs font-bold text-white/60">{{ localize('card.levels') }}</span>
                    </span>
                  </span>
                  <span class="flex min-w-0 flex-col">
                    <span class="text-xs font-bold text-white/60">{{ localize('card.beatable') }}</span>
                    <span class="flex items-baseline gap-1">
                      <span class="text-xl leading-tight font-bold" :class="isPlanned ? 'text-white' : 'text-white/35'">{{ isPlanned ? card.beatable : '-' }}</span>
                      <span v-if="isPlanned" class="text-xs font-bold text-white/60">{{ localize('card.levels') }}</span>
                    </span>
                  </span>
                </span>
                <span class="flex flex-col text-[12.5px] leading-snug text-white/60">
                  <template v-if="isPlanned">
                    <span class="flex items-center gap-1">
                      <strong class="text-white/90">{{ card.mushrooms }}</strong>
                      <img src="/res/mushroom.png" :alt="localize('card.mushrooms')" class="size-[15px]" />
                    </span>
                    <span>{{ localize('card.for', { won: card.won, total: card.total }) }}</span>
                  </template>
                  <span v-else>{{ localize('card.left', { count: card.total }) }}</span>
                </span>
              </template>
            </DungeonBreakCard>
          </section>

          <DungeonBreakTable v-if="selectedGroup && selectedDungeons.length > 0" :key="selectedGroup" :group="selectedGroup" :dungeons="selectedDungeons" :planned="isPlanned" :level="level" :xp="xp" :bought="boughtKeys" @toggle="toggleDungeon" />

          <section :aria-labelledby="orderTitleId" class="flex min-w-0 flex-col rounded-md border border-line bg-surface">
            <div class="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5 border-b border-line px-4 py-3">
              <SFHeading :id="orderTitleId" level="6">{{ localize('order.title') }}</SFHeading>
              <span v-if="order.length > 0" class="text-xs text-white/60">{{ localize('order.subtitle', { count: order.length }) }}</span>
            </div>
            <template v-if="order.length > 0">
              <div class="max-h-[480px] overflow-y-auto">
                <SFTable dense>
                  <template #header>
                    <SFTableRow>
                      <SFTableHeader class="w-14">{{ localize('order.number') }}</SFTableHeader>
                      <SFTableHeader>{{ localize('table.dungeon') }}</SFTableHeader>
                      <SFTableHeader>{{ localize('order.floor') }}</SFTableHeader>
                      <SFTableHeader align="right">{{ localize('floors.chance') }}</SFTableHeader>
                      <SFTableHeader align="right">{{ localize('floors.experience') }}</SFTableHeader>
                      <SFTableHeader align="right" class="pr-4">{{ localize('order.spent') }}</SFTableHeader>
                    </SFTableRow>
                  </template>
                  <SFTableRow v-for="fight in fights" :key="fight.key" class="h-12 whitespace-nowrap" :class="{ 'opacity-45': !fight.bought }">
                    <SFTableCell class="text-white/60">{{ fight.number }}</SFTableCell>
                    <SFTableCell>{{ fight.dungeon }}</SFTableCell>
                    <SFTableCell>{{ fight.boss }}</SFTableCell>
                    <SFTableCell align="right">{{ fight.chance }}</SFTableCell>
                    <SFTableCell align="right">{{ fight.experience }}</SFTableCell>
                    <SFTableCell align="right" class="pr-4 font-bold">{{ fight.spent }}</SFTableCell>
                  </SFTableRow>
                </SFTable>
              </div>
            </template>
            <SFParagraph v-else type="muted" class="flex min-h-40 items-center justify-center p-4 text-center">{{ localize(isPlanned ? 'order.nothing' : 'order.empty') }}</SFParagraph>
          </section>
        </div>
      </DungeonBreakZone>
    </div>
    <InlineSelector v-else @select="selectCharacter" />

    <template #footer-right>
      <PageFooterLinks />
    </template>
  </Page>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, toRaw, useId, useTemplateRef, watch } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFCheckbox from '@library/SFCheckbox.vue'
import SFHeading from '@library/SFHeading.vue'
import SFNumber from '@library/SFNumber.vue'
import SFParagraph from '@library/SFParagraph.vue'
import SFSelect from '@library/SFSelect.vue'
import SFTable from '@library/SFTable.vue'
import SFTableCell from '@library/SFTableCell.vue'
import SFTableHeader from '@library/SFTableHeader.vue'
import SFTableRow from '@library/SFTableRow.vue'
import { type SelectOption } from '@utils/components'
import { useLocalize } from '@utils/localization'
import { compact, sum, useSubmit } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import { type PlayerModel } from '~/core/models/player'
import { OptionsHandler } from '~/core/options'
import { DatabaseManager } from '~/data/database-manager'
import CharacterSwitcher from '~/integration/CharacterSwitcher.vue'
import InlineSelector from '~/integration/InlineSelector.vue'
import PageFooterLinks from '~/pages/components/PageFooterLinks.vue'
import Page from '~/pages/Page.vue'
import SimulatorSettings from '~/sim/components/SimulatorSettings.vue'
import { createDungeonFight, getBossName, getDungeonName, getDungeonProgress, type DungeonResult } from '~/sim/data/dungeons'
import { useDungeonSimulator } from '~/sim/dungeons'
import { createCharacterState } from '~/sim/equipment'
import DungeonBreakCard from './components/DungeonBreakCard.vue'
import DungeonBreakChart from './components/DungeonBreakChart.vue'
import DungeonBreakEditor from './components/DungeonBreakEditor.vue'
import DungeonBreakTable from './components/DungeonBreakTable.vue'
import DungeonBreakZone from './components/DungeonBreakZone.vue'
import { applyBreakModifiers, createBreakFighters, formatChance, formatExperience, formatMushrooms, getFightKey, getLevelAfter, getUnlockText, listRemainingDungeons, orderFights, planBreak, setFightersLevel, spendMushrooms, type BreakDungeon, type BreakGroup, type BreakModifiers, type MushroomCost } from './dungeon-break'

defineOptions({
  name: 'DungeonBreakPage'
})

type DungeonBreakOptions = {
  mushrooms: number | null
  threshold: number
  cost: MushroomCost
  modifiers: BreakModifiers
}

const GROUPS: BreakGroup[] = ['light', 'shadow', 'idols', 'twister', 'sandstorm']

const localize = useLocalize('dungeon_break')

const dungeonSimulator = useDungeonSimulator()

const options = new OptionsHandler<DungeonBreakOptions>('dungeon_break', { mushrooms: null, threshold: 5, cost: 'average', modifiers: { enchantmentsAndPotions: false, equipment: false, levels: null, attributes: [null, null, null, null, null] } })

const mushrooms = ref(options.mushrooms)
const threshold = ref<number | null>(options.threshold)
const cost = ref<MushroomCost>(options.cost)
const modifiers = ref<BreakModifiers>(structuredClone(options.modifiers))

const character = shallowRef<PlayerModel | null>(null)
const fighters = shallowRef<(PlayerModel | null)[]>([])
const results = shallowRef<Map<string, DungeonResult> | null>(null)
const plannedInputs = ref('')
const excluded = shallowRef(new Set<number>())
const selectedGroup = ref<BreakGroup | null>(null)
const selectedFighter = ref(0)
const selectionCount = ref(0)

const simulationId = useId()
const chartTitleId = useId()
const orderTitleId = useId()

const settings = useTemplateRef('settings-ref')
const editor = useTemplateRef('editor-ref')

const isValid = useComponentValidation(settings, useTemplateRef('mushrooms-ref'), useTemplateRef('cost-ref'), useTemplateRef('threshold-ref'), editor, useTemplateRef('levels-ref'), useTemplateRef('attributes-ref'))

const { submit: plan, isSubmitting: isPlanning } = useSubmit(runPlan)

const costOptions = computed<SelectOption<MushroomCost>[]>(() => [
  { value: 'average', label: localize('cost.average') },
  { value: 'certain', label: localize('cost.certain') }
])

const isPlanned = computed(() => results.value !== null)

const level = computed(() => (fighters.value[0]?.Level ?? character.value?.Level ?? 1) + (modifiers.value.levels ?? 0))

const xp = computed(() => (character.value && level.value === character.value.Level ? character.value.XP : 0))

const startLevel = computed(() => getLevelAfter(level.value, xp.value, 0))

const progress = computed(() => (character.value?.Dungeons ? getDungeonProgress(character.value.Dungeons) : new Map<number, number>()))

const remainingDungeons = computed(() => (character.value?.Dungeons ? listRemainingDungeons(progress.value) : []))

const canPlan = computed(() => {
  if (!character.value || !isValid.value || remainingDungeons.value.length === 0) return false

  const needsCompanions = remainingDungeons.value.some(({ dungeon, open }) => open && dungeon.companions)

  return !needsCompanions || fighters.value.every((fighter) => fighter !== null)
})

const runInputs = computed(() => JSON.stringify([threshold.value, [...excluded.value].sort((a, b) => a - b), fighters.value, modifiers.value, settings.value?.threads, settings.value?.iterations]))

const planOptions = computed(() => ({
  threshold: (threshold.value ?? 0) / 100,
  excluded: excluded.value,
  cost: cost.value,
  level: level.value,
  xp: xp.value,
  progress: progress.value
}))

const dungeons = computed(() => planBreak(remainingDungeons.value, results.value ?? new Map(), planOptions.value))

const includedDungeons = computed(() => dungeons.value.filter((dungeon) => dungeon.included))

const selectedDungeons = computed(() => dungeons.value.filter((dungeon) => dungeon.group === selectedGroup.value))

const order = computed(() => (isPlanned.value ? orderFights(dungeons.value, progress.value, level.value, xp.value) : []))

const bought = computed(() => (mushrooms.value === null ? null : spendMushrooms(order.value, mushrooms.value)))

const totals = computed(() => ({
  potential: sum(includedDungeons.value.map((dungeon) => dungeon.potential)),
  current: sum(includedDungeons.value.map((dungeon) => dungeon.current)),
  mushrooms: sum(includedDungeons.value.map((dungeon) => dungeon.mushrooms))
}))

const boughtFights = computed(() => (bought.value === null ? null : order.value.slice(0, bought.value.fights)))

const boughtKeys = computed(() => (boughtFights.value ? new Set(boughtFights.value.map(({ boss }) => getFightKey(boss.entry))) : null))

const tiles = computed(() => {
  const { potential } = totals.value
  const planned = isPlanned.value
  const fights = boughtFights.value
  const current = fights ? sum(fights.map(({ boss }) => boss.experience)) : totals.value.current
  const needed = fights ? sum(fights.map(({ boss }) => boss.cost)) : totals.value.mushrooms

  return [
    { key: 'remaining', label: localize('tiles.remaining'), value: formatLevels(potential), accent: false, pending: false },
    { key: 'remaining_xp', label: localize('tiles.remaining_xp'), value: formatExperience(potential), accent: false, pending: false },
    { key: 'beatable', label: localize('tiles.beatable'), value: planned ? formatLevels(current) : '-', accent: planned, pending: !planned },
    { key: 'beatable_xp', label: localize('tiles.beatable_xp'), value: planned ? formatExperience(current) : '-', accent: false, pending: !planned },
    { key: 'mushrooms', label: localize('tiles.mushrooms'), value: planned ? formatMushrooms(needed) : '-', accent: false, pending: !planned }
  ]
})

const cards = computed(() =>
  GROUPS.map((group) => {
    const list = dungeons.value.filter((dungeon) => dungeon.group === group)
    const counted = list.filter((dungeon) => dungeon.included)
    const fights = boughtFights.value?.filter((fight) => fight.dungeon.group === group)

    let included: boolean | 'mixed' | undefined

    if (list.length > 0) {
      included = counted.length === list.length || (counted.length === 0 ? false : 'mixed')
    }

    return {
      included,
      group,
      dungeons: list,
      selected: list.length > 0 && group === selectedGroup.value,
      subtitle: getGroupSubtitle(group, list),
      remaining: formatLevels(sum(counted.map((dungeon) => dungeon.potential))),
      beatable: formatLevels(fights ? sum(fights.map(({ boss }) => boss.experience)) : sum(counted.map((dungeon) => dungeon.current))),
      mushrooms: formatMushrooms(fights ? sum(fights.map(({ boss }) => boss.cost)) : sum(counted.map((dungeon) => dungeon.mushrooms))),
      won: fights ? fights.length : sum(counted.map((dungeon) => dungeon.winnable)),
      total: sum(list.map((dungeon) => dungeon.bosses.length))
    }
  })
)

const curve = computed(() => {
  let spent = 0
  let experience = 0

  return [
    { mushrooms: 0, levels: 0 },
    ...order.value.map(({ boss }) => {
      spent += boss.cost
      experience += boss.experience

      return { mushrooms: spent, levels: getLevelAfter(level.value, xp.value, experience) - startLevel.value }
    })
  ]
})

const fights = computed(() => {
  const shadow = localize.global('general.dungeon_shadow')

  let spent = 0

  return order.value.map(({ dungeon, boss }, index) => {
    spent += boss.cost

    return {
      key: getFightKey(boss.entry),
      number: index + 1,
      dungeon: dungeon.group === 'shadow' ? `${shadow} ${getDungeonName(dungeon.dungeon)}` : getDungeonName(dungeon.dungeon),
      boss: localize('table.boss', { position: boss.entry.boss.pos, name: getBossName(boss.entry) }),
      chance: formatChance(boss.chance ?? 0),
      experience: formatExperience(boss.experience),
      spent: formatMushrooms(spent),
      bought: bought.value === null || index < bought.value.fights
    }
  })
})

watch(mushrooms, (value) => {
  options.mushrooms = value
})

watch(threshold, (value) => {
  options.threshold = value ?? 0
})

watch(cost, (value) => {
  options.cost = value
})

watch(
  modifiers,
  (value) => {
    options.modifiers = structuredClone(toRaw(value))
  },
  { deep: true }
)

function selectCharacter(entry: PlayerModel) {
  // The database lists lazy proxies, which can't be cloned into a worker
  const player = DatabaseManager.getPlayer(entry.LinkId, entry.Timestamp) ?? entry

  character.value = player
  fighters.value = createBreakFighters(player)
  selectedFighter.value = 0
  results.value = null
  excluded.value = new Set()
  selectedGroup.value = null
  selectionCount.value++
}

function selectGroup(group: BreakGroup) {
  selectedGroup.value = selectedGroup.value === group ? null : group
}

function toggleDungeon(id: number) {
  const next = new Set(excluded.value)

  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }

  excluded.value = next
}

function includeGroup(group: BreakGroup, included: boolean) {
  const next = new Set(excluded.value)

  for (const { dungeon } of dungeons.value.filter((entry) => entry.group === group)) {
    if (included) {
      next.delete(dungeon.id)
    } else {
      next.add(dungeon.id)
    }
  }

  excluded.value = next
}

function formatLevels(experience: number) {
  return (getLevelAfter(level.value, xp.value, experience) - startLevel.value).toFixed(2)
}

function getGroupSubtitle(group: BreakGroup, list: BreakDungeon[]) {
  if (!character.value) return ''

  const [first] = list

  if (!first) return localize('card.done')

  const open = list.filter((dungeon) => dungeon.open).length

  if (open === 0) return getUnlockText(first.dungeon.id)
  if (group === 'light' || group === 'shadow') return localize(open < list.length ? 'card.open_locked' : 'card.open', { count: open, locked: list.length - open })

  return localize('card.floor', { position: first.done + 1, total: first.done + first.bosses.length })
}

async function runPlan() {
  const player = character.value

  if (!canPlan.value || !player) return

  const run = {
    instances: Math.max(1, settings.value?.threads || 4),
    iterations: Math.max(1, settings.value?.iterations || 5000)
  }

  const collected = new Map<string, DungeonResult>()
  const simulated = new Set<number>()
  const roundOptions = planOptions.value
  const inputs = runInputs.value
  const runFighters = applyBreakModifiers(fighters.value, editor.value?.equipment ?? { source: player, swaps: [], state: createCharacterState(player) }, modifiers.value)

  for (;;) {
    const plan = planBreak(remainingDungeons.value, collected, roundOptions)
    const round = plan.filter(({ dungeon, reachable }) => reachable && !simulated.has(dungeon.id))

    if (round.length === 0) break

    const experience = sum(plan.filter(({ included }) => included).map(({ current }) => current))
    const roundFighters = setFightersLevel(runFighters, Math.floor(getLevelAfter(level.value, xp.value, experience)))
    const simulation = await dungeonSimulator.simulateUntilNotPossible(compact(round.flatMap(({ entries }) => entries).map((entry) => createDungeonFight(entry, roundFighters))), run)

    if (!simulation) return

    for (const result of simulation.results) {
      collected.set(getFightKey(result), result)
    }

    for (const { dungeon } of round) {
      simulated.add(dungeon.id)
    }
  }

  results.value = collected
  plannedInputs.value = inputs
}
</script>
