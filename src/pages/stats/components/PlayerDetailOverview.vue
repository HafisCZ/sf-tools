<template>
  <div class="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-x-10 gap-y-8">
    <div v-for="(column, columnIndex) in columns" :key="columnIndex" class="flex flex-col gap-8">
      <PlayerDetailPanel v-if="columnIndex === 0" :title="localize('attributes')">
        <div class="grid grid-cols-[minmax(0,1fr)_9rem_9rem] leading-[22px]">
          <span />
          <span class="pt-1 pl-4 text-right text-xs text-white/60">{{ localize('columns.total') }}</span>
          <span class="pt-1 pl-4 text-right text-xs text-white/60">{{ localize('columns.base') }}</span>
          <template v-for="(name, index) in PlayerModel.ATTRIBUTES" :key="name">
            <span class="border-b border-white/5 py-1.5">{{ localize.global(`general.attribute${index + 1}`) }}</span>
            <PlayerDetailValue :value="formatSpacedNumber(props.player[name].Total)" :read="(player) => player[name].Total" :title="getChartTitle(index, 'total')" class="border-b border-white/5 py-1.5 pl-4 text-right" />
            <PlayerDetailValue :value="formatSpacedNumber(props.player[name].Base)" :read="(player) => player[name].Base" :title="getChartTitle(index, 'base')" class="border-b border-white/5 py-1.5 pl-4 text-right" />
          </template>
        </div>
      </PlayerDetailPanel>
      <PlayerDetailPanel v-for="panel in column" :key="panel.title" :title="panel.title" :icon="panel.icon" :rows="panel.rows" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatDate, formatSpacedNumber } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { compact } from '@utils/utils'
import { PlayerModel } from '~/core/models/player'
import PlayerDetailPanel from '~/pages/stats/components/PlayerDetailPanel.vue'
import PlayerDetailValue from '~/pages/stats/components/PlayerDetailValue.vue'
import { type PlayerDetailRow } from '~/pages/stats/types'
import { ASSASSIN } from '~/sim/workers/base'

defineOptions({
  name: 'PlayerDetailOverview'
})

const props = defineProps<{
  /**
   * Player in the shown scan
   */
  player: PlayerModel
  /**
   * Same player in the compared scan
   */
  compare: PlayerModel
}>()

type FortressBuilding = 'Fortress' | 'LaborerQuarters' | 'WoodcutterGuild' | 'Quarry' | 'GemMine' | 'Academy' | 'ArcheryGuild' | 'Barracks' | 'MageTower' | 'Treasury' | 'Smithy' | 'Fortifications'

type DetailPanel = {
  title: string
  icon?: `/${string}`
  rows: PlayerDetailRow[]
}

const localize = useLocalize('stats.player')

const columns = computed(() => {
  const player = props.player
  const potionRows = getPotionRows()
  const runeRows = getRuneRows()
  const underworldRows = getUnderworldRows()

  return [
    compact<DetailPanel | false | 0>([
      { title: localize('miscellaneous'), rows: getMiscRows() },
      potionRows.length && { title: localize('potions'), rows: potionRows },
      {
        title: localize('hall_of_fame'),
        icon: '/res/player/honor.webp',
        rows: [
          { label: localize('rank'), value: formatSpacedNumber(player.Rank) },
          { label: localize('honor'), value: formatSpacedNumber(player.Honor), read: (scan) => scan.Honor }
        ]
      },
      player.Pets.TotalCount !== undefined && { title: localize('pets.title'), icon: '/res/player/pets.webp', rows: getPetRows() },
      !!player.Toilet.Aura && { title: localize('toilet.title'), icon: '/res/player/toilet.webp', rows: getToiletRows() }
    ]),
    compact<DetailPanel | false | 0>([{ title: localize('bonuses'), rows: getBonusRows() }, runeRows.length && { title: localize('runes.title'), rows: runeRows }, underworldRows.length && { title: localize('underworld'), icon: '/res/player/underworld.webp', rows: underworldRows }]),
    compact<DetailPanel | false | 0>([{ title: localize('fortress.title'), icon: '/res/player/fortress.webp', rows: getFortressRows() }, player.hasGuild() && { title: localize('guild'), icon: '/res/player/guild.webp', rows: getGuildRows() }, player.Own && { title: localize('extras.title'), rows: getExtraRows() }])
  ]
})

function getChartTitle(index: number, column: 'total' | 'base') {
  return localize('chart_title', { name: localize.global(`general.attribute${index + 1}`), column: localize(`columns.${column}`) })
}

function getMiscRows() {
  const player = props.player

  return compact<PlayerDetailRow | false | undefined>([
    { label: localize('armor'), value: formatSpacedNumber(player.Armor), read: (scan) => scan.Armor },
    { label: localize('damage'), value: `${formatSpacedNumber(player.Damage.Min)} - ${formatSpacedNumber(player.Damage.Max)}` },
    player.Class === ASSASSIN && player.Damage2 && { label: '', value: `${formatSpacedNumber(player.Damage2.Min)} - ${formatSpacedNumber(player.Damage2.Max)}` },
    { label: localize('health'), value: formatSpacedNumber(player.Health), read: (scan) => scan.Health }
  ])
}

function getBonusRows() {
  const player = props.player

  return compact<PlayerDetailRow | false | 0 | undefined>([
    { icon: '/res/player/scrapbook.webp', label: localize('scrapbook'), value: `${formatSpacedNumber(player.Book)} / ${formatSpacedNumber(PlayerModel.SCRAPBOOK_COUNT)}`, read: (scan) => scan.Book },
    (player.Own || player.Achievements.Owned > 0) && { icon: '/res/player/achievements.webp', label: localize('achievements'), value: `${player.Achievements.Owned} / ${PlayerModel.ACHIEVEMENTS_COUNT}`, read: (scan) => scan.Achievements.Owned },
    { icon: '/res/player/dungeons.webp', label: localize('heath_bonus'), value: `${player.Dungeons.Player}%`, read: (scan) => scan.Dungeons.Player },
    { icon: '/res/player/dungeons.webp', label: localize('damage_bonus'), value: `${player.Dungeons.Group}%`, read: (scan) => scan.Dungeons.Group },
    player.Mount && { icon: getMountImageUrl(player), label: localize('mount'), value: `${player.MountValue}%` },
    player.Fortress.Gladiator && { icon: '/res/player/gladiator.webp', label: localize('gladiator'), value: String(player.Fortress.Gladiator), read: (scan) => scan.Fortress.Gladiator }
  ])
}

function getPotionRows(): PlayerDetailRow[] {
  return props.player.Potions.filter((potion) => potion.Size).map((potion) => ({
    icon: `/res/potions/potion_${potion.Type}_${potion.Size}.png`,
    label: localize('potion', { name: localize.global(`general.potion${potion.Type}`) }),
    value: `+${potion.Size}%`
  }))
}

function getMountImageUrl(player: PlayerModel): `/${string}` {
  // Races 5 to 8 ride the evil set of the same four mounts
  return `/res/player/mount${Math.min(player.Mount, 4) + (player.Race > 4 ? 4 : 0)}.webp`
}

function getRuneRows() {
  const runes = props.player.Runes
  const secondDamage = (value: number | undefined) => (props.player.Class === ASSASSIN ? ` / ${value}%` : '')

  return compact<PlayerDetailRow | false | 0 | undefined>([
    runes.Gold && { icon: '/res/rune1.png', label: localize.global('general.rune1'), value: `+${runes.Gold}%` },
    runes.XP && { icon: '/res/rune4.png', label: localize.global('general.rune4'), value: `+${runes.XP}%` },
    runes.Chance && { icon: '/res/rune2.png', label: localize.global('general.rune2'), value: `+${runes.Chance}%` },
    runes.Quality && { icon: '/res/rune3.png', label: localize.global('general.rune3'), value: `+${runes.Quality}` },
    runes.Health && { icon: '/res/rune5.png', label: localize.global('general.rune5'), value: `+${runes.Health}%` },
    (runes.DamageFire || runes.Damage2Fire) && { icon: '/res/rune10.png', label: localize.global('general.rune10'), value: `+${runes.DamageFire}%${secondDamage(runes.Damage2Fire)}` },
    (runes.DamageCold || runes.Damage2Cold) && { icon: '/res/rune11.png', label: localize.global('general.rune11'), value: `+${runes.DamageCold}%${secondDamage(runes.Damage2Cold)}` },
    (runes.DamageLightning || runes.Damage2Lightning) && { icon: '/res/rune12.png', label: localize.global('general.rune12'), value: `+${runes.DamageLightning}%${secondDamage(runes.Damage2Lightning)}` },
    runes.ResistanceFire && { icon: '/res/rune6.png', label: localize.global('general.rune6'), value: `+${runes.ResistanceFire}%` },
    runes.ResistanceCold && { icon: '/res/rune7.png', label: localize.global('general.rune7'), value: `+${runes.ResistanceCold}%` },
    runes.ResistanceLightning && { icon: '/res/rune8.png', label: localize.global('general.rune8'), value: `+${runes.ResistanceLightning}%` }
  ])
}

function getFortressRows() {
  const fortress = props.player.Fortress

  const building = (index: number, name: FortressBuilding, units = ''): PlayerDetailRow => ({
    label: localize(`fortress.building${index}`),
    value: `${fortress[name]}${units}`,
    read: (scan) => scan.Fortress[name]
  })

  const units = (count: number, level: number | undefined) => (level === undefined ? '' : ` (${count}x ${level})`)

  return compact<PlayerDetailRow | false>([
    fortress.Rank !== undefined && { label: localize('fortress.rank'), value: formatSpacedNumber(fortress.Rank) },
    fortress.Honor !== undefined && { label: localize('fortress.honor'), value: formatSpacedNumber(fortress.Honor), read: (scan) => scan.Fortress.Honor },
    fortress.Upgrades !== undefined && { label: localize('fortress.upgrades'), value: String(fortress.Upgrades), read: (scan) => scan.Fortress.Upgrades },
    building(1, 'Fortress'),
    building(2, 'LaborerQuarters'),
    building(3, 'WoodcutterGuild'),
    building(4, 'Quarry'),
    building(5, 'GemMine'),
    building(6, 'Academy'),
    building(7, 'ArcheryGuild', units(fortress.ArcheryGuild * 2, fortress.Archers)),
    building(8, 'Barracks', units(fortress.Barracks * 3, fortress.Warriors)),
    building(9, 'MageTower', units(fortress.MageTower, fortress.Mages)),
    building(10, 'Treasury'),
    building(11, 'Smithy'),
    building(12, 'Fortifications', fortress.Wall === undefined ? '' : ` (${fortress.Wall})`)
  ])
}

const UNDERWORLD_BUILDINGS = [
  [1, 'Heart'],
  [2, 'Gate'],
  [3, 'GoldPit'],
  [4, 'Extractor'],
  [5, 'GoblinPit'],
  [6, 'Torture'],
  [8, 'TrollBlock'],
  [9, 'TimeMachine'],
  [10, 'Keeper']
] as const

function getUnderworldRows() {
  const underworld = props.player.Underworld

  return UNDERWORLD_BUILDINGS.flatMap(([index, name]): PlayerDetailRow[] => {
    const level = underworld?.[name]

    return level === undefined ? [] : [{ label: localize.global(`general.buildings.underworld${index}`), value: String(level), read: (scan) => scan.Underworld?.[name] }]
  })
}

function getGuildRows() {
  const group = props.player.Group
  const knights = props.player.Fortress.Knights

  return compact<PlayerDetailRow | false | 0 | undefined>([
    { label: localize('name'), value: group.Name ?? '' },
    group.Role && { label: localize('role'), value: localize.global(`general.rank${group.Role}`) },
    group.Joined && { label: localize('joined_on'), value: formatDate(group.Joined) },
    group.Rank && { label: localize('guild_rank'), value: String(group.Rank) },
    group.Treasure && { label: localize('treasure'), value: String(group.Treasure), read: (scan) => scan.Group.Treasure },
    group.Instructor && { label: localize('instructor'), value: String(group.Instructor), read: (scan) => scan.Group.Instructor },
    group.Pet && { label: localize('pet'), value: String(group.Pet), read: (scan) => scan.Group.Pet },
    knights && { label: localize('knights'), value: String(knights), read: (scan) => scan.Fortress.Knights }
  ])
}

const PET_COUNT = 100

function getPetRows() {
  const pets = props.player.Pets

  return compact<PlayerDetailRow | false | 0 | undefined>([
    pets.TotalCount !== undefined && { label: localize('pets.collected'), value: `${pets.TotalCount} / ${PET_COUNT}`, read: (scan) => scan.Pets.TotalCount },
    pets.TotalLevel !== undefined && { label: localize('pets.total_level'), value: formatSpacedNumber(pets.TotalLevel), read: (scan) => scan.Pets.TotalLevel },
    pets.Rank && { label: localize('pets.rank'), value: formatSpacedNumber(pets.Rank) },
    pets.Honor !== undefined && { label: localize('pets.honor'), value: formatSpacedNumber(pets.Honor), read: (scan) => scan.Pets.Honor }
  ])
}

function getToiletRows(): PlayerDetailRow[] {
  const toilet = props.player.Toilet

  return [
    { label: localize('toilet.aura'), value: String(toilet.Aura), read: (scan) => scan.Toilet.Aura },
    { label: localize('toilet.fill'), value: `${toilet.Fill} / ${toilet.Capacity}`, read: (scan) => scan.Toilet.Fill }
  ]
}

function getExtraRows() {
  const player = props.player

  return compact<PlayerDetailRow | false | 0 | '' | undefined>([player.Registered && { label: localize('extras.registered'), value: formatDate(player.Registered) }, player.WebshopID && { label: localize('extras.webshopid'), value: player.WebshopID, placeholder: localize('extras.webshopid_placeholder') }])
}
</script>
