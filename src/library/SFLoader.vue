<template>
  <div class="fixed inset-0 z-[3000] flex items-center justify-center" aria-live="polite" aria-busy="true">
    <div class="flex flex-col items-center gap-8">
      <img src="/res/favicon.png" alt="" width="100" class="animate-[spin_1.2s_linear_infinite] opacity-65 select-none" />
      <SFProgress v-if="props.percent !== undefined" :percent="props.percent" class="w-[200px]" />
      <SFButton v-if="props.cancellable" variant="ghost" @click="emit('cancel')">
        {{ localize('cancel') }}
      </SFButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLocalize } from '@utils/localization'
import SFButton from './SFButton.vue'
import SFProgress from './SFProgress.vue'

defineOptions({
  name: 'SFLoader'
})

const props = defineProps<{
  /**
   * Shows a progress bar at this percentage, from 0 to 100
   */
  percent?: number
  /**
   * Shows a Cancel button
   */
  cancellable?: boolean
}>()

const emit = defineEmits<{
  /**
   * Cancel button was clicked
   */
  cancel: []
}>()

const localize = useLocalize('dialog.shared')
</script>
