import { createApp, type Component } from 'vue'

/**
 * Creates a Vue application. Use this instead of calling `createApp` directly.
 */
export function createVueApp(component: Component, props?: Record<string, unknown> | null) {
  return createApp(component, props)
}
