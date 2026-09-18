import { onScopeDispose, type Ref } from 'vue'

export function onClickOutsideOf(
  elements: Readonly<Ref<HTMLElement | null | undefined>>[],
  callback: () => void,
  options: {
    esc?: boolean
  } = {}
) {
  function handleClick(event: MouseEvent) {
    const target = event.target
    if (!(target instanceof Node)) return

    if (!elements.some((element) => element.value?.contains(target))) {
      callback()
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      callback()
    }
  }

  window.addEventListener('click', handleClick, true)

  if (options.esc) {
    window.addEventListener('keydown', handleKeydown, true)
  }

  onScopeDispose(() => {
    window.removeEventListener('click', handleClick, true)
    window.removeEventListener('keydown', handleKeydown, true)
  })
}
