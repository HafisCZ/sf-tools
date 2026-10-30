import '~/core/sentry'
import '~/styles/main.css'
import { createPage } from '~/pages/pages'
import DungeonsPage from '~/pages/dungeons/DungeonsPage.vue'

void createPage({ name: 'dungeons', type: 'simulator', requires: ['translations_monsters', 'translations_items'] }, DungeonsPage)
