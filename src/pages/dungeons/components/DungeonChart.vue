<template>
  <div class="flex flex-col">
    <div v-if="lines.length > 0" class="pb-2.5 text-center text-xs leading-[1.2] font-bold text-[#666]">
      <div v-for="line in lines" :key="line">{{ line }}</div>
      <div class="flex items-center justify-center gap-4 pt-1">
        <span class="flex items-center gap-1.5">
          <span class="size-2 rounded-full bg-[limegreen]" />
          {{ localize('graph.player') }}
        </span>
        <span class="flex items-center gap-1.5">
          <span class="size-2 rounded-full bg-[crimson]" />
          {{ localize('enemy') }}
        </span>
      </div>
    </div>
    <div class="flex min-h-0 flex-1 py-1.5">
      <div v-if="props.ticks" class="relative w-12 shrink-0 text-xs text-[#666]">
        <span v-for="tick in TICKS" :key="tick" class="absolute right-2.5 -translate-y-1/2" :style="{ top: `${100 - tick}%` }">{{ tick }}%</span>
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" class="h-full min-w-0 flex-1 overflow-visible">
        <line x1="0" x2="0" y1="0" y2="100" stroke="#2e2e2e" vector-effect="non-scaling-stroke" />
        <line v-for="tick in TICKS" :key="tick" x1="0" x2="100" :y1="100 - tick" :y2="100 - tick" stroke="#2e2e2e" vector-effect="non-scaling-stroke" />
        <polyline v-if="enemyPoints" :points="enemyPoints" fill="none" stroke="crimson" stroke-width="1.5" vector-effect="non-scaling-stroke" />
        <polyline v-if="playersPoints" :points="playersPoints" fill="none" stroke="limegreen" stroke-width="1.5" vector-effect="non-scaling-stroke" />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatSpacedNumber } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { compact } from '@utils/utils'
import { getBossName, getDungeonExperience, getDungeonName, TOWER, type DungeonResult } from '~/sim/data/dungeons'

defineOptions({
  name: 'DungeonChart'
})

const props = defineProps<{
  /**
   * Result whose enemy and player health left after each fight is drawn, sorted from lowest
   */
  result: DungeonResult | null
  /**
   * Shows the percentages next to the chart
   */
  ticks?: boolean
}>()

const TICKS = [0, 20, 40, 60, 80, 100]

const localize = useLocalize('dungeons')

const lines = computed(() => {
  const result = props.result

  if (!result) return []

  const { dungeon, score, iterations } = result

  const shadow = dungeon.id !== TOWER && dungeon.companions ? `${localize.global('dungeon_enemies.shadow')} ` : ''
  const experience = getDungeonExperience(result)

  return compact([`${shadow}${getDungeonName(dungeon)}: ${getBossName(result)}`, experience > 0 && `${formatSpacedNumber(experience)} XP`, localize('graph.winrate', { rate: ((100 * score) / iterations).toFixed(2), score: formatSpacedNumber(score), tries: formatSpacedNumber(iterations) })])
})

const enemyPoints = computed(() => toPoints(props.result?.enemyHealths ?? []))

const playersPoints = computed(() => toPoints([...(props.result?.playersHealths ?? [])].reverse()))

function toPoints(healths: number[]) {
  if (healths.length === 0) return ''

  const step = 100 / Math.max(1, healths.length - 1)

  return healths.map((health, index) => `${index * step},${100 - health * 100}`).join(' ')
}
</script>
