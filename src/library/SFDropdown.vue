<template>
  <div>
    <button ref="trigger-ref" type="button" class="flex cursor-pointer items-center rounded-md p-2 transition hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent" aria-haspopup="menu" :aria-expanded="open" :aria-label="props.label" @click="toggle">
      <slot />
    </button>
    <Teleport to="body">
      <SFDropdownMenu v-if="open && position" :items="props.items" :anchor="position" :float="props.float" @close="close" />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef, watch } from "vue"
import { useInert } from "@utils/interactions"
import { useAnimationFramePosition } from "@utils/position"
import { type DropdownItem } from "@utils/components"
import SFDropdownMenu from "./SFDropdownMenu.vue"

defineOptions({
  name: "SFDropdown"
})

const props = withDefaults(
  defineProps<{
    /**
     * Items shown in the menu
     */
    items: DropdownItem[]
    /**
     * Accessible name of the trigger button
     */
    label: string
    /**
     * Direction the menu grows in: `right` starts at the trigger's left edge, `left` ends at its right edge
     */
    float?: "right" | "left"
  }>(),
  {
    float: "right"
  }
)

const open = ref(false)

const triggerElement = useTemplateRef("trigger-ref")

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
  { flush: "post" }
)

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}
</script>
