<template>
  <Page>
    <template v-if="selected" #nav-left>
      <SFButton variant="ghost" @click="close">
        <SFIcon name="arrow-left" />
        {{ localize('back') }}
      </SFButton>
    </template>

    <div v-if="selected === null" class="flex flex-col gap-8">
      <div v-for="(row, rowIndex) in GROUP_ROWS" :key="rowIndex" class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-3.5 gap-y-8">
        <section v-for="group in row" :key="group.key" :aria-label="localize(`groups.${group.key}`)" class="flex flex-col gap-3.5">
          <div class="border-b border-white/30 pb-2">
            <SFHeading level="4" class="leading-none">{{ localize(`groups.${group.key}`) }}</SFHeading>
          </div>
          <div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3.5">
            <BestiaryDungeonCard v-for="entry in group.dungeons" :key="entry.id" :image="`/res/dungeons/cards/${entry.id}.webp`" :name="getDungeonName(entry)" @select="open({ type: 'dungeon', dungeon: entry })" />
            <BestiaryDungeonCard v-if="group.key === 'class'" image="/res/dungeons/cards/304.webp" :name="localize.global('dungeons.304.name')" @select="open({ type: 'class_world_portal' })" />
          </div>
        </section>
      </div>
      <section :aria-label="localize('groups.expeditions')" class="flex flex-col gap-3.5">
        <div class="border-b border-white/30 pb-2">
          <SFHeading level="4" class="leading-none">{{ localize('groups.expeditions') }}</SFHeading>
        </div>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3.5">
          <BestiaryDungeonCard v-for="entry in EXPEDITIONS" :key="entry.location" :image="`/res/expeditions/${entry.location}.webp`" :name="localize.global(`general.location_${entry.location}`)" @select="open({ type: 'expedition', expedition: entry })" />
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
          <SFButton v-if="twin" @click="selected = { type: 'dungeon', dungeon: twin }">{{ localize(groupKey === 'light' ? 'switch_shadow' : 'switch_light') }}</SFButton>
          <div class="w-65 min-w-0 flex-auto">
            <SFInput v-model="search" type="search" :label="localize('search')" :placeholder="localize('search_placeholder', { name })" />
          </div>
        </div>
      </div>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3.5">
        <BestiaryEnemyCard v-for="enemy in enemies" :key="enemy.key" :background="background" :monster="enemy.monster" :name="enemy.name" :description="enemy.description" :boss="enemy.boss" :armor="enemy.armor" :rewards="enemy.rewards" :experience="enemy.experience" @copy="copyEnemy" />
      </div>
    </div>

    <template #footer-left>
      <SFParagraph>
        <span v-html="localize('footer#')" />
      </SFParagraph>
    </template>

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
import { copyJson } from '@utils/utils'
import { PlayerModel } from '~/core/models/player'
import PageFooterLinks from '~/pages/components/PageFooterLinks.vue'
import Page from '~/pages/Page.vue'
import { CLASS_DUNGEONS, createSimulatorBoss, DUNGEON_DATA, getBossName, getDungeonExperience, getDungeonName, REWARD_GOLD, REWARD_ITEM_EPIC, SANDSTORM, TOWER, TWISTER, YOUTUBE, type Dungeon, type DungeonBossReward, type DungeonClassBoss } from '~/sim/data/dungeons'
import { CONFIG } from '~/sim/workers/base'
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

type Selection = { type: 'dungeon'; dungeon: Dungeon } | { type: 'expedition'; expedition: (typeof EXPEDITIONS)[number] } | { type: 'class_world_portal' }

const selected = shallowRef<Selection | null>(null)
const search = ref('')

function open(target: Selection) {
  search.value = ''
  selected.value = target

  window.scrollTo(0, 0)
}

function close() {
  selected.value = null

  window.scrollTo(0, 0)
}

const groupKey = computed(() => {
  const current = selected.value

  switch (current?.type) {
    case 'dungeon':
      return GROUPS.find((group) => group.dungeons.includes(current.dungeon))?.key
    case 'expedition':
      return 'expeditions'
    case 'class_world_portal':
      return 'class'
    default:
      return undefined
  }
})

const image = computed(() => {
  const current = selected.value

  switch (current?.type) {
    case 'dungeon':
      return `/res/dungeons/cards/${current.dungeon.id}.webp`
    case 'expedition':
      return `/res/expeditions/${current.expedition.location}.webp`
    case 'class_world_portal':
      return '/res/dungeons/cards/304.webp'
    default:
      return undefined
  }
})

const name = computed(() => {
  const current = selected.value

  switch (current?.type) {
    case 'dungeon':
      return getDungeonName(current.dungeon)
    case 'expedition':
      return localize.global(`general.location_${current.expedition.location}`)
    case 'class_world_portal':
      return localize.global('dungeons.304.name')
    default:
      return ''
  }
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
  const current = selected.value

  switch (current?.type) {
    case 'dungeon': {
      const id = current.dungeon.id

      return `/res/monsters/backgrounds/${BACKGROUNDS[id > 100 && id < TOWER ? id - 100 : id] ?? 'general'}.webp`
    }
    case 'expedition':
      return `/res/expeditions/${current.expedition.location}.webp`
    case 'class_world_portal':
      return '/res/monsters/backgrounds/guild.webp'
    default:
      return ''
  }
})

const twin = computed(() => {
  const current = selected.value

  if (current?.type !== 'dungeon' || current.dungeon.id >= TOWER) {
    return undefined
  }

  const id = current.dungeon.id

  return DUNGEON_DATA[id < 100 ? id + 100 : id - 100]
})

const description = computed(() => {
  const current = selected.value

  let key: string

  switch (current?.type) {
    case 'dungeon':
      key = `dungeons.${current.dungeon.intl}.description`
      break
    case 'class_world_portal':
      key = 'dungeons.304.description'
      break
    default:
      return undefined
  }

  return hasTranslation(key) ? localize.global(key) : undefined
})

const CLASS_WORLD_PORTAL: { pos: number; monster: number; rewards: DungeonBossReward[] }[] = [
  { pos: 1, monster: 1420, rewards: [{ type: REWARD_GOLD, amount: 86605155 }, { type: REWARD_ITEM_EPIC }] },
  { pos: 2, monster: 1421, rewards: [{ type: REWARD_GOLD, amount: 87864700 }, { type: REWARD_ITEM_EPIC }] },
  { pos: 3, monster: 1422, rewards: [{ type: REWARD_GOLD, amount: 89152140 }, { type: REWARD_ITEM_EPIC }] },
  { pos: 4, monster: 1423, rewards: [{ type: REWARD_GOLD, amount: 90439580 }, { type: REWARD_ITEM_EPIC }] }
]

const enemies = computed(() => {
  const current = selected.value
  const query = search.value.trim().toLowerCase()

  let list: { key: number; monster: number; name: string; description?: string; boss?: DungeonClassBoss; armor?: number; rewards?: DungeonBossReward[]; experience?: number }[] = []

  switch (current?.type) {
    case 'dungeon': {
      const dungeon = current.dungeon

      list = Object.values(dungeon.floors)
        .filter((boss): boss is DungeonClassBoss => boss.id !== undefined)
        .map((boss) => {
          const key = `dungeons.${dungeon.intl}.floors.${boss.pos}`
          const armor = boss.armor || (dungeon.armor_multiplier || 1) * (boss.level * CONFIG.fromID(boss.class).MaximumDamageReduction)
          const rewards = boss.rewards ?? (boss.reward ? [{ type: boss.reward }] : undefined)

          return { key: boss.pos, monster: boss.id, name: getBossName({ dungeon, boss }), description: hasTranslation(key) ? localize.global(key) : undefined, boss, armor, rewards, experience: getDungeonExperience({ dungeon, boss }) }
        })
      break
    }
    case 'expedition':
      list = current.expedition.monsters.map((monster) => ({ key: monster, monster, name: localize.global(`monsters.${monster}`) }))
      break
    case 'class_world_portal':
      list = CLASS_WORLD_PORTAL.map((entry) => {
        const key = `dungeons.304.floors.${entry.pos}`

        return { key: entry.pos, monster: entry.monster, name: localize.global(`monsters.${entry.monster}`), description: hasTranslation(key) ? localize.global(key) : undefined, rewards: entry.rewards }
      })
      break
  }

  return list.filter((enemy) => !query || enemy.name.toLowerCase().includes(query) || enemy.description?.toLowerCase().includes(query))
})

function copyEnemy(boss: DungeonClassBoss) {
  const current = selected.value

  if (current?.type === 'dungeon') {
    void copyJson(createSimulatorBoss({ dungeon: current.dungeon, boss }, new PlayerModel()))
  }
}
</script>
