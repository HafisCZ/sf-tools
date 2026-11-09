<template>
  <div class="relative grid before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/5" :style="{ gridTemplateColumns: getTimelineColumns(props.config) }">
    <span />
    <div v-for="option in options" :key="option.index" class="relative px-0.5 py-[3px]">
      <div class="absolute inset-x-0.5 inset-y-0 rounded-b bg-white/5" />
      <SFTooltip>
        <button
          type="button"
          class="relative block w-full rounded focus-visible:outline-2 focus-visible:outline-accent"
          :class="option.block ? 'cursor-default' : 'cursor-pointer opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100'"
          :aria-disabled="option.block ? 'true' : 'false'"
          :aria-label="option.label"
          @click="addStep(option)"
        >
          <BuildPicture :config="props.config" :building="option.index" :level="option.picture" :badge="option.badge" :variant="option.block ? 'locked' : 'next'" />
        </button>
        <template #content>
          <BuildCostSummary :config="props.config" :name="option.name" :cost="option.cost" :discount="option.discount" :duration="option.duration" />
        </template>
      </SFTooltip>
    </div>
    <span />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFTooltip from '@library/SFTooltip.vue'
import { getNextOptions, getTimelineColumns } from '~/pages/build-planner/build-planner'
import BuildCostSummary from '~/pages/build-planner/components/BuildCostSummary.vue'
import BuildPicture from '~/pages/build-planner/components/BuildPicture.vue'
import type { PlannerConfig, PlannerOption, PlannerPlan, PlannerState } from '~/pages/build-planner/types'

defineOptions({
  name: 'BuildTimelineNext'
})

const props = defineProps<{
  /**
   * Buildings, prices and rules of the planned area
   */
  config: PlannerConfig
  /**
   * Plan the next upgrade is added to
   */
  plan: PlannerPlan
  /**
   * Buildings and mined resources at the end of the plan
   */
  state: PlannerState
}>()

const emit = defineEmits<{
  add: [building: number]
}>()

const options = computed(() => getNextOptions(props.config, props.plan, props.state))

function addStep(option: PlannerOption) {
  if (option.block) return

  emit('add', option.index)
}
</script>
