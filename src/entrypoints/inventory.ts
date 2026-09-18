import '~/styles/main.css'
import '~/legacy/bridge'
import { createPage } from '~/pages/pages'
import InventoryPage from '~/pages/inventory/InventoryPage.vue'

void createPage({ name: 'inventory', requires: ['translations_items'] }, InventoryPage)
