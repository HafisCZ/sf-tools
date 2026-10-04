<template>
  <fieldset class="flex flex-col gap-1.5">
    <legend v-if="props.label" class="mb-1.5 font-bold text-white">{{ props.label }}</legend>
    <div v-for="(option, index) in options" :key="index" class="flex items-center gap-2">
      <input :id="`${id}-${index}`" v-model="modelValue" type="radio" :name="id" :value="option.value" :disabled="option.disabled" class="size-4 cursor-pointer accent-accent disabled:cursor-not-allowed" />
      <label :for="`${id}-${index}`" class="flex-1" :class="option.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'">{{ option.label }}</label>
    </div>
  </fieldset>
</template>

<script setup lang="ts" generic="TValue">
import { computed, useId } from 'vue'
import { isSelectable, type SelectOption } from '@utils/components'

defineOptions({
  name: 'SFRadioGroup'
})

const props = defineProps<{
  /**
   * Text shown above the options, also the group's accessible name
   */
  label?: string
  /**
   * Options to pick from, header rows and dividers are skipped
   */
  options: SelectOption<TValue>[]
}>()

const modelValue = defineModel<TValue>({ required: true })

defineExpose({
  get isValid() {
    return true
  }
})

const id = useId()

const options = computed(() => props.options.filter(isSelectable))
</script>
