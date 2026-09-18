<template>
  <SFDialog :title="localize('title')" size="sm">
    <div class="flex flex-col gap-4">
      <SFSelect ref="rage-ref" v-model="rageDisplayMode" :label="localize('option.rage_display_mode.title')" :options="rageOptions" />
      <SFSelect ref="type-ref" v-model="typeDisplayMode" :label="localize('option.type_display_mode.title')" :options="typeOptions" />
      <SFNumber ref="margin-ref" v-model="errorMargin" :label="localize('option.base_damage_error_margin.title')" required :min="0" :step="1" />
      <SFSelect ref="sort-ref" v-model="groupSort" :label="localize('option.group_sort.title')" :options="sortOptions" />
    </div>

    <template #buttons>
      <SFButton block @click="emit('close')">
        {{ localize.global('dialog.shared.cancel') }}
      </SFButton>
      <SFButton variant="primary" block :disabled="!isValid" @click="save">
        {{ localize.global('dialog.shared.save') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import SFNumber from '@library/SFNumber.vue'
import SFSelect from '@library/SFSelect.vue'
import { type SelectOption } from '@utils/components'
import { useLocalize } from '@utils/localization'
import { useComponentValidation } from '@utils/validations'
import { GROUP_SORTS, RAGE_DISPLAY_MODES, TYPE_DISPLAY_MODES, type AnalyzerOptions, type GroupSort, type RageDisplayMode, type TypeDisplayMode } from '~/pages/analyzer/analyzer'

defineOptions({
  name: 'AnalyzerOptionsDialog'
})

type DialogOptions = Omit<AnalyzerOptions, 'damages_sidebar'>

const props = defineProps<{
  /**
   * Values the fields start with
   */
  options: DialogOptions
}>()

const emit = defineEmits<{
  close: [options?: DialogOptions]
}>()

const localize = useLocalize('dialog.analyzer_options')

const rageDisplayMode = ref(props.options.rage_display_mode)
const typeDisplayMode = ref(props.options.type_display_mode)
const errorMargin = ref<number | null>(props.options.base_damage_error_margin)
const groupSort = ref(props.options.group_sort)

const isValid = useComponentValidation(useTemplateRef('rage-ref'), useTemplateRef('type-ref'), useTemplateRef('margin-ref'), useTemplateRef('sort-ref'))

const rageOptions = computed<SelectOption<RageDisplayMode>[]>(() => RAGE_DISPLAY_MODES.map((value) => ({ value, label: localize(`option.rage_display_mode.value.${value}`) })))

const typeOptions = computed<SelectOption<TypeDisplayMode>[]>(() => TYPE_DISPLAY_MODES.map((value) => ({ value, label: localize(`option.type_display_mode.value.${value}`) })))

const sortOptions = computed<SelectOption<GroupSort>[]>(() => GROUP_SORTS.map((value) => ({ value, label: localize(`option.group_sort.value.${value}`) })))

function save() {
  if (errorMargin.value === null) return

  emit('close', {
    rage_display_mode: rageDisplayMode.value,
    type_display_mode: typeDisplayMode.value,
    base_damage_error_margin: errorMargin.value,
    group_sort: groupSort.value
  })
}
</script>
