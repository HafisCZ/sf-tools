<template>
  <Page width="80vw">
    <div class="grid gap-[14px] md:grid-cols-3">
      <SFSelect ref="type-ref" v-model="type" :label="localize('item.type')" :options="typeOptions" />
      <SFNumber ref="value-ref" v-model="value" :label="localize('item.value')" required :min="0" :step="1" />
      <SFCheckbox ref="double-ref" v-model="double" :label="localize('item.double')" class="md:mt-[26px] md:h-[38px]" />
    </div>

    <SFTable class="mt-[14px] whitespace-nowrap">
      <template #header>
        <SFTableRow>
          <SFTableHeader align="center" class="w-[5%]">#</SFTableHeader>
          <SFTableHeader align="center" class="w-[6%]">{{ localize('table.bonus') }}</SFTableHeader>
          <SFTableHeader align="center" class="w-[6%]">{{ localize('table.total') }}</SFTableHeader>
          <SFTableHeader class="w-[4%]" />
          <SFTableHeader class="w-[calc(79%/6)]">{{ localize('table.required') }}</SFTableHeader>
          <SFTableHeader class="w-[calc(79%/6)]">{{ localize('table.total') }}</SFTableHeader>
          <SFTableHeader class="w-[calc(79%/6)]">{{ localize('table.reclaimable') }}</SFTableHeader>
          <SFTableHeader class="w-[calc(79%/6)]">{{ localize('table.total') }}</SFTableHeader>
          <SFTableHeader class="w-[calc(79%/6)]">{{ localize('table.lost') }}</SFTableHeader>
          <SFTableHeader class="w-[calc(79%/6)]">{{ localize('table.total') }}</SFTableHeader>
        </SFTableRow>
      </template>

      <template v-if="isValid">
        <SFTableRow v-for="entry in upgrades" :key="entry.level">
          <SFTableCell align="center">{{ entry.level }}</SFTableCell>
          <SFTableCell align="center">{{ formatSpacedNumber(entry.attribute) }}</SFTableCell>
          <SFTableCell align="center">{{ formatSpacedNumber(entry.attributeTotal) }}</SFTableCell>
          <SFTableCell />
          <SFTableCell>
            <ResourceAmounts :resources="entry.upgrade" />
          </SFTableCell>
          <SFTableCell>
            <ResourceAmounts :resources="entry.upgradeTotal" />
          </SFTableCell>
          <SFTableCell>
            <ResourceAmounts :resources="entry.dismantle" />
          </SFTableCell>
          <SFTableCell>
            <ResourceAmounts :resources="entry.dismantleTotal" />
          </SFTableCell>
          <SFTableCell>
            <ResourceAmounts :resources="entry.lost" :relative-to="entry.upgrade" />
          </SFTableCell>
          <SFTableCell>
            <ResourceAmounts :resources="entry.lostTotal" :relative-to="entry.upgradeTotal" />
          </SFTableCell>
        </SFTableRow>
      </template>
      <SFTableRow v-else>
        <SFTableCell colspan="10" align="center">{{ localize('table.invalid') }}</SFTableCell>
      </SFTableRow>
    </SFTable>
  </Page>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import SFCheckbox from '@library/SFCheckbox.vue'
import SFNumber from '@library/SFNumber.vue'
import SFSelect from '@library/SFSelect.vue'
import SFTable from '@library/SFTable.vue'
import SFTableCell from '@library/SFTableCell.vue'
import SFTableHeader from '@library/SFTableHeader.vue'
import SFTableRow from '@library/SFTableRow.vue'
import { formatSpacedNumber } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { useComponentValidation } from '@utils/validations'
import ResourceAmounts from './components/ResourceAmounts.vue'
import { ItemModel } from '~/data/item-model'
import { type BlacksmithResources } from '~/data/types'
import Page from '~/pages/Page.vue'

defineOptions({
  name: 'BlacksmithPage'
})

const ATTRIBUTE_TYPES: Record<string, number[]> = {
  normal_1: [1, 0, 0],
  normal_2: [1, 1, 0],
  epic_3: [21, 0, 0],
  epic_5: [6, 0, 0]
}

const MAX_UPGRADES = 20

const localize = useLocalize('blacksmith')

const type = ref('normal_1')
const value = ref<number | null>(0)
const double = ref(false)

const isValid = useComponentValidation(useTemplateRef('type-ref'), useTemplateRef('value-ref'), useTemplateRef('double-ref'))

const typeOptions = computed(() => Object.keys(ATTRIBUTE_TYPES).map((key) => ({ value: key, label: localize(`item.types.${key}`) })))

const upgrades = computed(() => listUpgrades(type.value, value.value ?? 0, double.value))

function addResources(a: BlacksmithResources, b: BlacksmithResources): BlacksmithResources {
  return {
    Metal: a.Metal + b.Metal,
    Crystal: a.Crystal + b.Crystal
  }
}

function subtractResources(a: BlacksmithResources, b: BlacksmithResources): BlacksmithResources {
  return {
    Metal: a.Metal - b.Metal,
    Crystal: a.Crystal - b.Crystal
  }
}

function listUpgrades(itemType: string, attribute: number, mageOrScoutWeapon: boolean) {
  const item = ItemModel.empty()

  item.Type = 1
  // Picture indexes from 1000 belong to Mage and Scout weapons
  item.PicIndex = mageOrScoutWeapon ? 1000 : 1
  item.Attributes[0] = attribute
  item.AttributeTypes = ATTRIBUTE_TYPES[itemType]
  item.SellPrice.Gold = 1

  const dismantleBase = item.getBlacksmithPrice()

  let upgradeTotal = { Metal: 0, Crystal: 0 }

  const entries = []

  for (let level = 1; level <= MAX_UPGRADES; level++) {
    const upgrade = item.getBlacksmithUpgradePrice()
    upgradeTotal = addResources(upgradeTotal, upgrade)

    const dismantleLast = item.getBlacksmithPrice()
    const attributeLast = item.Attributes[0]

    item.upgradeTo(level)

    const dismantleCurrent = item.getBlacksmithPrice()
    const dismantle = subtractResources(dismantleCurrent, dismantleLast)
    const dismantleTotal = subtractResources(dismantleCurrent, dismantleBase)

    entries.push({
      level,
      attribute: item.Attributes[0] - attributeLast,
      attributeTotal: item.Attributes[0] - attribute,
      upgrade,
      upgradeTotal,
      dismantle,
      dismantleTotal,
      lost: subtractResources(upgrade, dismantle),
      lostTotal: subtractResources(upgradeTotal, dismantleTotal)
    })
  }

  return entries
}
</script>
