<template>
  <div ref="container-ref" class="flex">
    <SFButton variant="ghost" icon aria-haspopup="menu" :aria-expanded="open" :aria-label="props.label" @click="toggle">
      <slot />
    </SFButton>
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
import SFButton from "./SFButton.vue"
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

// The root hugs the trigger button, so its box is the trigger's box
const containerElement = useTemplateRef("container-ref")

const position = useAnimationFramePosition(open, () => containerElement.value?.getBoundingClientRect())

useInert(open)

// Return focus to the trigger unless the user already moved it somewhere else
watch(
  open,
  (value) => {
    if (!value && document.activeElement === document.body) {
      containerElement.value?.querySelector("button")?.focus()
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
