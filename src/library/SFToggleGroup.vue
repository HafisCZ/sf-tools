<template>
  <div class="flex overflow-hidden rounded-md border border-white/60" role="group">
    <button
      v-for="option in props.options"
      :key="option.value"
      type="button"
      class="flex-1 cursor-pointer border-l border-white/60 px-4 py-2 leading-5 font-bold outline-none first:border-l-0 focus-visible:outline-2 focus-visible:-outline-offset-2"
      :class="option.value === modelValue ? 'bg-accent text-black focus-visible:outline-black' : 'text-white/90 hover:bg-surface-hover focus-visible:outline-accent'"
      :aria-pressed="option.value === modelValue"
      @click="toggle(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { type SelectOption } from '@utils/components'

defineOptions({
  name: 'SFToggleGroup'
})

const props = defineProps<{
  /**
   * Buttons in the group, at most one of them is active
   */
  options: SelectOption[]
}>()

const modelValue = defineModel<string | null>({ required: true })

// A toggle group is always valid, this lets it go into useComponentValidation with the other inputs
defineExpose({
  get isValid() {
    return true
  }
})

// Clicking the active button turns it off
function toggle(value: string) {
  modelValue.value = modelValue.value === value ? null : value
}
</script>
