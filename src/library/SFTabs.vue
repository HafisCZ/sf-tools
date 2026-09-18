<template>
  <div class="flex items-center gap-1" role="tablist">
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      role="tab"
      class="cursor-pointer rounded-md px-3 py-1.5 font-bold outline-none transition focus-visible:outline-2 focus-visible:outline-accent"
      :class="option.value === modelValue ? 'text-accent' : 'text-white/90 hover:bg-surface-hover'"
      :aria-selected="option.value === modelValue"
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
