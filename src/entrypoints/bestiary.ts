import '~/core/sentry'
import '~/styles/main.css'
import { createPage } from '~/pages/pages'
import BestiaryPage from '~/pages/bestiary/BestiaryPage.vue'

void createPage({ name: 'bestiary', requires: ['translations_monsters', 'translations_dungeons'] }, BestiaryPage)
