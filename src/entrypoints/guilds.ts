import '~/styles/main.css'
import '~/legacy/bridge'
import GuildsPage from '~/pages/guilds/GuildsPage.vue'
import { createPage } from '~/pages/pages'

void createPage({ name: 'guilds', type: 'simulator' }, GuildsPage)
