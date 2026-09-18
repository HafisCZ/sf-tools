import '~/styles/main.css'
import '~/legacy/bridge'
import { createPage } from '~/pages/pages'
import DungeonsPage from '~/pages/dungeons/DungeonsPage.vue'

void createPage({ name: 'dungeons', type: 'simulator', requires: ['translations_monsters'] }, DungeonsPage)
