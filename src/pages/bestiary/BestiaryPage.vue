<template>
  <Page>
    <template v-if="dungeon" #nav-left>
      <SFButton variant="ghost" @click="close">
        <SFIcon name="arrow-left" />
        {{ localize('back') }}
      </SFButton>
    </template>

    <div v-if="dungeon === null" class="flex flex-col gap-8">
      <div v-for="(row, rowIndex) in GROUP_ROWS" :key="rowIndex" class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-3.5 gap-y-8">
        <section v-for="group in row" :key="group.key" :aria-label="localize(`groups.${group.key}`)" class="flex flex-col gap-3.5">
          <div class="border-b border-white/30 pb-2">
            <SFHeading level="4" class="leading-none">{{ localize(`groups.${group.key}`) }}</SFHeading>
          </div>
          <div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3.5">
            <BestiaryDungeonCard v-for="entry in group.dungeons" :key="entry.id" :dungeon="entry" @select="open(entry)" />
          </div>
        </section>
      </div>
    </div>

    <div v-else class="flex flex-col gap-5">
      <div class="flex flex-wrap items-center gap-x-5 gap-y-4 border-b border-white/30 pb-4">
        <img :src="`/res/dungeons/cards/${dungeon.id}.webp`" alt="" class="h-30 w-40 flex-none rounded-lg border border-line object-cover" />
        <div class="flex min-w-0 flex-[999_1_320px] flex-col gap-0.5">
          <span class="text-white/60">{{ localize(`groups.${groupKey}`) }}</span>
          <SFHeading level="2">{{ getDungeonName(dungeon) }}</SFHeading>
          <SFParagraph v-if="description" type="muted">{{ description }}</SFParagraph>
        </div>
        <div class="flex min-w-0 flex-auto flex-wrap items-end gap-3.5">
          <SFButton v-if="twin" @click="dungeon = twin">{{ localize(groupKey === 'light' ? 'switch_shadow' : 'switch_light') }}</SFButton>
          <div class="w-65 min-w-0 flex-auto">
            <SFInput v-model="search" type="search" :label="localize('search')" :placeholder="localize('search_placeholder', { name: getDungeonName(dungeon) })" />
          </div>
        </div>
      </div>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3.5">
        <BestiaryEnemyCard v-for="enemy in enemies" :key="enemy.boss.pos" :dungeon="dungeon" :boss="enemy.boss" :name="enemy.name" :description="enemy.description" />
      </div>
    </div>

    <template #footer-right>
      <PageFooterLinks tool="bestiary" />
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

const dungeon = shallowRef<Dungeon | null>(null)
const search = ref('')

function open(target: Dungeon) {
  search.value = ''
  dungeon.value = target

  window.scrollTo(0, 0)
}

function close() {
  dungeon.value = null

  window.scrollTo(0, 0)
}

const groupKey = computed(() => GROUPS.find((group) => dungeon.value !== null && group.dungeons.includes(dungeon.value))?.key)

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

  if (current === null) {
    return []
  }

  const query = search.value.trim().toLowerCase()

  return Object.values(current.floors)
    .filter((boss): boss is DungeonClassBoss => boss.id !== undefined)
    .map((boss) => {
      const key = `dungeons.${current.intl}.floors.${boss.pos}`

      return { boss, name: getBossName({ dungeon: current, boss }), description: hasTranslation(key) ? localize.global(key) : undefined }
    })
    .filter((enemy) => !query || enemy.name.toLowerCase().includes(query) || enemy.description?.toLowerCase().includes(query))
})
</script>
