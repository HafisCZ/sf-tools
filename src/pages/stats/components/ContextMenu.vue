<template>
  <Teleport to="body">
    <SFDropdownMenu v-if="source && position" :items="menuItems" :anchor="position" float="right" position="right" @close="close" @mouseenter="stopTimer" @mouseleave="startTimer" />
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef } from 'vue'
import SFDropdownMenu from '@library/SFDropdownMenu.vue'
import { type DropdownItem } from '@utils/components'
import { useAnimationFramePosition } from '@utils/position'
import { type ContextMenuItem } from '~/pages/stats/stats'

defineOptions({
  name: 'ContextMenu'
})

const props = defineProps<{
  /**
   * Items of the menu, each action gets the element the menu was opened on
   */
  items: ContextMenuItem[]
}>()

defineExpose({
  open: openMenu
})

const HIDE_DELAY = 1500

const source = shallowRef<HTMLElement | null>(null)

const isOpen = computed(() => source.value !== null)

const position = useAnimationFramePosition(isOpen, () => source.value?.getBoundingClientRect())

const menuItems = computed<DropdownItem[]>(() =>
  props.items.map((item) => ({
    label: item.label,
    action: () => {
      if (source.value) {
        item.action(source.value)
      }
    }
  }))
)

let timer: ReturnType<typeof setTimeout> | undefined

onBeforeUnmount(stopTimer)

function openMenu(element: HTMLElement) {
  source.value = element

  stopTimer()
  startTimer()
}

function close() {
  source.value = null

  stopTimer()
}

function startTimer() {
  timer ??= setTimeout(close, HIDE_DELAY)
}

function stopTimer() {
  clearTimeout(timer)

  timer = undefined
}
</script>
