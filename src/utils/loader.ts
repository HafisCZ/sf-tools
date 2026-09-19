import { h, shallowReactive } from 'vue'
import SFLoader from '@library/SFLoader.vue'
import { createVueApp } from './vue'

const state = shallowReactive<{ open: boolean; percent: number | undefined; onCancel: (() => void) | undefined }>({
  open: false,
  percent: undefined,
  onCancel: undefined
})

let mounted = false

function mountLoader() {
  if (mounted) return

  mounted = true

  const element = document.createElement('div')
  document.body.append(element)

  createVueApp({
    render: () => (state.open ? h(SFLoader, { percent: state.percent, cancellable: !!state.onCancel, onCancel: () => state.onCancel?.() }) : null)
  }).mount(element)
}

export function useLoader() {
  return {
    start(options: { progress?: boolean; onCancel?: () => void } = {}) {
      mountLoader()

      state.percent = options.progress ? 0 : undefined
      state.onCancel = options.onCancel
      state.open = true
    },
    progress(value: number) {
      state.percent = Math.trunc(100 * value)
    },
    stop() {
      state.open = false
    }
  }
}
