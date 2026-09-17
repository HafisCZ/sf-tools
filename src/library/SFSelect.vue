<template>
  <div class="flex flex-col gap-1.5">
    <label :id="labelId" :for="id" class="font-bold text-white">{{ props.label }}</label>
    <button
      :id="id"
      ref="trigger-ref"
      type="button"
      class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border bg-surface px-3 py-2 text-left leading-5 text-white/90 outline-none"
      :class="BORDER_CLASSES[validationResult?.[0] ?? 'default']"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-labelledby="`${labelId} ${valueId}`"
      @click="toggle"
    >
      <span :id="valueId">{{ selectedLabel }}</span>
      <SFIcon name="chevron-down" class="text-white/60" />
    </button>
    <SFValidation v-if="validationResult" :type="validationResult[0]" :message="validationResult[1]" />
    <Teleport to="body">
      <SFDropdownMenu v-if="open && position" :items="items" :anchor="position" :width="position.right - position.left" float="right" @close="close" />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import { type DropdownItem, type SelectOption } from '@utils/components'
import { useInert } from '@utils/interactions'
import { useAnimationFramePosition } from '@utils/position'
import { createDefaultValidator, useValidation, type ValidationProps } from '@utils/validations'
import SFDropdownMenu from './SFDropdownMenu.vue'
import SFIcon from './SFIcon.vue'
import SFValidation from './SFValidation.vue'

defineOptions({
  name: 'SFSelect'
})

const props = defineProps<
  ValidationProps<string> & {
    /**
     * Text shown above the field, also its accessible name
     */
    label: string
    /**
     * Options to pick from
     */
    options: SelectOption[]
    /**
     * Shows an error while no option is picked
     */
    required?: boolean
  }
>()

const modelValue = defineModel<string>({ required: true })

defineExpose({
  get isValid() {
    return isValid.value
  }
})

const BORDER_CLASSES = {
  default: 'border-line focus-visible:border-accent',
  error: 'border-red-400',
  warning: 'border-yellow-400'
}

const id = useId()
const labelId = useId()
const valueId = useId()

const open = ref(false)

const triggerElement = useTemplateRef('trigger-ref')

const { validationVisible, validationResult, isValid } = useValidation(modelValue, props, createDefaultValidator(props))

const selectedLabel = computed(() => props.options.find((option) => option.value === modelValue.value)?.label ?? '')

const items = computed<DropdownItem[]>(() =>
  props.options.map((option) => ({
    label: option.label,
    active: option.value === modelValue.value,
    action: () => select(option.value)
  }))
)

const position = useAnimationFramePosition(open, () => triggerElement.value?.getBoundingClientRect())

useInert(open)

// Return focus to the trigger unless the user already moved it somewhere else
watch(
  open,
  (value) => {
    if (!value && document.activeElement === document.body) {
      triggerElement.value?.focus()
    }
  },
  { flush: 'post' }
)

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

function select(value: string) {
  modelValue.value = value

  validationVisible.value = true
}
</script>
