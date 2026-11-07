<template>
  <SFDialog :title="localize('results')" size="xl" height="80vh" column gap="14px" close-via-button @close="emit('close')">
    <template #actions>
      <SFTooltip :content="localize('copy_image')">
        <SFButton variant="ghost" icon :aria-label="localize('copy_image')" :disabled="isCopying && 'loading'" @click="copy">
          <SFIcon name="file-image" badge="copy-solid" />
        </SFButton>
      </SFTooltip>
      <SFTooltip :content="localize.global('stats.copy.image')">
        <SFButton variant="ghost" icon :aria-label="localize.global('stats.copy.image')" :disabled="isSaving && 'loading'" @click="save">
          <SFIcon name="file-image" badge="arrow-down" />
        </SFButton>
      </SFTooltip>
    </template>
    <SFSelect v-model="selected" :options="mapOptions" size="lg" class="shrink-0" />
    <div ref="table-ref" class="min-h-0 overflow-y-auto">
      <SFTable dense>
        <template #header>
          <SFTableRow>
            <SFTableHeader align="center">{{ localize.global('editor.level') }}</SFTableHeader>
            <SFTableHeader v-for="gladiator in table.gladiators" :key="gladiator" align="center">{{ localize('map.gladiator') }} {{ gladiator }}</SFTableHeader>
          </SFTableRow>
        </template>
        <SFTableRow v-for="row in table.rows" :key="row.level">
          <SFTableCell align="center" class="font-bold">{{ row.level }}</SFTableCell>
          <SFTableCell v-for="(chance, index) in row.chances" :key="index" align="center" :class="getTier(chance).cell">{{ formatMapChance(chance) }}</SFTableCell>
        </SFTableRow>
      </SFTable>
    </div>
    <div class="flex shrink-0 flex-wrap items-center gap-4 text-xs text-white/60">
      <span class="font-bold">{{ localize('win_chance') }}</span>
      <span v-for="tier in MAP_TIERS" :key="tier.label" class="inline-flex items-center gap-1.5">
        <span class="size-3 rounded-[3px]" :class="tier.swatch" />
        {{ localize(`map.legend.${tier.label}`) }}
      </span>
    </div>
  </SFDialog>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import SFIcon from '@library/SFIcon.vue'
import SFSelect from '@library/SFSelect.vue'
import SFTable from '@library/SFTable.vue'
import SFTableCell from '@library/SFTableCell.vue'
import SFTableHeader from '@library/SFTableHeader.vue'
import SFTableRow from '@library/SFTableRow.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { createCanvas, getGridHeight, type CanvasGrid, type CanvasGridCell, type CanvasGridColumn, type CanvasGridRow } from '@utils/canvas'
import { useLocalize } from '@utils/localization'
import { useSuccessToast } from '@utils/toasts'
import { useSubmit } from '@utils/utils'
import { Exporter } from '~/core/exporter'
import { type SimulatorPet } from '~/sim/workers/pets'
import { getMonsterId, getPetImageUrl, PET_ELEMENTS } from '../pets'

defineOptions({
  name: 'PetMapDialog'
})

const props = defineProps<{
  /**
   * Own pet the maps were generated for
   */
  pet: SimulatorPet
  /**
   * Maps to pick from, one per boss, with win chances from 0 to 100 by level minus one and gladiator level
   */
  maps: {
    boss: SimulatorPet
    data: (number[] | undefined)[]
  }[]
}>()

const emit = defineEmits<{
  close: []
}>()

const MAP_TIERS = [
  { min: 0, label: 'zero', cell: 'text-white/35', swatch: 'border border-white/25', background: undefined, color: 'rgba(255, 255, 255, 0.35)' },
  { min: 0.01, label: 'low', cell: 'bg-[#ffa34d]/16 text-[#ffc08a]', swatch: 'bg-[#ffc08a]', background: 'rgba(255, 163, 77, 0.16)', color: '#ffc08a' },
  { min: 5, label: 'medium', cell: 'bg-[#fae05a]/16 text-[#f5e08a]', swatch: 'bg-[#f5e08a]', background: 'rgba(250, 224, 90, 0.16)', color: '#f5e08a' },
  { min: 10, label: 'high', cell: 'bg-[#b9e864]/16 text-[#cdeb94]', swatch: 'bg-[#cdeb94]', background: 'rgba(185, 232, 100, 0.16)', color: '#cdeb94' },
  { min: 25, label: 'top', cell: 'bg-[#60d68c]/20 text-[#95e8b4]', swatch: 'bg-[#95e8b4]', background: 'rgba(96, 214, 140, 0.2)', color: '#95e8b4' }
]

const localize = useLocalize('pets')

const selected = ref(0)

const tableElement = useTemplateRef('table-ref')

const { submit: save, isSubmitting: isSaving } = useSubmit(async () => {
  const map = props.maps.at(selected.value)

  if (!tableElement.value || !map) return

  Exporter.download(`${getMapName(map.boss)}.png`, await drawMap(map.boss, tableElement.value.clientWidth))
})

const { submit: copy, isSubmitting: isCopying } = useSubmit(async () => {
  const map = props.maps.at(selected.value)

  if (!tableElement.value || !map) return

  // Safari only allows the clipboard write if it starts within the click, so the image goes in as a promise
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': drawMap(map.boss, tableElement.value.clientWidth) })])

  useSuccessToast(localize('copy_image_toast.title'), localize('copy_image_toast.message'))
})

const mapOptions = computed(() =>
  props.maps.map(({ boss }, index) => ({
    value: index,
    label: `#${boss.Pet + 1} - ${getPetName(boss)}`,
    image: getPetImageUrl(boss),
    description: localize('map.description', { pet: getPetName(props.pet), level: props.pet.Level })
  }))
)

// The worker leaves holes in the arrays, flatMap skips them
const table = computed(() => {
  const data = props.maps.at(selected.value)?.data ?? []

  return {
    gladiators: data.find((entry) => entry && entry.length > 0)?.flatMap((_, gladiator) => [gladiator]) ?? [],
    rows: data.flatMap((entry, level) => (entry ? [{ level: level + 1, chances: entry.flatMap((chance) => [chance]) }] : []))
  }
})

async function drawMap(boss: SimulatorPet, width: number) {
  const text = 'rgba(255, 255, 255, 0.9)'
  const muted = 'rgba(255, 255, 255, 0.6)'
  const lineHeight = 31

  const headerCell = (content: string): CanvasGridCell => ({ background: 'rgba(0, 0, 0, 0.15)', lines: [{ height: 46, items: [{ text: content, font: 'bold 14px Lato', color: text }] }] })

  const title: CanvasGrid = {
    columns: [{ width: 'fill' }],
    padding: { top: 8, left: 8 },
    rows: [
      {
        padding: { bottom: 12 },
        cells: [
          {
            lines: [
              {
                height: 32,
                gap: 10,
                items: [
                  { image: getPetImageUrl(props.pet), width: 32, height: 32 },
                  { text: getPetName(props.pet), font: 'bold 14px Lato', color: '#ffffff' },
                  { text: localize('details.level', { level: props.pet.Level }), font: '14px Lato', color: muted },
                  { text: localize('map.versus'), font: '14px Lato', color: muted },
                  { image: getPetImageUrl(boss), width: 32, height: 32 },
                  { text: `#${boss.Pet + 1} - ${getPetName(boss)}`, font: 'bold 14px Lato', color: '#ffffff' },
                  { text: localize(`types.${boss.Type}`), font: '14px Lato', color: PET_ELEMENTS[boss.Type].color }
                ]
              }
            ]
          }
        ]
      }
    ]
  }

  const grid: CanvasGrid = {
    columns: [{ width: 70, align: 'center' }, ...table.value.gladiators.map((): CanvasGridColumn => ({ width: 'fill', align: 'center' }))],
    padding: { top: getGridHeight(title), left: 8, right: 8, bottom: 8 },
    rows: [
      { cells: [headerCell(localize.global('editor.level')), ...table.value.gladiators.map((gladiator) => headerCell(`${localize('map.gladiator')} ${gladiator}`))] },
      ...table.value.rows.map(({ level, chances }): CanvasGridRow => ({
        cells: [
          { lines: [{ height: lineHeight, items: [{ text: String(level), font: 'bold 14px Lato', color: text }] }] },
          ...chances.map((chance): CanvasGridCell => {
            const tier = getTier(chance)

            return { background: tier.background, lines: [{ height: lineHeight, items: [{ text: formatMapChance(chance), font: '14px Lato', color: tier.color }] }] }
          })
        ]
      }))
    ]
  }

  const canvas = await createCanvas({
    width,
    height: getGridHeight(grid),
    background: '#1b1c1d',
    fonts: ['14px Lato', 'bold 14px Lato'],
    images: [getPetImageUrl(props.pet), getPetImageUrl(boss)]
  })

  canvas.drawGrid(title)
  canvas.drawGrid(grid)

  return canvas.toBlob()
}

function getTier(chance: number) {
  return MAP_TIERS.reduce((found, tier) => (chance >= tier.min ? tier : found))
}

function formatMapChance(chance: number) {
  return chance < 0.01 ? '-' : `${chance.toFixed(2)}%`
}

function getPetName(pet: SimulatorPet) {
  return localize.global(`monsters.${getMonsterId(pet)}`)
}

function getMapName(boss: SimulatorPet) {
  const { Pack, At100, At150, At200 } = props.pet

  return `${getPetLabel(props.pet)} (${Pack}, ${At100}, ${At150}, ${At200}) vs ${getPetLabel(boss)}`
}

function getPetLabel(pet: SimulatorPet) {
  return `${localize(`types.${pet.Type}`)} ${pet.Pet + 1} - ${getPetName(pet)}`
}
</script>
