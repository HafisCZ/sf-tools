<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="props.label || slots.label" :id="labelId" :for="id" class="font-bold text-white">
      <slot name="label">{{ props.label }}</slot>
    </label>
    <button
      :id="id"
      ref="trigger-ref"
      type="button"
      class="flex min-h-9.5 w-full items-center gap-2 rounded-md border bg-surface px-3 py-2 text-left leading-5 outline-none"
      :class="[BORDER_CLASSES[validationResult?.[0] ?? 'default'], props.readonly ? 'cursor-default text-white/60' : 'cursor-pointer text-white/90']"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-disabled="props.readonly || undefined"
      :aria-labelledby="props.label ? `${labelId} ${valueId}` : valueId"
      @click="toggle"
    >
      <span v-if="slots.option && selectedOption" :id="valueId" class="flex min-w-0 flex-auto items-center gap-2 truncate">
        <slot name="option" :option="selectedOption" />
      </span>
      <span v-else :id="valueId" class="flex min-w-0 flex-auto items-center gap-2">
        <template v-if="selectedOption?.image">
          <SFIcon v-if="isIconName(selectedOption.image)" :name="selectedOption.image" class="text-white/60" :class="{ 'order-last': selectedOption.imagePosition === 'right' }" />
          <img v-else :src="selectedOption.image" alt="" class="size-5 object-contain" :class="{ 'order-last': selectedOption.imagePosition === 'right' }" />
        </template>
        <span class="min-w-0 flex-auto truncate" :class="{ 'text-accent': selectedOption?.accent }" :style="{ color: selectedOption?.color }">{{ selectedOption?.label }}</span>
      </span>
      <SFIcon v-if="!props.readonly" name="chevron-down" class="text-white/60" :class="{ 'rotate-180': open }" />
    </button>
    <SFValidation v-if="validationResult" :type="validationResult[0]" :message="validationResult[1]" />
    <Teleport to="body">
      <SFDropdownMenu v-if="open && position" :anchor="position" :width="position.right - position.left" float="right" position="bottom" @close="close">
        <input v-if="props.search" v-model="query" type="search" :aria-label="props.label" class="mb-1 w-full rounded border border-line bg-page px-3 py-2 leading-5 text-white/90 outline-none focus:border-accent" @keydown.enter.prevent="selectFirstMatch" />
        <ul role="menu" class="flex flex-col">
          <template v-for="(option, index) in matchingOptions" :key="index">
            <li v-if="!isSelectable(option)" :role="option.type === 'divider' ? 'separator' : 'presentation'" :class="option.type === 'divider' ? 'mx-1 my-1 border-t border-line' : 'px-3 pt-2 pb-1 text-xs font-bold text-white/50 uppercase'">
              {{ option.type === 'header' ? option.label : '' }}
            </li>
            <li v-else role="none">
              <button
                type="button"
                role="menuitem"
                :data-selected="option.value === modelValue || undefined"
                class="flex w-full cursor-pointer items-center gap-3 rounded px-3 py-2 text-left outline-none"
                :class="[option.value === modelValue ? 'bg-accent/15' : 'hover:bg-surface-hover focus-visible:bg-surface-hover', { 'text-accent': option.accent }]"
                @click="select(option.value)"
              >
                <slot name="option" :option="option">
                  <template v-if="option.image">
                    <SFIcon v-if="isIconName(option.image)" :name="option.image" class="text-white/60" :class="{ 'order-last': option.imagePosition === 'right' }" />
                    <img v-else :src="option.image" alt="" class="size-5 object-contain" :class="{ 'order-last': option.imagePosition === 'right' }" />
                  </template>
                  <span class="flex min-w-0 flex-1 flex-col">
                    <span :style="{ color: option.color }">{{ option.label }}</span>
                    <span v-if="option.description" class="text-xs text-white/50">{{ option.description }}</span>
                  </span>
                </slot>
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
import { isSelectable, type SelectDivider, type SelectHeader, type SelectOption } from '@utils/components'
import { isIconName } from '@utils/icons'
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
  ValidationProps<TValue> & {
    /**
     * Text shown above the field, also its accessible name
     */
    label?: string
    /**
     * Options to pick from, with optional header rows and dividers between them
     */
    options: SelectOption<TValue>[]
    /**
     * Shows an error while no option is picked
     */
    required?: boolean
    /**
     * Shows a search field above the options that filters them by label and description
     */
    search?: boolean
    /**
     * Shows the value without letting it be changed
     */
    readonly?: boolean
  }
>()

const modelValue = defineModel<TValue>({ required: true })

const slots = defineSlots<{
  /**
   * Replaces the label text
   */
  label?(): unknown
  /**
   * Replaces the image and label of an option, in the list and in the field
   */
  option?(props: { option: Exclude<SelectOption<TValue>, SelectHeader | SelectDivider> }): unknown
}>()

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

const selectableOptions = computed(() => props.options.filter(isSelectable))

const selectedOption = computed(() => selectableOptions.value.find((option) => option.value === modelValue.value))

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
      triggerElement.value?.focus()
    }
  },
  { flush: 'post' }
)

function toggle() {
  if (props.readonly || selectableOptions.value.length === 0) return

  query.value = ''
  open.value = !open.value
}

function close() {
  open.value = false
}

function select(value: TValue) {
  modelValue.value = value

  validationVisible.value = true

  close()
}

function selectFirstMatch() {
  const option = matchingOptions.value.find(isSelectable)

  if (option) {
    select(option.value)
  }
}
</script>
