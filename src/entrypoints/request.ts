import '~/styles/main.css'
import '~/legacy/bridge'
import RequestPage from '~/pages/request/RequestPage.vue'
import { createPage } from '~/pages/pages'

void createPage({ name: 'request' }, RequestPage)
