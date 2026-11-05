<template>
  <SFTable plain fixed>
    <template #header>
      <SFTableRow>
        <SFTableHeader>{{ localize('columns.attribute') }}</SFTableHeader>
        <SFTableHeader v-for="column in columns" :key="column.key" align="right">{{ localize(`columns.${column.key}`) }}</SFTableHeader>
      </SFTableRow>
    </template>
    <SFTableRow v-for="(name, index) in PlayerModel.ATTRIBUTES" :key="name">
      <SFTableCell class="font-bold">{{ localize.global(`general.attribute${index + 1}`) }}</SFTableCell>
      <SFTableCell v-for="column in columns" :key="column.key" align="right">
        <PlayerDetailValue v-if="column.tracked" :value="formatSpacedNumber(column.read(props.player[name]))" :read="(player) => column.read(player[name])" :title="localize('chart_title', { name: localize.global(`general.attribute${index + 1}`), column: localize(`columns.${column.key}`) })" />
        <template v-else>{{ formatBonus(column.read(props.player[name])) }}</template>
      </SFTableCell>
    </SFTableRow>
  </SFTable>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFTable from '@library/SFTable.vue'
import SFTableCell from '@library/SFTableCell.vue'
import SFTableHeader from '@library/SFTableHeader.vue'
import SFTableRow from '@library/SFTableRow.vue'
import { formatSpacedNumber } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { compact } from '@utils/utils'
import { type PlayerAttribute, PlayerModel } from '~/core/models/player'
import PlayerDetailValue from '~/pages/stats/components/PlayerDetailValue.vue'

defineOptions({
  name: 'PlayerDetailAttributes'
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

type AttributeColumn = {
  key: 'total' | 'base' | 'items' | 'upgrades' | 'gems' | 'class' | 'potion' | 'pets'
  read: (attribute: PlayerAttribute) => number
  tracked?: boolean
}

const localize = useLocalize('stats.player')

const columns = computed(() =>
  compact<AttributeColumn | false>([
    { key: 'total', read: (attribute) => attribute.Total, tracked: true },
    { key: 'base', read: (attribute) => attribute.Base, tracked: true },
    { key: 'items', read: (attribute) => attribute.ItemsBase },
    { key: 'upgrades', read: (attribute) => attribute.Upgrades },
    { key: 'gems', read: (attribute) => attribute.Gems },
    PlayerModel.ATTRIBUTES.some((name) => props.player[name].Class > 0) && { key: 'class', read: (attribute) => attribute.Class },
    { key: 'potion', read: (attribute) => attribute.Potion },
    { key: 'pets', read: (attribute) => attribute.Pet }
  ])
)

function formatBonus(value: number) {
  return value ? formatSpacedNumber(value) : '-'
}
</script>
