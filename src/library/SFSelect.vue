<template>
  <div class="flex flex-col gap-1.5">
    <label :id="labelId" :for="id" class="font-bold text-white">{{ props.label }}</label>
    <button
      :id="id"
      ref="trigger-ref"
      type="button"
      class="flex w-full cursor-pointer items-center gap-2 rounded-md border bg-surface px-3 py-2 text-left leading-5 text-white/90 outline-none"
      :class="BORDER_CLASSES[validationResult?.[0] ?? 'default']"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-labelledby="`${labelId} ${valueId}`"
      @click="toggle"
    >
      <img v-if="selectedOption?.image" :src="selectedOption.image" alt="" class="size-5 object-contain" />
      <span :id="valueId">{{ selectedOption?.label }}</span>
      <SFIcon name="chevron-down" class="ml-auto text-white/60" />
    </button>
    <SFValidation v-if="validationResult" :type="validationResult[0]" :message="validationResult[1]" />
    <Teleport to="body">
      <SFDropdownMenu v-if="open && position" :anchor="position" :width="position.right - position.left" float="right" @close="close">
        <input v-if="props.search" v-model="query" type="search" :aria-label="props.label" class="mb-1 w-full rounded border border-line bg-page px-3 py-2 leading-5 text-white/90 outline-none focus:border-accent" @keydown.enter.prevent="selectFirstMatch" />
        <ul role="menu" class="flex flex-col">
          <li v-for="option in matchingOptions" :key="option.value" role="none">
            <button type="button" role="menuitem" class="flex w-full cursor-pointer items-center gap-3 rounded px-3 py-2 text-left outline-none hover:bg-surface-hover focus-visible:bg-surface-hover" :class="{ 'text-accent': option.value === modelValue }" @click="select(option.value)">
              <img v-if="option.image" :src="option.image" alt="" class="size-5 object-contain" />
              {{ option.label }}
            </button>
          </li>
        </ul>
      </SFDropdownMenu>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import { type SelectOption } from '@utils/components'
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
    /**
     * Shows a search field above the options that filters them by label
     */
    search?: boolean
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
const query = ref('')

const triggerElement = useTemplateRef('trigger-ref')

const { validationVisible, validationResult, isValid } = useValidation(modelValue, props, createDefaultValidator(props))

const selectedOption = computed(() => props.options.find((option) => option.value === modelValue.value))

const matchingOptions = computed(() => {
  const search = query.value.trim().toLowerCase()

  return search ? props.options.filter((option) => option.label.toLowerCase().includes(search)) : props.options
})

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
  query.value = ''
  open.value = !open.value
}

function close() {
  open.value = false
}

function select(value: string) {
  modelValue.value = value

  validationVisible.value = true

  close()
}

function selectFirstMatch() {
  const option = matchingOptions.value.at(0)

  if (option) {
    select(option.value)
  }
}
</script>
