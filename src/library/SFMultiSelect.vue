<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="props.label || slots.label" :id="labelId" :for="id" class="font-bold text-white">
      <slot name="label">{{ props.label }}</slot>
    </label>
    <div ref="trigger-ref" class="flex min-h-9.5 w-full cursor-pointer items-center gap-2 rounded-md border bg-surface py-1 pr-3 pl-1 leading-5 text-white/90" :class="[BORDER_CLASSES[validationResult?.[0] ?? 'default'], { 'border-accent': open }]" @click="toggle">
      <div class="flex min-w-0 flex-auto flex-wrap items-center gap-1">
        <span v-for="option in selectedOptions" :key="String(option.value)" class="flex max-w-full items-center gap-1.5 rounded bg-page py-0.5 pr-1 pl-2">
          <span class="truncate">{{ option.label }}</span>
          <button type="button" class="flex cursor-pointer items-center rounded p-0.5 text-white/60 outline-none hover:text-white focus-visible:text-white" :aria-label="option.label" @click.stop="deselect(option.value)">
            <SFIcon name="xmark" />
          </button>
        </span>
        <button :id="id" type="button" class="min-w-8 flex-auto cursor-pointer py-1 pl-2 text-left text-white/40 outline-none" aria-haspopup="menu" :aria-expanded="open" :aria-labelledby="props.label ? labelId : undefined" @click.stop="toggle">
          {{ selectedOptions.length === 0 ? props.placeholder : '' }}
        </button>
      </div>
      <SFIcon name="chevron-down" class="text-white/60" :class="{ 'rotate-180': open }" />
    </div>
    <SFValidation v-if="validationResult" :type="validationResult[0]" :message="validationResult[1]" />
    <Teleport to="body">
      <SFDropdownMenu v-if="open && position" :anchor="position" :width="position.right - position.left" float="right" position="bottom" @close="close">
        <input v-if="props.search" v-model="query" type="search" :aria-label="props.label" class="mb-1 w-full rounded border border-line bg-page px-3 py-2 leading-5 text-white/90 outline-none focus:border-accent" @keydown.enter.prevent="toggleFirstMatch" />
        <ul role="menu" class="flex flex-col">
          <template v-for="(option, index) in matchingOptions" :key="index">
            <li v-if="!isSelectable(option)" :role="option.type === 'divider' ? 'separator' : 'presentation'" :class="option.type === 'divider' ? 'mx-1 my-1 border-t border-line' : 'px-3 pt-2 pb-1 text-xs font-bold text-white/50 uppercase'">
              {{ option.type === 'header' ? option.label : '' }}
            </li>
            <li v-else role="none">
              <button
                type="button"
                role="menuitemcheckbox"
                :aria-checked="isSelected(option.value)"
                class="flex w-full cursor-pointer items-center gap-3 rounded px-3 py-2 text-left outline-none hover:bg-surface-hover focus-visible:bg-surface-hover"
                :class="{ 'text-accent': isSelected(option.value) }"
                @click="toggleOption(option.value)"
              >
                <SFIcon name="check" :class="{ invisible: !isSelected(option.value) }" />
                <template v-if="option.image">
                  <SFIcon v-if="isIconName(option.image)" :name="option.image" :class="{ 'order-last': option.imagePosition === 'right', 'text-white/60': !isSelected(option.value) }" />
                  <img v-else :src="option.image" alt="" class="size-5 object-contain" :class="{ 'order-last': option.imagePosition === 'right' }" />
                </template>
                <span class="flex min-w-0 flex-1 flex-col">
                  <span>{{ option.label }}</span>
                  <span v-if="option.description" class="text-xs text-white/50">{{ option.description }}</span>
                </span>
              </button>
            </li>
          </template>
        </ul>
      </SFDropdownMenu>
    </Teleport>
  </div>
</template>

<script setup lang="ts" generic="TValue">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import { isSelectable, type SelectOption } from '@utils/components'
import { isIconName } from '@utils/icons'
import { useInert } from '@utils/interactions'
import { useAnimationFramePosition } from '@utils/position'
import { createDefaultValidator, useValidation, type ValidationProps } from '@utils/validations'
import SFDropdownMenu from './SFDropdownMenu.vue'
import SFIcon from './SFIcon.vue'
import SFValidation from './SFValidation.vue'

defineOptions({
  name: 'SFMultiSelect'
})

const props = defineProps<
  ValidationProps<TValue[]> & {
    /**
     * Text shown above the field, also its accessible name
     */
    label?: string
    /**
     * Options to pick from, with optional header rows and dividers between them
     */
    options: SelectOption<TValue>[]
    /**
     * Text shown in the field while nothing is picked
     */
    placeholder?: string
    /**
     * Shows an error while nothing is picked
     */
    required?: boolean
    /**
     * Shows a search field above the options that filters them by label and description
     */
    search?: boolean
  }
>()

const modelValue = defineModel<TValue[]>({ required: true })

const slots = defineSlots<{
  /**
   * Replaces the label text
   */
  label?(): unknown
}>()

defineExpose({
  get isValid() {
    return isValid.value
  }
})

const BORDER_CLASSES = {
  default: 'border-line',
  error: 'border-red-400',
  warning: 'border-yellow-400'
}

const id = useId()
const labelId = useId()

const open = ref(false)
const query = ref('')

const triggerElement = useTemplateRef('trigger-ref')

const { validationVisible, validationResult, isValid } = useValidation(modelValue, props, (value) => createDefaultValidator(props)(value?.length ? value : null))

const selectableOptions = computed(() => props.options.filter(isSelectable))

const selectedOptions = computed(() => selectableOptions.value.filter((option) => modelValue.value.includes(option.value)))

const matchingOptions = computed((): SelectOption<TValue>[] => {
  const search = query.value.trim().toLowerCase()

  return search ? selectableOptions.value.filter((option) => option.label.toLowerCase().includes(search) || option.description?.toLowerCase().includes(search)) : props.options
})

const position = useAnimationFramePosition(open, () => triggerElement.value?.getBoundingClientRect())

useInert(open)

watch(
  open,
  (value) => {
    if (!value && document.activeElement === document.body) {
      triggerElement.value?.querySelector<HTMLElement>(`#${CSS.escape(id)}`)?.focus()
    }
  },
  { flush: 'post' }
)

function toggle() {
  if (selectableOptions.value.length === 0) return

  query.value = ''
  open.value = !open.value
}

function close() {
  open.value = false
}

function isSelected(value: TValue) {
  return modelValue.value.includes(value)
}

function toggleOption(value: TValue) {
  if (isSelected(value)) {
    deselect(value)
  } else {
    modelValue.value = [...modelValue.value, value]

    validationVisible.value = true
  }
}

function deselect(value: TValue) {
  modelValue.value = modelValue.value.filter((item) => item !== value)

  validationVisible.value = true
}

function toggleFirstMatch() {
  const option = matchingOptions.value.find(isSelectable)

  if (option) {
    toggleOption(option.value)
  }
}
</script>
