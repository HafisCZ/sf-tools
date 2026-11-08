<template>
  <div class="max-md:overflow-x-auto">
    <div class="min-w-250 pb-2">
      <div class="grid" :style="{ gridTemplateColumns: getTimelineColumns(props.config) }">
        <span />
        <div v-for="(building, index) in props.config.buildings" :key="building.name" class="flex flex-col gap-1 px-0.5 pt-1">
          <BuildPicture :kind="props.config.kind" :building="index" :level="Math.min(startLevels[index], building.pictures)" />
          <div class="mt-auto px-0.5 pt-1.5 pb-1.5">
            <slot name="level" :building="index" />
          </div>
        </div>
        <div class="flex flex-col gap-2 pt-1 pr-2 pl-4">
          <div class="flex grow items-center justify-center">
            <div class="flex items-end gap-2">
              <slot name="actions" />
            </div>
          </div>
          <div class="grid items-end gap-x-1.5 pb-1.5 text-center text-xs font-bold text-white/60" :style="{ gridTemplateColumns: getDetailColumns(props.config) }">
            <span v-for="resource in props.config.resources" :key="resource.key">{{ localize.global(`general.${resource.key}`) }}</span>
            <span>{{ localize('build') }}</span>
            <span>{{ localize('skip') }}</span>
          </div>
        </div>
      </div>
      <BuildTimelineRow
        v-for="row in simulation.rows"
        :key="row.index"
        :config="props.config"
        :row="row"
        :drop-target="row.index === dropIndex"
        :inserting="open && row.index === insertAt"
        :gem-run="gemRuns.get(row.index)"
        @insert="(anchor: HTMLElement) => openInsert(row.index, anchor)"
        @remove="removeStep(row.index)"
        @skip="toggleSkip(row.index)"
        @dragstart="(event: DragEvent) => startDrag(event, row.index)"
        @dragover="(event: DragEvent) => overDrag(event, row.index)"
        @drop="(event: DragEvent) => dropDrag(event, row.index)"
        @dragend="endDrag"
      />
      <div ref="end-ref">
        <BuildTimelineNext :config="props.config" :plan="plan" :state="simulation.state" @add="addStep" />
      </div>
    </div>
    <BuildInsertMenu v-if="open && position && insertState" :config="props.config" :plan="plan" :state="insertState" :anchor="position" @add="insertStep" @close="closeInsert" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef } from 'vue'
import { useDropdown } from '@utils/interactions'
import { useLocalize } from '@utils/localization'
import { getDetailColumns, getStartLevels, getTimelineColumns, notifyRemovedSteps, pruneSteps, simulate } from '~/pages/build-planner/build-planner'
import BuildInsertMenu from '~/pages/build-planner/components/BuildInsertMenu.vue'
import BuildPicture from '~/pages/build-planner/components/BuildPicture.vue'
import BuildTimelineNext from '~/pages/build-planner/components/BuildTimelineNext.vue'
import BuildTimelineRow from '~/pages/build-planner/components/BuildTimelineRow.vue'
import type { PlannerConfig, PlannerGemRun, PlannerPlan } from '~/pages/build-planner/types'

defineOptions({
  name: 'BuildTimeline'
})

const props = defineProps<{
  /**
   * Buildings, prices and rules of the planned area
   */
  config: PlannerConfig
}>()

const plan = defineModel<PlannerPlan>({ required: true })

defineSlots<{
  /**
   * Start level field at the top of a building's track
   */
  level(props: { building: number }): unknown
  /**
   * Controls centered above the column headings
   */
  actions(): unknown
}>()

const localize = useLocalize('build_planner')

// Position the building picked in the insert menu goes to
const insertAt = shallowRef<number | null>(null)

const insertAnchor = shallowRef<HTMLElement | null>(null)

const dragIndex = shallowRef<number | null>(null)

const dropIndex = shallowRef<number | null>(null)

const endElement = useTemplateRef('end-ref')

const { open, position, close } = useDropdown(insertAnchor, insertAnchor)

const startLevels = computed(() => getStartLevels(props.config, plan.value))

const simulation = computed(() => simulate(props.config, plan.value))

const insertState = computed(() => (insertAt.value === null ? null : simulate(props.config, plan.value, insertAt.value).state))

// One block per stretch of searching that finds a gem
const gemRuns = computed(() => {
  const runs = new Map<number, PlannerGemRun>()

  let first = -1
  let run: PlannerGemRun = { rows: 0, gems: 0 }

  for (const row of simulation.value.rows) {
    if (first >= 0 && !row.searching) {
      if (run.gems > 0) {
        runs.set(first, run)
      }

      first = -1
    }

    if (row.searching) {
      if (first < 0) {
        first = row.index
        run = { rows: 0, gems: 0 }
      }

      run.rows += 1
      run.gems += row.gems
    }
  }

  if (first >= 0 && run.gems > 0) {
    runs.set(first, run)
  }

  return runs
})

function openInsert(index: number, anchor: HTMLElement) {
  insertAt.value = index
  insertAnchor.value = anchor
  open.value = true
}

function closeInsert() {
  close()
  insertAt.value = null
}

function insertStep(building: number) {
  const index = insertAt.value

  if (index === null) return

  const steps = plan.value.steps.slice()

  steps.splice(index, 0, { building, skipped: false })
  closeInsert()

  const pruned = pruneSteps(props.config, { ...plan.value, steps })

  notifyRemovedSteps(steps.length - pruned.length)

  plan.value = { ...plan.value, steps: pruned }
}

async function addStep(building: number) {
  const top = endElement.value?.getBoundingClientRect().top

  plan.value = { ...plan.value, steps: [...plan.value.steps, { building, skipped: false }] }

  // Keeps the row at the end under the pointer while the timeline grows above it
  await nextTick()

  if (top !== undefined && endElement.value) {
    window.scrollBy(0, endElement.value.getBoundingClientRect().top - top)
  }
}

function toggleSkip(index: number) {
  plan.value = { ...plan.value, steps: plan.value.steps.map((step, stepIndex) => (stepIndex === index ? { ...step, skipped: !step.skipped } : step)) }
}

function removeStep(index: number) {
  const steps = plan.value.steps.slice()

  steps.splice(index, 1)

  const pruned = pruneSteps(props.config, { ...plan.value, steps })

  notifyRemovedSteps(steps.length - pruned.length)

  plan.value = { ...plan.value, steps: pruned }
}

function startDrag(event: DragEvent, index: number) {
  dragIndex.value = index

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

// Steps after moving one, null when the move would leave any step that can't be built
function getMovedSteps(from: number, to: number) {
  const steps = plan.value.steps.slice()
  const moved = steps.splice(from, 1)[0]

  steps.splice(to, 0, moved)

  return pruneSteps(props.config, { ...plan.value, steps }).length === steps.length ? steps : null
}

function overDrag(event: DragEvent, index: number) {
  const from = dragIndex.value

  if (from === null) return

  // Leaving the default in place shows the drop as not allowed
  if (from !== index && !getMovedSteps(from, index)) {
    dropIndex.value = null
    return
  }

  event.preventDefault()
  dropIndex.value = index
}

function dropDrag(event: DragEvent, index: number) {
  event.preventDefault()

  const from = dragIndex.value
  const steps = from !== null && from !== index ? getMovedSteps(from, index) : null

  if (steps) {
    plan.value = { ...plan.value, steps }
  }

  endDrag()
}

function endDrag() {
  dragIndex.value = null
  dropIndex.value = null
}
</script>
