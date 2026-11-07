<template>
  <SFDialog :title="localize('results')" size="md" close-via-button @close="emit('close')">
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
      <SFTooltip :content="localize.global('stats.copy.csv')">
        <SFButton variant="ghost" icon :aria-label="localize.global('stats.copy.csv')" @click="saveCSV">
          <SFIcon name="file-excel" />
        </SFButton>
      </SFTooltip>
    </template>
    <div ref="list-ref">
      <div class="grid grid-cols-[3rem_minmax(0,1fr)_3rem_minmax(0,1fr)_22%] items-center gap-x-3 pb-1 pl-2 text-xs font-bold text-white/50">
        <span class="col-span-2">{{ localize('editor.pet') }}</span>
        <span class="col-span-2">{{ localize('editor.habitat_boss') }}</span>
        <span class="text-center">{{ localize('win_chance') }}</span>
      </div>
      <div v-for="(result, index) in props.results" :key="index" class="grid grid-cols-[3rem_minmax(0,1fr)_3rem_minmax(0,1fr)_22%] items-center gap-x-3 py-2.5 pl-2">
        <img :src="getPetImageUrl(result.pet)" alt="" class="size-12 object-contain" />
        <div class="min-w-0">
          <div class="text-xs">
            <span :class="PET_ELEMENTS[result.pet.Type].text">{{ localize(`types.${result.pet.Type}`) }}</span>
            <span class="text-white/50"> · {{ localize('details.level', { level: result.pet.Level }) }}</span>
          </div>
          <div class="truncate text-base">{{ getPetName(result.pet) }}</div>
        </div>
        <img :src="getPetImageUrl(result.boss)" alt="" class="size-12 object-contain" />
        <div class="min-w-0">
          <div class="text-xs text-white/50">{{ localize('details.boss', { position: result.boss.Pet + 1 }) }}</div>
          <div class="truncate text-base">{{ getPetName(result.boss) }}</div>
        </div>
        <div class="text-center text-base">{{ formatResult(result.chance) }}</div>
      </div>
    </div>
  </SFDialog>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import SFIcon from '@library/SFIcon.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { createCanvas, getGridHeight, type CanvasGrid, type CanvasGridCell, type CanvasGridRow } from '@utils/canvas'
import { useLocalize } from '@utils/localization'
import { useSuccessToast } from '@utils/toasts'
import { useSubmit } from '@utils/utils'
import { Exporter } from '~/core/exporter'
import { type SimulatorPet } from '~/sim/workers/pets'
import { formatPetChance, getMonsterId, getPetImageUrl, PET_ELEMENTS } from '../pets'

defineOptions({
  name: 'PetResultsDialog'
})

const props = defineProps<{
  /**
   * Win chance from 0 to 100 of each pet against its boss
   */
  results: {
    chance: number
    pet: SimulatorPet
    boss: SimulatorPet
  }[]
}>()

const emit = defineEmits<{
  close: []
}>()

const localize = useLocalize('pets')

const listElement = useTemplateRef('list-ref')

const { submit: save, isSubmitting: isSaving } = useSubmit(async () => {
  if (!listElement.value) return

  Exporter.download(`pets_${Date.now()}.png`, await drawResults(listElement.value.clientWidth))
})

const { submit: copy, isSubmitting: isCopying } = useSubmit(async () => {
  if (!listElement.value) return

  // Safari only allows the clipboard write if it starts within the click, so the image goes in as a promise
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': drawResults(listElement.value.clientWidth) })])

  useSuccessToast(localize('copy_image_toast.title'), localize('copy_image_toast.message'))
})

async function drawResults(width: number) {
  const text = 'rgba(255, 255, 255, 0.9)'
  const muted = 'rgba(255, 255, 255, 0.5)'
  const smallHeight = 16
  const lineHeight = 24

  const label = (content: string): CanvasGridCell => ({ lines: [{ height: 16, items: [{ text: content, font: 'bold 12px Lato', color: muted }] }] })
  const picture = (pet: SimulatorPet): CanvasGridCell => ({ lines: [{ height: 48, items: [{ image: getPetImageUrl(pet), width: 48, height: 48 }] }] })

  const grid: CanvasGrid = {
    columns: [{ width: 48 }, { width: 'fill' }, { width: 48 }, { width: 'fill' }, { width: '22%', align: 'center' }],
    columnGap: 12,
    padding: { top: 8, left: 8 },
    rows: [
      {
        cells: [label(localize('editor.pet')), null, label(localize('editor.habitat_boss')), null, label(localize('win_chance'))],
        padding: { bottom: 4 }
      },
      ...props.results.map(({ pet, boss, chance }): CanvasGridRow => ({
        padding: { top: 10, bottom: 10 },
        cells: [
          picture(pet),
          {
            lines: [
              {
                height: smallHeight,
                items: [
                  { text: localize(`types.${pet.Type}`), font: '12px Lato', color: PET_ELEMENTS[pet.Type].color },
                  { text: ` · ${localize('details.level', { level: pet.Level })}`, font: '12px Lato', color: muted }
                ]
              },
              { height: lineHeight, items: [{ text: getPetName(pet), font: '16px Lato', color: text }] }
            ]
          },
          picture(boss),
          {
            lines: [
              { height: smallHeight, items: [{ text: localize('details.boss', { position: boss.Pet + 1 }), font: '12px Lato', color: muted }] },
              { height: lineHeight, items: [{ text: getPetName(boss), font: '16px Lato', color: text }] }
            ]
          },
          { lines: [{ height: lineHeight, items: [{ text: formatResult(chance), font: '16px Lato', color: text }] }] }
        ]
      }))
    ]
  }

  const canvas = await createCanvas({
    width,
    height: getGridHeight(grid),
    background: '#0b0c0c',
    fonts: ['16px Lato', '12px Lato', 'bold 12px Lato'],
    images: props.results.flatMap(({ pet, boss }) => [getPetImageUrl(pet), getPetImageUrl(boss)])
  })

  canvas.drawGrid(grid)

  return canvas.toBlob()
}

function getPetName(pet: SimulatorPet) {
  return localize.global(`monsters.${getMonsterId(pet)}`)
}

function formatResult(chance: number) {
  return chance === 0 ? localize('bulk.not_possible') : formatPetChance(chance)
}

function saveCSV() {
  const headers = [
    localize('editor.type'),
    localize('editor.pet'),
    localize.global('editor.level'),
    localize('editor.pack.title'),
    localize('editor.at100.title'),
    localize('editor.at150.title'),
    localize('editor.at200.title'),
    localize.global('editor.gladiator'),
    localize('editor.habitat_boss'),
    localize('csv.position'),
    localize('csv.win_rate')
  ]

  const rows = props.results.map(({ pet, boss, chance }) => [localize(`types.${pet.Type}`), getPetName(pet), pet.Level, pet.Pack, pet.At100, pet.At150, pet.At200, pet.Gladiator, getPetName(boss), boss.Pet + 1, chance.toFixed(chance < 0.01 ? 5 : 2)])

  Exporter.csv([headers, ...rows].map((row) => JSON.stringify(row).slice(1, -1)).join('\n'), `pets_${Date.now()}`)
}
</script>
