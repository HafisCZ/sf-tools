import { createApp, type Component } from 'vue'

let appCount = 0

export function createVueApp(component: Component, props?: Record<string, unknown> | null) {
  const app = createApp(component, props)

  // Every app on the page needs its own useId prefix
  app.config.idPrefix = `v${appCount++}`

  return app
}
