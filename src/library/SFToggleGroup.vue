<template>
  <div class="flex overflow-hidden rounded-md border" :class="VARIANT_CLASSES[props.variant].border" role="group">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="flex-1 border-l px-4 py-2 leading-5 font-bold outline-none first:border-l-0 focus-visible:outline-2 focus-visible:-outline-offset-2 enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      :class="[VARIANT_CLASSES[props.variant].border, option.value === modelValue ? VARIANT_CLASSES[props.variant].active : 'text-white/90 enabled:hover:bg-surface-hover focus-visible:outline-accent']"
      :aria-pressed="option.value === modelValue"
      :disabled="option.disabled"
      @click="toggle(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { isSelectable, type SelectOption } from '@utils/components'

defineOptions({
  name: 'SFToggleGroup'
})

const props = withDefaults(
  defineProps<{
    /**
     * Buttons in the group, header rows and dividers are skipped
     */
    options: SelectOption[]
    /**
     * Visual style of the group
     */
    variant?: 'solid' | 'soft'
  }>(),
  {
    variant: 'solid'
  }
)

const modelValue = defineModel<string | null>({ required: true })

const VARIANT_CLASSES = {
  solid: {
    border: 'border-white/60',
    active: 'bg-accent text-black focus-visible:outline-black'
  },
  soft: {
    border: 'border-line',
    active: 'text-accent focus-visible:outline-accent'
  }
}

const options = computed(() => props.options.filter(isSelectable))

defineExpose({
  get isValid() {
    return true
  }
})

function toggle(value: string) {
  modelValue.value = modelValue.value === value ? null : value
}
</script>
