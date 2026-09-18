<template>
  <SFDialog :title="localize('results')" size="sm" close-via-button @close="emit('close')">
    <div class="flex max-h-[60vh] flex-col gap-[14px]">
      <div class="flex shrink-0 items-center gap-2">
        <span class="flex-1 text-center font-bold text-[lightgray]">
          <template v-if="props.experience > 0">{{ localize('experience', { experience: formatSpacedNumber(props.experience) }) }}</template>
        </span>
        <SFTooltip :content="localize.global('stats.copy.image')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize.global('stats.copy.image')" :disabled="isSaving && 'loading'" @click="save">
            <SFIcon name="download" />
          </SFButton>
        </SFTooltip>
      </div>
      <DungeonChart :result="activeResult" class="h-[14em] shrink-0 border-b border-line pb-2" />
      <div :class="{ 'min-h-0 overflow-y-auto': !isSaving }">
        <div ref="image-ref" :class="isSaving ? 'text-black' : 'text-white/90'">
          <div v-for="(result, index) in props.results" :key="index" :tabindex="isSaving ? undefined : 0" class="flex items-center gap-3 py-2 pl-2 outline-none" :class="{ 'bg-white/5': !isSaving && index === activeIndex }" @mouseenter="activeIndex = index" @focus="activeIndex = index">
            <img :src="getClassImageUrl(result.boss.class ?? props.playerClass)" alt="" class="size-[2.5em]" />
            <div class="min-w-0 flex-1" :class="{ [isSaving ? 'text-[purple]' : 'text-[#dec0ff]']: result.dungeon.companions }">
              <div class="text-[80%]">{{ getDungeonName(result.dungeon) }}</div>
              <div>#{{ result.boss.pos }} - {{ getBossName(result) }}</div>
            </div>
            <div class="w-[31.25%] text-center">{{ result.score === 0 ? localize.global('pets.bulk.not_possible') : `${((100 * result.score) / result.iterations).toFixed(2)}%` }}</div>
          </div>
        </div>
      </div>
    </div>
  </SFDialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import SFIcon from '@library/SFIcon.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { formatSpacedNumber } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { getClassImageUrl, useSubmit } from '@utils/utils'
import { Exporter } from '~/core/exporter'
import { getBossName, getDungeonName, type DungeonResult } from '~/sim/data/dungeons'
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
}>()

const emit = defineEmits<{
  close: []
}>()

const localize = useLocalize('dungeons')

const activeIndex = ref(0)

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
</script>
