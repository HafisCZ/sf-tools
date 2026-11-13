<template>
  <section :aria-labelledby="titleId" class="flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-dashed border-line">
    <div class="flex flex-col gap-0.5 px-4 pt-4 text-white/90">
      <SFHeading :id="titleId" level="5" type="inherit" class="flex items-baseline gap-2">
        <span class="text-accent opacity-80">{{ props.number }}</span>
        {{ props.title }}
      </SFHeading>
      <SFParagraph class="text-white/50">
        <slot name="description">{{ props.description }}</slot>
      </SFParagraph>
    </div>
    <div class="flex flex-1 flex-col gap-3.5 px-4 pt-3.5 pb-4">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import SFHeading from '@library/SFHeading.vue'
import SFParagraph from '@library/SFParagraph.vue'

defineOptions({
  name: 'DungeonBreakZone'
})

const props = defineProps<{
  /**
   * Step number shown in front of the title
   */
  number: number
  /**
   * Zone name
   */
  title: string
  /**
   * One line on what the zone is for
   */
  description?: string
}>()

defineSlots<{
  /**
   * Zone content
   */
  default(): unknown
  /**
   * Replaces the description text, for descriptions with links
   */
  description?(): unknown
}>()

const titleId = useId()
</script>
