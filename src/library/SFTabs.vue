<template>
  <div class="flex items-center gap-1" role="tablist">
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      role="tab"
      class="rounded-md px-3 py-1.5 font-bold outline-none transition focus-visible:outline-2 focus-visible:outline-accent enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      :class="option.value === modelValue ? 'text-accent' : 'text-white/90 enabled:hover:bg-surface-hover'"
      :aria-selected="option.value === modelValue"
      :disabled="option.disabled"
      @click="modelValue = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts" generic="TValue">
import { computed } from 'vue'
import { isSelectable, type SelectOption } from '@utils/components'

defineOptions({
  name: 'SFTabs'
})

const props = defineProps<{
  /**
   * Tabs to pick from, header rows and dividers are skipped
   */
  options: SelectOption<TValue>[]
}>()

const modelValue = defineModel<TValue>({ required: true })

const options = computed(() => props.options.filter(isSelectable))
</script>
