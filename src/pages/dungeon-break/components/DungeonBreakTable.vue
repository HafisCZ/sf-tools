<template>
  <section :aria-labelledby="titleId" class="min-w-0 rounded-md border border-line bg-surface">
    <div class="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5 border-b border-line px-4 py-3">
      <SFHeading :id="titleId" level="6" class="tracking-[0.08em] uppercase">{{ localize(`groups.${props.group}`) }}</SFHeading>
      <span class="ml-auto flex flex-wrap items-center gap-3 text-xs text-white/60">
        <span v-for="item in LEGEND" :key="item.dot" class="flex items-center gap-1.5">
          <span :class="DOT_CLASSES[item.dot]" />
          {{ localize(item.label) }}
        </span>
      </span>
    </div>
    <SFTable dense>
      <template #header>
        <SFTableRow>
          <SFTableHeader class="w-11">
            <span class="sr-only">{{ localize('floors.include') }}</span>
          </SFTableHeader>
          <SFTableHeader>{{ localize('table.dungeon') }}</SFTableHeader>
          <SFTableHeader>{{ localize('table.next') }}</SFTableHeader>
          <SFTableHeader>{{ localize('table.floors') }}</SFTableHeader>
          <SFTableHeader align="right">{{ localize('table.winnable') }}</SFTableHeader>
          <SFTableHeader align="right">{{ localize('table.unlocked') }}</SFTableHeader>
          <SFTableHeader align="right">{{ localize('table.beatable') }}</SFTableHeader>
          <SFTableHeader align="right">{{ localize('table.levels') }}</SFTableHeader>
          <SFTableHeader align="right">{{ localize('table.mushrooms') }}</SFTableHeader>
        </SFTableRow>
      </template>
      <template v-for="dungeon in props.dungeons" :key="dungeon.dungeon.id">
        <SFTableRow class="whitespace-nowrap" :class="{ 'opacity-45': !dungeon.included, 'bg-white/[0.04]': openId === dungeon.dungeon.id }">
          <SFTableCell>
            <SFCheckbox :model-value="dungeon.included" :aria-label="localize('table.include', { name: getDungeonName(dungeon.dungeon) })" class="pl-2" @update:model-value="emit('toggle', dungeon.dungeon.id)" />
          </SFTableCell>
          <SFTableCell>
            <button type="button" class="flex min-h-9 cursor-pointer items-center font-bold outline-none focus-visible:underline" :aria-expanded="openId === dungeon.dungeon.id" @click="toggleOpen(dungeon.dungeon.id)">
              {{ getDungeonName(dungeon.dungeon) }}
            </button>
          </SFTableCell>
          <SFTableCell class="max-w-[220px] truncate">{{ formatBoss(dungeon.bosses[0]) }}</SFTableCell>
          <SFTableCell>
            <span role="img" :aria-label="describeFloors(dungeon)" class="flex max-w-[132px] flex-wrap items-center gap-[3px]">
              <span v-for="(status, index) in getDots(dungeon)" :key="index" :class="DOT_CLASSES[status]" />
            </span>
          </SFTableCell>
          <SFTableCell align="right">{{ formatWinnable(dungeon) }}</SFTableCell>
          <SFTableCell align="right">{{ formatExperience(dungeon.potential) }}</SFTableCell>
          <SFTableCell align="right">{{ props.planned && dungeon.current > 0 ? formatExperience(dungeon.current) : '-' }}</SFTableCell>
          <SFTableCell align="right">{{ props.planned && dungeon.current > 0 ? formatLevels(dungeon.current) : '-' }}</SFTableCell>
          <SFTableCell align="right">{{ props.planned && dungeon.mushrooms > 0 ? formatMushrooms(dungeon.mushrooms) : '-' }}</SFTableCell>
        </SFTableRow>
        <template v-if="openId === dungeon.dungeon.id">
          <SFTableRow v-for="boss in dungeon.bosses" :key="boss.entry.boss.pos" class="h-12 bg-black/20 whitespace-nowrap" :class="{ 'text-white/45': props.planned && boss.status !== 'win' }">
            <SFTableCell />
            <SFTableCell>{{ formatBoss(boss) }}</SFTableCell>
            <SFTableCell>{{ localize('table.level', { level: boss.entry.boss.level }) }}</SFTableCell>
            <SFTableCell align="right" colspan="2">
              <span v-if="props.planned && boss.chance !== null && boss.chance > 0" class="inline-flex items-center gap-2">
                {{ formatChance(boss.chance) }}
                <span class="relative inline-block h-1.5 w-[70px] overflow-hidden rounded-full bg-white/10">
                  <span class="absolute inset-y-0 left-0" :class="getChanceClass(boss.chance)" :style="{ width: `${boss.chance * 100}%` }" />
                </span>
              </span>
              <span v-else :class="{ 'text-[#f2c14e]': boss.status === 'blocked' }">{{ localize(props.planned ? `status.${boss.status}` : 'status.pending') }}</span>
            </SFTableCell>
            <SFTableCell align="right">{{ formatExperience(boss.experience) }}</SFTableCell>
            <SFTableCell align="right">{{ boss.status === 'win' ? formatExperience(boss.experience) : '' }}</SFTableCell>
            <SFTableCell />
            <SFTableCell align="right">{{ boss.status === 'win' ? formatMushrooms(boss.cost) : '' }}</SFTableCell>
          </SFTableRow>
        </template>
      </template>
    </SFTable>
  </section>
</template>

<script setup lang="ts">
import { ref, useId } from 'vue'
import SFCheckbox from '@library/SFCheckbox.vue'
import SFHeading from '@library/SFHeading.vue'
import SFTable from '@library/SFTable.vue'
import SFTableCell from '@library/SFTableCell.vue'
import SFTableHeader from '@library/SFTableHeader.vue'
import SFTableRow from '@library/SFTableRow.vue'
import { useLocalize } from '@utils/localization'
import { formatChance, formatExperience, formatMushrooms, getChanceClass, getLevelAfter, type BreakBoss, type BreakDungeon, type BreakGroup, type BreakStatus } from '~/pages/dungeon-break/dungeon-break'
import { getBossName, getDungeonName } from '~/sim/data/dungeons'

defineOptions({
  name: 'DungeonBreakTable'
})

const props = defineProps<{
  /**
   * Group the dungeons belong to, sets the title
   */
  group: BreakGroup
  /**
   * Open dungeons with their bosses
   */
  dungeons: BreakDungeon[]
  /**
   * Shows the win chances, the dungeons are only listed otherwise
   */
  planned?: boolean
  /**
   * Level of the character
   */
  level: number
  /**
   * Experience the character already has in its level
   */
  xp: number
}>()

const emit = defineEmits<{
  toggle: [id: number]
}>()

type Dot = BreakStatus | 'done' | 'pending'

const DOT_CLASSES: Record<Dot, string> = {
  done: 'size-2.5 rounded-full bg-white/15',
  win: 'size-2.5 rounded-full bg-[#6fcf7c]',
  blocked: 'size-2.5 rounded-full border-[1.5px] border-[#f2c14e]',
  never: 'size-2.5 rounded-full border-[1.5px] border-white/40',
  none: 'size-2.5 rounded-full border-[1.5px] border-white/40',
  pending: 'size-2.5 rounded-full border-[1.5px] border-dashed border-white/40'
}

const LEGEND: { dot: Dot; label: string }[] = [
  { dot: 'win', label: 'status.win' },
  { dot: 'blocked', label: 'status.blocked' },
  { dot: 'none', label: 'status.rest' }
]

const localize = useLocalize('dungeon_break')

const titleId = useId()

const openId = ref<number | null>(null)

function toggleOpen(id: number) {
  openId.value = openId.value === id ? null : id
}

function formatBoss({ entry }: BreakBoss) {
  return localize('table.boss', { position: entry.boss.pos, name: getBossName(entry) })
}

function formatLevels(experience: number) {
  return (getLevelAfter(props.level, props.xp, experience) - getLevelAfter(props.level, props.xp, 0)).toFixed(2)
}

function formatWinnable(dungeon: BreakDungeon) {
  return props.planned && dungeon.winnable > 0 ? String(dungeon.winnable) : '-'
}

function getDots(dungeon: BreakDungeon): Dot[] {
  const done: Dot[] = Array.from({ length: dungeon.done }, () => 'done')

  return [...done, ...dungeon.bosses.map((boss): Dot => (props.planned ? boss.status : 'pending'))]
}

function describeFloors(dungeon: BreakDungeon) {
  const total = dungeon.bosses.length

  return props.planned ? localize('table.progress', { done: dungeon.done, won: dungeon.winnable, total }) : localize('table.progress_pending', { done: dungeon.done, total })
}
</script>
