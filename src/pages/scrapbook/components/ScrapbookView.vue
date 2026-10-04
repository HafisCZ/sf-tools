<template>
  <div class="flex flex-col gap-5">
    <SFParagraph v-if="props.kinds.length === 0" class="text-center">{{ localize('nothing') }}</SFParagraph>
    <section v-for="kind in props.kinds" :key="kind.key" class="flex flex-col gap-2">
      <SFHeading level="5" class="flex items-baseline gap-2">
        {{ kind.itemClass ? `${localize.global(`general.class${kind.itemClass}`)} · ` : '' }}{{ localize.global(`general.item${kind.type}`) }}
        <span class="font-normal text-white/50">{{ kind.collected }} / {{ kind.total }}</span>
      </SFHeading>
      <div v-for="group in kind.groups" :key="group.key" class="flex flex-col gap-1.5">
        <span v-if="group.key !== 'legendary'" class="text-white/70">
          {{ localize(`group.${group.key}`) }}
          <span class="text-white/50">{{ group.collected }} / {{ group.total }}</span>
        </span>
        <div class="flex flex-wrap gap-2">
          <SFTooltip v-for="item in group.entries" :key="item.key" :content="getTooltip(item)">
            <button type="button" class="relative size-24 rounded-md border outline-none focus-visible:outline-2 focus-visible:outline-accent enabled:cursor-pointer" :class="item.collected || item.marked ? 'border-line' : 'border-red-900'" :disabled="item.collected" :aria-pressed="item.collected ? undefined : item.marked" @click="emit('toggle', item.key)">
              <img :src="item.picture" :alt="item.name" loading="lazy" class="size-full" :class="{ 'opacity-50': !item.collected && !item.marked }" />
              <span v-if="group.key === 'normal' && kind.type !== 10" class="absolute right-1.5 bottom-0.5 text-xs text-white/70">{{ item.color + 1 }}</span>
            </button>
          </SFTooltip>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import SFHeading from '@library/SFHeading.vue'
import SFParagraph from '@library/SFParagraph.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { useLocalize } from '@utils/localization'
import { type ScrapbookEntry, type ScrapbookKind } from '~/pages/scrapbook/scrapbook'

defineOptions({
  name: 'ScrapbookView'
})

const props = defineProps<{
  /**
   * Scrapbook slots grouped by kind
   */
  kinds: ScrapbookKind[]
}>()

const emit = defineEmits<{
  /**
   * A missing slot was clicked
   */
  toggle: [key: string]
}>()

const localize = useLocalize('scrapbook')

function getTooltip(item: ScrapbookEntry) {
  return item.note ? `${item.name} (${localize(`note.${item.note}`)})` : item.name
}
</script>
