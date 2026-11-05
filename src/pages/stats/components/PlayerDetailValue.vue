<template>
  <span class="block">
    <component
      :is="clickable ? 'button' : 'span'"
      ref="value-ref"
      :type="clickable ? 'button' : undefined"
      :aria-expanded="clickable ? open : undefined"
      :class="{ 'cursor-pointer underline decoration-white/35 decoration-dashed underline-offset-4 outline-none [text-transform:inherit] hover:decoration-white/70 focus-visible:decoration-white': clickable }"
      @click="clickable && toggle()"
    >
      <span class="whitespace-nowrap">{{ props.value }}</span>
      {{ ' ' }}
      <span v-if="difference" class="text-xs font-bold whitespace-nowrap" :class="difference > 0 ? 'text-[#8fd694]' : 'text-[#ff7676]'">{{ difference > 0 ? '+' : '-' }}{{ formatSpacedNumber(Math.abs(difference)) }}</span>
    </component>
    <Teleport to="body">
      <SFDropdownMenu v-if="open && position" :anchor="position" :width="460" float="right" position="bottom" @close="close">
        <div class="p-2">
          <SFHeading level="6" class="mb-2">{{ props.title }}</SFHeading>
          <PlayerDetailChart :title="props.title ?? ''" :points="chartPoints" />
        </div>
      </SFDropdownMenu>
    </Teleport>
  </span>
</template>

<script setup lang="ts">
import { computed, inject, useTemplateRef } from 'vue'
import SFDropdownMenu from '@library/SFDropdownMenu.vue'
import SFHeading from '@library/SFHeading.vue'
import { formatSpacedNumber } from '@utils/formatting'
import { useDropdown } from '@utils/interactions'
import { type PlayerModel } from '~/core/models/player'
import PlayerDetailChart from '~/pages/stats/components/PlayerDetailChart.vue'
import { PLAYER_DETAIL_KEY } from '~/pages/stats/stats'

defineOptions({
  name: 'PlayerDetailValue'
})

const props = defineProps<{
  /**
   * Text shown as the value
   */
  value: string
  /**
   * Reads the number from a scan, the change between the two picked scans is shown after the value and a click opens it as a chart
   */
  read?: (player: PlayerModel) => number | undefined
  /**
   * Heading of the chart
   */
  title?: string
}>()

const detail = inject(PLAYER_DETAIL_KEY, null)

const valueElement = useTemplateRef<HTMLElement>('value-ref')

const { open, position, toggle, close } = useDropdown(valueElement, valueElement)

const difference = computed(() => {
  const current = detail && props.read?.(detail.player)
  const previous = detail && props.read?.(detail.compare)

  return current === undefined || current === null || previous === undefined || previous === null ? 0 : current - previous
})

const clickable = computed(() => Boolean(props.read && props.title && detail && detail.player.Timestamp !== detail.compare.Timestamp))

const chartPoints = computed(() => {
  const read = props.read

  if (!open.value || !read || !detail) return []

  return detail.getHistory().flatMap((player) => {
    const value = read(player)

    return value === undefined ? [] : [{ timestamp: player.Timestamp, value }]
  })
})
</script>
