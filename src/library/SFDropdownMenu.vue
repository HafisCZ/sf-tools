<template>
  <div ref="container-ref" data-content-container class="fixed z-[1001] max-h-96 min-w-40 overflow-y-auto rounded-md border border-line bg-surface p-1 text-white/90 shadow-xl" :class="{ invisible: !size }" :style="style" @keydown="moveFocus">
    <slot>
      <ul role="menu" class="flex flex-col">
        <li v-for="item in props.items" :key="item.label" role="none">
          <button type="button" role="menuitem" class="flex w-full cursor-pointer items-center gap-3 rounded px-3 py-2 text-left outline-none hover:bg-surface-hover focus-visible:bg-surface-hover" :class="{ 'text-accent': item.active }" @click="select(item)">
            <img v-if="item.image" :src="item.image" alt="" class="h-4 w-6 rounded-sm object-contain" />
            {{ item.label }}
          </button>
        </li>
      </ul>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { onClickOutsideOf } from '@utils/focus'
import { pickVisibleAxisPosition, type Rectangle } from '@utils/position'
import { type DropdownItem } from '@utils/components'

defineOptions({
  name: 'SFDropdownMenu'
})

const props = defineProps<{
  /**
   * Items shown in the menu
   */
  items?: DropdownItem[]
  /**
   * Viewport edges of the element the menu opens from
   */
  anchor: Rectangle
  /**
   * Direction the menu grows in: `right` starts at the anchor's left edge, `left` ends at its right edge
   */
  float: 'right' | 'left'
  /**
   * Side of the anchor the menu opens on: under it, or next to it aligned with its top edge
   */
  position: 'bottom' | 'right'
  /**
   * Width in pixels
   */
  width?: number
}>()

const emit = defineEmits<{
  close: []
}>()

const GAP = 4

const size = shallowRef<{ width: number; height: number }>()

const containerElement = useTemplateRef('container-ref')

const resizeObserver = new ResizeObserver(() => {
  const rectangle = containerElement.value?.getBoundingClientRect()

  if (rectangle) {
    size.value = { width: rectangle.width, height: rectangle.height }
  }
})

const style = computed(() => {
  const width = props.width === undefined ? undefined : `${props.width}px`

  if (!size.value) {
    return { top: '0px', left: '0px', width }
  }

  const anchor = props.anchor
  const measured = size.value

  if (props.position === 'right') {
    const sideLeft = pickVisibleAxisPosition(anchor.right + GAP, anchor.left - measured.width - GAP, measured.width, window.innerWidth)
    const sideTop = pickVisibleAxisPosition(anchor.top, anchor.bottom - measured.height, measured.height, window.innerHeight)

    return { top: `${sideTop}px`, left: `${sideLeft}px`, width }
  }

  const left = props.float === 'right' ? pickVisibleAxisPosition(anchor.left, anchor.right - measured.width, measured.width, window.innerWidth) : pickVisibleAxisPosition(anchor.right - measured.width, anchor.left, measured.width, window.innerWidth)

  const top = pickVisibleAxisPosition(anchor.bottom + GAP, anchor.top - measured.height - GAP, measured.height, window.innerHeight)

  return { top: `${top}px`, left: `${left}px`, width }
})

// Waits until the menu is visible, hidden elements can't take focus
watch(
  size,
  (value, previous) => {
    if (value && !previous) {
      containerElement.value?.querySelector<HTMLElement>('input, [role="menuitem"]')?.focus()
    }
  },
  { flush: 'post' }
)

onMounted(() => {
  if (containerElement.value) {
    resizeObserver.observe(containerElement.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver.disconnect()
})

onClickOutsideOf([containerElement], close, { esc: true })

function close() {
  emit('close')
}

function getMenuItems() {
  return Array.from(containerElement.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
}

function moveFocus(event: KeyboardEvent) {
  if (event.target instanceof HTMLInputElement && (event.key === 'Home' || event.key === 'End')) return

  const menuItems = getMenuItems()
  const index = menuItems.findIndex((element) => element === document.activeElement)

  let target: HTMLElement | undefined

  switch (event.key) {
    case 'ArrowDown':
      target = menuItems.at((index + 1) % menuItems.length)
      break
    case 'ArrowUp':
      target = menuItems.at(index <= 0 ? -1 : index - 1)
      break
    case 'Home':
      target = menuItems.at(0)
      break
    case 'End':
      target = menuItems.at(-1)
      break
    default:
      return
  }

  event.preventDefault()
  target?.focus()
}

function select(item: DropdownItem) {
  item.action()

  close()
}
</script>
