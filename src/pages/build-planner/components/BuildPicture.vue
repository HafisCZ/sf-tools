<template>
  <span class="relative block aspect-4/3 w-full rounded">
    <img :src="picture" alt="" draggable="false" loading="lazy" class="size-full object-contain" :class="IMAGE_CLASSES[props.variant ?? 'built']" />
    <span v-if="props.badge || props.variant === 'locked'" class="absolute right-0.5 bottom-0.5 flex h-[13px] items-center rounded-[3px] bg-black/65 px-1 text-[10px] leading-[13px] font-bold" :class="BADGE_CLASSES[props.variant ?? 'built']">
      <template v-if="props.badge">{{ props.badge }}</template>
      <img v-else src="/res/buildings/lock.webp" alt="" class="h-[11px] w-2 object-contain opacity-70" />
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getBuildingPicture } from '~/pages/build-planner/build-planner'
import type { PlannerKind } from '~/pages/build-planner/types'

defineOptions({
  name: 'BuildPicture'
})

const props = defineProps<{
  /**
   * Fortress or underworld picture set
   */
  kind: PlannerKind
  /**
   * Building index in save order
   */
  building: number
  /**
   * Level whose picture is shown, 0 is the empty plot
   */
  level: number
  /**
   * Text of the level label in the corner
   */
  badge?: string
  /**
   * How the picture reads: a planned or start building, a step that can't be built, an upgrade to pick or a locked one
   */
  variant?: 'built' | 'error' | 'next' | 'locked'
}>()

const IMAGE_CLASSES = {
  built: '',
  error: 'opacity-45',
  next: '',
  locked: 'opacity-25 grayscale'
}

const BADGE_CLASSES = {
  built: 'text-white',
  error: 'text-red-400',
  next: 'text-accent',
  locked: 'text-white/60'
}

const picture = computed(() => getBuildingPicture(props.kind, props.building, props.level))
</script>
