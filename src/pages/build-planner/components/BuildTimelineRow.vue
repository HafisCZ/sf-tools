<template>
  <div draggable="true" class="group relative grid before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/5" :class="{ 'shadow-[inset_0_2px_0_var(--color-accent)]': props.dropTarget }" :style="{ gridTemplateColumns: getTimelineColumns(props.config) }">
    <button ref="insert-ref" type="button" class="group/insert absolute inset-x-0 top-0 z-2 flex h-3 -translate-y-1/2 cursor-pointer items-center" :aria-label="localize('insert')" :aria-expanded="props.inserting" @click="openInsert">
      <span class="ml-2 flex size-4 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] text-page" :class="insertLineClass">
        <SFIcon name="plus" />
      </span>
      <span class="h-0.5 grow bg-accent" :class="insertLineClass" />
    </button>
    <div class="flex items-center justify-center">
      <SFButton variant="ghost" size="sm" icon :aria-label="localize('remove')" @click="emit('remove')">
        <SFIcon name="xmark" />
      </SFButton>
    </div>
    <div v-for="(building, index) in props.config.buildings" :key="building.name" class="relative px-0.5 py-[3px]">
      <div class="absolute inset-x-0.5 inset-y-0 bg-white/5" />
      <SFTooltip v-if="index === props.row.building">
        <span class="relative block">
          <BuildPicture :kind="props.config.kind" :building="index" :level="Math.min(props.row.level, building.pictures)" :badge="String(props.row.level)" :variant="props.row.block ? 'error' : 'built'" />
        </span>
        <template #content>
          <BuildCostSummary :config="props.config" :name="name" :cost="props.row.cost" :discount="props.row.discount" :duration="props.row.duration" />
        </template>
      </SFTooltip>
      <div v-if="index === props.config.gemMine && props.gemRun" class="pointer-events-none absolute inset-x-1 top-1 z-1 flex items-center justify-center gap-1 rounded border border-sky-300/35 bg-sky-300/18 text-[13px] font-bold" :style="{ height: `calc(${props.gemRun.rows} * 100% - 8px)` }">
        <img src="/res/gem1.png" alt="" class="size-3.5 object-contain" />
        +{{ formatSpacedNumber(props.gemRun.gems) }}
      </div>
    </div>
    <div class="grid items-center gap-x-1.5 pr-2 pl-4 text-[13px]" :style="{ gridTemplateColumns: getDetailColumns(props.config) }">
      <template v-if="!props.row.block">
        <span v-for="(resource, resourceIndex) in props.config.resources" :key="resource.key" class="flex flex-col whitespace-nowrap">
          <span class="flex items-center gap-1">
            <img :src="`/res/buildings/${resource.key}.webp`" :alt="localize.global(`general.${resource.key}`)" class="h-3.5 w-4 object-contain" />
            {{ formatNamedNumber(props.row.cost[resourceIndex]) }}
            <span v-if="props.row.discount[resourceIndex] >= 1" class="text-xs text-white/50">-{{ formatNamedNumber(Math.round(props.row.discount[resourceIndex])) }}</span>
          </span>
          <span class="pl-5 text-xs text-white/50">{{ formatNamedNumber(props.row.total[resourceIndex]) }}</span>
        </span>
        <span class="flex flex-col whitespace-nowrap">
          <span :class="{ 'text-white/40 line-through': props.row.skipped }">{{ formatBuildTime(props.row.duration) }}</span>
          <span class="text-xs text-white/50">{{ formatBuildTime(props.row.end) }}</span>
        </span>
        <SFButton :variant="props.row.skipped ? 'primary' : 'ghost'" size="sm" :aria-label="localize('skip')" :aria-pressed="props.row.skipped" class="justify-self-start" @click="emit('skip')">
          <img src="/res/mushroom.png" alt="" class="size-3.5 object-contain" />
          {{ formatSpacedNumber(getSkipCost(props.row.duration)) }}
        </SFButton>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFIcon from '@library/SFIcon.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { formatNamedNumber, formatSpacedNumber } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { formatBuildTime, getDetailColumns, getSkipCost, getTimelineColumns } from '~/pages/build-planner/build-planner'
import BuildCostSummary from '~/pages/build-planner/components/BuildCostSummary.vue'
import BuildPicture from '~/pages/build-planner/components/BuildPicture.vue'
import type { PlannerConfig, PlannerGemRun, PlannerRow } from '~/pages/build-planner/types'

defineOptions({
  name: 'BuildTimelineRow'
})

const props = defineProps<{
  /**
   * Buildings, prices and rules of the planned area
   */
  config: PlannerConfig
  /**
   * Planned step shown on this row
   */
  row: PlannerRow
  /**
   * Shows where a dragged step would land
   */
  dropTarget: boolean
  /**
   * Keeps the insert line above this row shown while its building menu is open
   */
  inserting?: boolean
  /**
   * Gem search stretch starting on this row that finds a gem, drawn over the following rows of the Gem Mine track
   */
  gemRun?: PlannerGemRun
}>()

const emit = defineEmits<{
  insert: [anchor: HTMLElement]
  remove: []
  skip: []
}>()

const localize = useLocalize('build_planner')

const insertElement = useTemplateRef('insert-ref')

const insertLineClass = computed(() => (props.inserting ? 'opacity-100' : 'opacity-0 group-hover/insert:opacity-100 group-focus-visible/insert:opacity-100'))

const name = computed(() => `${localize.global(props.config.buildings[props.row.building].name)} ${props.row.level}`)

function openInsert() {
  if (insertElement.value) {
    emit('insert', insertElement.value)
  }
}
</script>
