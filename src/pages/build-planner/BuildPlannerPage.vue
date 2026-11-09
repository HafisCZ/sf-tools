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
        <SFButton variant="outline" :disabled="isEmpty" @click="resetPlan">{{ localize('reset') }}</SFButton>
        <SFTooltip :content="localize('import')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('import')" @click="importPlan">
            <SFIcon name="upload" />
          </SFButton>
        </SFTooltip>
        <SFTooltip :content="localize('export')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('export')" :disabled="isEmpty" @click="exportPlan">
            <SFIcon name="download" />
          </SFButton>
        </SFTooltip>
        <SFTooltip :content="localize('copy_image')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('copy_image')" :disabled="isCopying ? 'loading' : isEmpty" @click="copy">
            <SFIcon name="file-image" badge="copy-solid" />
          </SFButton>
        </SFTooltip>
        <SFTooltip :content="localize('save_image')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('save_image')" :disabled="isSaving ? 'loading' : isEmpty" @click="save">
            <SFIcon name="file-image" badge="arrow-down" />
          </SFButton>
        </SFTooltip>
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
import SFIcon from '@library/SFIcon.vue'
import SFNumber from '@library/SFNumber.vue'
import SFTabs from '@library/SFTabs.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { createCanvas, getGridHeight, type CanvasGrid, type CanvasGridCell, type CanvasGridColumn, type CanvasGridLine, type CanvasGridRow } from '@utils/canvas'
import { type SelectOption } from '@utils/components'
import { useFilePicker } from '@utils/dialogs'
import { formatNamedNumber, formatSpacedNumber } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { useErrorToast, useSuccessToast } from '@utils/toasts'
import { sum, useSubmit } from '@utils/utils'
import { validationError } from '@utils/validations'
import { Exporter } from '~/core/exporter'
import { type PlayerModel } from '~/core/models/player'
import { SELF_PROFILE } from '~/core/profiles'
import { DatabaseManager } from '~/data/database-manager'
import StatisticsIntegration from '~/integration/StatisticsIntegration.vue'
import { createPlan, formatBuildTime, FORTRESS_PLANNER, getBuildingPicture, getGemRuns, getSkipCost, getStartLevels, normalizePlan, notifyRemovedSteps, PLANNER_CONFIGS, pruneSteps, simulate, UNDERWORLD_PLANNER } from '~/pages/build-planner/build-planner'
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

const isEmpty = computed(() => plan.value.steps.length === 0 && plan.value.levels.every((level) => !level))

const { submit: readPlan } = useSubmit(
  async (file: File) => {
    const imported = JSON.parse(await file.text()) as PlannerPlan & { kind: string }

    if (imported.kind !== tab.value) {
      const known = imported.kind === 'fortress' || imported.kind === 'underworld'

      useErrorToast(localize('import_error.title'), known ? localize('import_error.tab', { tab: localize(`tab.${imported.kind}`) }) : localize('import_error.message'))
      return
    }

    const loaded = normalizePlan(config.value, { levels: imported.levels, steps: imported.steps })
    const steps = pruneSteps(config.value, loaded)

    notifyRemovedSteps(loaded.steps.length - steps.length)

    plans.value[tab.value] = { ...loaded, steps }
  },
  () => ({ title: localize('import_error.title'), message: localize('import_error.message') })
)

const { submit: save, isSubmitting: isSaving } = useSubmit(async () => {
  Exporter.png(await drawPlan(), `build_planner_${tab.value}_${Exporter.time}`)
})

const { submit: copy, isSubmitting: isCopying } = useSubmit(async () => {
  // Safari only allows the clipboard write if it starts within the click, so the image goes in as a promise
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': drawPlan() })])

  useSuccessToast(localize('copy_image_toast.title'), localize('copy_image_toast.message'))
})

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

  const fortressLevels = [fortress.Fortress, fortress.LaborerQuarters, fortress.WoodcutterGuild, fortress.Quarry, fortress.GemMine, fortress.Academy, fortress.ArcheryGuild, fortress.Barracks, fortress.MageTower, fortress.Treasury, fortress.Smithy, fortress.Fortifications, fortress.Knights ?? 0]
  const underworldLevels = [fortress.LaborerQuarters, underworld?.Heart, underworld?.Gate, underworld?.GoldPit, underworld?.Extractor, underworld?.GoblinPit, underworld?.Torture, fortress.Gladiator, underworld?.TrollBlock, underworld?.TimeMachine, underworld?.Keeper].map((level) => level ?? 0)

  plans.value = {
    fortress: normalizePlan(FORTRESS_PLANNER, { levels: fortressLevels, steps: [] }),
    underworld: normalizePlan(UNDERWORLD_PLANNER, { levels: underworldLevels, steps: [] })
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

function importPlan() {
  useFilePicker({ accept: '.json', callback: (files) => void readPlan(files[0]) })
}

function exportPlan() {
  Exporter.json({ kind: tab.value, levels: plan.value.levels, steps: plan.value.steps }, `build_planner_${tab.value}_${Exporter.time}`)
}

async function drawPlan() {
  const text = 'rgba(255, 255, 255, 0.9)'
  const muted = 'rgba(255, 255, 255, 0.5)'
  const heading = 'rgba(255, 255, 255, 0.6)'

  const buildings = config.value.buildings
  const resources = config.value.resources
  const rows = simulate(config.value, plan.value).rows
  const gemRuns = getGemRuns(rows)
  const startLevels = getStartLevels(config.value, plan.value)

  // With the 4px column gap, detail columns 2px wider than on the page land where the page has them
  const detailWidths = [...resources.map(() => 138), 74, 84]
  const columnCount = buildings.length + 1 + detailWidths.length
  const mushroom = { image: '/res/mushroom.png', width: 14, height: 14 }

  const body: CanvasGrid = {
    columns: [...buildings.map((): CanvasGridColumn => ({ width: 84, align: 'center', background: 'rgba(255, 255, 255, 0.05)' })), { width: 10 }, ...detailWidths.map((width): CanvasGridColumn => ({ width }))],
    columnGap: 4,
    // Under the header, which is always 16 + 131 + 8 tall since every name gets two lines
    padding: { top: 155, left: 16, right: 24, bottom: 16 },
    divider: 'rgba(255, 255, 255, 0.05)',
    rows: rows.map((row): CanvasGridRow => {
      const tracks = buildings.map((building, index): CanvasGridCell | null => {
        const run = index === config.value.gemMine ? gemRuns.get(row.index) : undefined

        if (index === row.building) {
          const badge: CanvasGridLine = { height: 13, padding: 4, radius: 3, background: 'rgba(0, 0, 0, 0.65)', items: [{ text: String(row.level), font: 'bold 10px Lato', color: row.block ? '#f87171' : '#ffffff' }] }

          return { lines: [{ height: 63, items: [{ image: getBuildingPicture(config.value, index, Math.min(row.level, building.pictures)), width: 84, height: 63, badge }] }] }
        }

        if (run) {
          return {
            rowSpan: run.rows,
            inset: 2,
            radius: 4,
            background: 'rgba(116, 212, 255, 0.18)',
            border: 'rgba(116, 212, 255, 0.35)',
            lines: [
              {
                height: 20,
                gap: 4,
                items: [
                  { image: '/res/gem1.png', width: 14, height: 14 },
                  { text: `+${formatSpacedNumber(run.gems)}`, font: 'bold 13px Lato', color: '#ffffff' }
                ]
              }
            ]
          }
        }

        return null
      })

      if (row.block) return { padding: { top: 3, bottom: 3 }, cells: tracks }

      return {
        padding: { top: 3, bottom: 3 },
        cells: [
          ...tracks,
          null,
          ...resources.map((resource, index): CanvasGridCell => ({
            lines: [
              {
                height: 20,
                gap: 4,
                items: [
                  { image: `/res/buildings/${resource.key}.webp`, width: 16, height: 14 },
                  { text: row.cost[index] > 0 ? formatNamedNumber(row.cost[index]) : '-', font: '13px Lato', color: text },
                  ...(row.discount[index] >= 1 ? [{ text: `-${formatNamedNumber(Math.round(row.discount[index]))}`, font: '12px Lato', color: muted }] : [])
                ]
              },
              { height: 16, padding: 20, items: [{ text: formatNamedNumber(row.total[index]), font: '12px Lato', color: muted }] }
            ]
          })),
          {
            lines: [
              { height: 20, items: [{ text: row.duration > 0 ? formatBuildTime(row.duration) : '-', font: '13px Lato', color: row.skipped ? 'rgba(255, 255, 255, 0.4)' : text, strike: row.skipped }] },
              { height: 16, items: [{ text: formatBuildTime(row.end), font: '12px Lato', color: muted }] }
            ]
          },
          row.duration > 0
            ? {
                lines: [
                  { height: 22, gap: 8, padding: 13, radius: 6, background: row.skipped ? '#ffa500' : undefined, items: [mushroom, { text: formatSpacedNumber(getSkipCost(row.duration)), font: 'bold 12px Lato', color: row.skipped ? '#000000' : text }] },
                  { height: 16, gap: 8, padding: 13, items: [mushroom, { text: formatSpacedNumber(row.mushrooms), font: '12px Lato', color: muted }] }
                ]
              }
            : null
        ]
      }
    })
  }

  const canvas = await createCanvas({
    width: 16 + buildings.length * 84 + 10 + sum(detailWidths) + 4 * (columnCount - 1) + 24,
    height: getGridHeight(body),
    background: '#141414',
    fonts: ['12px Lato', '13px Lato', 'bold 10px Lato', 'bold 12px Lato', 'bold 13px Lato', 'bold 14px Lato', 'bold 16px Lato'],
    images: [
      ...buildings.map((building, index) => getBuildingPicture(config.value, index, Math.min(startLevels[index], building.pictures))),
      ...rows.map((row) => getBuildingPicture(config.value, row.building, Math.min(row.level, buildings[row.building].pictures))),
      ...resources.map((resource) => `/res/buildings/${resource.key}.webp`),
      '/res/mushroom.png',
      '/res/gem1.png'
    ]
  })

  // Built after the canvas, wrapping the names needs measureText
  const header: CanvasGrid = {
    columns: [...buildings.map((): CanvasGridColumn => ({ width: 84, align: 'center' })), { width: 10 }, ...detailWidths.map((width): CanvasGridColumn => ({ width, align: 'center' }))],
    columnGap: 4,
    padding: { top: 16, left: 16, right: 24, bottom: 8 },
    rows: [
      {
        cells: [
          ...buildings.map((building, index): CanvasGridCell => {
            const words: string[] = []

            for (const word of localize.global(building.name).split(' ')) {
              const last = words.at(-1)

              if (last !== undefined && canvas.measureText(`${last} ${word}`, 'bold 14px Lato') <= 84) {
                words[words.length - 1] = `${last} ${word}`
              } else {
                words.push(word)
              }
            }

            return {
              lines: [
                { height: 63, items: [{ image: getBuildingPicture(config.value, index, Math.min(startLevels[index], building.pictures)), width: 84, height: 63 }] },
                { height: 4, items: [] },
                ...[words.slice(0, -1).join(' '), words.at(-1) ?? ''].map((name): CanvasGridLine => ({ height: 20, items: [{ text: name, font: 'bold 14px Lato', color: '#ffffff' }] })),
                { height: 2, items: [] },
                { height: 22, items: [{ text: String(startLevels[index]), font: 'bold 16px Lato', color: heading }] }
              ]
            }
          }),
          null,
          ...[...resources.map((resource) => localize.global(`general.${resource.key}`)), localize('build'), localize('skip')].map((label): CanvasGridCell => ({
            lines: [
              { height: 109, items: [] },
              { height: 22, items: [{ text: label, font: 'bold 12px Lato', color: heading }] }
            ]
          }))
        ]
      }
    ]
  }

  canvas.drawGrid(header)
  canvas.drawGrid(body)

  return canvas.toBlob()
}
</script>
