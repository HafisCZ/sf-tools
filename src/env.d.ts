// For oxlint, vue-tsc resolves the real files
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent
  export default component
}

declare const __BUILD_INFO__: {
  hash: string
  version: number
  timestamp: number
  message: string
} | null
