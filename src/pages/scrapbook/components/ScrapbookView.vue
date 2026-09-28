<template>
  <div class="flex flex-col gap-5">
    <div v-if="classes.length > 1" class="flex items-center gap-3 border-b border-line pb-1.5">
      <SFTabs v-model="itemClass" :options="classOptions" />
      <span v-if="selected" class="text-white/50">{{ selected.collected }} / {{ selected.total }}</span>
    </div>
    <SFParagraph v-if="kinds.length === 0" class="text-center">{{ localize('complete') }}</SFParagraph>
    <section v-for="kind in kinds" :key="kind.key" class="flex flex-col gap-2">
      <SFHeading level="5" class="flex items-baseline gap-2">
        {{ kind.klass ? localize(`weapon${kind.klass}`) : localize.global(`general.item${kind.type}`) }}
        <span class="font-normal text-white/50">{{ kind.collected }} / {{ kind.total }}</span>
      </SFHeading>
      <div v-for="group in kind.groups" :key="group.key" class="flex flex-col gap-1.5">
        <span v-if="group.key !== 'legendary'" class="text-white/70">
          {{ localize(`group.${group.key}`) }}
          <span class="text-white/50">{{ group.collected }} / {{ group.total }}</span>
        </span>
        <div class="flex flex-wrap gap-2">
          <SFTooltip v-for="item in group.entries" :key="item.key" :content="item.name">
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
import { computed, ref } from 'vue'
import SFHeading from '@library/SFHeading.vue'
import SFParagraph from '@library/SFParagraph.vue'
import SFTabs from '@library/SFTabs.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { type SelectOption } from '@utils/components'
import { useLocalize } from '@utils/localization'
import { type ScrapbookClass } from '~/pages/scrapbook/scrapbook'

defineOptions({
  name: 'ScrapbookView'
})

const props = defineProps<{
  /**
   * Scrapbook slots grouped by class and kind
   */
  classes: ScrapbookClass[]
  /**
   * Hides the collected slots
   */
  missingOnly?: boolean
}>()

const emit = defineEmits<{
  /**
   * A missing slot was clicked
   */
  toggle: [key: string]
}>()

const localize = useLocalize('scrapbook')

const itemClass = ref(1)

const classOptions = computed<SelectOption<number>[]>(() => props.classes.map((entry) => ({ value: entry.class, label: entry.class ? localize.global(`general.class${entry.class}`) : localize('shared') })))

const selected = computed(() => props.classes.find((entry) => entry.class === itemClass.value) ?? props.classes[0])

const kinds = computed(() => {
  const kinds = selected.value?.kinds ?? []

  if (!props.missingOnly) return kinds

  return kinds
    .map((kind) => ({
      ...kind,
      groups: kind.groups.map((group) => ({ ...group, entries: group.entries.filter((item) => !item.collected) })).filter((group) => group.entries.length > 0)
    }))
    .filter((kind) => kind.groups.length > 0)
})
</script>
