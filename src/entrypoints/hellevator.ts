import '~/styles/main.css'
import '~/legacy/bridge'
import HellevatorPage from '~/pages/hellevator/HellevatorPage.vue'
import { createPage } from '~/pages/pages'

void createPage({ name: 'hellevator', type: 'simulator' }, HellevatorPage)
