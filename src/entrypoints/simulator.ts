import '~/styles/main.css'
import '~/legacy/bridge'
import { createPage } from '~/pages/pages'
import SimulatorPage from '~/pages/simulator/SimulatorPage.vue'

void createPage({ name: 'simulator', type: 'simulator' }, SimulatorPage)
