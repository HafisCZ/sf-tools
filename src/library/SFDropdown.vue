<template>
  <div ref="container-ref" class="flex">
    <SFButton :variant="props.variant" icon class="min-h-9.5 min-w-9.5" :disabled="props.disabled" aria-haspopup="menu" :aria-expanded="open" :aria-label="props.label" @click="toggle">
      <slot />
    </SFButton>
    <Teleport to="body">
      <SFDropdownMenu v-if="open && position" :items="props.items" :anchor="position" :float="props.float" position="bottom" @close="close" />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue'
import { useInert } from '@utils/interactions'
import { useAnimationFramePosition } from '@utils/position'
import { type DropdownItem } from '@utils/components'
import SFButton from './SFButton.vue'
import SFDropdownMenu from './SFDropdownMenu.vue'

defineOptions({
  name: 'SFDropdown'
})

const props = withDefaults(
  defineProps<{
    /**
     * Items shown in the menu, with optional header rows and dividers between them
     */
    items: DropdownItem[]
    /**
     * Accessible name of the trigger button
     */
    label: string
    /**
     * Direction the menu grows in: `right` starts at the trigger's left edge, `left` ends at its right edge
     */
    float?: 'right' | 'left'
    /**
     * Visual style of the trigger button
     */
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
    /**
     * Disables the trigger button, `'loading'` also shows a spinner over its content
     */
    disabled?: boolean | 'loading'
  }>(),
  {
    float: 'right',
    variant: 'ghost'
  }
)

const open = ref(false)

const containerElement = useTemplateRef('container-ref')

const position = useAnimationFramePosition(open, () => containerElement.value?.getBoundingClientRect())

useInert(open)

watch(
  open,
  (value) => {
    if (!value && document.activeElement === document.body) {
      containerElement.value?.querySelector('button')?.focus()
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
</script>
