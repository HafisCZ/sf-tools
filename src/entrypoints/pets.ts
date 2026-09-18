import '~/styles/main.css'
import '~/legacy/bridge'
import { createPage } from '~/pages/pages'
import PetsPage from '~/pages/pets/PetsPage.vue'

void createPage({ name: 'pets', type: 'simulator', requires: ['translations_monsters'] }, PetsPage)
