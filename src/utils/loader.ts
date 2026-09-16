import { h, shallowReactive } from 'vue'
import SFLoader from '@library/SFLoader.vue'
import { createVueApp } from './vue'

const state = shallowReactive<{ open: boolean; percent: number | undefined }>({
  open: false,
  percent: undefined
})

let mounted = false

// One overlay for the whole page, created the first time it opens
function mountLoader() {
  if (mounted) return

  mounted = true

  const element = document.createElement('div')
  document.body.append(element)

  createVueApp({
    render: () => (state.open ? h(SFLoader, { percent: state.percent }) : null)
  }).mount(element)
}

/**
 * Full page loading overlay that blocks the page. Pair `start` with `stop` in a `finally`.
 */
export function useLoader() {
  return {
    /**
     * Shows the overlay, with an empty progress bar when `progress` is set
     */
    start(options: { progress?: boolean } = {}) {
      mountLoader()

      state.percent = options.progress ? 0 : undefined
      state.open = true
    },
    /**
     * Moves the progress bar, `value` goes from 0 to 1
     */
    progress(value: number) {
      state.percent = Math.trunc(100 * value)
    },
    stop() {
      state.open = false
    }
  }
}
