import '~/styles/main.css'
import '~/legacy/bridge'
import UnderworldPage from '~/pages/underworld/UnderworldPage.vue'
import { createPage } from '~/pages/pages'

void createPage({ name: 'underworld', type: 'simulator' }, UnderworldPage)
