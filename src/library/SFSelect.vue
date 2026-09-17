<template>
  <div class="flex flex-col gap-1.5">
    <label :id="labelId" :for="id" class="font-bold text-white">{{ props.label }}</label>
    <button
      :id="id"
      ref="trigger-ref"
      type="button"
      class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2 text-left leading-5 text-white/90 outline-none focus-visible:border-accent"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-labelledby="`${labelId} ${valueId}`"
      @click="toggle"
    >
      <span :id="valueId">{{ selectedLabel }}</span>
      <SFIcon name="chevron-down" class="text-white/60" />
    </button>
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
import SFDropdownMenu from './SFDropdownMenu.vue'
import SFIcon from './SFIcon.vue'

defineOptions({
  name: 'SFSelect'
})

const props = defineProps<{
  /**
   * Text shown above the field, also its accessible name
   */
  label: string
  /**
   * Options to pick from
   */
  options: SelectOption[]
}>()

const modelValue = defineModel<string>({ required: true })

const id = useId()
const labelId = useId()
const valueId = useId()

const open = ref(false)

const triggerElement = useTemplateRef('trigger-ref')

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
}
</script>
