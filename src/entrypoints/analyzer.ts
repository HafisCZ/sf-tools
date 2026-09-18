import '~/styles/main.css'
import '~/legacy/bridge'
import { createPage } from '~/pages/pages'
import AnalyzerPage from '~/pages/analyzer/AnalyzerPage.vue'

void createPage({ name: 'analyzer', requires: ['translations_monsters'] }, AnalyzerPage)
