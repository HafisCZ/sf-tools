import { createApp, type Component } from 'vue'

let appCount = 0

/**
 * Creates a Vue application. Use this instead of calling `createApp` directly.
 */
export function createVueApp(component: Component, props?: Record<string, unknown> | null) {
  const app = createApp(component, props)

  // Dialogs and toasts are separate applications on the same page, so each needs its own `useId` prefix
  app.config.idPrefix = `v${appCount++}`

  return app
}
