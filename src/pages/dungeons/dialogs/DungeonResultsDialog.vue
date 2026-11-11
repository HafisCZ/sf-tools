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
        <span v-if="showMushrooms" class="flex w-[26%] items-center justify-center gap-1">
          {{ localize('mushrooms') }}
          <SFTooltip>
            <SFIcon name="circle-question" />
            <template #content>
              <div>{{ localize('mushrooms_info.average') }}</div>
              <div>{{ localize('mushrooms_info.certain') }}</div>
            </template>
          </SFTooltip>
        </span>
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
import { createCanvas, getGridHeight, type CanvasGrid, type CanvasGridItem, type CanvasGridRow } from '@utils/canvas'
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
  /**
   * Background of the saved and copied image
   */
  imageBackground: 'dark' | 'white'
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

  Exporter.download(`dungeons_${Date.now()}.png`, await drawResults(listElement.value.clientWidth))
})

const { submit: copy, isSubmitting: isCopying } = useSubmit(async () => {
  if (!listElement.value) return

  // Safari only allows the clipboard write if it starts within the click, so the image goes in as a promise
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': drawResults(listElement.value.clientWidth) })])

  useSuccessToast(localize('copy_image_toast.title'), localize('copy_image_toast.message'))
})

async function drawResults(width: number) {
  const colors = {
    dark: { background: '#0b0c0c', text: 'rgba(255, 255, 255, 0.9)', muted: 'rgba(255, 255, 255, 0.5)', companions: '#dec0ff' },
    white: { background: '#ffffff', text: 'rgba(0, 0, 0, 0.9)', muted: 'rgba(0, 0, 0, 0.5)', companions: 'purple' }
  }[props.imageBackground]
  const mushroomUrl = '/res/mushroom.png'
  const nameHeight = 11.2 * 1.625
  const lineHeight = 14 * 1.625
  const labels = [localize('win_chance'), ...(showMushrooms.value ? [localize('mushrooms')] : [])]

  const grid: CanvasGrid = {
    columns: [{ width: 35 }, { width: 'fill' }, { width: '22%', align: 'center' }, ...(showMushrooms.value ? [{ width: '26%', align: 'center' } as const] : [])],
    columnGap: 12,
    padding: { top: 8, left: 8 },
    rows: [
      {
        cells: [null, null, ...labels.map((text) => ({ lines: [{ height: 16, items: [{ text, font: 'bold 12px Lato', color: colors.muted }] }] }))],
        padding: { bottom: 4 }
      },
      ...props.results.map((result): CanvasGridRow => {
        const color = result.dungeon.companions ? colors.companions : colors.text
        const name: CanvasGridItem[] = [{ text: getDungeonName(result.dungeon), font: '11.2px Lato', color }]
        const range: CanvasGridItem = { text: result.score > 0 ? formatMushroomRange(result) : '-', font: '14px Lato', color: colors.text }
        const mushrooms: CanvasGridItem[] = result.score > 0 ? [{ image: mushroomUrl, width: 14, height: 14 }, range] : [range]

        if (result.boss.runes) {
          name.push({ text: ` · ${formatRunes(result.boss.runes)}`, font: '11.2px Lato', color: colors.muted })
        }

        return {
          padding: { top: 8, bottom: 8 },
          cells: [
            { lines: [{ height: 35, items: [{ image: getClassImageUrl(result.boss.class ?? props.playerClass), width: 35, height: 35 }] }] },
            {
              lines: [
                { height: nameHeight, items: name },
                { height: lineHeight, items: [{ text: `#${result.boss.pos} - ${getBossName(result)}`, font: '14px Lato', color }] }
              ]
            },
            { lines: [{ height: lineHeight, items: [{ text: formatChance(result), font: '14px Lato', color: colors.text }] }] },
            ...(showMushrooms.value ? [{ lines: [{ height: lineHeight, gap: 6, items: mushrooms }] }] : [])
          ]
        }
      })
    ]
  }

  const canvas = await createCanvas({
    width,
    height: getGridHeight(grid),
    background: colors.background,
    fonts: ['14px Lato', 'bold 12px Lato'],
    images: [mushroomUrl, ...props.results.map(({ boss }) => getClassImageUrl(boss.class ?? props.playerClass))]
  })

  canvas.drawGrid(grid)

  return canvas.toBlob()
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
