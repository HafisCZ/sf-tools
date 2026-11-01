<template>
  <Page>
    <div class="flex flex-col gap-5">
      <section :aria-label="localize('setup')" class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3.5">
        <IntegrationSelector :model-value="character" class="flex-[1_1_380px]" @update:model-value="selectCharacter" />
        <div class="flex flex-wrap items-end gap-x-4 gap-y-3.5">
          <div class="w-[150px]">
            <SFNumber ref="mushrooms-ref" v-model="mushrooms" :label="localize('mushrooms')" :min="0" :step="1" :placeholder="localize('mushrooms_all')" />
          </div>
          <SFSelect ref="cost-ref" v-model="cost" :label="localize('cost.label')" :options="costOptions" class="w-[140px]" />
          <div class="w-[120px]">
            <SFNumber ref="threshold-ref" v-model="threshold" :label="localize('threshold')" :min="0" :max="100" :step="1" suffix="%" />
          </div>
          <div role="group" :aria-labelledby="simulationId" class="flex w-44 flex-col gap-1.5">
            <span :id="simulationId" class="font-bold text-white">{{ localize('simulation') }}</span>
            <SimulatorSettings ref="settings-ref" storage-key="dungeon_break_sim" :default-threads="4" :default-iterations="50000" />
          </div>
        </div>
      </section>

      <section v-if="!character" class="flex flex-col items-center gap-1.5 rounded-md border border-line bg-surface px-6 py-12 text-center">
        <SFHeading level="4">{{ localize('empty.title') }}</SFHeading>
        <SFParagraph type="muted" class="max-w-[60ch]">{{ localize('empty.text') }}</SFParagraph>
      </section>

      <section v-else :aria-label="localize('summary')" class="flex flex-wrap gap-px overflow-hidden rounded-md border border-line bg-line">
        <div class="flex flex-[1_1_220px] flex-col gap-px">
          <div v-for="tile in tiles" :key="tile.key" class="flex flex-1 flex-col justify-center gap-0.5 bg-surface px-4.5 py-3">
            <span class="text-[11px] font-bold tracking-[0.08em] text-white/60 uppercase">{{ tile.label }}</span>
            <span class="text-[26px] leading-tight font-bold" :class="tile.accent ? 'text-accent' : tile.pending ? 'text-white/35' : 'text-white'">
              {{ tile.value }}
              <small v-if="tile.unit" class="text-sm font-bold text-white/60">{{ tile.unit }}</small>
            </span>
            <span v-if="tile.detail" class="text-xs text-white/60">{{ tile.detail }}</span>
          </div>
        </div>
        <section :aria-labelledby="chartTitleId" class="flex min-w-0 flex-[999_1_560px] flex-col bg-surface">
          <div class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4.5 pt-3">
            <SFHeading :id="chartTitleId" level="6" type="muted" class="text-[11px] tracking-[0.08em] uppercase">{{ localize('chart.title') }}</SFHeading>
          </div>
          <div class="relative px-4.5 pt-2 pb-3.5">
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
          :locked="card.locked"
          :dimmed="!character"
          :disabled="card.dungeons.length === 0"
          :included="card.included"
          @select="selectedGroup = card.group"
          @include="includeGroup(card.group, $event)"
        >
          <template v-if="card.dungeons.length > 0" #default>
            <span class="grid grid-cols-2 gap-2">
              <span class="flex min-w-0 flex-col">
                <span class="text-[10.5px] font-bold tracking-[0.08em] text-white/60 uppercase">{{ localize('card.unlocked') }}</span>
                <span class="flex items-baseline gap-1">
                  <span class="text-xl leading-tight font-bold text-white">{{ card.unlocked }}</span>
                  <span class="text-xs font-bold text-white/60">{{ localize('card.levels') }}</span>
                </span>
              </span>
              <span class="flex min-w-0 flex-col">
                <span class="text-[10.5px] font-bold tracking-[0.08em] text-white/60 uppercase">{{ localize('card.beatable') }}</span>
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

      <template v-if="character && selectedDungeons.length > 0">
        <DungeonBreakFloors v-if="selectedGroup === 'twister' || selectedGroup === 'sandstorm'" :dungeon="selectedDungeons[0]" :planned="isPlanned" :level="character.Level" :xp="character.XP" />
        <DungeonBreakTable v-else :key="selectedGroup" :group="selectedGroup" :dungeons="selectedDungeons" :planned="isPlanned" :level="character.Level" :xp="character.XP" @toggle="toggleDungeon" />
      </template>

      <section v-if="character" :aria-labelledby="orderTitleId" class="flex min-w-0 flex-col rounded-md border border-line bg-surface">
        <div class="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5 border-b border-line px-4 py-3">
          <SFHeading :id="orderTitleId" level="6" class="tracking-[0.08em] uppercase">{{ localize('order.title') }}</SFHeading>
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
                  <SFTableHeader align="right">{{ localize('order.spent') }}</SFTableHeader>
                </SFTableRow>
              </template>
              <SFTableRow v-for="fight in fights" :key="fight.key" class="whitespace-nowrap" :class="{ 'opacity-45': !fight.bought }">
                <SFTableCell class="text-white/60">{{ fight.number }}</SFTableCell>
                <SFTableCell>{{ fight.dungeon }}</SFTableCell>
                <SFTableCell>{{ fight.boss }}</SFTableCell>
                <SFTableCell align="right">{{ fight.chance }}</SFTableCell>
                <SFTableCell align="right">{{ fight.experience }}</SFTableCell>
                <SFTableCell align="right" class="font-bold">{{ fight.spent }}</SFTableCell>
              </SFTableRow>
            </SFTable>
          </div>
          <SFParagraph v-if="missingFights" size="sm" class="px-4 pt-2 pb-3.5 text-[#f2c14e]">{{ missingFights }}</SFParagraph>
        </template>
        <SFParagraph v-else type="muted" class="flex min-h-40 items-center justify-center p-4 text-center">{{ localize(isPlanned ? 'order.nothing' : 'order.empty') }}</SFParagraph>
      </section>
    </div>

    <template #footer-right>
      <PageFooterLinks tool="dungeon_break" />
    </template>
  </Page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, useId, useTemplateRef, watch } from 'vue'
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
import IntegrationSelector from '~/integration/IntegrationSelector.vue'
import PageFooterLinks from '~/pages/components/PageFooterLinks.vue'
import Page from '~/pages/Page.vue'
import SimulatorSettings from '~/sim/components/SimulatorSettings.vue'
import { createDungeonFight, getBossName, getDungeonName, type DungeonResult } from '~/sim/data/dungeons'
import { useDungeonSimulator } from '~/sim/dungeons'
import DungeonBreakCard from './components/DungeonBreakCard.vue'
import DungeonBreakChart from './components/DungeonBreakChart.vue'
import DungeonBreakFloors from './components/DungeonBreakFloors.vue'
import DungeonBreakTable from './components/DungeonBreakTable.vue'
import { createBreakFighters, formatChance, formatExperience, formatMushrooms, getFightKey, getLevelAfter, listOpenDungeons, orderFights, planBreak, spendMushrooms, type BreakDungeon, type BreakGroup, type MushroomCost } from './dungeon-break'

defineOptions({
  name: 'DungeonBreakPage'
})

type DungeonBreakOptions = {
  mushrooms: number | null
  threshold: number
  cost: MushroomCost
}

const GROUPS: BreakGroup[] = ['light', 'shadow', 'idols', 'twister', 'sandstorm']

const localize = useLocalize('dungeon_break')

const dungeonSimulator = useDungeonSimulator()

const options = new OptionsHandler<DungeonBreakOptions>('dungeon_break', { mushrooms: null, threshold: 5, cost: 'average' })

const mushrooms = ref(options.mushrooms)
const threshold = ref<number | null>(options.threshold)
const cost = ref<MushroomCost>(options.cost)

const character = shallowRef<PlayerModel | null>(null)
const results = shallowRef<Map<string, DungeonResult> | null>(null)
const excluded = shallowRef(new Set<number>())
const selectedGroup = ref<BreakGroup>('light')

const simulationId = useId()
const chartTitleId = useId()
const orderTitleId = useId()

const settings = useTemplateRef('settings-ref')

const isValid = useComponentValidation(settings, useTemplateRef('mushrooms-ref'), useTemplateRef('cost-ref'), useTemplateRef('threshold-ref'))

const { submit: plan } = useSubmit(runPlan)

const costOptions = computed<SelectOption<MushroomCost>[]>(() => [
  { value: 'average', label: localize('cost.average') },
  { value: 'certain', label: localize('cost.certain') }
])

const isPlanned = computed(() => results.value !== null)

const level = computed(() => character.value?.Level ?? 1)

const xp = computed(() => character.value?.XP ?? 0)

const startLevel = computed(() => getLevelAfter(level.value, xp.value, 0))

const openDungeons = computed(() => (character.value?.Dungeons ? listOpenDungeons(character.value.Dungeons) : []))

const fighters = computed(() => (character.value ? createBreakFighters(character.value) : []))

const canPlan = computed(() => {
  if (!character.value || !isValid.value || openDungeons.value.length === 0) return false

  const needsCompanions = openDungeons.value.some(({ dungeon }) => dungeon.companions)

  return !needsCompanions || fighters.value.every((fighter) => fighter !== null)
})

const dungeons = computed(() => planBreak(openDungeons.value, results.value ?? new Map(), (threshold.value ?? 0) / 100, excluded.value, cost.value))

const includedDungeons = computed(() => dungeons.value.filter((dungeon) => dungeon.included))

const selectedDungeons = computed(() => dungeons.value.filter((dungeon) => dungeon.group === selectedGroup.value))

const order = computed(() => (isPlanned.value ? orderFights(dungeons.value) : []))

const bought = computed(() => (mushrooms.value === null ? null : spendMushrooms(order.value, mushrooms.value)))

const totals = computed(() => ({
  potential: sum(includedDungeons.value.map((dungeon) => dungeon.potential)),
  current: sum(includedDungeons.value.map((dungeon) => dungeon.current)),
  mushrooms: sum(includedDungeons.value.map((dungeon) => dungeon.mushrooms))
}))

const tiles = computed(() => {
  const { potential, current } = totals.value
  const planned = isPlanned.value
  const unit = localize('tiles.levels')

  return [
    { key: 'unlocked', label: localize('tiles.unlocked'), value: formatLevels(potential), unit, detail: localize('tiles.detail', { experience: formatExperience(potential), level: formatEndLevel(potential) }), accent: false, pending: false },
    { key: 'beatable', label: localize('tiles.beatable'), value: planned ? formatLevels(current) : '-', unit: planned ? unit : '', detail: planned ? localize('tiles.detail', { experience: formatExperience(current), level: formatEndLevel(current) }) : localize('tiles.pending'), accent: planned, pending: !planned },
    { key: 'mushrooms', label: localize('tiles.mushrooms'), value: planned ? formatMushrooms(totals.value.mushrooms) : '-', unit: '', detail: '', accent: false, pending: !planned }
  ]
})

const cards = computed(() =>
  GROUPS.map((group) => {
    const list = dungeons.value.filter((dungeon) => dungeon.group === group)
    const counted = list.filter((dungeon) => dungeon.included)

    let included: boolean | 'mixed' | undefined

    if (list.length > 0) {
      included = counted.length === list.length || (counted.length === 0 ? false : 'mixed')
    }

    return {
      included,
      group,
      dungeons: list,
      selected: list.length > 0 && group === selectedGroup.value,
      locked: list.length === 0 && isGroupLocked(group),
      subtitle: getGroupSubtitle(group, list),
      unlocked: formatLevels(sum(counted.map((dungeon) => dungeon.potential))),
      beatable: formatLevels(sum(counted.map((dungeon) => dungeon.current))),
      mushrooms: formatMushrooms(sum(counted.map((dungeon) => dungeon.mushrooms))),
      won: sum(counted.map((dungeon) => dungeon.winnable)),
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
  const shadow = localize.global('dungeon_enemies.shadow')

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

const missingFights = computed(() => {
  if (bought.value === null || mushrooms.value === null || bought.value.fights === order.value.length) return ''

  return localize('order.missing', { from: bought.value.fights + 1, to: order.value.length, missing: formatMushrooms(totals.value.mushrooms - mushrooms.value) })
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

watch(character, () => {
  void plan()
})

const SETTINGS_DELAY = 500

let settingsTimer: ReturnType<typeof setTimeout> | undefined

watch([() => settings.value?.threads, () => settings.value?.iterations], () => {
  clearTimeout(settingsTimer)

  settingsTimer = setTimeout(() => void plan(), SETTINGS_DELAY)
})

onBeforeUnmount(() => {
  clearTimeout(settingsTimer)
})

function selectCharacter(entry: PlayerModel | null) {
  character.value = entry
  results.value = null
  excluded.value = new Set()
  selectedGroup.value = GROUPS.find((group) => dungeons.value.some((dungeon) => dungeon.group === group)) ?? 'light'
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

function formatEndLevel(experience: number) {
  return getLevelAfter(level.value, xp.value, experience).toFixed(2)
}

function isGroupLocked(group: BreakGroup) {
  const progress = character.value?.Dungeons

  if (!progress) return false

  switch (group) {
    case 'light':
      return progress.Normal.Unlocked === 0
    case 'shadow':
      return progress.Shadow.Unlocked === 0
    case 'idols':
      return progress.Youtube < 0
    case 'twister':
      return progress.Twister < 0
    case 'sandstorm':
      return progress.Sandstorm < 0
  }
}

function getGroupSubtitle(group: BreakGroup, list: BreakDungeon[]) {
  if (!character.value) return ''

  const [first] = list

  if (!first) return localize(isGroupLocked(group) ? 'card.locked' : 'card.done')
  if (group === 'light' || group === 'shadow') return localize('card.open', { count: list.length })

  return localize('card.floor', { position: first.done + 1, total: first.done + first.bosses.length })
}

async function runPlan() {
  if (!canPlan.value) return

  const entries = openDungeons.value.flatMap((dungeon) => dungeon.entries)

  const simulation = await dungeonSimulator.simulateUntilNotPossible(compact(entries.map((entry) => createDungeonFight(entry, fighters.value))), {
    instances: Math.max(1, settings.value?.threads || 4),
    iterations: Math.max(1, settings.value?.iterations || 5000)
  })

  if (!simulation) return

  results.value = new Map(simulation.results.map((result) => [getFightKey(result), result]))
}
</script>
