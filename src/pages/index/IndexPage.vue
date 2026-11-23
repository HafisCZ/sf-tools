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
      <TransitionGroup v-else tag="div" move-class="transition-[transform] duration-300 ease-out" enter-from-class="opacity-0" enter-active-class="transition-opacity duration-200" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <template v-for="entry in entries" :key="entry.key">
          <ToolCard
            v-if="entry.tool"
            :href="entry.tool.href"
            :title="entry.tool.title"
            :author="entry.tool.author"
            :description="entry.tool.description"
            :picture="entry.tool.picture"
            :icon="entry.tool.icon"
            :tag="entry.tool.tag"
            :external="entry.tool.external"
            :favorite="favorites.includes(entry.tool.href)"
            :managing="managing"
            :movable="entry.top"
            :dragging="dragged === entry.key"
            @favorite="toggleFavorite(entry.tool.href)"
            @pointerdown="startDrag($event, entry)"
            @keydown="moveFavorite($event, entry)"
          />
          <SFHeading v-else level="2" type="accent" class="col-span-full mt-5 text-[15px]! font-black! tracking-[0.08em] uppercase first:mt-0">{{ localize(`groups.${entry.group}`) }}</SFHeading>
        </template>
      </TransitionGroup>

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
import { computed, nextTick, ref } from 'vue'
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

type IndexEntry = {
  key: string
  group?: string
  tool?: IndexTool
  top?: boolean
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
  { key: 'build_planner', href: 'build-planner.html', group: 'planning' },
  { key: 'dungeon_break', href: 'dungeon-break.html', author: 'Borro', group: 'planning' },
  { key: 'hell_raids', href: 'hell-raids.html', group: 'planning' },
  { key: 'hellevator_rewards', href: 'https://hellevatorrewards.12hp.de/', author: 'ÐonMuErte', icon: '/res/tools/hellevator-rewards.webp', group: 'community' },
  { key: 'smith_simulator', href: 'https://snfsmithsim.12hp.de/', author: 'ÐonMuErte', icon: '/res/tools/smith-simulator.webp', group: 'community' },
  { key: 'portrait_maker', href: 'https://sfportrait.12hp.de/', author: 'ÐonMuErte', icon: '/res/tools/portrait-maker.webp', group: 'community' },
  { key: 'top_list', href: 'https://nachbarsf.github.io/Top-List/', author: 'Deinnachbar', group: 'community' },
  { key: 'sf_poradnik', href: 'https://en.sfporadnik.pl/', author: 'ThreeG', icon: '/res/tools/sf-poradnik.webp', group: 'community' },
  { key: 'rune_bonuses', href: 'https://bit.ly/Rune-bonuses', author: 'Zorago', icon: '/res/tools/rune-bonuses.webp', group: 'community' },
  { key: 'gold_pit', href: 'https://goldpit.12hp.de/', author: 'ÐonMuErte & KaYa43v3r', icon: '/res/tools/gold-pit.webp', group: 'community' },
  { key: 'ld_gadget', href: 'https://ldgadget.12hp.de/', author: 'ÐonMuErte & KaYa43v3r & AyWolf', icon: '/res/tools/ld-gadget.webp', group: 'community' },
  { key: 'enfants_du_chaos', href: 'https://www.enfantsduchaos.fr/', author: 'Demetra', icon: '/res/tools/enfants-du-chaos.webp', group: 'community' },
  { key: 'sfsimulator', href: 'https://sfsimulator.xyz/', author: 'Abus3r', icon: '/res/tools/sfsimulator.webp', group: 'community' },
  { key: 'aura_calculator', href: 'https://nachbarsf.github.io/Aura-Calculator/', author: 'Deinnachbar', icon: '/res/tools/aura-calculator.webp', group: 'community' },
  { key: 'bestiary', href: 'bestiary.html', group: 'info' },
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
    if (tool.group === 'community') {
      return { href: tool.href, title: localize(`${tool.key}.title`), author: tool.author, description: localize(`${tool.key}.desc`), icon: tool.icon, group: tool.group, external: true }
    } else {
      return {
        href: tool.href,
        title: localize(`${tool.key}.title`),
        author: tool.author,
        description: localize(`${tool.key}.desc`),
        picture: `/res/tools/${tool.key}.webp`,
        tag: tool.key === 'dungeon_break' || tool.key === 'hell_raids' ? localize('wip') : undefined,
        group: tool.group,
        external: false
      }
    }
  })
)

const favoriteTools = computed(() => favorites.value.map((href) => tools.value.find((tool) => tool.href === href)).filter((tool) => tool !== undefined))

const GROUPS = ['simulators', 'planning', 'community', 'info']

const entries = computed<IndexEntry[]>(() => [...favoriteTools.value.map((tool) => ({ key: `favorite-${tool.href}`, tool, top: true })), ...GROUPS.flatMap((group) => [{ key: `heading-${group}`, group }, ...tools.value.filter((tool) => tool.group === group).map((tool) => ({ key: tool.href, tool }))])])

function toggleFavorite(href: string) {
  favorites.value = favorites.value.includes(href) ? favorites.value.filter((entry) => entry !== href) : [...favorites.value, href]
  Site.options.favorite_tools = favorites.value
}

const dragged = ref<string>()

function startDrag(event: PointerEvent, entry: IndexEntry) {
  if (!managing.value || !entry.top || entry.tool === undefined || event.button !== 0) {
    return
  }

  const href = entry.tool.href
  const element = event.currentTarget as HTMLElement
  const order = favoriteTools.value.map((tool) => tool.href)
  const slots = Array.from(element.parentElement?.children ?? [])
    .slice(0, order.length)
    .map((child) => {
      const rect = child.getBoundingClientRect()

      return { left: rect.left + window.scrollX, top: rect.top + window.scrollY, right: rect.right + window.scrollX, bottom: rect.bottom + window.scrollY }
    })

  let index = order.indexOf(href)
  let pointerX = event.pageX
  let pointerY = event.pageY

  const grabX = pointerX - slots[index].left
  const grabY = pointerY - slots[index].top

  function place() {
    element.style.translate = `${pointerX - grabX - slots[index].left}px ${pointerY - grabY - slots[index].top}px`
  }

  function blockClick(clickEvent: MouseEvent) {
    clickEvent.stopPropagation()
    clickEvent.preventDefault()
  }

  function move(moveEvent: PointerEvent) {
    pointerX = moveEvent.pageX
    pointerY = moveEvent.pageY

    if (dragged.value === undefined) {
      if (Math.hypot(pointerX - event.pageX, pointerY - event.pageY) < 6) {
        return
      }

      dragged.value = entry.key
      element.style.transition = ''
    }

    const target = slots.findIndex((slot) => pointerX >= slot.left && pointerX <= slot.right && pointerY >= slot.top && pointerY <= slot.bottom)

    if (target === -1 || target === index) {
      place()
    } else {
      order.splice(index, 1)
      order.splice(target, 0, href)
      index = target
      favorites.value = [...order]
      void nextTick(place)
    }
  }

  function stop() {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', stop)
    window.removeEventListener('pointercancel', stop)

    if (dragged.value !== undefined) {
      window.addEventListener('click', blockClick, true)
      setTimeout(() => window.removeEventListener('click', blockClick, true))

      element.style.transition = 'translate 200ms ease-out'
      element.style.translate = ''
      setTimeout(() => (element.style.transition = ''), 200)

      dragged.value = undefined
      Site.options.favorite_tools = favorites.value
    }
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', stop)
  window.addEventListener('pointercancel', stop)
}

function moveFavorite(event: KeyboardEvent, entry: IndexEntry) {
  if (!managing.value || !entry.top || entry.tool === undefined || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) {
    return
  }

  const href = entry.tool.href
  const order = favoriteTools.value.map((tool) => tool.href)
  const index = order.indexOf(href)
  const target = index + (event.key === 'ArrowLeft' ? -1 : 1)

  if (target >= 0 && target < order.length) {
    const button = event.target as HTMLElement

    event.preventDefault()
    order.splice(index, 1)
    order.splice(target, 0, href)
    favorites.value = order
    Site.options.favorite_tools = order
    void nextTick(() => button.focus())
  }
}

function toggleCredits() {
  showCredits.value = !showCredits.value
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }).replace(' at', '')
}
</script>
