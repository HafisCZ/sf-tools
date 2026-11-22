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
      <div v-else class="flex flex-col gap-8">
        <section v-for="section in sections" :key="section.key" class="flex flex-col gap-3">
          <SFHeading level="2" type="accent" class="text-[15px]! font-black! tracking-[0.08em] uppercase">{{ localize(`groups.${section.key}`) }}</SFHeading>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ToolCard
              v-for="tool in section.tools"
              :key="tool.href"
              :href="tool.href"
              :title="tool.title"
              :author="tool.author"
              :description="tool.description"
              :picture="tool.picture"
              :icon="tool.icon"
              :tag="tool.tag"
              :external="tool.external"
              :favorite="favorites.includes(tool.href)"
              :managing="managing"
              @favorite="toggleFavorite(tool.href)"
            />
          </div>
        </section>
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
import SFHeading from '@library/SFHeading.vue'
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
  author?: string
  description?: string
  picture?: string
  icon?: string
  tag?: string
  group: string
  external: boolean
}

const TOOLS = [
  { key: 'stats', href: 'stats.html', group: 'planning' },
  { key: 'dungeons', href: 'dungeons.html', group: 'simulators' },
  { key: 'pets', href: 'pets.html', group: 'simulators' },
  { key: 'hellevator', href: 'hellevator.html', group: 'simulators' },
  { key: 'scrapbook', href: 'scrapbook.html', group: 'planning' },
  { key: 'simulator', href: 'simulator.html', group: 'simulators' },
  { key: 'inventory', href: 'inventory.html', group: 'planning' },
  { key: 'guilds', href: 'guilds.html', group: 'simulators' },
  { key: 'hydra', href: 'hydra.html', group: 'simulators' },
  { key: 'underworld', href: 'underworld.html', group: 'simulators' },
  { key: 'blacksmith', href: 'blacksmith.html', group: 'planning' },
  { key: 'attributes', href: 'attributes.html', group: 'planning' },
  { key: 'fortress', href: 'fortress.html', group: 'simulators' },
  { key: 'raids', href: 'raids.html', group: 'simulators' },
  { key: 'idle', href: 'idle.html', group: 'planning' },
  { key: 'calendar', href: 'calendar.html', group: 'planning' },
  { key: 'bestiary', href: 'bestiary.html', group: 'planning' },
  { key: 'build_planner', href: 'build-planner.html', group: 'planning' },
  { key: 'dungeon_break', href: 'dungeon-break.html', author: 'Borro', group: 'planning' },
  { key: 'hell_raids', href: 'hell-raids.html', group: 'planning' },
  { title: 'Hellevator', href: 'https://hellevatorrewards.12hp.de/', author: 'ÐonMuErte', icon: '/res/tools/hellevator-rewards.webp', group: 'community' },
  { title: 'Smith Simulator', href: 'https://snfsmithsim.12hp.de/', author: 'ÐonMuErte', icon: '/res/tools/smith-simulator.webp', group: 'community' },
  { title: 'Portrait Maker', href: 'https://sfportrait.12hp.de/', author: 'ÐonMuErte', icon: '/res/tools/portrait-maker.webp', group: 'community' },
  { title: 'Top List', href: 'https://nachbarsf.github.io/Top-List/', author: 'Deinnachbar', group: 'community' },
  // Non-breaking space
  { title: 'SF Poradnik', href: 'https://en.sfporadnik.pl/', author: 'ThreeG', icon: '/res/tools/sf-poradnik.webp', group: 'community' },
  { title: 'Rune Bonuses', href: 'https://bit.ly/Rune-bonuses', author: 'Zorago', icon: '/res/tools/rune-bonuses.webp', group: 'community' },
  { title: 'Gold Pit', href: 'https://goldpit.12hp.de/', author: 'ÐonMuErte & KaYa43v3r', icon: '/res/tools/gold-pit.webp', group: 'community' },
  { title: 'LD Gadget', href: 'https://ldgadget.12hp.de/', author: 'ÐonMuErte & KaYa43v3r & AyWolf', icon: '/res/tools/ld-gadget.webp', group: 'community' },
  { title: 'Enfants du Chaos', href: 'https://www.enfantsduchaos.fr/', author: 'Demetra', icon: '/res/tools/enfants-du-chaos.webp', group: 'community' },
  { title: 'SFSimulator', href: 'https://sfsimulator.xyz/', author: 'Abus3r', icon: '/res/tools/sfsimulator.webp', group: 'community' },
  { title: 'Aura Calculator', href: 'https://nachbarsf.github.io/Aura-Calculator/', author: 'Deinnachbar', icon: '/res/tools/aura-calculator.webp', group: 'community' },
  { key: 'wiki', href: 'https://github.com/HafisCZ/sf-tools/wiki', group: 'info' },
  { key: 'analyzer', href: 'analyzer.html', group: 'planning' },
  { key: 'changelog', href: 'changelog.html', group: 'info' }
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
      return { href: tool.href, title: tool.title, description: tool.author, icon: tool.icon, group: tool.group, external: true }
    } else {
      return {
        href: tool.href,
        title: localize(`${tool.key}.title`),
        author: tool.author,
        description: localize(`${tool.key}.desc`),
        picture: `/res/tools/${tool.key}.webp`,
        tag: tool.key === 'dungeon_break' || tool.key === 'hell_raids' ? localize(`${tool.key}.wip`) : undefined,
        group: tool.group,
        external: false
      }
    }
  })
)

const GROUPS = ['simulators', 'planning', 'community', 'info']

const sections = computed(() => {
  const favoriteTools = favorites.value.map((href) => tools.value.find((tool) => tool.href === href)).filter((tool) => tool !== undefined)

  return [{ key: 'favorites', tools: favoriteTools }, ...GROUPS.map((group) => ({ key: group, tools: tools.value.filter((tool) => tool.group === group) }))].filter((section) => section.tools.length > 0)
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
