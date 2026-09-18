<template>
  <div class="group relative flex items-center gap-2 rounded-[0.25em] border hover:bg-surface" :class="props.selected ? 'border-[rgba(255,166,0,0.7)] bg-surface' : 'border-[#3a3a3a] bg-page'">
    <button type="button" class="w-full min-w-0 cursor-pointer p-4 pr-[3em] text-left outline-none focus-visible:bg-surface" :title="props.script.description" @click="emit('select')">
      <span class="block truncate" :title="props.script.name">{{ props.script.name }}</span>
      <span class="block text-[gray]">v{{ props.script.version }} - {{ formatDate(props.script.updated_at) }}</span>
    </button>
    <SFTooltip :content="localize(props.script.favorite ? 'unpin' : 'pin')">
      <button
        type="button"
        class="absolute top-[1em] right-[0.5em] cursor-pointer text-[gray] outline-none group-hover:visible hover:text-white focus-visible:visible focus-visible:text-white"
        :class="{ invisible: !props.script.favorite }"
        :aria-label="localize(props.script.favorite ? 'unpin' : 'pin')"
        :aria-pressed="props.script.favorite"
        @click="emit('pin')"
      >
        <SFIcon name="thumbtack" />
      </button>
    </SFTooltip>
    <div class="pointer-events-none absolute right-[0.5em] bottom-[1em] flex flex-row-reverse gap-[0.25em] text-[gray]">
      <SFIcon name="satellite-dish" :class="{ invisible: !props.script.remote }" />
      <SFIcon name="link" :class="{ invisible: !props.assigned }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import SFIcon from '@library/SFIcon.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { formatDate } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { type StoredScript } from '~/script/scripts'

defineOptions({
  name: 'ScriptListItem'
})

const props = defineProps<{
  /**
   * Shown script
   */
  script: StoredScript
  /**
   * Highlights the script as the one open in the editor
   */
  selected: boolean
  /**
   * Shows that the script is assigned to the current table
   */
  assigned: boolean
}>()

const emit = defineEmits<{
  /**
   * The script was clicked
   */
  select: []
  /**
   * The pin icon was clicked
   */
  pin: []
}>()

const localize = useLocalize('stats.scripts.tooltip')
</script>
