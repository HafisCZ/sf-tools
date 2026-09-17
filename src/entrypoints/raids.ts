import '~/styles/main.css'
import '~/legacy/bridge'
import { createPage } from '~/pages/pages'
import RaidsPage from '~/pages/raids/RaidsPage.vue'

void createPage({ name: 'raids', type: 'simulator', requires: ['translations_monsters', 'translations_general'] }, RaidsPage)
