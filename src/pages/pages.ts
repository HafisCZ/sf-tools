import { type Component } from 'vue'
import { useDialog } from '@utils/dialogs'
import { loadTranslations } from '@utils/localization'
import { createVueApp } from '@utils/vue'
import { ANNOUNCEMENTS } from '~/site/changelog'
import { MODULE_VERSION, Site, type SiteMetadata } from '~/site/site'
import { StoreWrapper } from '~/site/store'
import AnnouncementDialog from './dialogs/AnnouncementDialog.vue'
import ChangelogDialog from './dialogs/ChangelogDialog.vue'
import SimulatorShopDialog from './dialogs/SimulatorShopDialog.vue'
import TermsDialog from './dialogs/TermsDialog.vue'

const TERMS_VERSION = 2

export async function createPage(metadata: SiteMetadata, component: Component) {
  // Site.run() replaces Site.data with this result, which keeps what the page set while mounting
  Site.ready(metadata, () => Site.data)

  await loadTranslations(metadata.requires)

  createVueApp(component).mount('#app')

  openStartupDialogs(metadata)

  Site.run()
}

function openStartupDialogs(metadata: SiteMetadata) {
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

  if (metadata.type === 'simulator' && Site.isEvent('april_fools_day')) {
    useDialog(SimulatorShopDialog, {})
  }
}
