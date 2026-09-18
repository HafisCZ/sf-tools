<template>
  <div class="flex flex-col gap-1">
    <SFSelect v-model="timestamp" :options="props.options">
      <template #option="{ option }">
        <span class="flex min-w-0 flex-1 justify-between gap-2">
          <span class="truncate">{{ option.label }}</span>
          <span v-if="option.description" class="text-white/50">{{ option.description }}</span>
        </span>
      </template>
    </SFSelect>
    <SFSelect v-model="reference" :options="referenceOptions">
      <template #option="{ option }">
        <span class="flex min-w-0 flex-1 justify-between gap-2">
          <span class="truncate">{{ option.label }}</span>
          <span v-if="option.description" class="text-white/50">{{ option.description }}</span>
        </span>
      </template>
    </SFSelect>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFSelect from '@library/SFSelect.vue'
import { type SelectOption } from '@utils/components'

defineOptions({
  name: 'TimestampSelect'
})

const props = defineProps<{
  /**
   * Selectable timestamps, newest first, with an optional note shown next to the date
   */
  options: SelectOption<number>[]
}>()

const emit = defineEmits<{
  /**
   * The timestamp or the reference was changed by the user
   */
  change: []
}>()

const timestampModel = defineModel<number>('timestamp', { required: true })
const referenceModel = defineModel<number>('reference', { required: true })

const referenceOptions = computed(() => props.options.filter((option) => !('value' in option) || option.value <= timestampModel.value))

const timestamp = computed({
  get: () => timestampModel.value,
  set: (value) => {
    timestampModel.value = value

    if (referenceModel.value > value) {
      referenceModel.value = value
    }

    emit('change')
  }
})

const reference = computed({
  get: () => referenceModel.value,
  set: (value) => {
    referenceModel.value = value

    emit('change')
  }
})
</script>
