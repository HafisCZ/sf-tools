<template>
  <Page>
    <div class="grid gap-7 md:grid-cols-2">
      <div class="flex flex-col gap-2">
        <div class="grid grid-cols-2 gap-[14px] rounded-md border border-line bg-surface p-2">
          <SFNumber ref="warrior-count-ref" v-model="warriorCount" :label="localize('warrior_count')" placeholder="1 - 45" required :min="1" :max="45" :step="1" centered />
          <SFSelect ref="warrior-level-ref" v-model="warriorLevel" :label="localize('warrior_level')" :options="WARRIOR_LEVEL_OPTIONS" />
        </div>
        <div class="flex flex-col gap-[14px] rounded-md border border-line bg-surface p-2">
          <SFSelect ref="fortifications-ref" v-model="fortificationsLevel" :label="localize.global('stats.player.fortress.building12')" :options="fortificationsOptions" />
          <div class="grid grid-cols-2 gap-[14px]">
            <SFNumber ref="archer-count-ref" v-model="archerCount" :label="localize('archer_count')" placeholder="0 - 30" :min="0" :max="30" :step="1" centered />
            <SFSelect ref="archer-level-ref" v-model="archerLevel" :label="localize('archer_level')" :options="ARCHER_LEVEL_OPTIONS" />
          </div>
          <div class="grid grid-cols-2 gap-[14px]">
            <SFNumber ref="mage-count-ref" v-model="mageCount" :label="localize('mage_count')" placeholder="0 - 15" :min="0" :max="15" :step="1" centered />
            <SFSelect ref="mage-level-ref" v-model="mageLevel" :label="localize('mage_level')" :options="MAGE_LEVEL_OPTIONS" />
          </div>
        </div>
      </div>

      <div>
        <div class="grid grid-cols-16 items-center gap-[14px]">
          <div class="col-span-4 flex gap-2">
            <SFTooltip :content="localize.global('simulator.add')">
              <SFButton variant="outline" class="flex-1" :aria-label="localize.global('simulator.add')" :disabled="!isEditorValid" @click="addSetup">
                <SFIcon name="plus" />
              </SFButton>
            </SFTooltip>
            <SFTooltip :content="localize.global('simulator.save')">
              <SFButton variant="outline" class="flex-1" :aria-label="localize.global('simulator.save')" :disabled="selectedIndex < 0 || !isEditorValid" @click="saveSetup">
                <SFIcon name="floppy-disk" />
              </SFButton>
            </SFTooltip>
          </div>
          <SimulatorSettings ref="settings-ref" storage-key="fortress_sim" :default-threads="4" :default-iterations="2500" class="col-span-7" />
          <SFButton variant="outline" block :disabled="isSimulating ? 'loading' : setups.length === 0 || !isSettingsValid" class="col-span-5" @click="simulate">
            {{ localize.global('simulator.simulate') }}
          </SFButton>
        </div>

        <SFTable fixed dense class="mt-[14px]">
          <template #header>
            <SFTableRow>
              <SFTableHeader align="center">{{ localize('warrior_count') }}</SFTableHeader>
              <SFTableHeader align="center">{{ localize.global('stats.player.fortress.building12') }}</SFTableHeader>
              <SFTableHeader align="center">{{ localize('archer_count') }}</SFTableHeader>
              <SFTableHeader align="center">{{ localize('mage_count') }}</SFTableHeader>
              <SFTableHeader align="center">{{ localize.global('simulator.win_chance') }}</SFTableHeader>
              <SFTableHeader class="w-12" />
            </SFTableRow>
          </template>
          <SFTableRow
            v-for="setup in setups"
            :key="setup.index"
            tabindex="0"
            class="cursor-pointer outline-none"
            :class="setup.index === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5 focus-visible:bg-white/5'"
            @click="(event: MouseEvent) => handleRowClick(event, setup)"
            @keydown="(event: KeyboardEvent) => handleRowKeydown(event, setup)"
          >
            <SFTableCell align="center">{{ formatUnits(setup.values.WarriorCount, setup.values.WarriorLevel, FORTRESS_WARRIOR_MAP) }}</SFTableCell>
            <SFTableCell align="center">{{ setup.values.FortificationsLevel > 0 ? FORTRESS_WALL_MAP[setup.values.FortificationsLevel].level : '' }}</SFTableCell>
            <SFTableCell align="center">{{ formatUnits(setup.values.ArcherCount, setup.values.ArcherLevel, FORTRESS_ARCHER_MAP) }}</SFTableCell>
            <SFTableCell align="center">{{ formatUnits(setup.values.MageCount, setup.values.MageLevel, FORTRESS_MAGE_MAP) }}</SFTableCell>
            <SFTableCell align="center">{{ setup.score === null ? '' : `${(100 * setup.score).toFixed(2)}%` }}</SFTableCell>
            <SFTableCell align="center">
              <SFButton variant="ghost" size="sm" icon class="hover:text-red-400 focus-visible:text-red-400" @click="removeSetup(setup)">
                <SFIcon name="trash-can" />
              </SFButton>
            </SFTableCell>
          </SFTableRow>
        </SFTable>
      </div>
    </div>

    <template #footer-right>
      <FooterLink icon="message" @click="openFeedback">
        {{ localize.global('index.footer.report') }}
      </FooterLink>
      <FooterLink icon="basket-shopping" href="https://home.sfgame.net">
        <span v-html="localize.global('index.footer.webshop#')" />
      </FooterLink>
      <FooterCopyright />
    </template>
  </Page>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFIcon from '@library/SFIcon.vue'
import SFNumber from '@library/SFNumber.vue'
import SFSelect from '@library/SFSelect.vue'
import SFTable from '@library/SFTable.vue'
import SFTableCell from '@library/SFTableCell.vue'
import SFTableHeader from '@library/SFTableHeader.vue'
import SFTableRow from '@library/SFTableRow.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { useDialog } from '@utils/dialogs'
import { useLocalize } from '@utils/localization'
import { useToast } from '@utils/toasts'
import { formatDuration, useSubmit } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import FeedbackDialog from '~/dialogs/FeedbackDialog.vue'
import FooterCopyright from '~/pages/components/FooterCopyright.vue'
import FooterLink from '~/pages/components/FooterLink.vue'
import Page from '~/pages/Page.vue'
import SimulatorSettings from '~/sim/components/SimulatorSettings.vue'
import { createFortressBattle, FORTRESS_ARCHER_MAP, FORTRESS_MAGE_MAP, FORTRESS_WALL_MAP, FORTRESS_WARRIOR_MAP, type FortressUnit, type FortressValues } from '~/sim/data/fortress'
import { WorkerBatch } from '~/sim/workers'

defineOptions({
  name: 'FortressPage'
})

type Setup = {
  values: FortressValues
  index: number
  // 0 to 1
  score: number | null
}

const WARRIOR_LEVEL_OPTIONS = toLevelOptions(FORTRESS_WARRIOR_MAP)
const ARCHER_LEVEL_OPTIONS = toLevelOptions(FORTRESS_ARCHER_MAP)
const MAGE_LEVEL_OPTIONS = toLevelOptions(FORTRESS_MAGE_MAP)

const localize = useLocalize('fortress')

const warriorCount = ref<number | null>(null)
const warriorLevel = ref('0')
const fortificationsLevel = ref('0')
const archerCount = ref<number | null>(null)
const archerLevel = ref('0')
const mageCount = ref<number | null>(null)
const mageLevel = ref('0')

const setups = ref<Setup[]>([])
const selectedIndex = ref(-1)

let nextIndex = 0

const settings = useTemplateRef('settings-ref')

const isEditorValid = useComponentValidation(useTemplateRef('warrior-count-ref'), useTemplateRef('warrior-level-ref'), useTemplateRef('fortifications-ref'), useTemplateRef('archer-count-ref'), useTemplateRef('archer-level-ref'), useTemplateRef('mage-count-ref'), useTemplateRef('mage-level-ref'))

const isSettingsValid = useComponentValidation(settings)

const { submit: simulate, isSubmitting: isSimulating } = useSubmit(runSimulation)

const fortificationsOptions = computed(() => Object.entries(FORTRESS_WALL_MAP).map(([id, unit]) => ({ value: id, label: `${id === '0' ? localize.global('editor.none') : id} - ${localize.global('editor.level')} ${unit.level}` })))

function toLevelOptions(map: Record<number, FortressUnit>) {
  return Object.entries(map).map(([id, unit]) => ({ value: id, label: String(unit.level) }))
}

function formatUnits(count: number, level: number, map: Record<number, FortressUnit>) {
  return count > 0 ? `${count} x ${map[level].level}` : ''
}

function readValues(): FortressValues {
  return {
    WarriorCount: warriorCount.value ?? 0,
    WarriorLevel: Number(warriorLevel.value),
    ArcherCount: archerCount.value ?? 0,
    ArcherLevel: Number(archerLevel.value),
    MageCount: mageCount.value ?? 0,
    MageLevel: Number(mageLevel.value),
    FortificationsLevel: Number(fortificationsLevel.value)
  }
}

function fillEditor(values: FortressValues) {
  warriorCount.value = values.WarriorCount
  warriorLevel.value = String(values.WarriorLevel)
  archerCount.value = values.ArcherCount
  archerLevel.value = String(values.ArcherLevel)
  mageCount.value = values.MageCount
  mageLevel.value = String(values.MageLevel)
  fortificationsLevel.value = String(values.FortificationsLevel)
}

function clearEditor() {
  fillEditor({ WarriorCount: 1, WarriorLevel: 0, ArcherCount: 0, ArcherLevel: 0, MageCount: 0, MageLevel: 0, FortificationsLevel: 0 })
}

function addSetup() {
  selectedIndex.value = nextIndex++

  setups.value.push({ values: readValues(), index: selectedIndex.value, score: null })
}

function saveSetup() {
  const setup = setups.value.find((item) => item.index === selectedIndex.value)

  if (setup) {
    setup.values = readValues()
    setup.score = null
  }
}

function selectSetup(setup: Setup) {
  selectedIndex.value = setup.index

  fillEditor(setup.values)
}

function removeSetup(setup: Setup) {
  setups.value = setups.value.filter((item) => item !== setup)

  if (setup.index === selectedIndex.value) {
    clearEditor()

    selectedIndex.value = -1
  }
}

function handleRowClick(event: MouseEvent, setup: Setup) {
  if (event.target instanceof Element && event.target.closest('button')) return

  selectSetup(setup)
}

function handleRowKeydown(event: KeyboardEvent, setup: Setup) {
  if (event.key === 'Enter' && event.target === event.currentTarget) {
    selectSetup(setup)
  }
}

async function runSimulation() {
  if (!settings.value) return

  const instances = Math.max(1, settings.value.threads || 4)
  const iterations = Math.max(1, settings.value.iterations || 2500)

  const collected: { score: number; index: number }[] = []
  const batch = new WorkerBatch<{ score: number; index: number }>('fortress')

  for (const { values, index } of setups.value) {
    batch.add(
      (data) => {
        collected.push(data)
      },
      {
        index,
        iterations,
        ...createFortressBattle(values)
      }
    )
  }

  const duration = await batch.run(instances)

  if (duration === null) return

  useToast({ title: localize.global('simulator.toast.title'), message: localize.global('simulator.toast.message', { duration: formatDuration(duration) }) })

  for (const { score, index } of collected) {
    const setup = setups.value.find((item) => item.index === index)

    if (setup) {
      setup.score = score
    }
  }
}

function openFeedback() {
  useDialog(FeedbackDialog, { tool: 'fortress' })
}
</script>
