<template>
  <div class="fixed right-[4em] bottom-[4em] z-10 flex w-[250px] flex-col gap-2 rounded-[0.25em] border border-[#3a3a3a] bg-page p-2">
    <div class="text-center font-bold">{{ localize('title') }}</div>
    <button
      v-for="action in props.actions"
      :key="action.label"
      type="button"
      class="flex w-full cursor-pointer items-center gap-2 rounded-[0.25em] border border-[#3a3a3a] bg-page p-2 text-left outline-none hover:bg-surface focus-visible:bg-surface disabled:pointer-events-none disabled:text-[gray]"
      :disabled="action.disabled"
      @click="action.action"
    >
      <SFIcon :name="action.icon" />
      {{ action.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import SFIcon from '@library/SFIcon.vue'
import { useLocalize } from '@utils/localization'
import { type GridAction } from '~/pages/stats/stats'

defineOptions({
  name: 'GridActions'
})

const props = defineProps<{
  /**
   * Actions applied to the selected cards
   */
  actions: GridAction[]
}>()

const localize = useLocalize('stats.context')
</script>
