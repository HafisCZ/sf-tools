<template>
  <div class="text-shadow-[0_0_10px_black]">
    <div class="fixed inset-0 -z-20 bg-page bg-[url(/res/backgrounds/request.webp)] bg-cover bg-center bg-blend-overlay" />
    <img :src="IMAGE" alt="" width="300" class="fixed bottom-0 left-8 -z-10" />

    <Page :opaque="false">
      <IndexCredits v-if="showCredits" />
      <template v-else>
        <div class="grid grid-cols-1 gap-7 md:grid-cols-4">
          <ToolCard v-for="tool in TOOLS" :key="tool.key" :href="tool.href" :title="localize(`${tool.key}.title`)" :description="localize(`${tool.key}.desc`)" :badge="tool.key === 'temp' ? localize('temp.temporary') : undefined" />
        </div>
        <SFHeading level="2" type="accent" class="mt-[53px] mb-[27px] text-center">{{ localize('others') }}</SFHeading>
        <div class="grid grid-cols-1 gap-7 md:grid-cols-4">
          <ToolCard v-for="tool in COMMUNITY_TOOLS" :key="tool.href" :href="tool.href" :title="tool.title" :author="tool.author" external />
        </div>
      </template>

      <template #footer-left>
        <SFParagraph v-if="BUILD_INFO">
          v{{ MAJOR_VERSION }}.{{ BUILD_INFO.version }}
          <br />
          Last updated on {{ formatDate(BUILD_INFO.timestamp) }} - {{ BUILD_INFO.message }}
        </SFParagraph>
      </template>

      <template #footer-right>
        <span class="flex items-center gap-1.5">
          <FooterLink icon="trophy" @click="toggleCredits">
            {{ localize('toggle') }}
          </FooterLink>
          &bull;
          <FooterLink icon="message" @click="openFeedback">
            {{ localize('footer.report') }}
          </FooterLink>
        </span>
        <FooterLink icon="basket-shopping" href="https://home.sfgame.net">
          <span v-html="localize('footer.webshop#')" />
        </FooterLink>
        <span class="flex items-center gap-1.5">
          <FooterLink icon="language" href="https://crowdin.com/project/sftools">
            {{ localize('footer.crowdin') }}
          </FooterLink>
          &bull;
          <FooterLink icon="screwdriver-wrench" href="https://beta.sftools.mar21.eu">
            {{ localize('footer.beta') }}
          </FooterLink>
        </span>
        <FooterCopyright />
        <span v-html="localize('footer.notice#')" />
      </template>
    </Page>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SFHeading from '@library/SFHeading.vue'
import SFParagraph from '@library/SFParagraph.vue'
import { useDialog } from '@utils/dialogs'
import { useLocalize } from '@utils/localization'
import IndexCredits from './components/IndexCredits.vue'
import ToolCard from './components/ToolCard.vue'
import { MODULE_VERSION_MAJOR, Site } from '~/core/site'
import FeedbackDialog from '~/dialogs/FeedbackDialog.vue'
import FooterCopyright from '~/pages/components/FooterCopyright.vue'
import FooterLink from '~/pages/components/FooterLink.vue'
import Page from '~/pages/Page.vue'

defineOptions({
  name: 'IndexPage'
})

const TOOLS = [
  { key: 'stats', href: 'stats.html' },
  { key: 'temp', href: 'stats.html?temp' },
  { key: 'wiki', href: 'https://github.com/HafisCZ/sf-tools/wiki' },
  { key: 'changelog', href: 'changelog.html' },
  { key: 'inventory', href: 'inventory.html' },
  { key: 'idle', href: 'idle.html' },
  { key: 'calendar', href: 'calendar.html' },
  { key: 'attributes', href: 'attributes.html' },
  { key: 'simulator', href: 'simulator.html' },
  { key: 'guilds', href: 'guilds.html' },
  { key: 'pets', href: 'pets.html' },
  { key: 'dungeons', href: 'dungeons.html' },
  { key: 'hydra', href: 'hydra.html' },
  { key: 'hellevator', href: 'hellevator.html' },
  { key: 'analyzer', href: 'analyzer.html' },
  { key: 'blacksmith', href: 'blacksmith.html' },
  { key: 'underworld', href: 'underworld.html' },
  { key: 'fortress', href: 'fortress.html' },
  { key: 'raids', href: 'raids.html' }
]

const COMMUNITY_TOOLS = [
  { title: 'Hellevator', href: 'https://hellevatorrewards.12hp.de/', author: 'ÐonMuErte' },
  { title: 'Smith Simulator', href: 'https://snfsmithsim.12hp.de/', author: 'ÐonMuErte' },
  { title: 'Portrait Maker', href: 'https://sfportrait.12hp.de/', author: 'ÐonMuErte' },
  // Non-breaking space
  { title: 'SF Poradnik', href: 'https://en.sfporadnik.pl/', author: 'ThreeG' },
  { title: 'Rune Bonuses', href: 'https://bit.ly/Rune-bonuses', author: 'Zorago' },
  { title: 'Gold Pit', href: 'https://goldpit.12hp.de/', author: 'ÐonMuErte & KaYa43v3r' },
  { title: 'LD Gadget', href: 'https://ldgadget.12hp.de/', author: 'ÐonMuErte & KaYa43v3r & AyWolf' },
  { title: 'Enfants du Chaos', href: 'https://www.enfantsduchaos.fr/', author: 'Demetra' },
  { title: 'SFSimulator', href: 'https://sfsimulator.xyz/', author: 'Abus3r' }
]

const IMAGE = (() => {
  if (Site.isEvent('winter')) {
    return '/res/drvcs_winter.png'
  } else if (Site.isEvent('halloween')) {
    return '/res/drvcs_halloween.png'
  } else {
    return '/res/drvcs.png'
  }
})()

const MAJOR_VERSION = MODULE_VERSION_MAJOR

const BUILD_INFO = __BUILD_INFO__

const localize = useLocalize('index')

const showCredits = ref(false)

function toggleCredits() {
  showCredits.value = !showCredits.value
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }).replace(' at', '')
}

function openFeedback() {
  useDialog(FeedbackDialog, {})
}
</script>
