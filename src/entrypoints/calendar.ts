import '~/core/sentry'
import '~/styles/main.css'
import CalendarPage from '~/pages/calendar/CalendarPage.vue'
import { createPage } from '~/pages/pages'

void createPage({ name: 'calendar', requires: ['translations_monsters', 'translations_general'] }, CalendarPage)
