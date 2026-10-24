import { init } from '@sentry/vue'

init({
  dsn: 'https://b14c71c074fc1cad39dbbb467248263c@o496093.ingest.us.sentry.io/4512125415260160',
  enabled: import.meta.env.PROD,
  maxBreadcrumbs: 50,
  environment: 'production',
  release: __BUILD_INFO__?.hash,
  // Every Vue app gets its error handler in createVueApp, there is no app to pass here yet
  integrations: (integrations) => integrations.filter((integration) => integration.name !== 'Vue')
})
