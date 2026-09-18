import { init } from '@sentry/vue'

init({
  dsn: 'https://c545f98538e446fd9b2ea2d2a4103273@o496093.ingest.sentry.io/5569896',
  enabled: import.meta.env.PROD,
  maxBreadcrumbs: 50,
  environment: window.location.hostname.startsWith('beta.') ? 'beta' : 'production',
  // Every Vue app gets its error handler in createVueApp, there is no app to pass here yet
  integrations: (integrations) => integrations.filter((integration) => integration.name !== 'Vue')
})
