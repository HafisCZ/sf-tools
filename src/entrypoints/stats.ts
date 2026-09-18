import '~/styles/main.css'
import { createPage } from '~/pages/pages'
import StatsPage from '~/pages/stats/StatsPage.vue'

void createPage({ name: 'stats', requires: ['translations_items', 'translations_general'] }, StatsPage)
