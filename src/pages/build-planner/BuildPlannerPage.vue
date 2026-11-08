<template>
  <Page width="80vw">
    <template #nav-left>
      <StatisticsIntegration type="players" :profile="SELF_PROFILE" :scope="listPlayers" @select="loadPlayer" />
      <span class="mx-1.5 h-5 w-px bg-white/12" />
      <SFTabs v-model="tab" :options="tabOptions" />
    </template>

    <BuildTimeline :key="tab" v-model="plans[tab]" :config="config">
      <template #level="column">
        <SFNumber
          v-model="plan.levels[column.building]"
          :label="localize.global(config.buildings[column.building].name)"
          :min="0"
          :max="config.buildings[column.building].max"
          :step="1"
          :validator="(value: number | null) => validateLevel(column.building, value)"
          validation-trigger="immediate"
          validation-position="floating"
          centered
          centered-label
          @change="pruneCurrentPlan"
        />
      </template>
      <template #actions>
        <div v-if="config.quarters < 0" class="w-36">
          <SFNumber v-model="plan.quarters" :label="localize.global('general.buildings.fortress2')" :min="0" :max="15" :step="1" centered />
        </div>
        <SFButton variant="outline" :disabled="isEmpty" @click="resetPlan">{{ localize('reset') }}</SFButton>
      </template>
    </BuildTimeline>

    <template #footer-right>
      <PageFooterLinks tool="build_planner" />
    </template>
  </Page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFNumber from '@library/SFNumber.vue'
import SFTabs from '@library/SFTabs.vue'
import { type SelectOption } from '@utils/components'
import { useLocalize } from '@utils/localization'
import { validationError } from '@utils/validations'
import { type PlayerModel } from '~/core/models/player'
import { SELF_PROFILE } from '~/core/profiles'
import { DatabaseManager } from '~/data/database-manager'
import StatisticsIntegration from '~/integration/StatisticsIntegration.vue'
import { createPlan, FORTRESS_PLANNER, normalizePlan, notifyRemovedSteps, PLANNER_CONFIGS, pruneSteps, UNDERWORLD_PLANNER } from '~/pages/build-planner/build-planner'
import BuildTimeline from '~/pages/build-planner/components/BuildTimeline.vue'
import type { PlannerKind, PlannerPlan } from '~/pages/build-planner/types'
import PageFooterLinks from '~/pages/components/PageFooterLinks.vue'
import Page from '~/pages/Page.vue'

defineOptions({
  name: 'BuildPlannerPage'
})

const localize = useLocalize('build_planner')

const tab = ref<PlannerKind>('fortress')

const plans = ref<Record<PlannerKind, PlannerPlan>>({
  fortress: createPlan(FORTRESS_PLANNER),
  underworld: createPlan(UNDERWORLD_PLANNER)
})

const tabOptions = computed<SelectOption<PlannerKind>[]>(() => [
  { value: 'fortress', label: localize('tab.fortress') },
  { value: 'underworld', label: localize('tab.underworld') }
])

const config = computed(() => PLANNER_CONFIGS[tab.value])

const plan = computed(() => plans.value[tab.value])

const isEmpty = computed(() => plan.value.steps.length === 0 && !plan.value.quarters && plan.value.levels.every((level) => !level))

// A start level is wrong when the building it depends on is too low for it
function validateLevel(building: number, value: number | null) {
  const level = value ?? 0

  if (level <= 0) return null

  const requirement = config.value.required(building, level)

  if (!requirement || (plan.value.levels[requirement.building] ?? 0) >= requirement.level) return null

  return validationError(localize('needs', { building: localize.global(config.value.buildings[requirement.building].name), level: requirement.level }))
}

function listPlayers() {
  return DatabaseManager.getLatestPlayers(true)
}

function loadPlayer(player: PlayerModel) {
  const fortress = player.Fortress
  const underworld = player.Underworld

  const fortressLevels = [fortress.Fortress, fortress.LaborerQuarters, fortress.WoodcutterGuild, fortress.Quarry, fortress.GemMine, fortress.Academy, fortress.ArcheryGuild, fortress.Barracks, fortress.MageTower, fortress.Treasury, fortress.Smithy, fortress.Fortifications]
  const underworldLevels = [underworld?.Heart, underworld?.Gate, underworld?.GoldPit, underworld?.Extractor, underworld?.GoblinPit, underworld?.Torture, fortress.Gladiator, underworld?.TrollBlock, underworld?.TimeMachine, underworld?.Keeper].map((level) => level ?? 0)

  plans.value = {
    fortress: normalizePlan(FORTRESS_PLANNER, { levels: fortressLevels, quarters: 0, steps: [] }),
    underworld: normalizePlan(UNDERWORLD_PLANNER, { levels: underworldLevels, quarters: fortress.LaborerQuarters, steps: [] })
  }
}

// Runs once a start level is committed, so typing "1" on the way to "16" keeps the plan
function pruneCurrentPlan() {
  const steps = pruneSteps(config.value, plan.value)

  if (steps.length === plan.value.steps.length) return

  notifyRemovedSteps(plan.value.steps.length - steps.length)

  plans.value[tab.value] = { ...plan.value, steps }
}

function resetPlan() {
  plans.value[tab.value] = createPlan(config.value)
}
</script>
