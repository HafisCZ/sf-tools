import '~/core/sentry'
import '~/styles/main.css'
import FortressPage from '~/pages/fortress/FortressPage.vue'
import { createPage } from '~/pages/pages'

void createPage({ name: 'fortress', type: 'simulator' }, FortressPage)
