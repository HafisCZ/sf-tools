import '~/core/sentry'
import '~/styles/main.css'
import { createPage } from '~/pages/pages'
import BuildPlannerPage from '~/pages/build-planner/BuildPlannerPage.vue'

void createPage({ name: 'build-planner' }, BuildPlannerPage)
