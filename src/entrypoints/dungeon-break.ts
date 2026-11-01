import '~/core/sentry'
import '~/styles/main.css'
import { createPage } from '~/pages/pages'
import DungeonBreakPage from '~/pages/dungeon-break/DungeonBreakPage.vue'

void createPage({ name: 'dungeon-break', type: 'simulator', requires: ['translations_monsters'] }, DungeonBreakPage)
