import '~/styles/main.css'
import '~/legacy/bridge'
import IdlePage from '~/pages/idle/IdlePage.vue'
import { createPage } from '~/pages/pages'

void createPage({ name: 'idle' }, IdlePage)
