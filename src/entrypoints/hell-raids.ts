import '~/core/sentry'
import '~/styles/main.css'
import HellRaidsPage from '~/pages/hell-raids/HellRaidsPage.vue'
import { createPage } from '~/pages/pages'

void createPage({ name: 'hell-raids', type: 'simulator', requires: ['translations_monsters', 'translations_general'] }, HellRaidsPage)
