import '~/core/sentry'
import '~/styles/main.css'
import { createPage } from '~/pages/pages'
import TermsPage from '~/pages/terms/TermsPage.vue'

void createPage({ name: 'terms', startupDialogs: false }, TermsPage)
