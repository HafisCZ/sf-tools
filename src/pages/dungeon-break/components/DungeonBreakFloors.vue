<template>
  <section :aria-labelledby="titleId" class="min-w-0 rounded-md border border-line bg-surface">
    <div class="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border-b border-line px-4 py-3">
      <SFHeading :id="titleId" level="6" class="tracking-[0.08em] uppercase">{{ localize(`groups.${props.dungeon.group}`) }}</SFHeading>
      <span class="text-xs text-white/60">{{ localize('floors.subtitle', { position: firstFloor, total: totalFloors, count: props.dungeon.bosses.length }) }}</span>
    </div>
    <div class="flex flex-col gap-2.5 p-4">
      <div role="img" :aria-label="localize('floors.strip', { won: wonCount, blocked: blockedCount })" class="flex h-3.5 overflow-hidden rounded-full bg-white/[0.06]">
        <span class="bg-[#6fcf7c]" :style="{ width: getShare(wonCount) }" />
        <span class="bg-[#f2c14e]/55" :style="{ width: getShare(blockedCount) }" />
      </div>
      <div v-if="props.planned" class="flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-white/60">
        <span v-if="wonCount > 0">{{ localize('floors.winnable', { from: firstFloor, to: firstFloor + wonCount - 1, count: wonCount }) }}</span>
        <span v-if="blockedCount > 0" class="text-[#f2c14e]">{{ localize('floors.blocked', { from: firstFloor + wonCount, to: firstFloor + wonCount + blockedCount - 1 }) }}</span>
        <span>{{ localize('floors.rest', { from: firstFloor + wonCount + blockedCount, total: totalFloors }) }}</span>
      </div>
      <div v-if="props.planned" class="flex flex-wrap items-center gap-x-7 gap-y-1.5 pt-1">
        <span class="flex items-baseline gap-1">
          <strong>{{ formatExperience(props.dungeon.current) }}</strong>
          <span class="text-white/60">{{ localize('floors.beatable', { unlocked: formatExperience(props.dungeon.potential) }) }}</span>
        </span>
        <span class="flex items-baseline gap-1">
          <strong>{{ levels }}</strong>
          <span class="text-white/60">{{ localize('floors.levels') }}</span>
        </span>
        <span class="flex items-center gap-1.5">
          <img src="/res/mushroom.png" alt="" class="size-4" />
          <strong>{{ formatMushrooms(props.dungeon.mushrooms) }}</strong>
          <span class="text-white/60">{{ localize('floors.mushrooms', { paid: formatMushrooms(paidMushrooms) }) }}</span>
        </span>
      </div>
      <SFParagraph type="muted" size="sm">{{ localize('floors.rule') }}</SFParagraph>
    </div>
    <div v-if="props.planned" class="max-h-[480px] overflow-y-auto">
      <SFTable dense>
        <template #header>
          <SFTableRow>
            <SFTableHeader>{{ localize('floors.floor') }}</SFTableHeader>
            <SFTableHeader>{{ localize('floors.enemy') }}</SFTableHeader>
            <SFTableHeader align="right">{{ localize('floors.chance') }}</SFTableHeader>
            <SFTableHeader align="right">{{ localize('floors.clean') }}</SFTableHeader>
            <SFTableHeader align="right">{{ localize('floors.first') }}</SFTableHeader>
            <SFTableHeader align="right">{{ localize('floors.experience') }}</SFTableHeader>
            <SFTableHeader align="right">{{ localize('floors.mushrooms_column') }}</SFTableHeader>
          </SFTableRow>
        </template>
        <SFTableRow v-for="boss in simulated" :key="boss.entry.boss.pos" class="whitespace-nowrap" :class="{ 'text-white/45': boss.status !== 'win' }">
          <SFTableCell class="font-bold">{{ boss.entry.boss.pos }}</SFTableCell>
          <SFTableCell>{{ localize('table.level', { level: boss.entry.boss.level }) }}</SFTableCell>
          <SFTableCell align="right">
            <span v-if="boss.chance" class="inline-flex items-center gap-2">
              {{ formatChance(boss.chance) }}
              <span class="relative inline-block h-1.5 w-[70px] overflow-hidden rounded-full bg-white/10">
                <span class="absolute inset-y-0 left-0" :class="getChanceClass(boss.chance)" :style="{ width: `${boss.chance * 100}%` }" />
              </span>
            </span>
            <template v-else>{{ localize('status.never') }}</template>
          </SFTableCell>
          <SFTableCell align="right">{{ boss.status === 'win' ? `${Math.round(boss.clean * 100)}%` : '' }}</SFTableCell>
          <SFTableCell align="right" :class="{ 'text-[#6fcf7c]': boss.free }">{{ formatFirstFight(boss) }}</SFTableCell>
          <SFTableCell align="right">{{ formatExperience(boss.experience) }}</SFTableCell>
          <SFTableCell align="right" class="font-bold">{{ boss.status === 'win' ? formatMushrooms(boss.cost) : '' }}</SFTableCell>
        </SFTableRow>
      </SFTable>
    </div>
    <SFParagraph v-else type="muted" class="px-4 pb-4">{{ localize('floors.pending') }}</SFParagraph>
  </section>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import SFHeading from '@library/SFHeading.vue'
import SFParagraph from '@library/SFParagraph.vue'
import SFTable from '@library/SFTable.vue'
import SFTableCell from '@library/SFTableCell.vue'
import SFTableHeader from '@library/SFTableHeader.vue'
import SFTableRow from '@library/SFTableRow.vue'
import { useLocalize } from '@utils/localization'
import { sum } from '@utils/utils'
import { formatChance, formatExperience, formatMushrooms, getChanceClass, getLevelAfter, type BreakBoss, type BreakDungeon } from '~/pages/dungeon-break/dungeon-break'

defineOptions({
  name: 'DungeonBreakFloors'
})

const props = defineProps<{
  /**
   * Twister or Sandstorm with its remaining floors
   */
  dungeon: BreakDungeon
  /**
   * Shows the win chances, the floors are only counted otherwise
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

const localize = useLocalize('dungeon_break')

const titleId = useId()

const firstFloor = computed(() => props.dungeon.done + 1)

const totalFloors = computed(() => props.dungeon.done + props.dungeon.bosses.length)

const wonCount = computed(() => (props.planned ? props.dungeon.winnable : 0))

const blockedCount = computed(() => (props.planned ? props.dungeon.bosses.filter((boss) => boss.status === 'blocked').length : 0))

const simulated = computed(() => props.dungeon.bosses.filter((boss) => boss.status !== 'none'))

const paidMushrooms = computed(() => sum(props.dungeon.bosses.flatMap((boss) => (boss.status === 'win' ? [boss.cost + (boss.free ?? 0)] : []))))

const levels = computed(() => (getLevelAfter(props.level, props.xp, props.dungeon.current) - getLevelAfter(props.level, props.xp, 0)).toFixed(2))

function getShare(count: number) {
  return `${(100 * count) / Math.max(1, props.dungeon.bosses.length)}%`
}

function formatFirstFight({ status, free }: BreakBoss) {
  if (status !== 'win' || free === null) return ''

  return free > 0 ? localize('floors.free', { share: Math.round(free * 100) }) : localize('floors.paid')
}
</script>
