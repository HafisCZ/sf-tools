<template>
  <SFDialog :title="localize('title')" size="sm" height="80vh">
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <SFHeading level="6">{{ localize('threshold.title') }}</SFHeading>
        <SFParagraph type="muted" size="sm">{{ localize('threshold.description') }}</SFParagraph>
      </div>
      <SFSlider ref="slider-ref" v-model:from="minimum" v-model:to="maximum" :label="localize('threshold.label')" :min="0" :max="100" :step="0.1" :from-label="localize.global('general.min')" :to-label="localize.global('general.max')" />
      <div class="grid grid-cols-2 gap-[14px]">
        <SFNumber ref="minimum-ref" v-model="minimum" :label="localize.global('general.min')" required :min="0" :max="maximum ?? 100" :step="0.1" />
        <SFNumber ref="maximum-ref" v-model="maximum" :label="localize.global('general.max')" required :min="minimum ?? 0" :max="100" :step="0.1" />
      </div>
      <div class="flex flex-col gap-1 border-t border-line pt-4">
        <SFHeading level="6">{{ localize('threshold.more') }}</SFHeading>
        <SFParagraph type="muted" size="sm">{{ localize('threshold.more_description') }}</SFParagraph>
      </div>
      <div class="flex flex-col gap-2">
        <SFCheckbox ref="twister-ref" v-model="includeTwister" :label="localize('threshold.include_twister')" />
        <SFCheckbox ref="sandstorm-ref" v-model="includeSandstorm" :label="localize('threshold.include_sandstorm')" />
      </div>
      <div class="flex flex-col gap-1 border-t border-line pt-4">
        <SFHeading level="6">{{ localize('limits.title') }}</SFHeading>
        <SFParagraph type="muted" size="sm">{{ localize('limits.description') }}</SFParagraph>
      </div>
      <div class="grid grid-cols-2 gap-[14px]">
        <SFNumber ref="twister-floors-ref" v-model="twisterFloors" :label="localize('limits.twister')" required :min="1" :max="1000" :step="1" />
        <SFNumber ref="sandstorm-floors-ref" v-model="sandstormFloors" :label="localize('limits.sandstorm')" required :min="1" :max="1000" :step="1" />
      </div>
      <div class="border-t border-line pt-4">
        <SFSelect ref="precision-ref" v-model="decimals" :label="localize('precision')" :options="DECIMAL_OPTIONS" />
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
import SFParagraph from '@library/SFParagraph.vue'
import SFSelect from '@library/SFSelect.vue'
import SFSlider from '@library/SFSlider.vue'
import { type SelectOption } from '@utils/components'
import { useLocalize } from '@utils/localization'
import { sequence } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'

defineOptions({
  name: 'DungeonOptionsDialog'
})

type DungeonOptions = {
  thresholdMin: number
  thresholdMax: number
  includeTwister: boolean
  includeSandstorm: boolean
  twisterFloors: number
  sandstormFloors: number
  decimals: number
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
   * Includes the Twister in More
   */
  includeTwister: boolean
  /**
   * Includes the Sandstorm in More
   */
  includeSandstorm: boolean
  /**
   * Most Twister floors simulated, counted from the starting floor
   */
  twisterFloors: number
  /**
   * Most Sandstorm floors simulated, counted from the starting floor
   */
  sandstormFloors: number
  /**
   * Decimal places shown for win chances
   */
  decimals: number
}>()

const emit = defineEmits<{
  close: [options?: DungeonOptions]
}>()

const SAMPLE_CHANCE = 87.5312864

const DECIMAL_OPTIONS: SelectOption<number>[] = sequence(5, 2).map((decimals) => ({ value: decimals, label: `${SAMPLE_CHANCE.toFixed(decimals)}%` }))

const localize = useLocalize('dialog.dungeons_options')

const minimum = ref<number | null>(props.thresholdMin)
const maximum = ref<number | null>(props.thresholdMax)
const includeTwister = ref(props.includeTwister)
const includeSandstorm = ref(props.includeSandstorm)
const twisterFloors = ref<number | null>(props.twisterFloors)
const sandstormFloors = ref<number | null>(props.sandstormFloors)
const decimals = ref(props.decimals)

const isValid = useComponentValidation(useTemplateRef('slider-ref'), useTemplateRef('minimum-ref'), useTemplateRef('maximum-ref'), useTemplateRef('twister-ref'), useTemplateRef('sandstorm-ref'), useTemplateRef('twister-floors-ref'), useTemplateRef('sandstorm-floors-ref'), useTemplateRef('precision-ref'))

function save() {
  if (minimum.value === null || maximum.value === null || twisterFloors.value === null || sandstormFloors.value === null) return

  emit('close', {
    thresholdMin: Math.round(minimum.value * 10) / 10,
    thresholdMax: Math.round(maximum.value * 10) / 10,
    includeTwister: includeTwister.value,
    includeSandstorm: includeSandstorm.value,
    twisterFloors: twisterFloors.value,
    sandstormFloors: sandstormFloors.value,
    decimals: decimals.value
  })
}
</script>
