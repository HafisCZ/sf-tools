import '~/styles/main.css'
import '~/legacy/bridge'
import CalendarPage from '~/pages/calendar/CalendarPage.vue'
import { createPage } from '~/pages/pages'

void createPage({ name: 'calendar', requires: ['translations_monsters', 'translations_general'] }, CalendarPage)
