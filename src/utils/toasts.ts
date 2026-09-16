import SFToast from '@library/SFToast.vue'
import { type ToastParams } from './components'
import { createVueApp } from './vue'

// Same display time as the legacy toasts in js/views/base.js
const DISPLAY_TIME = 6000
const FADE_TIME = 500

const CONTAINER_ID = 'sf-toast-container'

// Every toast goes into one container in the bottom left corner, created with the first toast
function getContainer() {
  let element = document.getElementById(CONTAINER_ID)
  if (element) return element

  element = document.createElement('div')
  element.id = CONTAINER_ID
  element.className = 'fixed bottom-4 left-4 z-[2000] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2'
  element.setAttribute('aria-live', 'polite')

  document.body.append(element)

  return element
}

/**
 * Shows a toast above the ones already shown. It fades out after 6 seconds, or disappears when clicked.
 */
export function useToast(params: ToastParams) {
  const element = document.createElement('div')
  element.className = 'opacity-0 transition-opacity duration-500'

  getContainer().insertAdjacentElement('afterbegin', element)

  let removed = false
  let timeout = setTimeout(fadeOut, DISPLAY_TIME)

  const app = createVueApp(SFToast, { ...params, onClose: remove })

  function fadeOut() {
    element.classList.replace('opacity-100', 'opacity-0')

    timeout = setTimeout(remove, FADE_TIME)
  }

  function remove() {
    if (removed) return

    removed = true

    clearTimeout(timeout)

    app.unmount()
    element.remove()
  }

  app.mount(element)

  // Next task, so the browser has drawn the hidden state and the fade in runs
  setTimeout(() => element.classList.replace('opacity-0', 'opacity-100'), 0)

  return { remove }
}

/**
 * Shows a toast with a green check
 */
export function useSuccessToast(title: string, message: string) {
  return useToast({ title, message, type: 'success' })
}

/**
 * Shows a toast with a red warning icon
 */
export function useErrorToast(title: string, message: string) {
  return useToast({ title, message, type: 'error' })
}
