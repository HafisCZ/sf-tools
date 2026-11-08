<template>
  <Teleport to="body">
    <SFDropdownMenu :anchor="props.anchor" float="right" position="bottom" :width="columns * 124 + 10" :max-height="560" @close="emit('close')">
      <div role="menu" class="grid gap-1" :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }">
        <SFTooltip v-for="option in options" :key="option.index">
          <button type="button" role="menuitem" class="block w-full rounded p-0.5 outline-none focus-visible:bg-surface-hover" :class="option.block ? 'cursor-default' : 'cursor-pointer hover:bg-surface-hover'" :aria-disabled="option.block ? 'true' : 'false'" :aria-label="option.label" @click="addStep(option)">
            <BuildPicture :kind="props.config.kind" :building="option.index" :level="option.picture" :badge="option.badge" :variant="option.block ? 'locked' : 'next'" />
          </button>
          <template #content>
            <BuildCostSummary :config="props.config" :name="option.name" :cost="option.cost" :discount="option.discount" :duration="option.duration" />
          </template>
        </SFTooltip>
      </div>
    </SFDropdownMenu>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFDropdownMenu from '@library/SFDropdownMenu.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { type Rectangle } from '@utils/position'
import { getNextOptions } from '~/pages/build-planner/build-planner'
import BuildCostSummary from '~/pages/build-planner/components/BuildCostSummary.vue'
import BuildPicture from '~/pages/build-planner/components/BuildPicture.vue'
import type { PlannerConfig, PlannerOption, PlannerPlan, PlannerState } from '~/pages/build-planner/types'

defineOptions({
  name: 'BuildInsertMenu'
})

const props = defineProps<{
  /**
   * Buildings, prices and rules of the planned area
   */
  config: PlannerConfig
  /**
   * Plan the picked building is inserted into
   */
  plan: PlannerPlan
  /**
   * Buildings and mined resources at the spot the building goes to
   */
  state: PlannerState
  /**
   * Viewport edges of the insert line the menu opens from
   */
  anchor: Rectangle
}>()

const emit = defineEmits<{
  add: [building: number]
  close: []
}>()

const options = computed(() => getNextOptions(props.config, props.plan, props.state))

const columns = computed(() => Math.min(4, props.config.buildings.length))

function addStep(option: PlannerOption) {
  if (option.block) return

  emit('add', option.index)
}
</script>
