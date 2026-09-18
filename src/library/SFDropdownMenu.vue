<template>
  <div ref="container-ref" data-content-container class="fixed z-[1001] max-h-96 min-w-40 overflow-y-auto rounded-md border border-line bg-surface p-1 text-white/90 shadow-xl" :class="{ invisible: !size }" :style="style" @keydown="moveFocus">
    <slot>
      <ul role="menu" class="flex flex-col">
        <template v-for="(item, index) in props.items" :key="index">
          <li v-if="!isSelectable(item)" :role="item.type === 'divider' ? 'separator' : 'presentation'" :class="item.type === 'divider' ? 'mx-1 my-1 border-t border-line' : 'px-3 pt-2 pb-1 text-xs font-bold text-white/50 uppercase'">
            {{ item.type === 'header' ? item.label : '' }}
          </li>
          <li v-else role="none">
            <button
              type="button"
              role="menuitem"
              class="flex w-full cursor-pointer items-center gap-3 rounded px-3 py-2 text-left outline-none enabled:hover:bg-surface-hover focus-visible:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
              :class="{ 'text-accent': item.active }"
              :disabled="item.disabled"
              @click="select(item.action)"
            >
              <template v-if="item.image">
                <SFIcon v-if="isIconName(item.image)" :name="item.image" :class="{ 'text-white/60': !item.active }" />
                <img v-else :src="item.image" alt="" class="h-4 w-6 rounded-sm object-contain" />
              </template>
              {{ item.label }}
            </button>
          </li>
        </template>
      </ul>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { isSelectable, type DropdownItem } from '@utils/components'
import { onClickOutsideOf } from '@utils/focus'
import { isIconName } from '@utils/icons'
import { pickVisibleAxisPosition, type Rectangle } from '@utils/position'
import SFIcon from './SFIcon.vue'

defineOptions({
  name: 'SFDropdownMenu'
})

const props = defineProps<{
  /**
   * Items shown in the menu, with optional header rows and dividers between them
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
      containerElement.value?.querySelector<HTMLElement>('input, [role="menuitem"]:not(:disabled)')?.focus()
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
  return Array.from(containerElement.value?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [])
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

function select(action: () => void) {
  action()

  close()
}
</script>
