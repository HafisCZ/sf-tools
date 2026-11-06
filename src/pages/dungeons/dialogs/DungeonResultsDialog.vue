<template>
  <SFDialog :title="localize('results')" size="sm" :width="showMushrooms ? '660px' : undefined" height="80vh" column gap="14px" close-via-button buttons-bar @close="emit('close')">
    <template #actions>
      <SFTooltip :content="localize.global('stats.copy.image')">
        <SFButton variant="ghost" icon :aria-label="localize.global('stats.copy.image')" :disabled="isSaving && 'loading'" @click="save">
          <SFIcon name="file-image" />
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
    <div :class="{ 'min-h-0 overflow-y-auto': !isSaving }">
      <div ref="image-ref" :class="isSaving ? 'text-black' : 'text-white/90'">
        <div class="flex items-center gap-3 pb-1 pl-2 text-xs font-bold" :class="isSaving ? 'text-[gray]' : 'text-white/50'">
          <span class="flex-1" />
          <span class="w-[22%] text-center">{{ localize('win_chance') }}</span>
          <span v-if="showMushrooms" class="w-[26%] text-center">{{ localize('mushrooms') }}</span>
        </div>
        <div v-for="(result, index) in props.results" :key="index" :tabindex="isSaving ? undefined : 0" class="flex items-center gap-3 py-2 pl-2 outline-none" :class="{ 'bg-white/5': !isSaving && index === activeIndex }" @mouseenter="activeIndex = index" @focus="activeIndex = index">
          <img :src="getClassImageUrl(result.boss.class ?? props.playerClass)" alt="" class="size-[2.5em]" />
          <div class="min-w-0 flex-1" :class="{ [isSaving ? 'text-[purple]' : 'text-[#dec0ff]']: result.dungeon.companions }">
            <div class="text-[80%]">
              {{ getDungeonName(result.dungeon) }}<span v-if="result.boss.runes" :class="isSaving ? 'text-[gray]' : 'text-white/50'"> · {{ formatRunes(result.boss.runes) }}</span>
            </div>
            <div>#{{ result.boss.pos }} - {{ getBossName(result) }}</div>
          </div>
          <div class="w-[22%] text-center">{{ result.score === 0 ? localize.global('pets.bulk.not_possible') : `${((100 * result.score) / result.iterations).toFixed(props.decimals)}%` }}</div>
          <div v-if="showMushrooms" class="flex w-[26%] items-center justify-center gap-1.5">
            <template v-if="result.score > 0">
              <img src="/res/mushroom.png" alt="" class="size-[1em]" />
              <span>{{ formatMushroomRange(result) }}</span>
            </template>
            <template v-else>-</template>
          </div>
        </div>
      </div>
    </div>

    <template #buttons>
      <SFCheckbox :model-value="showMushrooms" :label="localize('show_mushrooms')" @update:model-value="toggleMushrooms" />
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFCheckbox from '@library/SFCheckbox.vue'
import SFDialog from '@library/SFDialog.vue'
import SFIcon from '@library/SFIcon.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { formatSpacedNumber } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
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

const imageElement = useTemplateRef('image-ref')

const activeResult = computed(() => props.results.at(activeIndex.value) ?? null)

// Everything in the image needs plain colours while saving, html2canvas can't read oklab()
const { submit: save, isSubmitting: isSaving } = useSubmit(async () => {
  await nextTick()

  if (!imageElement.value) return

  const canvas = await html2canvas(imageElement.value, { logging: false })
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve))

  if (blob) {
    Exporter.download(`dungeons_${Date.now()}.png`, blob)
  }
})

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
