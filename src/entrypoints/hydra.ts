import '~/styles/main.css'
import '~/legacy/bridge'
import HydraPage from '~/pages/hydra/HydraPage.vue'
import { createPage } from '~/pages/pages'

void createPage({ name: 'hydra', type: 'simulator' }, HydraPage)
