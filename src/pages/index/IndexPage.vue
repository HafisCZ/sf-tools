<template>
  <div class="text-shadow-[0_0_10px_black]">
    <div class="fixed inset-0 -z-20 bg-page bg-[url(/res/backgrounds/request.webp)] bg-cover bg-center bg-blend-overlay" />
    <img :src="IMAGE" alt="" width="300" class="fixed bottom-0 left-8 -z-10" />

    <Page :opaque="false" width="1280px">
      <template #nav-right>
        <SFButton v-if="!showCredits" variant="ghost" icon :title="managing ? localize('manage_done') : localize('manage')" :aria-label="managing ? localize('manage_done') : localize('manage')" :aria-pressed="managing" @click="managing = !managing">
          <SFIcon :name="managing ? 'star-solid' : 'star'" :class="{ 'text-accent': managing }" />
        </SFButton>
      </template>

      <IndexCredits v-if="showCredits" />
      <div v-else class="grid auto-rows-fr grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
        <ToolCard v-for="tool in orderedTools" :key="tool.href" v-bind="tool" :favorite="favorites.includes(tool.href)" :managing="managing" @favorite="toggleFavorite(tool.href)" />
      </div>

      <template #footer-left>
        <SFParagraph v-if="BUILD_INFO">
          v{{ MAJOR_VERSION }}.{{ BUILD_INFO.version }}
          <br />
          Last updated on {{ formatDate(BUILD_INFO.timestamp) }} - {{ BUILD_INFO.message }}
        </SFParagraph>
      </template>

      <template #footer-right>
        <FooterLink icon="trophy" @click="toggleCredits">
          {{ localize('toggle') }}
        </FooterLink>
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
import { computed, ref } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFIcon from '@library/SFIcon.vue'
import SFParagraph from '@library/SFParagraph.vue'
import { useLocalize } from '@utils/localization'
import IndexCredits from './components/IndexCredits.vue'
import ToolCard from './components/ToolCard.vue'
import { MODULE_VERSION_MAJOR, Site } from '~/core/site'
import FooterCopyright from '~/pages/components/FooterCopyright.vue'
import FooterLink from '~/pages/components/FooterLink.vue'
import Page from '~/pages/Page.vue'

defineOptions({
  name: 'IndexPage'
})

type IndexTool = {
  href: string
  title: string
  description?: string
  subtitle?: string
  picture?: string
  icon?: string
  tag?: string
  external: boolean
}

const TOOLS = [
  { key: 'stats', href: 'stats.html' },
  { key: 'dungeons', href: 'dungeons.html' },
  { key: 'pets', href: 'pets.html' },
  { key: 'hellevator', href: 'hellevator.html' },
  { key: 'scrapbook', href: 'scrapbook.html' },
  { key: 'simulator', href: 'simulator.html' },
  { key: 'inventory', href: 'inventory.html' },
  { key: 'guilds', href: 'guilds.html' },
  { key: 'hydra', href: 'hydra.html' },
  { key: 'underworld', href: 'underworld.html' },
  { key: 'blacksmith', href: 'blacksmith.html' },
  { key: 'attributes', href: 'attributes.html' },
  { key: 'fortress', href: 'fortress.html' },
  { key: 'raids', href: 'raids.html' },
  { key: 'idle', href: 'idle.html' },
  { key: 'calendar', href: 'calendar.html' },
  { key: 'bestiary', href: 'bestiary.html' },
  { key: 'build_planner', href: 'build-planner.html' },
  { key: 'dungeon_break', href: 'dungeon-break.html', author: 'Borro' },
  { key: 'hell_raids', href: 'hell-raids.html' },
  { title: 'Hellevator', href: 'https://hellevatorrewards.12hp.de/', author: 'ÐonMuErte', icon: '/res/tools/hellevator-rewards.webp' },
  { title: 'Smith Simulator', href: 'https://snfsmithsim.12hp.de/', author: 'ÐonMuErte', icon: '/res/tools/smith-simulator.webp' },
  { title: 'Portrait Maker', href: 'https://sfportrait.12hp.de/', author: 'ÐonMuErte', icon: '/res/tools/portrait-maker.webp' },
  { title: 'Top List', href: 'https://nachbarsf.github.io/Top-List/', author: 'Deinnachbar' },
  // Non-breaking space
  { title: 'SF Poradnik', href: 'https://en.sfporadnik.pl/', author: 'ThreeG', icon: '/res/tools/sf-poradnik.webp' },
  { title: 'Rune Bonuses', href: 'https://bit.ly/Rune-bonuses', author: 'Zorago', icon: '/res/tools/rune-bonuses.webp' },
  { title: 'Gold Pit', href: 'https://goldpit.12hp.de/', author: 'ÐonMuErte & KaYa43v3r', icon: '/res/tools/gold-pit.webp' },
  { title: 'LD Gadget', href: 'https://ldgadget.12hp.de/', author: 'ÐonMuErte & KaYa43v3r & AyWolf', icon: '/res/tools/ld-gadget.webp' },
  { title: 'Enfants du Chaos', href: 'https://www.enfantsduchaos.fr/', author: 'Demetra', icon: '/res/tools/enfants-du-chaos.webp' },
  { title: 'SFSimulator', href: 'https://sfsimulator.xyz/', author: 'Abus3r', icon: '/res/tools/sfsimulator.webp' },
  { title: 'Aura Calculator', href: 'https://nachbarsf.github.io/Aura-Calculator/', author: 'Deinnachbar', icon: '/res/tools/aura-calculator.webp' },
  { key: 'wiki', href: 'https://github.com/HafisCZ/sf-tools/wiki' },
  { key: 'analyzer', href: 'analyzer.html' },
  { key: 'changelog', href: 'changelog.html' }
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

const managing = ref(false)

const favorites = ref(Site.options.favorite_tools)

const tools = computed<IndexTool[]>(() =>
  TOOLS.map((tool) => {
    if (tool.key === undefined) {
      return { href: tool.href, title: tool.title, subtitle: tool.author, icon: tool.icon, external: true }
    } else {
      return {
        href: tool.href,
        title: localize(`${tool.key}.title`),
        description: localize(`${tool.key}.desc`),
        picture: `/res/tools/${tool.key}.webp`,
        tag: tool.key === 'dungeon_break' || tool.key === 'hell_raids' ? localize(`${tool.key}.wip`) : undefined,
        subtitle: tool.author,
        external: false
      }
    }
  })
)

const orderedTools = computed(() => {
  const favoriteTools = favorites.value.map((href) => tools.value.find((tool) => tool.href === href)).filter((tool) => tool !== undefined)

  return [...favoriteTools, ...tools.value.filter((tool) => !favorites.value.includes(tool.href))]
})

function toggleFavorite(href: string) {
  favorites.value = favorites.value.includes(href) ? favorites.value.filter((entry) => entry !== href) : [...favorites.value, href]
  Site.options.favorite_tools = favorites.value
}

function toggleCredits() {
  showCredits.value = !showCredits.value
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }).replace(' at', '')
}
</script>
