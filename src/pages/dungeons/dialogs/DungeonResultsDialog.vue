<template>
  <SFDialog :title="localize('results')" size="sm" :width="showMushrooms ? '660px' : undefined" height="80vh" column gap="14px" close-via-button buttons-bar @close="emit('close')">
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
    <div v-if="props.experience > 0" class="shrink-0 text-center font-bold text-[lightgray]">{{ localize('experience', { experience: formatSpacedNumber(props.experience) }) }}</div>
    <DungeonChart :result="activeResult" :decimals="props.decimals" class="h-[14em] shrink-0 border-b border-line pb-2" />
    <div ref="list-ref" class="min-h-0 overflow-y-auto">
      <div class="flex items-center gap-3 pb-1 pl-2 text-xs font-bold text-white/50">
        <span class="flex-1" />
        <span class="w-[22%] text-center">{{ localize('win_chance') }}</span>
        <span v-if="showMushrooms" class="w-[26%] text-center">{{ localize('mushrooms') }}</span>
      </div>
      <div v-for="(result, index) in props.results" :key="index" tabindex="0" class="flex items-center gap-3 py-2 pl-2 outline-none" :class="{ 'bg-white/5': index === activeIndex }" @mouseenter="activeIndex = index" @focus="activeIndex = index">
        <img :src="getClassImageUrl(result.boss.class ?? props.playerClass)" alt="" class="size-[2.5em]" />
        <div class="min-w-0 flex-1" :class="{ 'text-[#dec0ff]': result.dungeon.companions }">
          <div class="text-[80%]">
            {{ getDungeonName(result.dungeon) }}<span v-if="result.boss.runes" class="text-white/50"> · {{ formatRunes(result.boss.runes) }}</span>
          </div>
          <div>#{{ result.boss.pos }} - {{ getBossName(result) }}</div>
        </div>
        <div class="w-[22%] text-center">{{ formatChance(result) }}</div>
        <div v-if="showMushrooms" class="flex w-[26%] items-center justify-center gap-1.5">
          <template v-if="result.score > 0">
            <img src="/res/mushroom.png" alt="" class="size-[1em]" />
            <span>{{ formatMushroomRange(result) }}</span>
          </template>
          <template v-else>-</template>
        </div>
      </div>
    </div>

    <template #buttons>
      <SFCheckbox :model-value="showMushrooms" :label="localize('show_mushrooms')" @update:model-value="toggleMushrooms" />
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFCheckbox from '@library/SFCheckbox.vue'
import SFDialog from '@library/SFDialog.vue'
import SFIcon from '@library/SFIcon.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { createCanvas, type CanvasDrawing } from '@utils/canvas'
import { formatSpacedNumber } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { useSuccessToast } from '@utils/toasts'
import { getClassImageUrl, useSubmit } from '@utils/utils'
import { Exporter } from '~/core/exporter'
import { formatMushrooms } from '~/pages/dungeon-break/dungeon-break'
import { formatRunes, getBossName, getDungeonExperience, getDungeonName, getDungeonTries, type DungeonResult } from '~/sim/data/dungeons'
import DungeonChart from '../components/DungeonChart.vue'

defineOptions({
  name: 'DungeonResultsDialog'
})

const props = defineProps<{
  /**
   * Results in the order they are listed
   */
  results: DungeonResult[]
  /**
   * Total experience of all listed bosses, hidden when 0
   */
  experience: number
  /**
   * Class shown for bosses that copy the player
   */
  playerClass: CharacterClass
  /**
   * Decimal places of the win chances
   */
  decimals: number
  /**
   * Shows the mushroom column when the dialog opens
   */
  showMushrooms: boolean
}>()

const emit = defineEmits<{
  close: []
  toggleMushrooms: [shown: boolean]
}>()

const MUTED_COLOR = 'rgba(255, 255, 255, 0.5)'
const MUSHROOM_URL = '/res/mushroom.png'
const NAME_HEIGHT = 11.2 * 1.625
const LINE_HEIGHT = 14 * 1.625
const ROW_HEIGHT = 8 + NAME_HEIGHT + LINE_HEIGHT + 8
const HEADER_TOP = 8

const localize = useLocalize('dungeons')

const activeIndex = ref(0)

const showMushrooms = ref(props.showMushrooms)

const listElement = useTemplateRef('list-ref')

const activeResult = computed(() => props.results.at(activeIndex.value) ?? null)

const { submit: save, isSubmitting: isSaving } = useSubmit(async () => {
  if (!listElement.value) return

  Exporter.download(`dungeons_${Date.now()}.png`, await drawResults(listElement.value.clientWidth))
})

const { submit: copy, isSubmitting: isCopying } = useSubmit(async () => {
  if (!listElement.value) return

  // Safari only allows the clipboard write if it starts within the click, so the image goes in as a promise
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': drawResults(listElement.value.clientWidth) })])

  useSuccessToast(localize('copy_image_toast.title'), localize('copy_image_toast.message'))
})

const ROWS_TOP = HEADER_TOP + 20

async function drawResults(width: number) {
  const columns = getImageColumns(width)

  const canvas = await createCanvas({
    width,
    height: ROWS_TOP + props.results.length * ROW_HEIGHT,
    background: '#0b0c0c',
    fonts: ['14px Lato', 'bold 12px Lato'],
    images: [MUSHROOM_URL, ...props.results.map(({ boss }) => getClassImageUrl(boss.class ?? props.playerClass))]
  })

  drawImageHeader(canvas, columns)

  for (const [index, result] of props.results.entries()) {
    drawImageRow(canvas, columns, result, ROWS_TOP + index * ROW_HEIGHT)
  }

  return canvas.toBlob()
}

function getImageColumns(width: number) {
  const chanceWidth = 0.22 * (width - 8)
  const mushroomWidth = 0.26 * (width - 8)
  const chanceRight = showMushrooms.value ? width - mushroomWidth - 12 : width

  return {
    chance: { x: chanceRight - chanceWidth, width: chanceWidth },
    mushroom: showMushrooms.value ? { x: width - mushroomWidth, width: mushroomWidth } : null
  }
}

type ImageColumns = ReturnType<typeof getImageColumns>

function drawImageHeader(canvas: CanvasDrawing, { chance, mushroom }: ImageColumns) {
  const label = { top: HEADER_TOP, lineHeight: 16, font: 'bold 12px Lato', color: MUTED_COLOR, align: 'center' } as const

  canvas.drawText(localize('win_chance'), { ...label, x: chance.x + chance.width / 2 })

  if (mushroom) {
    canvas.drawText(localize('mushrooms'), { ...label, x: mushroom.x + mushroom.width / 2 })
  }
}

const TEXT_COLOR = 'rgba(255, 255, 255, 0.9)'

function drawImageRow(canvas: CanvasDrawing, { chance, mushroom }: ImageColumns, result: DungeonResult, top: number) {
  const textX = 8 + 35 + 12
  const color = result.dungeon.companions ? '#dec0ff' : TEXT_COLOR
  const name = { x: textX, top: top + 8, lineHeight: NAME_HEIGHT, font: '11.2px Lato' }
  const line = { top: top + (ROW_HEIGHT - LINE_HEIGHT) / 2, lineHeight: LINE_HEIGHT, font: '14px Lato', color: TEXT_COLOR }

  canvas.drawImage(getClassImageUrl(result.boss.class ?? props.playerClass), 8, top + (ROW_HEIGHT - 35) / 2, 35, 35)

  const nameWidth = canvas.drawText(getDungeonName(result.dungeon), { ...name, color })

  if (result.boss.runes) {
    canvas.drawText(` · ${formatRunes(result.boss.runes)}`, { ...name, x: textX + nameWidth, color: MUTED_COLOR })
  }

  canvas.drawText(`#${result.boss.pos} - ${getBossName(result)}`, { x: textX, top: top + 8 + NAME_HEIGHT, lineHeight: LINE_HEIGHT, font: '14px Lato', color })
  canvas.drawText(formatChance(result), { ...line, x: chance.x + chance.width / 2, align: 'center' })

  if (!mushroom) return

  if (result.score > 0) {
    const range = formatMushroomRange(result)
    const left = mushroom.x + (mushroom.width - 14 - 6 - canvas.measureText(range, line.font)) / 2

    canvas.drawImage(MUSHROOM_URL, left, line.top + (LINE_HEIGHT - 14) / 2, 14, 14)
    canvas.drawText(range, { ...line, x: left + 14 + 6 })
  } else {
    canvas.drawText('-', { ...line, x: mushroom.x + mushroom.width / 2, align: 'center' })
  }
}

function formatChance({ score, iterations }: DungeonResult) {
  return score === 0 ? localize.global('pets.bulk.not_possible') : `${((100 * score) / iterations).toFixed(props.decimals)}%`
}

function toggleMushrooms(shown: boolean) {
  showMushrooms.value = shown

  emit('toggleMushrooms', shown)
}

// Fire, cold and lightning resistance, in the order of DungeonRunes.res
const RESISTANCE_RUNES = [6, 7, 8]

function saveCSV() {
  const headers = [
    localize('csv.dungeon'),
    localize('csv.position'),
    localize('csv.enemy'),
    localize('csv.level'),
    localize('csv.class'),
    localize('csv.companions'),
    localize('csv.damage_rune'),
    localize('csv.damage_rune_value'),
    ...RESISTANCE_RUNES.map((type) => localize.global(`general.rune${type}`)),
    localize('csv.win_rate'),
    localize('csv.wins'),
    localize('csv.tries'),
    localize('csv.experience'),
    localize('csv.mushrooms_average'),
    localize('csv.mushrooms_certain')
  ]

  const rows = props.results.map((result) => {
    const { dungeon, boss, score, iterations } = result
    const runes = boss.runes
    const experience = getDungeonExperience(result)

    return [
      getDungeonName(dungeon),
      boss.pos,
      getBossName(result),
      boss.level,
      localize.global(`general.class${boss.class ?? props.playerClass}`),
      localize.global(dungeon.companions ? 'general.yes' : 'general.no'),
      runes ? localize.global(`general.rune${runes.type - 30}`) : '',
      runes ? runes.damage : '',
      ...RESISTANCE_RUNES.map((_, index) => runes?.res?.[index] || ''),
      ((100 * score) / iterations).toFixed(props.decimals),
      score,
      iterations,
      experience > 0 ? Math.trunc(experience) : '',
      ...(score > 0 ? getMushroomRange(result) : ['', ''])
    ]
  })

  Exporter.csv([headers, ...rows].map((row) => JSON.stringify(row).slice(1, -1)).join('\n'), `dungeons_${Date.now()}`)
}

function getMushroomRange({ score, iterations }: DungeonResult) {
  const { average, certain } = getDungeonTries(score / iterations)

  return [Math.max(1, Math.round(average)), certain]
}

function formatMushroomRange(result: DungeonResult) {
  const [average, certain] = getMushroomRange(result).map((value) => (value > 9999 ? formatMushrooms(value) : formatSpacedNumber(value)))

  return average === certain ? average : `${average} - ${certain}`
}
</script>
