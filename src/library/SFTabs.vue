<template>
  <div class="flex gap-1" :class="props.vertical ? 'flex-col' : 'items-center'" role="tablist" :aria-orientation="props.vertical ? 'vertical' : undefined">
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      role="tab"
      class="rounded-md px-3 py-1.5 font-bold outline-none transition focus-visible:outline-2 focus-visible:outline-accent enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      :class="[option.value === modelValue ? 'text-accent' : 'text-white/90 enabled:hover:bg-surface-hover', { 'text-left': props.vertical }]"
      :aria-selected="option.value === modelValue"
      :disabled="option.disabled"
      @click="modelValue = option.value"
    >
      <slot name="option" :option="option">
        {{ option.label }}
      </slot>
    </button>
  </div>
</template>

<script setup lang="ts" generic="TValue">
import { computed } from 'vue'
import { isSelectable, type SelectDivider, type SelectHeader, type SelectOption } from '@utils/components'

defineOptions({
  name: 'SFTabs'
})

const props = defineProps<{
  /**
   * Tabs to pick from, header rows and dividers are skipped
   */
  options: SelectOption<TValue>[]
  /**
   * Stacks the tabs in a column
   */
  vertical?: boolean
}>()

const modelValue = defineModel<TValue>({ required: true })

defineSlots<{
  /**
   * Replaces the label of a tab
   */
  option?(props: { option: Exclude<SelectOption<TValue>, SelectHeader | SelectDivider> }): unknown
}>()

const options = computed(() => props.options.filter(isSelectable))
</script>
