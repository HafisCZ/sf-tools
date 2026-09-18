import { onScopeDispose, watch, type Ref } from 'vue'

const FOCUSABLE_SELECTOR = ['a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'].join(', ')

const traps: HTMLElement[] = []

function getInteractableContainer() {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-content-container]:not([aria-hidden="true"])')).at(-1)
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => element.offsetParent !== null)
}

function handleTrapKeydown(event: KeyboardEvent) {
  if (event.key !== 'Tab') return

  const container = getInteractableContainer()
  if (!container) return

  const focusables = getFocusableElements(container)
  const first = focusables.at(0)
  const last = focusables.at(-1)
  if (!first || !last) return

  const active = focusables.find((element) => element === document.activeElement)

  if (event.shiftKey && (!active || active === first)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (!active || active === last)) {
    event.preventDefault()
    first.focus()
  }
}

function createTrap() {
  // Invisible layer that blocks clicks on the covered page
  const element = document.createElement('div')
  element.style.position = 'fixed'
  element.style.inset = '0'
  element.style.zIndex = '1000'

  document.body.append(element)

  if (traps.length === 0) {
    document.addEventListener('keydown', handleTrapKeydown, true)
  }

  traps.push(element)
}

function removeTrap() {
  traps.pop()?.remove()

  if (traps.length === 0) {
    document.removeEventListener('keydown', handleTrapKeydown, true)
  }
}

export function setCoveredElementsAsInert() {
  for (const element of document.querySelectorAll('main, [data-content-container]')) {
    element.setAttribute('aria-hidden', 'true')
  }

  createTrap()
}

export function unsetCoveredElementsAsInert() {
  Array.from(document.querySelectorAll('main[aria-hidden], [data-content-container][aria-hidden]')).at(-1)?.removeAttribute('aria-hidden')

  removeTrap()
}

export function useInert(open: Ref<boolean>) {
  watch(open, (value) => {
    if (value) {
      setCoveredElementsAsInert()
    } else {
      unsetCoveredElementsAsInert()
    }
  })

  onScopeDispose(() => {
    if (open.value) {
      unsetCoveredElementsAsInert()
    }
  })
}
