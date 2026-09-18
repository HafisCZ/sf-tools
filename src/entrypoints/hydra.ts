import '~/core/sentry'
import '~/styles/main.css'
import HydraPage from '~/pages/hydra/HydraPage.vue'
import { createPage } from '~/pages/pages'

void createPage({ name: 'hydra', type: 'simulator' }, HydraPage)
