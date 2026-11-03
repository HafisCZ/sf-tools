<template>
  <SFDialog :title="localize('title')" size="sm">
    <SFSelect v-model="decimals" :label="localize('precision')" :options="DECIMAL_OPTIONS" />

    <template #buttons>
      <SFButton block @click="emit('close')">
        {{ localize.global('dialog.shared.cancel') }}
      </SFButton>
      <SFButton variant="primary" block @click="save">
        {{ localize.global('dialog.shared.ok') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import SFSelect from '@library/SFSelect.vue'
import { type SelectOption } from '@utils/components'
import { useLocalize } from '@utils/localization'
import { sequence } from '@utils/utils'

defineOptions({
  name: 'SimulatorOptionsDialog'
})

type SimulatorOptions = {
  decimals: number
}

const props = defineProps<{
  /**
   * Decimal places shown for win chances
   */
  decimals: number
}>()

const emit = defineEmits<{
  close: [options?: SimulatorOptions]
}>()

const SAMPLE_CHANCE = 87.5312864

const DECIMAL_OPTIONS: SelectOption<number>[] = sequence(5, 2).map((decimals) => ({ value: decimals, label: `${SAMPLE_CHANCE.toFixed(decimals)}%` }))

const localize = useLocalize('dialog.simulator_options')

const decimals = ref(props.decimals)

function save() {
  emit('close', {
    decimals: decimals.value
  })
}
</script>
