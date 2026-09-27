import '~/core/sentry'
import '~/styles/main.css'
import { createPage } from '~/pages/pages'
import ScrapbookPage from '~/pages/scrapbook/ScrapbookPage.vue'

void createPage({ name: 'scrapbook', requires: ['translations_items'] }, ScrapbookPage)
