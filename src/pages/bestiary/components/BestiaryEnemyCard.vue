<template>
  <article class="flex flex-col overflow-hidden rounded-lg border border-line bg-surface [contain-intrinsic-size:auto_640px] [content-visibility:auto]">
    <div class="relative aspect-[4/3] bg-dialog bg-cover bg-center" :style="{ backgroundImage: `url(/res/monsters/backgrounds/${background}.webp)` }">
      <img :src="`/res/monsters/${props.boss.id}.webp`" alt="" loading="lazy" class="absolute top-[4%] left-1/2 h-[92%] -translate-x-1/2 object-contain" />
      <span class="absolute top-2 left-2 min-w-6 rounded bg-dialog/85 px-1.5 py-0.5 text-center text-[13px] font-bold">{{ props.boss.pos }}</span>
    </div>
    <div class="flex flex-1 flex-col gap-0.5 bg-dialog/85 px-3 pt-2 pb-2.5">
      <span class="text-base leading-5 font-bold text-white">{{ props.name }}</span>
      <span v-if="props.description" class="text-[13px] leading-[1.35] text-white/75">{{ props.description }}</span>
    </div>
    <div class="flex flex-col gap-2.5 px-3.5 pt-3 pb-3.5">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <img :src="getClassImageUrl(props.boss.class)" alt="" class="size-[22px] object-contain" />
          <span>{{ localize.global(`general.class${props.boss.class}`) }}</span>
        </div>
        <span>{{ localize('level', { level: props.boss.level }) }}</span>
      </div>
      <div>
        <div v-for="row in rows" :key="row.label" class="flex gap-2 border-t border-white/5 py-1 leading-5">
          <span class="flex-1">{{ row.label }}</span>
          <span class="text-right whitespace-nowrap">{{ row.value }}</span>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatSpacedNumber } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { getClassImageUrl } from '@utils/utils'
import { TOWER, type Dungeon, type DungeonClassBoss } from '~/sim/data/dungeons'
import { RUNE_FIRE_DAMAGE } from '~/sim/workers/base'

defineOptions({
  name: 'BestiaryEnemyCard'
})

const props = defineProps<{
  /**
   * Dungeon the enemy belongs to, picks the background behind the enemy
   */
  dungeon: Dungeon
  /**
   * Floor whose enemy and stats the card shows
   */
  boss: DungeonClassBoss
  /**
   * Enemy name
   */
  name: string
  /**
   * Text the game shows before the floor's fight
   */
  description?: string
}>()

const localize = useLocalize('bestiary')

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
  const id = props.dungeon.id

  return BACKGROUNDS[id > 100 && id < TOWER ? id - 100 : id] ?? 'general'
})

const rows = computed(() => {
  const boss = props.boss

  const list = [
    { label: localize.global('general.attribute1'), value: formatSpacedNumber(boss.str) },
    { label: localize.global('general.attribute2'), value: formatSpacedNumber(boss.dex) },
    { label: localize.global('general.attribute3'), value: formatSpacedNumber(boss.int) },
    { label: localize.global('general.attribute4'), value: formatSpacedNumber(boss.con) },
    { label: localize.global('general.attribute5'), value: formatSpacedNumber(boss.lck) },
    { label: localize('health'), value: formatSpacedNumber(boss.health) },
    { label: localize('damage'), value: `${formatSpacedNumber(boss.min)}-${formatSpacedNumber(boss.max)}` }
  ]

  if (boss.armor) {
    list.push({ label: localize.global('general.item3'), value: formatSpacedNumber(boss.armor) })
  }

  if (boss.block) {
    list.push({ label: localize.global('general.defense3'), value: `${boss.block}%` })
  }

  const runes = boss.runes

  if (runes) {
    list.push({ label: localize.global(`general.rune${10 + runes.type - RUNE_FIRE_DAMAGE}`), value: `${runes.damage}%` })

    runes.res?.forEach((resistance, index) => {
      if (resistance) {
        list.push({ label: localize.global(`general.rune${6 + index}`), value: `${resistance}%` })
      }
    })
  }

  return list
})
</script>
