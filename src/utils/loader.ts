import { h, shallowReactive } from 'vue'
import SFLoader from '@library/SFLoader.vue'
import { createVueApp } from './vue'

const state = shallowReactive<{ open: boolean; percent: number | undefined }>({
  open: false,
  percent: undefined
})

let mounted = false

function mountLoader() {
  if (mounted) return

  mounted = true

  const element = document.createElement('div')
  document.body.append(element)

  createVueApp({
    render: () => (state.open ? h(SFLoader, { percent: state.percent }) : null)
  }).mount(element)
}

export function useLoader() {
  return {
    start(options: { progress?: boolean } = {}) {
      mountLoader()

      state.percent = options.progress ? 0 : undefined
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
