import { type Component } from 'vue'
import { useDialog } from '@utils/dialogs'
import { loadTranslations } from '@utils/localization'
import { createVueApp } from '@utils/vue'
import AnnouncementDialog from './dialogs/AnnouncementDialog.vue'
import ChangelogDialog from './dialogs/ChangelogDialog.vue'
import TermsDialog from './dialogs/TermsDialog.vue'

// Keep in sync with TermsAndConditionsDialog.VERSION in js/views/base.js
const TERMS_VERSION = 2

/**
 * Mounts a converted page into `#app` once its translations are loaded
 */
export async function createPage(metadata: SiteMetadata, component: Component) {
  Site.ready(metadata, () => {})

  await loadTranslations(metadata.requires)

  createVueApp(component).mount('#app')

  openStartupDialogs()

  Site.run()
}

// Queues the dialogs every page shows on load, with the same checks and order as the
// DOMContentLoaded handler in js/views/base.js
function openStartupDialogs() {
  if (!StoreWrapper.isAvailable()) return

  if (Site.options.terms_accepted !== TERMS_VERSION) {
    useDialog(TermsDialog, { version: TERMS_VERSION })
  }

  if (Site.options.version_accepted !== MODULE_VERSION) {
    useDialog(ChangelogDialog, {})
  }

  if (Site.options.announcement_accepted > 0) {
    // Update viewed announcements from the legacy setting
    Site.options.announcements_viewed = ANNOUNCEMENTS.slice(0, Site.options.announcement_accepted).map((announcement) => announcement.id)
    Site.options.announcement_accepted = -1
  }

  const announcements = ANNOUNCEMENTS.filter((announcement) => !announcement.disabled && !Site.options.announcements_viewed.includes(announcement.id) && (!announcement.for || announcement.for.some((page) => Site.is(page))))

  for (const announcement of announcements) {
    useDialog(AnnouncementDialog, { announcement })
  }
}
