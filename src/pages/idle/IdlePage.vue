<template>
  <Page>
    <StatisticsIntegration type="players" :profile="PROFILE" :scope="listIdlePlayers" @select="load" />

    <div class="grid grid-cols-16 items-center gap-[14px]">
      <SFToggleGroup ref="upgrade-mode-ref" v-model="upgradeMode" :options="UPGRADE_MODES" class="col-span-5" />
      <SFHeading level="1" class="col-span-6 text-center">{{ localize('title') }}</SFHeading>
      <SFSelect ref="suggest-mode-ref" v-model="suggestMode" :options="suggestOptions" class="col-span-3" />
      <SFSelect ref="number-mode-ref" v-model="numberMode" :options="numberOptions" class="col-span-2" />
    </div>

    <SFTable fixed dense class="mt-[14px]">
      <template #header>
        <SFTableRow>
          <SFTableHeader align="center">{{ localize('table.runes') }}</SFTableHeader>
          <SFTableHeader />
          <SFTableHeader align="center">{{ localize('table.money_spent') }}</SFTableHeader>
          <SFTableHeader align="center">{{ localize('table.money_1h') }}</SFTableHeader>
          <SFTableHeader align="center">{{ localize('table.money_8h') }}</SFTableHeader>
          <SFTableHeader align="center">{{ localize('table.money_1d') }}</SFTableHeader>
          <SFTableHeader align="center">{{ localize('table.money_7d') }}</SFTableHeader>
        </SFTableRow>
      </template>
      <SFTableRow>
        <SFTableCell>
          <SFNumber ref="runes-ref" v-model="runes" :placeholder="localize('table.runes')" :min="0" :step="1" />
        </SFTableCell>
        <SFTableCell>{{ results?.totals.runes }}</SFTableCell>
        <SFTableCell>{{ results?.totals.spent }}</SFTableCell>
        <SFTableCell>{{ results?.totals.hour }}</SFTableCell>
        <SFTableCell>{{ results?.totals.eightHours }}</SFTableCell>
        <SFTableCell>{{ results?.totals.day }}</SFTableCell>
        <SFTableCell>{{ results?.totals.week }}</SFTableCell>
      </SFTableRow>
    </SFTable>

    <SFTable fixed dense class="mt-[14px]">
      <template #header>
        <SFTableRow>
          <SFTableHeader align="center">{{ localize('table.building') }}</SFTableHeader>
          <SFTableHeader align="center">{{ localize('table.upgrades') }}</SFTableHeader>
          <SFTableHeader align="center" class="w-[8%]">{{ localize('table.level') }}</SFTableHeader>
          <SFTableHeader align="center" class="w-[8%]">{{ localize('table.level_next') }}</SFTableHeader>
          <SFTableHeader align="center">{{ localize('table.cycle_duration') }}</SFTableHeader>
          <SFTableHeader align="center">{{ localize('table.cycle_money') }}</SFTableHeader>
          <SFTableHeader align="center">{{ localize('table.money_share') }}</SFTableHeader>
          <SFTableHeader align="center">{{ localize('table.upgrade_money') }}</SFTableHeader>
          <SFTableHeader align="center">{{ localize('table.upgrade_estimation') }}</SFTableHeader>
        </SFTableRow>
      </template>
      <SFTableRow v-for="({ name }, index) in BUILDINGS" :key="name">
        <SFTableCell class="text-[105%] font-bold" :class="{ 'text-accent': results?.suggestedIndex === index }">{{ localize(`building.${name}`) }}</SFTableCell>
        <SFTableCell>
          <SFSelect ref="upgrades-ref" v-model="upgrades[index]" :options="upgradeOptions" />
        </SFTableCell>
        <SFTableCell>
          <SFNumber ref="levels-ref" v-model="levels[index]" :required="index === 0" :min="index === 0 ? 1 : 0" :max="25000" :step="1" />
        </SFTableCell>
        <template v-if="results">
          <SFTableCell :class="outputClasses">
            <button type="button" class="cursor-pointer" @click="applyNextLevel(index)">{{ results.rows[index].levelNext }}</button>
          </SFTableCell>
          <SFTableCell :class="outputClasses">{{ results.rows[index].cycleDuration }}</SFTableCell>
          <SFTableCell :class="outputClasses">{{ results.rows[index].cycleMoney }}</SFTableCell>
          <SFTableCell align="center" :class="outputClasses">{{ results.rows[index].moneyShare }}</SFTableCell>
          <SFTableCell :class="outputClasses">{{ results.rows[index].upgradeMoney }}</SFTableCell>
          <SFTableCell :class="outputClasses">{{ results.rows[index].upgradeEstimation }}</SFTableCell>
        </template>
        <SFTableCell v-else colspan="6" />
      </SFTableRow>
    </SFTable>
  </Page>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import SFHeading from '@library/SFHeading.vue'
import SFNumber from '@library/SFNumber.vue'
import SFSelect from '@library/SFSelect.vue'
import SFTable from '@library/SFTable.vue'
import SFTableCell from '@library/SFTableCell.vue'
import SFTableHeader from '@library/SFTableHeader.vue'
import SFTableRow from '@library/SFTableRow.vue'
import SFToggleGroup from '@library/SFToggleGroup.vue'
import { formatNamedNumber } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { useComponentValidation } from '@utils/validations'
import { type PlayerModel } from '~/core/models/player'
import { SELF_PROFILE } from '~/core/profiles'
import { DatabaseManager } from '~/data/database-manager'
import StatisticsIntegration from '~/integration/StatisticsIntegration.vue'
import Page from '~/pages/Page.vue'
import { BUILDINGS, Building, MULTIPLIERS } from '~/playa/idle'

defineOptions({
  name: 'IdlePage'
})

const PROFILE = SELF_PROFILE

const UPGRADE_MODES = [
  { value: '1', label: '1' },
  { value: '2', label: '10' },
  { value: '3', label: '25' },
  { value: '4', label: '100' },
  { value: '5', label: 'BP' }
]

const MAX_LEVEL = 25000

// One value per second of a day
const CURVE_LENGTH = 86401

const localize = useLocalize('idle')

const upgradeMode = ref<string | null>(null)
const suggestMode = ref('0')
const numberMode = ref('0')

const runes = ref<number | null>(0)
const levels = ref<(number | null)[]>(BUILDINGS.map((_, index) => (index === 0 ? 1 : 0)))
const upgrades = ref(BUILDINGS.map(() => '0'))

const isValid = useComponentValidation(useTemplateRef('upgrade-mode-ref'), useTemplateRef('suggest-mode-ref'), useTemplateRef('number-mode-ref'), useTemplateRef('runes-ref'), useTemplateRef('levels-ref'), useTemplateRef('upgrades-ref'))

const suggestOptions = computed(() => ['0', '1', '2'].map((value) => ({ value, label: localize(`topbar.suggest.${value}`) })))

const numberOptions = computed(() => ['0', '1'].map((value) => ({ value, label: localize(`topbar.number.${value}`) })))

const upgradeOptions = computed(() => ['0', '1', '2', '3', '4'].map((value) => ({ value, label: localize(`upgrades.${value}`) })))

const outputClasses = computed(() => ({ 'text-accent': upgradeMode.value !== null }))

const results = computed(() => {
  if (!isValid.value) return null

  const modeUpgrade = Number(upgradeMode.value ?? 0)
  const modeSuggest = Number(suggestMode.value)
  const runeCount = runes.value ?? 0
  const runeMultiplier = Math.trunc(1 + runeCount * 0.05)

  let moneySpent = 0
  let productionApproximate = 0
  let productionHourlyApproximate = 0
  const productionCurve = new Array<number>(CURVE_LENGTH).fill(0)

  let amortizationIndex = 0
  let amortizationValue = 0

  BUILDINGS.forEach(({ building }, index) => {
    const level = levels.value[index] ?? 0
    const boost = upgradeToModifiers(Number(upgrades.value[index]))

    moneySpent += building.getUpgradePrice(index === 0 ? 1 : 0, level)

    productionApproximate += runeMultiplier * boost.rate * building.getProductionRate(level)
    productionHourlyApproximate += runeMultiplier * boost.rate * building.getProductionRate(level) * 3600

    for (let i = 0; i < CURVE_LENGTH; i++) {
      productionCurve[i] += runeMultiplier * boost.money * building.getProductionReduced(level, i, boost.duration)
    }

    const amortization = building.getAmortisation(level, modeUpgrade > 0 && modeUpgrade < 5 ? MULTIPLIERS[modeUpgrade - 1] : 1) / boost.rate
    const amortizationBreakpoint = building.getBreakpointAmortisation(level) / boost.rate

    if (modeSuggest === 1) {
      if (index === 0 || (modeUpgrade < 5 && amortization < amortizationValue)) {
        amortizationIndex = index
        amortizationValue = amortization
      }
    } else if (modeSuggest === 2) {
      if (index === 0 || amortizationBreakpoint < amortizationValue) {
        amortizationIndex = index
        amortizationValue = amortizationBreakpoint
      }
    } else if (index === 0 || (modeUpgrade < 5 && amortization < amortizationValue) || amortizationBreakpoint < amortizationValue) {
      amortizationIndex = index
      amortizationValue = modeUpgrade < 5 ? Math.min(amortization, amortizationBreakpoint) : amortizationBreakpoint
    }
  })

  const rows = BUILDINGS.map(({ building }, index) => {
    const level = levels.value[index] ?? 0
    const boost = upgradeToModifiers(Number(upgrades.value[index]))

    let target = 0

    if (modeUpgrade === 5) {
      target = Math.min(MAX_LEVEL, Building.getBreakpointLevel(Building.getNearestBreakpoint(level) + 1))
    } else if (modeUpgrade > 0) {
      target = Math.min(MAX_LEVEL, level + MULTIPLIERS[modeUpgrade - 1])
    }

    let moneyShare
    let cycleMoney

    if (target) {
      moneyShare = `+${((100 * (building.getProductionRate(target) - building.getProductionRate(level)) * boost.rate * runeMultiplier) / productionApproximate).toFixed(1)}%`
      cycleMoney = `+${formatNumber(Math.trunc((building.getCycleProduction(target) - building.getCycleProduction(level)) * boost.money * runeMultiplier))}`
    } else {
      moneyShare = `${((100 * building.getProductionRate(level) * boost.rate * runeMultiplier) / productionApproximate).toFixed(1)}%`
      cycleMoney = formatNumber(building.getCycleProduction(level) * boost.money * runeMultiplier)
    }

    let upgradeMoney = ''
    let upgradeEstimation = ''

    if (level < MAX_LEVEL) {
      const upgradeCost = building.getUpgradePrice(level, target ? target - level : 1)
      upgradeMoney = formatNumber(upgradeCost)

      const estimationPrecise = productionCurve.findIndex((value) => value >= upgradeCost)
      const estimationApproximate = upgradeCost / productionApproximate

      if (estimationPrecise !== -1) {
        upgradeEstimation = getFormattedDuration(estimationPrecise)
      } else if (estimationApproximate < 604800) {
        upgradeEstimation = getFormattedDuration(estimationApproximate)
      } else {
        upgradeEstimation = '> 7D'
      }
    }

    return {
      levelNext: target || level,
      cycleDuration: getFormattedDuration(boost.duration * building.getCycleDuration(target || level)),
      cycleMoney,
      moneyShare,
      upgradeMoney,
      upgradeEstimation
    }
  })

  return {
    suggestedIndex: amortizationIndex,
    totals: {
      runes: formatNumber(runeCount),
      spent: formatNumber(moneySpent),
      hour: formatNumber(productionCurve[3600]),
      eightHours: formatNumber(productionCurve[28800]),
      day: formatNumber(productionCurve[86400]),
      week: formatNumber(168 * productionHourlyApproximate)
    },
    rows
  }
})

function getFormattedDuration(duration: number) {
  const seconds = Math.trunc(duration)

  const s = seconds % 60
  const m = ((seconds - (seconds % 60)) / 60) % 60
  const h = ((seconds - (seconds % 3600)) / 3600) % 24
  const d = (seconds - (seconds % 86400)) / 86400

  if (d) {
    return `${d}D ${h}H ${m}M ${s}S`
  } else if (h) {
    return `${h}H ${m}M ${s}S`
  } else if (m) {
    return `${m}M ${s}S`
  } else {
    return `${s}S`
  }
}

function formatNumber(value: number) {
  if (numberMode.value === '0' || value < 1e6) {
    return formatNamedNumber(Math.trunc(value))
  } else {
    return value.toExponential(3).replace('+', '')
  }
}

// Upgrade 0 none, 1 speed, 2 gold, 3 both, 4 platinum
function upgradeToModifiers(upgrade: number) {
  return {
    rate: Math.pow(2, upgrade - (upgrade > 1 ? 1 : 0)),
    duration: upgrade === 1 || upgrade > 2 ? 0.5 : 1,
    money: upgrade === 4 ? 4 : upgrade > 1 ? 2 : 1
  }
}

function applyNextLevel(index: number) {
  if (results.value) {
    levels.value[index] = results.value.rows[index].levelNext
  }
}

function listIdlePlayers() {
  return DatabaseManager.getLatestPlayers(true).filter((player) => player.Level >= 105 && player.Idle)
}

function load(player: PlayerModel) {
  const idle = player.Idle

  if (!idle) return

  const { Money: money, Speed: speed } = idle.Upgrades

  runes.value = idle.Runes
  upgrades.value = BUILDINGS.map((_, index) => String(money[index] === 3 ? 4 : money[index] === 1 && speed[index] === 1 ? 3 : money[index] === 1 ? 2 : speed[index] === 1 ? 1 : 0))
  levels.value = BUILDINGS.map((_, index) => (idle.Buildings ? idle.Buildings[index] : index === 0 ? 1 : 0))
}
</script>
