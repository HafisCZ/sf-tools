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

const localize = useLocalize('dungeons')

const activeIndex = ref(0)

const showMushrooms = ref(props.showMushrooms)

const listElement = useTemplateRef('list-ref')

const activeResult = computed(() => props.results.at(activeIndex.value) ?? null)

const { submit: save, isSubmitting: isSaving } = useSubmit(async () => {
  if (!listElement.value) return

  const blob = await drawResults(listElement.value.clientWidth)

  if (blob) {
    Exporter.download(`dungeons_${Date.now()}.png`, blob)
  }
})

const { submit: copy, isSubmitting: isCopying } = useSubmit(async () => {
  if (!listElement.value) return

  // Safari only allows the clipboard write if it starts within the click, so the image goes in as a promise
  const image = drawResults(listElement.value.clientWidth).then((blob) => blob ?? Promise.reject(new Error('The image could not be created')))

  await navigator.clipboard.write([new ClipboardItem({ 'image/png': image })])

  useSuccessToast(localize('copy_image_toast.title'), localize('copy_image_toast.message'))
})

const TEXT_COLOR = 'rgba(255, 255, 255, 0.9)'
const MUTED_COLOR = 'rgba(255, 255, 255, 0.5)'
const MUSHROOM_URL = '/res/mushroom.png'

async function drawResults(width: number) {
  const urls = new Set([MUSHROOM_URL, ...props.results.map(({ boss }) => getClassImageUrl(boss.class ?? props.playerClass))])
  const images = new Map(
    await Promise.all(
      Array.from(urls, (url) => {
        const image = new Image()
        image.src = url

        return image.decode().then(
          () => [url, image] as const,
          () => [url, null] as const
        )
      })
    )
  )

  await Promise.all([document.fonts.load('14px Lato'), document.fonts.load('bold 12px Lato')])

  const paddingTop = 8
  const nameHeight = 11.2 * 1.625
  const lineHeight = 14 * 1.625
  const rowHeight = 8 + nameHeight + lineHeight + 8
  const textX = 8 + 35 + 12
  const mushroomWidth = 0.26 * (width - 8)
  const mushroomX = width - mushroomWidth
  const chanceWidth = 0.22 * (width - 8)
  const chanceX = (showMushrooms.value ? mushroomX - 12 : width) - chanceWidth
  const height = paddingTop + 20 + props.results.length * rowHeight
  const scale = window.devicePixelRatio

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width * scale)
  canvas.height = Math.ceil(height * scale)

  const context = canvas.getContext('2d')

  if (!context) return null

  context.scale(scale, scale)
  context.fillStyle = '#0b0c0c'
  context.fillRect(0, 0, width, height)

  const drawText = (text: string, x: number, top: number, boxHeight: number, font: string, color: string, align: CanvasTextAlign = 'left') => {
    context.font = font
    context.fillStyle = color
    context.textAlign = align

    const metrics = context.measureText(text)
    context.fillText(text, x, top + (boxHeight + metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2)

    return metrics.width
  }

  drawText(localize('win_chance'), chanceX + chanceWidth / 2, paddingTop, 16, 'bold 12px Lato', MUTED_COLOR, 'center')

  if (showMushrooms.value) {
    drawText(localize('mushrooms'), mushroomX + mushroomWidth / 2, paddingTop, 16, 'bold 12px Lato', MUTED_COLOR, 'center')
  }

  for (const [index, result] of props.results.entries()) {
    const top = paddingTop + 20 + index * rowHeight
    const lineTop = top + (rowHeight - lineHeight) / 2
    const color = result.dungeon.companions ? '#dec0ff' : TEXT_COLOR

    const icon = images.get(getClassImageUrl(result.boss.class ?? props.playerClass))

    if (icon) {
      context.drawImage(icon, 8, top + (rowHeight - 35) / 2, 35, 35)
    }

    const nameWidth = drawText(getDungeonName(result.dungeon), textX, top + 8, nameHeight, '11.2px Lato', color)

    if (result.boss.runes) {
      drawText(` · ${formatRunes(result.boss.runes)}`, textX + nameWidth, top + 8, nameHeight, '11.2px Lato', MUTED_COLOR)
    }

    drawText(`#${result.boss.pos} - ${getBossName(result)}`, textX, top + 8 + nameHeight, lineHeight, '14px Lato', color)
    drawText(formatChance(result), chanceX + chanceWidth / 2, lineTop, lineHeight, '14px Lato', TEXT_COLOR, 'center')

    if (!showMushrooms.value) continue

    if (result.score > 0) {
      const range = formatMushroomRange(result)

      context.font = '14px Lato'

      const left = mushroomX + (mushroomWidth - 14 - 6 - context.measureText(range).width) / 2
      const mushroom = images.get(MUSHROOM_URL)

      if (mushroom) {
        context.drawImage(mushroom, left, lineTop + (lineHeight - 14) / 2, 14, 14)
      }

      drawText(range, left + 14 + 6, lineTop, lineHeight, '14px Lato', TEXT_COLOR)
    } else {
      drawText('-', mushroomX + mushroomWidth / 2, lineTop, lineHeight, '14px Lato', TEXT_COLOR, 'center')
    }
  }

  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve))
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
