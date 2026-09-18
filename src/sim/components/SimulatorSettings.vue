<template>
  <div class="flex items-center gap-[5px]">
    <div class="min-w-0 flex-1">
      <SFTooltip :content="localize('threads')">
        <SFNumber ref="threads-ref" v-model="threads" :aria-label="localize('threads')" :min="1" :step="1" centered />
      </SFTooltip>
    </div>
    <span>x</span>
    <div class="min-w-0 flex-1">
      <SFTooltip :content="localize('iterations')">
        <SFNumber ref="iterations-ref" v-model="iterations" :aria-label="localize('iterations')" :min="1" :step="1" centered />
      </SFTooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue'
import SFNumber from '@library/SFNumber.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { useLocalize } from '@utils/localization'
import { useComponentValidation } from '@utils/validations'

defineOptions({
  name: 'SimulatorSettings'
})

const props = defineProps<{
  /**
   * Prefix of the saved values, which are stored as `<storageKey>/threads` and `<storageKey>/iterations`
   */
  storageKey: string
  /**
   * Threads shown until a value is saved
   */
  defaultThreads: number
  /**
   * Iterations shown until a value is saved
   */
  defaultIterations: number
}>()

defineExpose({
  get threads() {
    return threads.value
  },
  get iterations() {
    return iterations.value
  },
  get isValid() {
    return isValid.value
  }
})

const localize = useLocalize('simulator')

const threads = ref(readSetting('threads', props.defaultThreads))
const iterations = ref(readSetting('iterations', props.defaultIterations))

const isValid = useComponentValidation(useTemplateRef('threads-ref'), useTemplateRef('iterations-ref'))

watch(threads, (value) => saveSetting('threads', value))
watch(iterations, (value) => saveSetting('iterations', value))

function readSetting(name: string, defaultValue: number) {
  const value = Number(Store.shared.get(`${props.storageKey}/${name}`, defaultValue, true))

  return Number.isFinite(value) ? value : null
}

function saveSetting(name: string, value: number | null) {
  if (value !== null && value >= 1) {
    Store.shared.set(`${props.storageKey}/${name}`, String(value), true)
  }
}
</script>
