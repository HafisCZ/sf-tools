import '~/core/sentry'
import '~/styles/main.css'
import { createPage } from '~/pages/pages'
import SimulatorPage from '~/pages/simulator/SimulatorPage.vue'

void createPage({ name: 'simulator', type: 'simulator' }, SimulatorPage)
