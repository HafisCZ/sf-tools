import '~/core/sentry'
import '~/styles/main.css'
import { createPage } from '~/pages/pages'
import PrivacyPage from '~/pages/privacy/PrivacyPage.vue'

void createPage({ name: 'privacy', startupDialogs: false }, PrivacyPage)
