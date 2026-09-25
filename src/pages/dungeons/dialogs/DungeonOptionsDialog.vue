<template>
  <SFDialog :title="localize('title')" size="sm">
    <div class="flex flex-col gap-4">
      <SFHeading level="5">{{ localize('threshold.title') }}</SFHeading>
      <SFSlider ref="slider-ref" v-model:from="minimum" v-model:to="maximum" :label="localize('threshold.label')" :min="0" :max="100" :step="0.1" :from-label="localize.global('general.min')" :to-label="localize.global('general.max')" />
      <div class="grid grid-cols-2 gap-[14px]">
        <SFNumber ref="minimum-ref" v-model="minimum" :label="localize.global('general.min')" required :min="0" :max="maximum ?? 100" :step="0.1" />
        <SFNumber ref="maximum-ref" v-model="maximum" :label="localize.global('general.max')" required :min="minimum ?? 0" :max="100" :step="0.1" />
      </div>
      <div class="flex flex-col gap-2">
        <SFHeading level="6">{{ localize('threshold.remaining') }}</SFHeading>
        <SFCheckbox ref="tower-ref" v-model="includeTower" :label="localize('threshold.include_tower')" />
        <SFCheckbox ref="twister-ref" v-model="includeTwister" :label="localize('threshold.include_twister')" />
        <SFCheckbox ref="sandstorm-ref" v-model="includeSandstorm" :label="localize('threshold.include_sandstorm')" />
      </div>
    </div>

    <template #buttons>
      <SFButton block @click="emit('close')">
        {{ localize.global('dialog.shared.cancel') }}
      </SFButton>
      <SFButton variant="primary" block :disabled="!isValid" @click="save">
        {{ localize.global('dialog.shared.ok') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFCheckbox from '@library/SFCheckbox.vue'
import SFDialog from '@library/SFDialog.vue'
import SFHeading from '@library/SFHeading.vue'
import SFNumber from '@library/SFNumber.vue'
import SFSlider from '@library/SFSlider.vue'
import { useLocalize } from '@utils/localization'
import { useComponentValidation } from '@utils/validations'

defineOptions({
  name: 'DungeonOptionsDialog'
})

type DungeonOptions = {
  thresholdMin: number
  thresholdMax: number
  includeTower: boolean
  includeTwister: boolean
  includeSandstorm: boolean
}

const props = defineProps<{
  /**
   * Lowest win chance from 0 to 100 that is still simulated
   */
  thresholdMin: number
  /**
   * Highest win chance from 0 to 100 that is still simulated
   */
  thresholdMax: number
  /**
   * Stops Remaining in the Tower at the first enemy outside the threshold
   */
  includeTower: boolean
  /**
   * Stops Remaining in the Twister at the first enemy outside the threshold
   */
  includeTwister: boolean
  /**
   * Stops Remaining in the Sandstorm at the first enemy outside the threshold
   */
  includeSandstorm: boolean
}>()

const emit = defineEmits<{
  close: [options?: DungeonOptions]
}>()

const localize = useLocalize('dialog.dungeons_options')

const minimum = ref<number | null>(props.thresholdMin)
const maximum = ref<number | null>(props.thresholdMax)
const includeTower = ref(props.includeTower)
const includeTwister = ref(props.includeTwister)
const includeSandstorm = ref(props.includeSandstorm)

const isValid = useComponentValidation(useTemplateRef('slider-ref'), useTemplateRef('minimum-ref'), useTemplateRef('maximum-ref'), useTemplateRef('tower-ref'), useTemplateRef('twister-ref'), useTemplateRef('sandstorm-ref'))

function save() {
  if (minimum.value === null || maximum.value === null) return

  emit('close', {
    thresholdMin: Math.round(minimum.value * 10) / 10,
    thresholdMax: Math.round(maximum.value * 10) / 10,
    includeTower: includeTower.value,
    includeTwister: includeTwister.value,
    includeSandstorm: includeSandstorm.value
  })
}
</script>
