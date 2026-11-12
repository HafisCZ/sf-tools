<template>
  <Page>
    <template v-if="dungeon || expedition" #nav-left>
      <SFButton variant="ghost" @click="close">
        <SFIcon name="arrow-left" />
        {{ localize('back') }}
      </SFButton>
    </template>

    <div v-if="dungeon === null && expedition === null" class="flex flex-col gap-8">
      <div v-for="(row, rowIndex) in GROUP_ROWS" :key="rowIndex" class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-3.5 gap-y-8">
        <section v-for="group in row" :key="group.key" :aria-label="localize(`groups.${group.key}`)" class="flex flex-col gap-3.5">
          <div class="border-b border-white/30 pb-2">
            <SFHeading level="4" class="leading-none">{{ localize(`groups.${group.key}`) }}</SFHeading>
          </div>
          <div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3.5">
            <BestiaryDungeonCard v-for="entry in group.dungeons" :key="entry.id" :image="`/res/dungeons/cards/${entry.id}.webp`" :name="getDungeonName(entry)" @select="open(entry)" />
          </div>
        </section>
      </div>
      <section :aria-label="localize('groups.expeditions')" class="flex flex-col gap-3.5">
        <div class="border-b border-white/30 pb-2">
          <SFHeading level="4" class="leading-none">{{ localize('groups.expeditions') }}</SFHeading>
        </div>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3.5">
          <BestiaryDungeonCard v-for="entry in EXPEDITIONS" :key="entry.location" :image="`/res/expeditions/${entry.location}.webp`" :name="localize.global(`general.location_${entry.location}`)" @select="openExpedition(entry)" />
        </div>
      </section>
    </div>

    <div v-else class="flex flex-col gap-5">
      <div class="flex flex-wrap items-center gap-x-5 gap-y-4 border-b border-white/30 pb-4">
        <img :src="image" alt="" class="h-30 w-40 flex-none rounded-lg border border-line object-cover" />
        <div class="flex min-w-0 flex-[999_1_320px] flex-col gap-0.5">
          <span class="text-white/60">{{ localize(`groups.${groupKey}`) }}</span>
          <SFHeading level="2">{{ name }}</SFHeading>
          <SFParagraph v-if="description" type="muted">{{ description }}</SFParagraph>
        </div>
        <div class="flex min-w-0 flex-auto flex-wrap items-end gap-3.5">
          <SFButton v-if="twin" @click="dungeon = twin">{{ localize(groupKey === 'light' ? 'switch_shadow' : 'switch_light') }}</SFButton>
          <div class="w-65 min-w-0 flex-auto">
            <SFInput v-model="search" type="search" :label="localize('search')" :placeholder="localize('search_placeholder', { name })" />
          </div>
        </div>
      </div>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3.5">
        <BestiaryEnemyCard v-for="enemy in enemies" :key="enemy.key" :background="background" :monster="enemy.monster" :name="enemy.name" :description="enemy.description" :boss="enemy.boss" />
      </div>
    </div>

    <template #footer-right>
      <PageFooterLinks />
    </template>
  </Page>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import SFInput from '@library/SFInput.vue'
import SFParagraph from '@library/SFParagraph.vue'
import { hasTranslation, useLocalize } from '@utils/localization'
import PageFooterLinks from '~/pages/components/PageFooterLinks.vue'
import Page from '~/pages/Page.vue'
import { CLASS_DUNGEONS, DUNGEON_DATA, getBossName, getDungeonName, SANDSTORM, TOWER, TWISTER, YOUTUBE, type Dungeon, type DungeonClassBoss } from '~/sim/data/dungeons'
import BestiaryDungeonCard from './components/BestiaryDungeonCard.vue'
import BestiaryEnemyCard from './components/BestiaryEnemyCard.vue'

defineOptions({
  name: 'BestiaryPage'
})

const localize = useLocalize('bestiary')

const DUNGEONS = Object.values(DUNGEON_DATA).sort((a, b) => a.pos - b.pos)

const GROUPS: { key: 'light' | 'shadow' | 'tower' | 'idols' | 'twister' | 'sandstorm' | 'class'; dungeons: Dungeon[] }[] = [
  { key: 'light', dungeons: DUNGEONS.filter((entry) => entry.id < 100) },
  { key: 'shadow', dungeons: DUNGEONS.filter((entry) => entry.id > 100 && entry.id < TOWER) },
  { key: 'tower', dungeons: [DUNGEON_DATA[TOWER]] },
  { key: 'idols', dungeons: [DUNGEON_DATA[YOUTUBE]] },
  { key: 'twister', dungeons: [DUNGEON_DATA[TWISTER]] },
  { key: 'sandstorm', dungeons: [DUNGEON_DATA[SANDSTORM]] },
  { key: 'class', dungeons: DUNGEONS.filter((entry) => entry.id >= CLASS_DUNGEONS) }
]

const GROUP_ROWS = [[GROUPS[0]], [GROUPS[1]], GROUPS.slice(2, 6), [GROUPS[6]]]

const EXPEDITIONS = [
  { location: 1, monsters: [34, 126, 120, 127, 65, 145] },
  { location: 2, monsters: [108, 152, 63, 40, 45, 11] },
  { location: 5, monsters: [76, 8, 13, 20, 109, 155] },
  { location: 7, monsters: [10, 105, 132, 113, 58, 119] },
  { location: 10, monsters: [100, 79, 70, 29, 44, 72] },
  { location: 12, monsters: [138, 124, 54, 88, 85, 157] },
  { location: 14, monsters: [91, 67, 19, 169, 96, 148] },
  { location: 15, monsters: [121, 134, 25, 35, 18, 80] },
  { location: 16, monsters: [14, 162, 111, 1, 22, 104] },
  { location: 19, monsters: [26, 123, 87, 112, 95, 41] },
  { location: 20, monsters: [133, 24, 116, 50, 71, 117] },
  { location: 21, monsters: [142, 74, 83, 32, 5, 4, 115] }
]

const dungeon = shallowRef<Dungeon | null>(null)
const expedition = shallowRef<(typeof EXPEDITIONS)[number] | null>(null)
const search = ref('')

function open(target: Dungeon) {
  search.value = ''
  dungeon.value = target

  window.scrollTo(0, 0)
}

function openExpedition(target: (typeof EXPEDITIONS)[number]) {
  search.value = ''
  expedition.value = target

  window.scrollTo(0, 0)
}

function close() {
  dungeon.value = null
  expedition.value = null

  window.scrollTo(0, 0)
}

const groupKey = computed(() => {
  const current = dungeon.value

  return current ? GROUPS.find((group) => group.dungeons.includes(current))?.key : 'expeditions'
})

const image = computed(() => {
  const current = dungeon.value

  return current ? `/res/dungeons/cards/${current.id}.webp` : `/res/expeditions/${expedition.value?.location}.webp`
})

const name = computed(() => {
  const current = dungeon.value

  return current ? getDungeonName(current) : localize.global(`general.location_${expedition.value?.location}`)
})

const BACKGROUNDS: Record<number, string> = {
  14: 'easteros',
  16: 'academy',
  17: 'ring',
  19: 'nordic',
  20: 'greek',
  21: 'birthday',
  22: 'dragons',
  23: 'horror',
  24: 'superheroes',
  25: 'anime',
  26: 'giantmonsters',
  27: 'easteros',
  28: 'academy',
  29: 'ring',
  201: 'tower',
  300: 'guild',
  301: 'guild',
  302: 'guild',
  303: 'guild'
}

const background = computed(() => {
  const current = dungeon.value

  if (current === null) {
    return image.value
  }

  const id = current.id

  return `/res/monsters/backgrounds/${BACKGROUNDS[id > 100 && id < TOWER ? id - 100 : id] ?? 'general'}.webp`
})

const twin = computed(() => {
  const current = dungeon.value

  if (current === null || current.id >= TOWER) {
    return undefined
  }

  return DUNGEON_DATA[current.id < 100 ? current.id + 100 : current.id - 100]
})

const description = computed(() => {
  const key = `dungeons.${dungeon.value?.intl}.description`

  return hasTranslation(key) ? localize.global(key) : undefined
})

const enemies = computed(() => {
  const current = dungeon.value
  const query = search.value.trim().toLowerCase()

  const list: { key: number; monster: number; name: string; description?: string; boss?: DungeonClassBoss }[] = current
    ? Object.values(current.floors)
        .filter((boss): boss is DungeonClassBoss => boss.id !== undefined)
        .map((boss) => {
          const key = `dungeons.${current.intl}.floors.${boss.pos}`

          return { key: boss.pos, monster: boss.id, name: getBossName({ dungeon: current, boss }), description: hasTranslation(key) ? localize.global(key) : undefined, boss }
        })
    : (expedition.value?.monsters ?? []).map((monster) => ({ key: monster, monster, name: localize.global(`monsters.${monster}`) }))

  return list.filter((enemy) => !query || enemy.name.toLowerCase().includes(query) || enemy.description?.toLowerCase().includes(query))
})
</script>
