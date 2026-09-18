<template>
  <div class="fixed inset-0 flex items-start justify-center overflow-y-scroll overscroll-contain bg-black/85 [scrollbar-color:rgba(88,88,88,0.329)_rgba(24,24,24,0.459)] [scrollbar-width:thin]" @click.self="emit('close')">
    <div ref="dialog-ref" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1" class="mt-[2em] flex w-[1180px] flex-col p-[1.25em] text-white outline-none">
      <button type="button" class="fixed top-[31.5px] right-[35px] flex h-[1em] w-[1.18em] cursor-pointer items-center justify-center text-[21px] opacity-80 outline-none hover:opacity-100 focus-visible:opacity-100" :aria-label="localize.global('dialog.shared.close')" @click="emit('close')">
        <SFIcon name="xmark" />
      </button>
      <div class="relative leading-[1.4]">
        <div class="absolute top-0 left-0 flex h-[5em] w-full items-center">
          <img :src="getClassImageUrl(player.Class)" alt="" class="h-[5em] w-auto pl-[1em]" />
          <SFHeading :id="titleId" level="2" class="pl-[0.25em]">{{ player.Level }} - {{ player.Name }}</SFHeading>
        </div>
        <div class="absolute top-[1.25em] right-[2em]">{{ formatDate(player.Timestamp) }}{{ hasReference ? ` - ${formatDate(compare.Timestamp)}` : '' }}</div>
        <div class="absolute top-[2.75em] right-[2em] opacity-40">{{ DatabaseManager.getLinkedIdentifiers(props.identifier).join(' / ') }}</div>
        <div class="mt-[4em] flex items-start justify-between text-[1.25em]">
          <div v-for="(panel, panelIndex) in panels" :key="panelIndex" class="basis-[33%] p-[1em]">
            <template v-for="(section, sectionIndex) in panel" :key="sectionIndex">
              <div class="flex items-center border-b border-white pt-[0.35em]" :class="{ 'mt-[1.4em]': sectionIndex > 0 }">
                <div class="basis-[49%]">{{ section.title }}</div>
              </div>
              <div v-for="(row, rowIndex) in section.rows" :key="rowIndex" class="flex items-center pt-[0.35em]" :class="{ 'mt-[1.4em]': row.spaced }">
                <div class="basis-[49%]">{{ row.label }}</div>
                <div v-if="row.hidden" class="group relative basis-[49%] text-center">
                  <div class="opacity-0 group-hover:opacity-100">{{ row.value[0] }}</div>
                  <div class="pointer-events-none absolute inset-0 text-[gray] group-hover:opacity-0">{{ row.hidden }}</div>
                </div>
                <div v-else class="basis-[49%] text-center">
                  <template v-for="(part, partIndex) in row.value" :key="partIndex">
                    <template v-if="typeof part === 'string'">{{ part }}</template>
                    <span v-else-if="part.diff" class="text-[70%]"> {{ part.diff }}</span>
                  </template>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, useId, useTemplateRef } from 'vue'
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import { formatDate, formatDigitGroups } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { compact, getClassImageUrl } from '@utils/utils'
import { DatabaseManager, type PlayerHistory } from '~/data/database-manager'
import { type AttributeName, PlayerModel } from '~/data/player-model'

defineOptions({
  name: 'PlayerDetailDialog'
})

const props = defineProps<{
  /**
   * Link id of the shown player
   */
  identifier: string
  /**
   * Shows the newest entry at or before this timestamp
   */
  timestamp: number
  /**
   * Compares with the oldest entry between this timestamp and the shown one
   */
  reference: number
}>()

const emit = defineEmits<{
  close: []
}>()

type Part = string | { diff: string }

type Row = {
  label: string
  value: Part[]
  spaced?: boolean
  hidden?: string
}

type Section = {
  title: string
  rows: Row[]
}

const ATTRIBUTES: AttributeName[] = ['Strength', 'Dexterity', 'Intelligence', 'Constitution', 'Luck']

const localize = useLocalize('stats.player')

const titleId = useId()

const dialogElement = useTemplateRef('dialog-ref')

const history = DatabaseManager.getPlayer(props.identifier) as PlayerHistory
const timestamps = history.List.map((entry) => entry.Timestamp)
const timestampCurrent = timestamps.find((timestamp) => timestamp <= props.timestamp) || history.LatestTimestamp
const timestampReference = [...timestamps].reverse().find((timestamp) => timestamp >= props.reference && timestamp <= timestampCurrent) || timestampCurrent

const player = DatabaseManager.getPlayer(props.identifier, timestampCurrent) as PlayerModel
const compare = DatabaseManager.getPlayer(props.identifier, timestampReference) as PlayerModel

const hasReference = player.Timestamp != compare.Timestamp

const panels = [createFirstPanel(), createSecondPanel(), createThirdPanel()]

onMounted(() => {
  dialogElement.value?.focus({ preventScroll: true })
})

function spaced(value: number) {
  return formatDigitGroups(value, ' ')
}

function diff(a: number | undefined, b: number | undefined, formatter?: (value: number) => string): Part {
  if (a != b && b != undefined && a != undefined) {
    const text = formatter ? formatter(a - b) : String(a - b)

    return { diff: a - b > 0 ? `+${text}` : text }
  } else {
    return { diff: '' }
  }
}

function createFirstPanel(): Section[] {
  const sections: Section[] = [
    {
      title: localize('attributes'),
      rows: ATTRIBUTES.map((name, index) => ({ label: localize.global(`general.attribute${index + 1}`), value: [spaced(player[name].Total), diff(player[name].Total, compare[name].Total, spaced)] }))
    },
    {
      title: localize('basis'),
      rows: ATTRIBUTES.map((name, index) => ({ label: localize.global(`general.attribute${index + 1}`), value: [spaced(player[name].Base), diff(player[name].Base, compare[name].Base, spaced)] }))
    },
    {
      title: localize('miscellaneous'),
      rows: compact([
        { label: localize('armor'), value: [spaced(player.Armor), diff(player.Armor, compare.Armor, spaced)] },
        { label: localize('damage'), value: [`${spaced(player.Damage.Min)} - ${spaced(player.Damage.Max)}`] },
        player.Class == ASSASSIN && player.Damage2 && { label: '', value: [`${spaced(player.Damage2.Min)} - ${spaced(player.Damage2.Max)}`] },
        { label: localize('health'), value: [spaced(player.Health)], spaced: true }
      ])
    }
  ]

  if (player.Potions[0].Size) {
    sections.push({
      title: localize('potions'),
      rows: player.Potions.filter((potion) => potion.Size).map((potion) => ({ label: localize.global(`general.potion${potion.Type}`), value: [`+ ${potion.Size}%`] }))
    })
  }

  return sections
}

function createSecondPanel(): Section[] {
  const sections: Section[] = []

  if (player.hasGuild()) {
    sections.push({
      title: localize('guild'),
      rows: compact([{ label: localize('name'), value: [player.Group.Name ?? ''] }, player.Group.Role && { label: localize('role'), value: [localize.global(`general.rank${player.Group.Role}`)] }, { label: localize('joined_on'), value: [formatDate(player.Group.Joined)] }])
    })
  }

  sections.push({
    title: localize('bonuses'),
    rows: compact([
      { label: localize('scrapbook'), value: [`${player.Book} / ${PlayerModel.SCRAPBOOK_COUNT}`, diff(player.Book, compare.Book, spaced)] },
      (player.Own || player.Achievements.Owned > 0) && { label: localize('achievements'), value: [`${player.Achievements.Owned} / ${PlayerModel.ACHIEVEMENTS_COUNT}`, diff(player.Achievements.Owned, compare.Achievements.Owned, spaced)] },
      player.Mount && { label: localize('mount'), value: [`${player.MountValue}%`] },
      { label: localize('heath_bonus'), value: [`${player.Dungeons.Player}%`, diff(player.Dungeons.Player, compare.Dungeons.Player)] },
      { label: localize('damage_bonus'), value: [`${player.Dungeons.Group}%`, diff(player.Dungeons.Group, compare.Dungeons.Group)] },
      player.Fortress.Gladiator && { label: localize('gladiator'), value: [String(player.Fortress.Gladiator), diff(player.Fortress.Gladiator, compare.Fortress.Gladiator)] },
      player.Group.Treasure && { label: localize('treasure'), value: [String(player.Group.Treasure), diff(player.Group.Treasure, compare.Group.Treasure)] },
      player.Group.Instructor && { label: localize('instructor'), value: [String(player.Group.Instructor), diff(player.Group.Instructor, compare.Group.Instructor)] },
      player.Group.Pet && { label: localize('pet'), value: [String(player.Group.Pet), diff(player.Group.Pet, compare.Group.Pet)] },
      player.Fortress.Knights && { label: localize('knights'), value: [String(player.Fortress.Knights), diff(player.Fortress.Knights, compare.Fortress.Knights)] }
    ])
  })

  const runes = player.Runes
  const secondDamage = (value: number | undefined) => (player.Class == 4 ? ` / ${value}%` : '')

  sections.push({
    title: localize('runes.title'),
    rows: compact([
      runes.Gold && { label: localize.global('general.rune1'), value: [`+ ${runes.Gold}%`] },
      runes.XP && { label: localize.global('general.rune4'), value: [`+ ${runes.XP}%`] },
      runes.Chance && { label: localize.global('general.rune2'), value: [`+ ${runes.Chance}%`] },
      runes.Quality && { label: localize.global('general.rune3'), value: [`+ ${runes.Quality}`] },
      runes.Health && { label: localize.global('general.rune5'), value: [`+ ${runes.Health}%`] },
      (runes.DamageFire || runes.Damage2Fire) && { label: localize.global('general.rune10'), value: [`+ ${runes.DamageFire}%${secondDamage(runes.Damage2Fire)}`] },
      (runes.DamageCold || runes.Damage2Cold) && { label: localize.global('general.rune11'), value: [`+ ${runes.DamageCold}%${secondDamage(runes.Damage2Cold)}`] },
      (runes.DamageLightning || runes.Damage2Lightning) && { label: localize.global('general.rune12'), value: [`+ ${runes.DamageLightning}%${secondDamage(runes.Damage2Lightning)}`] },
      runes.ResistanceFire && { label: localize.global('general.rune6'), value: [`+ ${runes.ResistanceFire}%`] },
      runes.ResistanceCold && { label: localize.global('general.rune7'), value: [`+ ${runes.ResistanceCold}%`] },
      runes.ResistanceLightning && { label: localize.global('general.rune8'), value: [`+ ${runes.ResistanceLightning}%`] }
    ])
  })

  return sections
}

function createThirdPanel(): Section[] {
  const fortress = player.Fortress
  const other = compare.Fortress

  const building = (index: number, name: keyof typeof fortress & ('Fortress' | 'LaborerQuarters' | 'WoodcutterGuild' | 'Quarry' | 'GemMine' | 'Academy' | 'Treasury' | 'Smithy')): Row => ({
    label: localize(`fortress.building${index}`),
    value: [String(fortress[name]), diff(fortress[name], other[name])]
  })

  const sections: Section[] = [
    {
      title: localize('fortress.title'),
      rows: [
        { label: localize('fortress.upgrades'), value: [String(fortress.Upgrades), diff(fortress.Upgrades, other.Upgrades)] },
        { label: localize('fortress.rank'), value: [String(fortress.Rank), diff(fortress.Rank, other.Rank)] },
        { label: localize('fortress.honor'), value: [String(fortress.Honor), diff(fortress.Honor, other.Honor)] },
        { ...building(1, 'Fortress'), spaced: true },
        building(2, 'LaborerQuarters'),
        building(3, 'WoodcutterGuild'),
        building(4, 'Quarry'),
        building(5, 'GemMine'),
        building(6, 'Academy'),
        { label: localize('fortress.building7'), value: [String(fortress.ArcheryGuild), diff(fortress.ArcheryGuild, other.ArcheryGuild), ` (${fortress.ArcheryGuild * 2}x ${fortress.Archers}`, diff(fortress.Archers, other.Archers), ')'] },
        { label: localize('fortress.building8'), value: [String(fortress.Barracks), diff(fortress.Barracks, other.Barracks), ` (${fortress.Barracks * 3}x ${fortress.Warriors}`, diff(fortress.Warriors, other.Warriors), ')'] },
        { label: localize('fortress.building9'), value: [String(fortress.MageTower), diff(fortress.MageTower, other.MageTower), ` (${fortress.MageTower}x ${fortress.Mages}`, diff(fortress.Mages, other.Mages), ')'] },
        building(10, 'Treasury'),
        building(11, 'Smithy'),
        { label: localize('fortress.building12'), value: [String(fortress.Fortifications), diff(fortress.Fortifications, other.Fortifications), ` (${fortress.Wall}`, diff(fortress.Wall, other.Wall), ')'] }
      ]
    }
  ]

  if (fortress.Upgrade.Building >= 0) {
    sections.push({
      title: localize('fortress.working'),
      rows: [{ label: localize(`fortress.building${fortress.Upgrade.Building + 1}`), value: [formatDate(fortress.Upgrade.Finish)] }]
    })
  }

  if (player.Own) {
    sections.push({
      title: localize('extras.title'),
      rows: compact([{ label: localize('extras.registered'), value: [formatDate(player.Registered)] }, player.WebshopID && { label: localize('extras.webshopid'), value: [player.WebshopID], hidden: localize('extras.webshopid_placeholder') }])
    })
  }

  return sections
}
</script>
