import { onScopeDispose, shallowRef, watch, type Ref } from 'vue'

export type Rectangle = {
  top: number
  bottom: number
  left: number
  right: number
}

function isSameRectangle(first: Rectangle | undefined, second: Rectangle | undefined) {
  return first?.top === second?.top && first?.bottom === second?.bottom && first?.left === second?.left && first?.right === second?.right
}

export function useAnimationFramePosition(open: Ref<boolean>, getter: () => Rectangle | undefined) {
  const position = shallowRef<Rectangle>()

  let frame = 0

  function update() {
    const value = getter()

    if (!isSameRectangle(value, position.value)) {
      position.value = value
    }

    frame = requestAnimationFrame(update)
  }

  function stop() {
    cancelAnimationFrame(frame)
  }

  watch(
    open,
    (value) => {
      if (value) {
        update()
      } else {
        stop()
      }
    },
    { immediate: true }
  )

  onScopeDispose(stop)

  return position
}

export function pickVisibleAxisPosition(preferred: number, fallback: number, size: number, limit: number) {
  if (preferred >= 0 && preferred + size <= limit) {
    return preferred
  } else if (fallback >= 0 && fallback + size <= limit) {
    return fallback
  } else {
    return Math.max(0, Math.min(preferred, limit - size))
  }
}
