<template>
  <article class="row-span-4 grid grid-rows-subgrid gap-0 overflow-hidden rounded-lg border border-line bg-surface">
    <div class="relative aspect-[4/3] bg-dialog bg-cover bg-center" :style="{ backgroundImage: `url(${props.background})` }">
      <div class="absolute inset-0 bg-line backdrop-blur-sm mask-exclude mask-center mask-no-repeat [mask-image:linear-gradient(#000_0_0),linear-gradient(#000_0_0)] [mask-size:100%_100%,calc(69%_-_4px)_calc(92%_-_4px)]" />
      <img :src="`/res/monsters/${props.monster}.webp`" alt="" loading="lazy" class="absolute top-[4%] left-1/2 h-[92%] -translate-x-1/2 rounded-md border-2 border-line object-contain" />
      <span v-if="props.boss" class="absolute top-2 left-2 min-w-6 rounded bg-dialog/85 px-1.5 py-0.5 text-center text-[13px] font-bold">{{ props.boss.pos }}</span>
      <div v-if="props.boss" class="absolute top-2 right-2 rounded bg-dialog/85">
        <SFTooltip :content="localize('copy')">
          <SFButton variant="ghost" size="sm" icon :aria-label="localize('copy')" @click="copy">
            <SFIcon :name="copied ? 'check' : 'copy'" />
          </SFButton>
        </SFTooltip>
      </div>
    </div>
    <div class="flex flex-col gap-0.5 bg-dialog/85 px-3 pt-2 pb-2.5 [contain-intrinsic-size:auto_140px] [content-visibility:auto]">
      <span class="text-base leading-5 font-bold text-white">{{ props.name }}</span>
      <span v-if="props.description" class="text-[13px] leading-[1.35] text-white/75">{{ props.description }}</span>
    </div>
    <div v-if="props.boss?.reward || props.experience" class="row-start-3 flex items-center gap-3 border-y border-white/5 bg-black/25 px-3.5 py-2">
      <div v-if="props.boss?.reward" class="flex min-w-0 items-center gap-2">
        <img :src="`/res/rewards/${rewardIcon}.webp`" alt="" class="size-[22px] flex-none object-contain" />
        <div class="flex min-w-0 flex-col">
          <span class="truncate leading-5 font-bold">{{ localize(`rewards.${props.boss.reward}`) }}</span>
          <span v-if="props.boss.reward === REWARD_ITEM_EPIC_UNIVERSAL" class="text-[13px] leading-4 text-white/60">{{ localize('rewards.any_class') }}</span>
        </div>
      </div>
      <span v-if="props.experience" class="ml-auto flex items-center gap-1.5 font-bold whitespace-nowrap">
        {{ formatSpacedNumber(props.experience) }}
        <img src="/res/rewards/xp.webp" :alt="localize('experience')" class="h-[13px]" />
      </span>
    </div>
    <div v-if="props.boss" class="row-start-4 flex flex-col gap-2.5 px-3.5 pt-3 pb-3.5 [contain-intrinsic-size:auto_330px] [content-visibility:auto]">
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
import { computed, ref } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFIcon from '@library/SFIcon.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { formatSpacedNumber } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { getClassImageUrl } from '@utils/utils'
import { REWARD_ITEM_EPIC, REWARD_ITEM_EPIC_UNIVERSAL, type DungeonClassBoss } from '~/sim/data/dungeons'
import { RUNE_FIRE_DAMAGE } from '~/sim/workers/base'

defineOptions({
  name: 'BestiaryEnemyCard'
})

const props = defineProps<{
  /**
   * Picture behind the enemy
   */
  background: string
  /**
   * Monster whose picture the card shows
   */
  monster: number
  /**
   * Enemy name
   */
  name: string
  /**
   * Text the game shows before the floor's fight
   */
  description?: string
  /**
   * Floor whose number and stats the card shows, without it the card is only the picture and name
   */
  boss?: DungeonClassBoss
  /**
   * Floor armor, the stored value or the one the sim generates from class and level
   */
  armor?: number
  /**
   * XP the floor gives
   */
  experience?: number
}>()

const emit = defineEmits<{
  /**
   * Copy button pressed, with the floor whose stats to copy
   */
  copy: [boss: DungeonClassBoss]
}>()

const localize = useLocalize('bestiary')

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

function copy() {
  const boss = props.boss
  if (boss === undefined) return

  emit('copy', boss)

  copied.value = true

  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copied.value = false
  }, 1000)
}

const rewardIcon = computed(() => (props.boss?.reward === REWARD_ITEM_EPIC_UNIVERSAL ? REWARD_ITEM_EPIC : props.boss?.reward))

const rows = computed(() => {
  const boss = props.boss

  if (boss === undefined) {
    return []
  }

  const list = [
    { label: localize.global('general.attribute1'), value: formatSpacedNumber(boss.str) },
    { label: localize.global('general.attribute2'), value: formatSpacedNumber(boss.dex) },
    { label: localize.global('general.attribute3'), value: formatSpacedNumber(boss.int) },
    { label: localize.global('general.attribute4'), value: formatSpacedNumber(boss.con) },
    { label: localize.global('general.attribute5'), value: formatSpacedNumber(boss.lck) },
    { label: localize('health'), value: formatSpacedNumber(boss.health) },
    { label: localize('weapon_range'), value: `${formatSpacedNumber(boss.min)}-${formatSpacedNumber(boss.max)}` }
  ]

  if (props.armor) {
    list.push({ label: localize.global('general.item3'), value: formatSpacedNumber(props.armor) })
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
