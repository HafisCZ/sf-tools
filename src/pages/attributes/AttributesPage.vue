<template>
  <Page>
    <template #nav>
      <SFTabs v-model="tab" :options="tabOptions" />
    </template>

    <div v-if="tab === 'fortress' || tab === 'underworld'" class="fixed top-[84px] right-[28px] z-[99] w-[216px] rounded-md border border-line bg-surface p-[14px]">
      <SFHeading level="5" class="mb-[14px]">{{ localize('float.title') }}</SFHeading>
      <div class="flex flex-col gap-[14px]">
        <SFNumber v-model="fortressLevel" :label="localize.global('editor.level')" :min="1" :max="999" :step="1" />
        <SFNumber v-model="quartersLevel" :label="localize('float.quarters')" :min="0" :max="15" :step="1" />
      </div>
    </div>

    <div v-show="tab === 'gold_experience'" role="tabpanel" class="flex flex-col gap-[14px] [&_label]:text-[12px]">
      <div class="rounded-md border border-line bg-surface p-[14px]">
        <SFHeading level="5" class="mb-[14px]">{{ localize('gold.title') }}</SFHeading>
        <div class="grid grid-cols-2 gap-[14px] md:grid-cols-6">
          <SFNumber v-model="goldLevel" :label="localize.global('editor.level')" :min="1" :max="999" :step="1" />
          <SFNumber v-model="goldGuild" :min="0" :max="200" :step="1">
            <template #label><SFPing color="blue" /> {{ localize('gold.group') }}</template>
          </SFNumber>
          <SFNumber v-model="goldTower" :min="0" :max="100" :step="1">
            <template #label><SFPing color="blue" /> {{ localize('gold.tower') }}</template>
          </SFNumber>
          <SFNumber v-model="goldMine" :min="1" :max="100" :step="1">
            <template #label><SFPing color="red" /> {{ localize('gold.mine') }}</template>
          </SFNumber>
          <SFNumber v-model="goldPit" :min="1" :max="100" :step="1">
            <template #label><SFPing color="accent" /> {{ localize('gold.pit') }}</template>
          </SFNumber>
          <SFNumber v-model="goldRunes" :min="0" :max="5" :step="1">
            <template #label><SFPing color="green" /> {{ localize('gold.rune') }}</template>
          </SFNumber>

          <SFInput :model-value="gold.reward" :label="localize('gold.reward')" readonly />
          <SFInput :model-value="gold.guard" readonly>
            <template #label><SFPing color="blue" /> {{ localize('gold.guard_hr') }}</template>
          </SFInput>
          <SFInput :model-value="gold.dice1" :label="localize('gold.dice_3')" readonly />
          <SFInput :model-value="gold.gem1" readonly>
            <template #label><SFPing color="red" /> {{ localize('gold.gem_s') }}</template>
          </SFInput>
          <SFInput :model-value="gold.capacity" readonly>
            <template #label><SFPing color="accent" /> {{ localize('gold.pit_cap') }}</template>
          </SFInput>
          <SFInput :model-value="gold.potion10" readonly>
            <template #label><SFPing color="green" /> {{ localize('gold.pot_10') }}</template>
          </SFInput>

          <SFInput :model-value="gold.scroll" :label="localize('gold.scroll')" readonly />
          <SFInput :model-value="gold.hourglass1" readonly>
            <template #label><SFPing color="green" /> {{ localize('gold.glass') }}</template>
          </SFInput>
          <SFInput :model-value="gold.dice2" :label="localize('gold.dice_4')" readonly />
          <SFInput :model-value="gold.gem2" readonly>
            <template #label><SFPing color="red" /> {{ localize('gold.gem_m') }}</template>
          </SFInput>
          <SFInput :model-value="gold.hourly" readonly>
            <template #label><SFPing color="accent" /> {{ localize('gold.pit_hr') }}</template>
          </SFInput>
          <SFInput :model-value="gold.potion15" readonly>
            <template #label><SFPing color="green" /> {{ localize('gold.pot_15') }}</template>
          </SFInput>

          <SFInput :model-value="gold.bar1" :label="localize('gold.calendar_1')" readonly />
          <SFInput :model-value="gold.hourglass10" readonly>
            <template #label><SFPing color="green" /> {{ localize('gold.glass_10') }}</template>
          </SFInput>
          <SFInput :model-value="gold.dice3" :label="localize('gold.dice_5')" readonly />
          <SFInput :model-value="gold.gem3" readonly>
            <template #label><SFPing color="red" /> {{ localize('gold.gem_l') }}</template>
          </SFInput>
          <SFInput :model-value="gold.time" readonly>
            <template #label><SFPing color="accent" /> {{ localize('gold.pit_time') }}</template>
          </SFInput>
          <SFInput :model-value="gold.potion25" readonly>
            <template #label><SFPing color="green" /> {{ localize('gold.pot_25') }}</template>
          </SFInput>

          <SFInput :model-value="gold.bar3" :label="localize('gold.calendar_3')" readonly />
          <SFInput :model-value="gold.witchPotion" :label="localize('gold.pot_w')" readonly />
          <div class="hidden md:block" />
          <div class="hidden md:block" />
          <div class="hidden md:block" />
          <SFInput :model-value="gold.lifePotion" readonly>
            <template #label><SFPing color="green" /> {{ localize('gold.pot_pm') }}</template>
          </SFInput>

          <SFInput :model-value="gold.arena" :label="localize('gold.arena')" readonly />
          <SFInput :model-value="gold.reroll" :label="localize('gold.reroll')" readonly />
          <SFInput :model-value="gold.towerEnemy" :label="localize('gold.tower_reward')" readonly />
          <SFInput :model-value="gold.twisterEnemy" :label="localize('gold.twister_reward')" readonly />
          <div class="hidden md:block" />
          <SFInput :model-value="gold.lifePotionGold" readonly>
            <template #label><SFPing color="green" /> {{ localize('gold.pot_pg') }}</template>
          </SFInput>
        </div>
      </div>

      <div class="rounded-md border border-line bg-surface p-[14px]">
        <SFHeading level="5" class="mb-[14px]">{{ localize('experience.title') }}</SFHeading>
        <div class="grid grid-cols-2 gap-[14px] md:grid-cols-6">
          <SFNumber v-model="experienceLevel" :label="localize.global('editor.level')" :min="1" :max="999" :step="1" />
          <SFNumber v-model="experienceHydra" :min="0" :max="20" :step="1">
            <template #label><SFPing color="green" /> {{ localize('experience.hydra') }}</template>
          </SFNumber>
          <SFNumber v-model="experienceAcademy" :min="1" :max="20" :step="1">
            <template #label><SFPing color="accent" /> {{ localize('experience.academy') }}</template>
          </SFNumber>
          <div class="hidden md:block" />
          <div class="hidden md:block" />
          <div class="hidden md:block" />

          <SFInput :model-value="experience.next" :label="localize('experience.next')" readonly />
          <SFInput :model-value="experience.daily" readonly>
            <template #label><SFPing color="green" /> {{ localize('experience.daily') }}</template>
          </SFInput>
          <SFInput :model-value="experience.hourly" readonly>
            <template #label><SFPing color="accent" /> {{ localize('experience.academy_hr') }}</template>
          </SFInput>
          <SFInput :model-value="experience.calendar1" :label="localize('experience.calendar_1')" readonly />
          <SFInput :model-value="experience.arena" :label="localize('experience.arena')" readonly />
          <SFInput :model-value="experience.dungeon" :label="localize('experience.dungeon')" readonly />

          <div class="hidden md:block" />
          <div class="hidden md:block" />
          <SFInput :model-value="experience.time" readonly>
            <template #label><SFPing color="accent" /> {{ localize('experience.academy_time') }}</template>
          </SFInput>
          <SFInput :model-value="experience.calendar2" :label="localize('experience.calendar_2')" readonly />
          <SFInput :model-value="experience.wheel1" :label="localize('experience.wheel_1')" readonly />
          <SFInput :model-value="experience.twister" :label="localize('experience.twister')" readonly />

          <div class="hidden md:block" />
          <div class="hidden md:block" />
          <SFInput :model-value="experience.capacity" readonly>
            <template #label><SFPing color="accent" /> {{ localize('experience.academy_cap') }}</template>
          </SFInput>
          <SFInput :model-value="experience.calendar3" :label="localize('experience.calendar_3')" readonly />
          <SFInput :model-value="experience.wheel2" :label="localize('experience.wheel_2')" readonly />
          <SFInput :model-value="experience.habitat" :label="localize('experience.habitat')" readonly />
        </div>
      </div>

      <div class="rounded-md border border-line bg-surface p-[14px]">
        <SFHeading level="5" class="mb-[14px]">{{ localize('expeditions.title') }}</SFHeading>
        <div class="grid grid-cols-2 gap-[14px] md:grid-cols-7">
          <SFNumber v-model="expeditionLevel" :label="localize.global('editor.level')" :min="1" :max="999" :step="1" />
          <SFSelect v-model="expeditionMount" :label="localize('expeditions.mount.title')" :options="mountOptions" />
          <div class="hidden md:block" />
          <div class="hidden md:block" />
          <div class="hidden md:block" />
          <div class="hidden md:block" />
          <div class="hidden md:block" />

          <SFNumber v-model="expeditionBook" :min="0" :max="100" :step="1">
            <template #label><SFPing color="green" /> {{ localize('expeditions.album') }}</template>
          </SFNumber>
          <SFNumber v-model="expeditionGuildExperience" :min="0" :max="200" :step="1">
            <template #label><SFPing color="green" /> {{ localize('expeditions.group_exp') }}</template>
          </SFNumber>
          <SFNumber v-model="expeditionExperienceRune" :min="0" :max="10" :step="1">
            <template #label><SFPing color="green" /> {{ localize('expeditions.rune_exp') }}</template>
          </SFNumber>
          <SFSelect v-model="expeditionExperienceScroll" :options="yesNoOptions">
            <template #label><SFPing color="green" /> {{ localize('expeditions.enchantment_exp') }}</template>
          </SFSelect>
          <SFNumber v-model="expeditionStars" :min="0" :max="3" :step="1">
            <template #label><SFPing color="green" /> {{ localize('expeditions.stars') }}</template>
          </SFNumber>
          <div class="hidden md:block" />
          <SFInput :model-value="expedition.experience" readonly>
            <template #label><SFPing color="green" /> {{ localize('expeditions.xp') }}</template>
          </SFInput>

          <SFNumber v-model="expeditionTower" :min="0" :max="100" :step="1">
            <template #label><SFPing color="blue" /> {{ localize('expeditions.tower') }}</template>
          </SFNumber>
          <SFNumber v-model="expeditionGuildGold" :min="0" :max="200" :step="1">
            <template #label><SFPing color="blue" /> {{ localize('expeditions.group_gold') }}</template>
          </SFNumber>
          <SFNumber v-model="expeditionGoldRune" :min="0" :max="50" :step="1">
            <template #label><SFPing color="blue" /> {{ localize('expeditions.rune_gold') }}</template>
          </SFNumber>
          <SFSelect v-model="expeditionGoldScroll" :options="yesNoOptions">
            <template #label><SFPing color="blue" /> {{ localize('expeditions.enchantment_gold') }}</template>
          </SFSelect>
          <SFInput :model-value="expedition.goldChest" readonly>
            <template #label><SFPing color="blue" /> {{ localize('expeditions.gold_chest') }}</template>
          </SFInput>
          <SFInput :model-value="expedition.goldMid" readonly>
            <template #label><SFPing color="blue" /> {{ localize('expeditions.gold_mid') }}</template>
          </SFInput>
          <SFInput :model-value="expedition.gold" readonly>
            <template #label><SFPing color="blue" /> {{ localize('expeditions.gold') }}</template>
          </SFInput>
        </div>
        <SFParagraph class="mt-[14px] font-bold text-white">{{ localize('expeditions.notice') }}</SFParagraph>
      </div>

      <div class="rounded-md border border-line bg-surface p-[14px]">
        <SFHeading level="5" class="mb-[14px]">{{ localize('quests.title') }}</SFHeading>
        <div class="grid grid-cols-2 gap-[14px] md:grid-cols-6">
          <SFNumber v-model="questLevel" :label="localize.global('editor.level')" :min="1" :max="999" :step="1" />
          <div class="hidden md:block" />
          <div class="hidden md:block" />
          <div class="hidden md:block" />
          <div class="hidden md:block" />
          <div class="hidden md:block" />

          <SFNumber v-model="questBook" :min="0" :max="100" :step="1">
            <template #label><SFPing color="green" /> {{ localize('quests.album') }}</template>
          </SFNumber>
          <SFNumber v-model="questGuildExperience" :min="0" :max="200" :step="1">
            <template #label><SFPing color="green" /> {{ localize('quests.group_exp') }}</template>
          </SFNumber>
          <SFNumber v-model="questExperienceRune" :min="0" :max="10" :step="1">
            <template #label><SFPing color="green" /> {{ localize('quests.rune_exp') }}</template>
          </SFNumber>
          <SFSelect v-model="questExperienceScroll" :options="yesNoOptions">
            <template #label><SFPing color="green" /> {{ localize('quests.enchantment_exp') }}</template>
          </SFSelect>
          <SFInput :model-value="quest.experienceMin" readonly>
            <template #label><SFPing color="green" /> {{ localize('quests.min_xp') }}</template>
          </SFInput>
          <SFInput :model-value="quest.experienceMax" readonly>
            <template #label><SFPing color="green" /> {{ localize('quests.max_xp') }}</template>
          </SFInput>

          <SFNumber v-model="questTower" :min="0" :max="100" :step="1">
            <template #label><SFPing color="blue" /> {{ localize('quests.tower') }}</template>
          </SFNumber>
          <SFNumber v-model="questGuildGold" :min="0" :max="200" :step="1">
            <template #label><SFPing color="blue" /> {{ localize('quests.group_gold') }}</template>
          </SFNumber>
          <SFNumber v-model="questGoldRune" :min="0" :max="50" :step="1">
            <template #label><SFPing color="blue" /> {{ localize('quests.rune_gold') }}</template>
          </SFNumber>
          <SFSelect v-model="questGoldScroll" :options="yesNoOptions">
            <template #label><SFPing color="blue" /> {{ localize('quests.enchantment_gold') }}</template>
          </SFSelect>
          <SFInput :model-value="quest.goldMin" readonly>
            <template #label><SFPing color="blue" /> {{ localize('quests.min_gold') }}</template>
          </SFInput>
          <SFInput :model-value="quest.goldMax" readonly>
            <template #label><SFPing color="blue" /> {{ localize('quests.max_gold') }}</template>
          </SFInput>
        </div>
        <SFParagraph class="mt-[14px] font-bold text-white">{{ localize('quests.notice') }}</SFParagraph>
      </div>

      <div class="rounded-md border border-line bg-surface p-[14px]">
        <SFHeading level="5" class="mb-[14px]">{{ localize('misc.title') }}</SFHeading>
        <div class="grid grid-cols-2 gap-[14px] md:grid-cols-6">
          <SFNumber v-model="miscLevel" :label="localize.global('editor.level')" :min="1" :max="999" :step="1" />
          <SFNumber v-model="miscGate" :min="0" :max="15" :step="1">
            <template #label><SFPing color="blue" /> {{ localize('misc.gate') }}</template>
          </SFNumber>
          <SFNumber v-model="miscTorture" :min="0" :max="15" :step="1">
            <template #label><SFPing color="red" /> {{ localize('misc.torture') }}</template>
          </SFNumber>
          <div class="hidden md:block" />
          <div class="hidden md:block" />
          <div class="hidden md:block" />

          <SFInput :model-value="miscSouls" readonly>
            <template #label><SFPing color="blue" /><SFPing color="red" /> {{ localize('misc.souls') }}</template>
          </SFInput>
        </div>
      </div>

      <div class="rounded-md border border-line bg-surface p-[14px]">
        <SFHeading level="5" class="mb-[14px]">{{ localize('calc.title_at') }}</SFHeading>
        <div class="grid grid-cols-2 gap-[14px]">
          <SFNumber v-model="priceAtAttribute" :label="localize('calc.attribute')" :min="1" :step="1" />
          <SFInput :model-value="priceAt" :label="localize('calc.cost')" readonly />
        </div>
      </div>

      <div class="rounded-md border border-line bg-surface p-[14px]">
        <SFHeading level="5" class="mb-[14px]">{{ localize('calc.title_between') }}</SFHeading>
        <div class="grid grid-cols-2 gap-[14px] md:grid-cols-3">
          <SFNumber v-model="priceFrom" :label="localize('calc.from')" :min="1" :step="1" />
          <SFNumber v-model="priceTo" :label="localize('calc.to')" :min="1" :step="1" />
          <SFInput :model-value="priceBetween" :label="localize('calc.cost')" readonly />
        </div>
      </div>
    </div>

    <div v-if="visited.has('fortress')" v-show="tab === 'fortress'" role="tabpanel" class="flex flex-col gap-[34px] px-[14px] pt-[11px]">
      <BuildingTable v-for="table in fortressTables" :key="table.title" v-bind="table" />
    </div>

    <div v-if="visited.has('underworld')" v-show="tab === 'underworld'" role="tabpanel" class="flex flex-col gap-[34px] px-[14px] pt-[11px]">
      <BuildingTable v-for="table in underworldTables" :key="table.title" v-bind="table" />
    </div>

    <div v-if="visited.has('gold_table')" v-show="tab === 'gold_table'" role="tabpanel" class="px-[14px] pt-[15px]">
      <div class="mb-[14px] grid grid-cols-2 gap-[14px]">
        <SFButton variant="outline" size="sm" @click="copyGoldTable(false)">
          <SFIcon name="copy" />
          {{ localize('gold_table.copy') }}
        </SFButton>
        <SFButton variant="outline" size="sm" @click="copyGoldTable(true)">
          <SFIcon name="copy" />
          {{ localize('gold_table.copy_comma') }}
        </SFButton>
      </div>
      <SFTable dense>
        <template #header>
          <SFTableRow>
            <SFTableHeader v-for="column in goldTableColumns" :key="column" align="center" style="width: 20%">
              {{ column }}
            </SFTableHeader>
          </SFTableRow>
        </template>
        <tr v-for="row in goldTableRows" :key="row[0]" class="group/row">
          <td v-for="(cell, index) in row" :key="index" class="border-t border-white/10 px-[8.4px] py-[5.6px] text-center group-first/row:border-t-0">{{ cell }}</td>
        </tr>
      </SFTable>
    </div>

    <PageFooter>
      <template #links>
        <FooterLink icon="message" @click="openFeedback">
          {{ localize.global('index.footer.report') }}
        </FooterLink>
        <FooterLink icon="basket-shopping" href="https://home.sfgame.net">
          <span v-html="localize.global('index.footer.webshop#')" />
        </FooterLink>
        <FooterCopyright />
      </template>
    </PageFooter>
  </Page>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch, type Ref } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import SFInput from '@library/SFInput.vue'
import SFNumber from '@library/SFNumber.vue'
import SFParagraph from '@library/SFParagraph.vue'
import SFPing from '@library/SFPing.vue'
import SFSelect from '@library/SFSelect.vue'
import SFTable from '@library/SFTable.vue'
import SFTableHeader from '@library/SFTableHeader.vue'
import SFTableRow from '@library/SFTableRow.vue'
import SFTabs from '@library/SFTabs.vue'
import { type SelectOption } from '@utils/components'
import { useDialog } from '@utils/dialogs'
import { formatSpacedNumber } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { copyElement } from '@utils/utils'
import BuildingTable from './components/BuildingTable.vue'
import FeedbackDialog from '~/dialogs/FeedbackDialog.vue'
import FooterCopyright from '~/pages/components/FooterCopyright.vue'
import FooterLink from '~/pages/components/FooterLink.vue'
import PageFooter from '~/pages/components/PageFooter.vue'
import Page from '~/pages/Page.vue'

defineOptions({
  name: 'AttributesPage'
})

type TabName = 'gold_experience' | 'fortress' | 'underworld' | 'gold_table'

type BuildingTableData = {
  title: string
  columns: { label: string; width?: string }[]
  rows: string[][]
}

// Cells of one building level, the level and the build time are added around them
type CellGenerator = (level: number, ...values: number[]) => string | number

// Build time in seconds of building levels 1 to 20, before the quarters reduction
const BUILD_TIMES = [900, 1895, 3960, 8460, 18000, 28800, 41100, 66420, 144000, 313200, 691200, 1152000, 1728000, 2221200, 2880000, 3801600, 4147200, 4492800, 4838400, 5184000]

const HEART = [0, 616, 1650, 4220, 11000, 25080, 45930, 84150, 198000, 439550, 902850, 2043300, 4118400, 7722000, 16632000]

const GATE = [0, 55, 149, 380, 990, 2255, 4820, 10090, 26730, 65930, 135400, 306500, 617750, 1158300, 2494800]

const GOLD_PIT = [12, 46, 124, 317, 825, 1880, 4015, 8415, 19800, 43950, 90280, 204300, 411800, 772200, 1663200, 162518400].concat(Array<number>(84).fill(162518400))

const EXTRACTOR = [
  [0, 165, 412, 3804],
  [462, 231, 635, 10890],
  [1235, 330, 990, 27456],
  [3165, 528, 1716, 60648],
  [8250, 825, 2887, 122252],
  [18810, 1254, 4702, 237336],
  [40190, 1914, 7656, 504900],
  [84150, 2805, 14025, 1014750],
  [198000, 4125, 24750, 2246640],
  [439550, 6105, 48840, 4796550],
  [902850, 9405, 94050, 9535680],
  [2043300, 14190, 170280, 20935200],
  [4118400, 21450, 343200, 42471000],
  [7722000, 32175, 643500, 84348000],
  [16632000, 49500, 1188000, 162518400]
]

const GOBLIN_PIT = [
  [0, 1],
  [396, 2],
  [1060, 3],
  [2715, 4],
  [7070, 5],
  [16120, 5],
  [34450, 5],
  [63110, 5],
  [148500, 5],
  [329650, 5],
  [677150, 5],
  [1532500, 5],
  [3088800, 5],
  [5791500, 5],
  [12474000, 5]
]

const TROLL_BLOCK = [
  [165, 1],
  [616, 1],
  [1650, 1],
  [4220, 1],
  [11000, 1],
  [25080, 1],
  [45930, 1],
  [84150, 1],
  [198000, 2],
  [439550, 2],
  [902850, 2],
  [2043300, 2],
  [4118400, 3],
  [7722000, 3],
  [16632000, 4]
]

const TORTURE_CHAMBER = [148, 554, 1485, 3800, 9900, 22570, 41340, 75730, 178200, 395600, 812550, 1839000, 3706500, 6949800, 14968500]

const KEEPER = [198, 739, 1980, 5065, 13200, 25080, 45930, 84150, 198000, 439550, 902850, 2043300, 4118400, 7722000, 16632000]

const GLADIATOR_TRAINER = [148, 554, 1485, 3800, 9900, 22570, 48230, 100950, 237600, 527450, 1083400, 2452000, 4942000, 9266400, 19958000]

const TIME_MACHINE = [297, 1105, 2970, 5700, 11880, 22570, 41340, 75730, 178200, 395600, 812550, 1839000, 3706500, 6949800, 14968500]

const FORTRESS = [
  [0, 0, 900, 300],
  [150, 50, 1760, 560],
  [440, 140, 3300, 1000],
  [1100, 333, 6000, 1920],
  [2500, 800, 12000, 4000],
  [6000, 2000, 23000, 7600],
  [13417, 4433, 40800, 13920],
  [27200, 9280, 76500, 25500],
  [57375, 19125, 184800, 60000],
  [154000, 50000, 414000, 133200],
  [379500, 122100, 830400, 273600],
  [830400, 273600, 1872000, 619200],
  [1872000, 619200, 3744000, 1248000],
  [3744000, 1248000, 7200000, 2340000],
  [7200000, 2340000, 15120000, 5040000],
  [15120000, 5040000, 27350000, 9000000],
  [27350000, 9000000, 50000000, 17500000],
  [50000000, 17500000, 90000000, 30000000],
  [90000000, 30000000, 165000000, 54000000],
  [165000000, 54000000, 300000000, 100000000]
]

const QUARTERS = [
  [35, 12],
  [138, 46],
  [406, 129],
  [1015, 308],
  [2308, 738],
  [5538, 1846],
  [12385, 4092],
  [25108, 8566],
  [52962, 17654],
  [142154, 46154],
  [350308, 112708],
  [766523, 252554],
  [1872000, 619200],
  [3744000, 1248000],
  [7200000, 2340000]
]

const WOODCUTTER = [
  [0, 0, 375, 150],
  [30, 20, 605, 220],
  [88, 56, 990, 330],
  [220, 133, 1625, 500],
  [500, 320, 2625, 750],
  [1200, 800, 4312, 1150],
  [2683, 1773, 6800, 1700],
  [5440, 3712, 12750, 2550],
  [11475, 7650, 23100, 3850],
  [30800, 20000, 46000, 5750],
  [75900, 48840, 86500, 8650],
  [166080, 109440, 156000, 13000],
  [405600, 268320, 312000, 19500],
  [873600, 582400, 600000, 30000],
  [1800000, 1170000, 1080000, 45000],
  [3780000, 2520000, 1687500, 67500],
  [6837500, 4500000, 2600000, 100000],
  [12500000, 8750000, 4050000, 150000],
  [22500000, 15000000, 6300000, 225000],
  [41250000, 27000000, 10500000, 350000]
]

const QUARRY = [
  [22, 0, 125, 50],
  [90, 16, 192, 70],
  [264, 45, 300, 100],
  [660, 107, 520, 160],
  [1500, 256, 875, 250],
  [3600, 640, 1425, 380],
  [8050, 1419, 2320, 580],
  [16320, 2970, 4250, 850],
  [34425, 6120, 7500, 1250],
  [92400, 16000, 14800, 1850],
  [227700, 39072, 28500, 2850],
  [498240, 87552, 51600, 4300],
  [1216800, 214656, 104000, 6500],
  [2620800, 465920, 195000, 9750],
  [5400000, 936000, 360000, 15000],
  [11340000, 2016000, 562500, 22500],
  [20512500, 3600000, 858000, 33000],
  [37500000, 7000000, 1350000, 50000],
  [67500000, 12000000, 2100000, 75000],
  [123750000, 21600000, 3450000, 115000]
]

// Minutes a gem takes to grow, by gem mine level
const GEMTIME = [60, 120, 180, 240, 360, 480, 600, 720, 840, 960, 1080, 1200, 1440, 1680, 1920, 1800, 1680, 1560, 1530, 1500]

const GEMMINE = [
  [50, 17, 2, 1],
  [200, 67, 10, 3],
  [587, 187, 29, 9],
  [1467, 444, 73, 22],
  [3333, 1067, 167, 53],
  [8000, 2667, 400, 133],
  [17889, 5911, 894, 296],
  [36267, 12373, 1813, 619],
  [76500, 25500, 3825, 1275],
  [184800, 60000, 9240, 3000],
  [414000, 133200, 20700, 6660],
  [830400, 273600, 41520, 13680],
  [1872000, 619200, 93600, 30960],
  [3744000, 1248000, 187200, 62400],
  [7200000, 2340000, 360000, 117000],
  [15120000, 5040000, 756000, 252000],
  [27350000, 9000000, 1367500, 450000],
  [50000000, 17500000, 2500000, 875000],
  [90000000, 30000000, 4500000, 1500000],
  [165000000, 54000000, 4500000, 1500000],
  [300000000, 100000000, 4500000, 1500000]
]

const ACADEMY = [
  [7, 9],
  [28, 37],
  [81, 103],
  [203, 246],
  [462, 591],
  [1108, 1477],
  [2477, 3247],
  [5022, 6853],
  [10592, 14123],
  [28431, 36923],
  [70062, 90166],
  [153305, 202043],
  [374400, 495360],
  [748800, 998400],
  [1440000, 1872000],
  [3024000, 4032000],
  [5470000, 7200000],
  [10000000, 14000000],
  [18000000, 24000000],
  [33000000, 43000000]
]

const ARCHERY = [
  [41, 7],
  [164, 27],
  [480, 76],
  [1200, 182],
  [2727, 436],
  [6545, 1091],
  [14636, 2418],
  [29673, 5062],
  [62591, 10432],
  [168000, 27273],
  [414000, 66600],
  [830400, 136800],
  [1872000, 309600],
  [3744000, 624000],
  [7200000, 1170000]
]

const BARRACKS = [
  [20, 14],
  [82, 55],
  [240, 153],
  [600, 364],
  [1364, 873],
  [3273, 2182],
  [7318, 4836],
  [14836, 10124],
  [31295, 20864],
  [84000, 54545],
  [207000, 133200],
  [415200, 273600],
  [936000, 619200],
  [1872000, 1248000],
  [3600000, 2340000]
]

const MAGES = [
  [61, 20],
  [240, 76],
  [675, 205],
  [1636, 524],
  [4091, 1364],
  [9409, 3109],
  [19473, 6644],
  [41727, 13909],
  [113400, 36818],
  [282273, 90818],
  [622800, 205200],
  [1404000, 464400],
  [2808000, 936000],
  [5400000, 1755000],
  [11340000, 3780000]
]

const TREASURY = [
  [40, 13],
  [160, 53],
  [469, 149],
  [1173, 356],
  [2667, 853],
  [6400, 2133],
  [14311, 4729],
  [29013, 9899],
  [61200, 20400],
  [147840, 48000],
  [331200, 106560],
  [664320, 218880],
  [1497600, 495360],
  [2995200, 998400],
  [5760000, 1872000]
]

const SMITHY = [
  [25, 8],
  [100, 33],
  [293, 93],
  [733, 222],
  [1667, 533],
  [4000, 1333],
  [8944, 2956],
  [18133, 6187],
  [38250, 12750],
  [92400, 30000],
  [207000, 66600],
  [415200, 136800],
  [936000, 309600],
  [1872000, 624000],
  [3600000, 1170000],
  [7560000, 2520000],
  [13675000, 4500000],
  [25000000, 8750000],
  [45000000, 15000000],
  [82500000, 27000000]
]

const WALL = [
  [30, 13, 10],
  [120, 53, 18],
  [352, 149, 25],
  [880, 356, 29],
  [2000, 853, 35],
  [4800, 2133, 40],
  [10733, 4729, 50],
  [21760, 9899, 62],
  [45900, 20400, 76],
  [110880, 48000, 88],
  [248400, 106560, 102],
  [498240, 218880, 118],
  [1123200, 495360, 135],
  [2246400, 998400, 153],
  [4320000, 1872000, 170],
  [9072000, 4032000, 180],
  [16410000, 7200000, 185],
  [30000000, 14000000, 190],
  [54000000, 24000000, 195],
  [99000000, 43200000, 200]
]

const KNIGHTS = [
  [720, 240],
  [1408, 448],
  [2640, 800],
  [4800, 1536],
  [9600, 3200],
  [18400, 6080],
  [32640, 11136],
  [61200, 20400],
  [147840, 48000],
  [331200, 106560],
  [664320, 218880],
  [1497600, 495360],
  [2995200, 998400],
  [5760000, 1872000],
  [12096000, 4032000],
  [21880000, 7200000],
  [40000000, 14000000],
  [72000000, 24000000],
  [132000000, 43200000],
  [240000000, 80000000]
]

const localize = useLocalize('attributes')

const tab = ref<TabName>('gold_experience')

// Tabs only build their content the first time they are opened, the gold table alone holds 3156 rows
const visited = ref(new Set<TabName>([tab.value]))

const goldTableRows = shallowRef<string[][]>([])

const fortressLevel = ref<number | null>(null)
const quartersLevel = ref<number | null>(null)

const goldLevel = ref<number | null>(null)
const goldGuild = ref<number | null>(null)
const goldTower = ref<number | null>(null)
const goldMine = ref<number | null>(null)
const goldPit = ref<number | null>(null)
const goldRunes = ref<number | null>(null)

const experienceLevel = ref<number | null>(null)
const experienceHydra = ref<number | null>(null)
const experienceAcademy = ref<number | null>(null)

const expeditionLevel = ref<number | null>(null)
const expeditionMount = ref(0)
const expeditionBook = ref<number | null>(null)
const expeditionGuildExperience = ref<number | null>(null)
const expeditionExperienceRune = ref<number | null>(null)
const expeditionExperienceScroll = ref(0)
const expeditionStars = ref<number | null>(null)
const expeditionTower = ref<number | null>(null)
const expeditionGuildGold = ref<number | null>(null)
const expeditionGoldRune = ref<number | null>(null)
const expeditionGoldScroll = ref(0)

const questLevel = ref<number | null>(null)
const questBook = ref<number | null>(null)
const questGuildExperience = ref<number | null>(null)
const questExperienceRune = ref<number | null>(null)
const questExperienceScroll = ref(0)
const questTower = ref<number | null>(null)
const questGuildGold = ref<number | null>(null)
const questGoldRune = ref<number | null>(null)
const questGoldScroll = ref(0)

const miscLevel = ref<number | null>(null)
const miscGate = ref<number | null>(null)
const miscTorture = ref<number | null>(null)

const priceAtAttribute = ref<number | null>(null)
const priceFrom = ref<number | null>(null)
const priceTo = ref<number | null>(null)

const tabOptions = computed<SelectOption<TabName>[]>(() => [
  { value: 'gold_experience', label: localize('tabs.gold_exp') },
  { value: 'fortress', label: localize('tabs.fortress') },
  { value: 'underworld', label: localize('tabs.underworld') },
  { value: 'gold_table', label: localize('tabs.gold_table') }
])

const yesNoOptions = computed<SelectOption<number>[]>(() => [
  { value: 0, label: localize.global('general.no') },
  { value: 1, label: localize.global('general.yes') }
])

const mountOptions = computed<SelectOption<number>[]>(() => [
  { value: 0, label: localize('expeditions.mount.none') },
  { value: 1, label: localize('expeditions.mount.pig') },
  { value: 2, label: localize('expeditions.mount.wolf') },
  { value: 3, label: localize('expeditions.mount.raptor') },
  { value: 4, label: localize('expeditions.mount.griffin') }
])

const goldTableColumns = computed(() => [localize('gold_table.level'), localize('gold_table.price'), localize('gold_table.curve'), localize('gold_table.mount'), localize('gold_table.guard')])

// An empty field counts as its lowest allowed value, like the legacy page
const characterLevel = computed(() => clamp(fortressLevel.value ?? 0, 1, 999))
const quarters = computed(() => clamp(quartersLevel.value ?? 0, 0, 15))

const goldTouched = useTouched([goldLevel, goldGuild, goldTower, goldMine, goldPit, goldRunes])
const experienceTouched = useTouched([experienceLevel, experienceHydra, experienceAcademy])
const expeditionTouched = useTouched([expeditionLevel, expeditionMount, expeditionBook, expeditionGuildExperience, expeditionExperienceRune, expeditionExperienceScroll, expeditionStars, expeditionTower, expeditionGuildGold, expeditionGoldRune, expeditionGoldScroll])
const questTouched = useTouched([questLevel, questBook, questGuildExperience, questExperienceRune, questExperienceScroll, questTower, questGuildGold, questGoldRune, questGoldScroll])
const miscTouched = useTouched([miscLevel, miscGate, miscTorture])
const priceAtTouched = useTouched([priceAtAttribute])
const priceBetweenTouched = useTouched([priceFrom, priceTo])

const gold = computed(() => {
  const level = clamp(goldLevel.value ?? 0, 1, 999)
  const guild = clamp(goldGuild.value ?? 0, 0, 200)
  const tower = clamp(goldTower.value ?? 0, 0, 100)
  // The gem value multiplier stops rising at gem mine 14, higher levels are worth the same
  const mine = Math.min(clamp(goldMine.value ?? 0, 1, 100), 14)
  const runes = clamp(goldRunes.value ?? 0, 0, 5)
  const pit = clamp(goldPit.value ?? 0, 1, 100)

  const [capacity, hourly, time] = getGoldPitValues(level, pit)

  return blankUnless(goldTouched.value, {
    reward: formatValue(Calculations.goldEnvironmentalReward(level)),
    guard: formatValue(Calculations.goldGuardDuty(level, tower, guild)),
    scroll: formatValue(Calculations.goldWitchScroll(level)),
    witchPotion: formatValue(Calculations.goldWitchPotion(level)),
    reroll: formatValue(Calculations.goldFortressReroll(level)),
    arena: formatValue(Calculations.goldArena(level)),
    towerEnemy: formatValue(Calculations.goldTowerEnemy(level)),
    twisterEnemy: formatValue(Calculations.goldTwisterEnemy(level)),
    dice1: formatValue(Calculations.goldDice(level, 0)),
    dice2: formatValue(Calculations.goldDice(level, 1)),
    dice3: formatValue(Calculations.goldDice(level, 2)),
    gem1: formatValue(Calculations.goldGem(level, mine, 0)),
    gem2: formatValue(Calculations.goldGem(level, mine, 1)),
    gem3: formatValue(Calculations.goldGem(level, mine, 2)),
    potion10: formatValue(Calculations.goldPotionCost(level, runes, 0)),
    potion15: formatValue(Calculations.goldPotionCost(level, runes, 1)),
    potion25: formatValue(Calculations.goldPotionCost(level, runes, 2)),
    lifePotion: formatValue(Calculations.goldLifePotionCost(level, runes)),
    lifePotionGold: formatValue(Calculations.goldLifePotionShroomlessCost(level, runes)),
    hourglass1: formatValue(Calculations.goldHourglassCost(level, runes)),
    hourglass10: formatValue(Calculations.goldHourglassPackCost(level, runes)),
    bar1: formatValue(Calculations.goldCalendarBar(level)),
    bar3: formatValue(Calculations.goldCalendarBars(level)),
    capacity: formatSpacedNumber(capacity),
    hourly: formatValue(hourly),
    time: formatFancyTime(time)
  })
})

const experience = computed(() => {
  const level = clamp(experienceLevel.value ?? 0, 1, 999)
  const hydra = clamp(experienceHydra.value ?? 0, 0, 20)
  const academy = clamp(experienceAcademy.value ?? 0, 1, 20)

  const [hourly, capacity, time] = getAcademyValues(level, academy)

  const calendar3 = Calculations.experienceCalendar(level, 2)

  return blankUnless(experienceTouched.value, {
    next: formatSpacedNumber(Calculations.experienceNextLevel(level)),
    daily: formatSpacedNumber(Calculations.experienceSecretMission(level, hydra)),
    arena: formatSpacedNumber(Calculations.experienceArena(level)),
    hourly: formatSpacedNumber(hourly),
    capacity: formatSpacedNumber(capacity),
    time: formatFancyTime(time),
    wheel1: formatSpacedNumber(Calculations.experienceWheelBook(level)),
    wheel2: formatSpacedNumber(Calculations.experienceWheelBooks(level)),
    calendar1: formatSpacedNumber(Calculations.experienceCalendar(level, 0)),
    calendar2: formatSpacedNumber(Calculations.experienceCalendar(level, 1)),
    calendar3: formatSpacedNumber(calendar3),
    dungeon: formatSpacedNumber(calendar3),
    habitat: formatSpacedNumber(Calculations.experiencePetHabitat(level)),
    twister: formatSpacedNumber(Calculations.experienceTwisterEnemy(level))
  })
})

const expedition = computed(() => {
  const level = clamp(expeditionLevel.value ?? 0, 1, 999)
  const guildExperience = clamp(expeditionGuildExperience.value ?? 0, 0, 200)
  const guildGold = clamp(expeditionGuildGold.value ?? 0, 0, 200)
  const book = clamp(expeditionBook.value ?? 0, 0, 100)
  const tower = clamp(expeditionTower.value ?? 0, 0, 100)
  const experienceRune = clamp(expeditionExperienceRune.value ?? 0, 0, 10)
  const goldRune = clamp(expeditionGoldRune.value ?? 0, 0, 50)
  const stars = clamp(expeditionStars.value ?? 0, 0, 3)
  const mount = clamp(expeditionMount.value, 0, 4)

  const experienceValue = Calculations.experienceExpedition(level, book, guildExperience, experienceRune, expeditionExperienceScroll.value === 1, stars, mount)
  const goldValue = Calculations.goldExpedition(level, tower, guildGold, goldRune, expeditionGoldScroll.value === 1, mount)

  return blankUnless(expeditionTouched.value, {
    experience: formatSpacedNumber(experienceValue),
    gold: formatValue(goldValue),
    goldChest: formatValue(goldValue / 5),
    goldMid: formatValue(goldValue / 10)
  })
})

const quest = computed(() => {
  const level = clamp(questLevel.value ?? 0, 1, 999)
  const guildExperience = clamp(questGuildExperience.value ?? 0, 0, 200)
  const guildGold = clamp(questGuildGold.value ?? 0, 0, 200)
  const book = clamp(questBook.value ?? 0, 0, 100)
  const tower = clamp(questTower.value ?? 0, 0, 100)
  const experienceRune = clamp(questExperienceRune.value ?? 0, 0, 10)
  const goldRune = clamp(questGoldRune.value ?? 0, 0, 50)

  const experienceScroll = questExperienceScroll.value === 1 ? 1.1 : 1
  const goldScroll = questGoldScroll.value === 1 ? 1.1 : 1

  return blankUnless(questTouched.value, {
    experienceMin: formatSpacedNumber(experienceScroll * Calculations.experienceQuestMin(level, book, guildExperience, experienceRune)),
    experienceMax: formatSpacedNumber(experienceScroll * Calculations.experienceQuestMax(level, book, guildExperience, experienceRune)),
    goldMin: formatValue(goldScroll * Calculations.goldQuestMin(level, tower, guildGold, goldRune)),
    goldMax: formatValue(goldScroll * Calculations.goldQuestMax(level, tower, guildGold, goldRune))
  })
})

const miscSouls = computed(() => {
  const level = clamp(miscLevel.value ?? 0, 1, 999)
  const gate = clamp(miscGate.value ?? 0, 0, 15)
  const torture = clamp(miscTorture.value ?? 0, 0, 15)

  return miscTouched.value ? formatValue(Calculations.souls(level, gate, torture)) : ''
})

const priceAt = computed(() => {
  const attribute = clamp(priceAtAttribute.value ?? 0, 1, Infinity)

  return priceAtTouched.value ? formatCost(Calculations.goldAttributeCost(attribute - 1)) : ''
})

const priceBetween = computed(() => {
  const from = clamp(priceFrom.value ?? 0, 1, Infinity)
  const to = clamp(priceTo.value ?? 0, from, Infinity)

  return priceBetweenTouched.value ? formatCost(Calculations.goldAttributeTotalCost(to - 1) - Calculations.goldAttributeTotalCost(from - 1)) : ''
})

const underworldTables = computed<BuildingTableData[]>(() => [
  {
    title: localize.global('general.buildings.underworld1'),
    columns: [
      { label: localize.global('general.level'), width: '10%' },
      { label: localize.global('general.buildings.time'), width: '15%' },
      { label: localize.global('general.gold'), width: '15%' },
      { label: localize.global('general.souls'), width: '15%' },
      { label: '', width: '45%' }
    ],
    rows: buildRows(HEART, [(level) => (level === 1 ? 0 : formatTableNumber(level * 1000)), (level, souls) => formatTableNumber(souls), () => ''])
  },
  {
    title: localize.global('general.buildings.underworld2'),
    columns: [
      { label: localize.global('general.level'), width: '10%' },
      { label: localize.global('general.buildings.time'), width: '15%' },
      { label: localize.global('general.gold'), width: '15%' },
      { label: localize.global('general.souls'), width: '15%' },
      { label: localize.global('general.buildings.lure_count'), width: '10%' },
      { label: localize.global('general.buildings.lure_bonus'), width: '10%' },
      { label: '', width: '25%' }
    ],
    rows: buildRows(GATE, [(level) => formatTableNumber(level * 500), (level, souls) => formatTableNumber(souls), (level) => Math.min(5, level), (level) => `${100 + Math.max(0, (level - 5) * 20)} %`, () => ''])
  },
  {
    title: localize.global('general.buildings.underworld4'),
    columns: [
      { label: localize.global('general.level'), width: '10%' },
      { label: localize.global('general.buildings.time'), width: '15%' },
      { label: localize.global('general.gold'), width: '13%' },
      { label: localize.global('general.souls'), width: '13%' },
      { label: localize.global('general.buildings.hourly'), width: '12%' },
      { label: localize.global('general.buildings.capacity'), width: '12%' },
      { label: localize.global('general.buildings.full'), width: '12%' },
      { label: localize.global('general.buildings.storage'), width: '13%' }
    ],
    rows: buildRows(EXTRACTOR, [
      (level) => formatTableNumber(level * 250),
      (level, souls) => formatTableNumber(souls),
      (level, souls, hourly) => formatTableNumber(hourly),
      (level, souls, hourly, storage) => formatTableNumber(storage),
      (level, souls, hourly, storage) => formatFancyTime((3600000 * storage) / hourly),
      (level, souls, hourly, storage, capacity) => formatTableNumber(capacity)
    ])
  },
  {
    title: localize.global('general.buildings.underworld5'),
    columns: [
      { label: localize.global('general.level'), width: '10%' },
      { label: localize.global('general.buildings.time'), width: '15%' },
      { label: localize.global('general.gold'), width: '15%' },
      { label: localize.global('general.souls'), width: '15%' },
      { label: localize.global('general.buildings.goblins'), width: '15%' },
      { label: '', width: '30%' }
    ],
    rows: buildRows(GOBLIN_PIT, [(level) => formatTableNumber(level * 400), (level, souls) => formatTableNumber(souls), (level, souls, goblins) => goblins, () => ''])
  },
  {
    title: localize.global('general.buildings.underworld6'),
    columns: [
      { label: localize.global('general.level'), width: '10%' },
      { label: localize.global('general.buildings.time'), width: '15%' },
      { label: localize.global('general.gold'), width: '15%' },
      { label: localize.global('general.souls'), width: '15%' },
      { label: localize.global('general.buildings.lure_bonus'), width: '15%' },
      { label: '', width: '30%' }
    ],
    rows: buildRows(TORTURE_CHAMBER, [(level) => formatTableNumber(level * 660), (level, souls) => formatTableNumber(souls), (level) => `${100 + level * 10} %`, () => ''])
  },
  {
    title: localize.global('general.buildings.underworld7'),
    columns: [
      { label: localize.global('general.level'), width: '10%' },
      { label: localize.global('general.buildings.time'), width: '15%' },
      { label: localize.global('general.gold'), width: '15%' },
      { label: localize.global('general.souls'), width: '15%' },
      { label: localize.global('general.buildings.critical_bonus'), width: '15%' },
      { label: '', width: '30%' }
    ],
    rows: buildRows(GLADIATOR_TRAINER, [(level) => formatTableNumber(level * 700), (level, souls) => formatTableNumber(souls), (level) => `${100 + level * 5} %`, () => ''])
  },
  {
    title: localize.global('general.buildings.underworld8'),
    columns: [
      { label: localize.global('general.level'), width: '10%' },
      { label: localize.global('general.buildings.time'), width: '15%' },
      { label: localize.global('general.gold'), width: '15%' },
      { label: localize.global('general.souls'), width: '15%' },
      { label: localize.global('general.buildings.trolls'), width: '15%' },
      { label: '', width: '30%' }
    ],
    rows: buildRows(TROLL_BLOCK, [(level) => formatTableNumber(level * 990), (level, souls) => formatTableNumber(souls), (level, souls, trolls) => trolls, () => ''])
  },
  {
    title: localize.global('general.buildings.underworld9'),
    columns: [
      { label: localize.global('general.level'), width: '10%' },
      { label: localize.global('general.buildings.time'), width: '15%' },
      { label: localize.global('general.gold'), width: '15%' },
      { label: localize.global('general.souls'), width: '15%' },
      { label: localize.global('general.buildings.thirst_free'), width: '15%' },
      { label: localize.global('general.buildings.thirst_usable'), width: '15%' },
      { label: localize.global('general.buildings.capacity'), width: '15%' }
    ],
    rows: buildRows(TIME_MACHINE, [(level) => formatTableNumber(level * 10000), (level, souls) => formatTableNumber(souls), (level) => getThirst(level), (level) => 4 * getThirst(level), (level) => 100 * getThirst(level)])
  },
  {
    title: localize.global('general.buildings.underworld10'),
    columns: [
      { label: localize.global('general.level'), width: '10%' },
      { label: localize.global('general.buildings.time'), width: '15%' },
      { label: localize.global('general.gold'), width: '15%' },
      { label: localize.global('general.souls'), width: '15%' },
      { label: '', width: '45%' }
    ],
    rows: buildRows(KEEPER, [(level) => formatTableNumber(level * 1500), (level, souls) => formatTableNumber(souls), () => ''])
  },
  {
    title: localize.global('general.buildings.underworld3'),
    columns: [
      { label: localize.global('general.level'), width: '10%' },
      { label: localize.global('general.buildings.time'), width: '15%' },
      { label: localize.global('general.gold'), width: '15%' },
      { label: localize.global('general.souls'), width: '15%' },
      { label: localize.global('general.buildings.capacity'), width: '15%' },
      { label: localize.global('general.buildings.hourly'), width: '15%' },
      { label: localize.global('general.buildings.full'), width: '15%' }
    ],
    rows: buildRows(
      GOLD_PIT,
      [
        (level) => formatTableNumber(level > 15 ? 10e6 : level * 1000),
        (level, souls) => formatTableNumber(souls),
        (level) => formatSpacedNumber(getGoldPitValues(characterLevel.value, level)[0]),
        (level) => formatSpacedNumber(getGoldPitValues(characterLevel.value, level)[1]),
        (level) => formatFancyTime(getGoldPitValues(characterLevel.value, level)[2])
      ],
      { underworld: true }
    )
  }
])

const fortressTables = computed<BuildingTableData[]>(() => [
  {
    title: localize.global('general.buildings.fortress1'),
    columns: [
      { label: localize.global('general.level'), width: '10%' },
      { label: localize.global('general.buildings.time'), width: '15%' },
      { label: localize.global('general.gold'), width: '15%' },
      { label: localize.global('general.wood'), width: '15%' },
      { label: localize.global('general.stone'), width: '15%' },
      { label: localize.global('general.wood_cap'), width: '15%' },
      { label: localize.global('general.stone_cap'), width: '15%' }
    ],
    rows: buildRows(FORTRESS, [(level) => formatTableNumber(level * 10), (level, wood) => formatTableNumber(wood), (level, wood, stone) => formatTableNumber(stone), (level, wood, stone, maxWood) => formatTableNumber(maxWood), (level, wood, stone, maxWood, maxStone) => formatTableNumber(maxStone)])
  },
  {
    title: localize.global('general.buildings.fortress2'),
    columns: [
      { label: localize.global('general.level'), width: '10%' },
      { label: localize.global('general.buildings.time'), width: '10%' },
      { label: localize.global('general.buildings.fortress1'), width: '10%' },
      { label: localize.global('general.gold'), width: '10%' },
      { label: localize.global('general.wood'), width: '10%' },
      { label: localize.global('general.stone'), width: '10%' },
      { label: localize.global('general.reduction'), width: '10%' },
      { label: '', width: '30%' }
    ],
    rows: buildRows(QUARTERS, [(level) => level, (level) => formatTableNumber(level * 5), (level, wood) => formatTableNumber(wood), (level, wood, stone) => formatTableNumber(stone), (level) => `${level * 5} %`, () => ''])
  },
  {
    title: localize.global('general.buildings.fortress3'),
    columns: productionColumns(),
    rows: buildRows(WOODCUTTER, [
      (level) => level,
      (level) => formatTableNumber(level * 2),
      (level, wood) => formatTableNumber(wood),
      (level, wood, stone) => formatTableNumber(stone),
      (level, wood, stone, capacity, hourly) => formatTableNumber(hourly),
      (level, wood, stone, capacity) => formatTableNumber(capacity),
      (level, wood, stone, capacity, hourly) => formatFancyTime((3600000 * capacity) / hourly),
      () => ''
    ])
  },
  {
    title: localize.global('general.buildings.fortress4'),
    columns: productionColumns(),
    rows: buildRows(QUARRY, [
      (level) => level,
      (level) => formatTableNumber(level * 3),
      (level, wood) => formatTableNumber(wood),
      (level, wood, stone) => formatTableNumber(stone),
      (level, wood, stone, capacity, hourly) => formatTableNumber(hourly),
      (level, wood, stone, capacity) => formatTableNumber(capacity),
      (level, wood, stone, capacity, hourly) => formatFancyTime((3600000 * capacity) / hourly),
      () => ''
    ])
  },
  {
    title: localize.global('general.buildings.fortress5'),
    columns: [
      { label: localize.global('general.level'), width: '10%' },
      { label: localize.global('general.buildings.time'), width: '10%' },
      { label: localize.global('general.buildings.fortress1'), width: '10%' },
      { label: localize.global('general.gold'), width: '10%' },
      { label: localize.global('general.wood'), width: '10%' },
      { label: localize.global('general.stone'), width: '10%' },
      { label: `${localize.global('general.gem')} ${localize.global('general.gold')}`, width: '10%' },
      { label: `${localize.global('general.gem')} ${localize.global('general.wood')}`, width: '10%' },
      { label: `${localize.global('general.gem')} ${localize.global('general.stone')}`, width: '10%' },
      { label: `${localize.global('general.gem')} ${localize.global('general.time')}`, width: '10%' }
    ],
    rows: [
      ...buildRows(GEMMINE, [
        (level) => Math.min(20, Math.max(3, level)),
        (level) => formatTableNumber(level > 20 ? 10e6 : level * 15),
        (level, wood) => formatTableNumber(wood),
        (level, wood, stone) => formatTableNumber(stone),
        (level) => formatTableNumber(Math.min(3000, level * 150)),
        (level, wood, stone, gemWood) => formatTableNumber(gemWood),
        (level, wood, stone, gemWood, gemStone) => formatTableNumber(gemStone),
        (level) => formatFancyTime(gemTime(GEMTIME[Math.min(19, level - 1)] * 60000))
      ]),
      ['...', '...', '...', '...', '...', '...', '...', '...', '...', '...'],
      ['100', formatFancyTime(buildTime(100)), '20', formatSpacedNumber(10e6), formatSpacedNumber(300e6), formatSpacedNumber(100e6), formatSpacedNumber(3000), formatSpacedNumber(4.5e6), formatSpacedNumber(1.5e6), formatFancyTime(gemTime(90000000))]
    ]
  },
  {
    title: localize.global('general.buildings.fortress6'),
    columns: productionColumns(),
    rows: buildRows(ACADEMY, [
      (level) => Math.max(6, level),
      (level) => formatTableNumber(level * 7),
      (level, wood) => formatTableNumber(wood),
      (level, wood, stone) => formatTableNumber(stone),
      (level) => formatSpacedNumber(getAcademyValues(characterLevel.value, level)[0]),
      (level) => formatSpacedNumber(getAcademyValues(characterLevel.value, level)[1]),
      (level) => formatFancyTime(getAcademyValues(characterLevel.value, level)[2]),
      () => ''
    ])
  },
  {
    title: localize.global('general.buildings.fortress7'),
    columns: unitColumns(localize.global('general.buildings.archers')),
    rows: buildRows(ARCHERY, [(level) => Math.max(5, level), (level) => formatTableNumber(level * 5), (level, wood) => formatTableNumber(wood), (level, wood, stone) => formatTableNumber(stone), (level) => level * 2, () => ''])
  },
  {
    title: localize.global('general.buildings.fortress8'),
    columns: unitColumns(localize.global('general.buildings.warriors')),
    rows: buildRows(BARRACKS, [(level) => Math.max(4, level), (level) => formatTableNumber(level * 5), (level, wood) => formatTableNumber(wood), (level, wood, stone) => formatTableNumber(stone), (level) => level * 3, () => ''])
  },
  {
    title: localize.global('general.buildings.fortress9'),
    columns: unitColumns(localize.global('general.buildings.mages')),
    rows: buildRows(MAGES, [(level) => Math.max(7, level), (level) => formatTableNumber(level * 6), (level, wood) => formatTableNumber(wood), (level, wood, stone) => formatTableNumber(stone), (level) => level, () => ''])
  },
  {
    title: localize.global('general.buildings.fortress10'),
    columns: unitColumns(localize.global('general.buildings.backpack_size')),
    rows: [
      ...buildRows(TREASURY, [(level) => Math.max(2, level), (level) => formatTableNumber(Math.min(level, 15) * 25), (level, wood) => formatTableNumber(wood), (level, wood, stone) => formatTableNumber(stone), (level) => 5 + level, () => '']),
      ['...', '...', '...', '...', '...', '...', '...', ''],
      ['45', formatFancyTime(buildTime(15)), '20', formatSpacedNumber(3750), formatSpacedNumber(5760000), formatSpacedNumber(1872000), '50', '']
    ]
  },
  {
    title: localize.global('general.buildings.fortress11'),
    columns: [
      { label: localize.global('general.level'), width: '10%' },
      { label: localize.global('general.buildings.time'), width: '10%' },
      { label: localize.global('general.buildings.fortress1'), width: '10%' },
      { label: localize.global('general.gold'), width: '10%' },
      { label: localize.global('general.wood'), width: '10%' },
      { label: localize.global('general.stone'), width: '10%' },
      { label: '', width: '40%' }
    ],
    rows: buildRows(SMITHY, [(level) => Math.max(7, level), (level) => formatTableNumber(level * 4), (level, wood) => formatTableNumber(wood), (level, wood, stone) => formatTableNumber(stone), () => ''])
  },
  {
    title: localize.global('general.buildings.fortress12'),
    columns: unitColumns(`${localize.global('general.fight')} ${localize.global('general.level')}`),
    rows: buildRows(WALL, [(level) => Math.max(4, level), (level) => formatTableNumber(level * 15), (level, wood) => formatTableNumber(wood), (level, wood, stone) => formatTableNumber(stone), (level, wood, stone, fightLevel) => fightLevel, () => ''])
  },
  {
    title: localize.global('general.buildings.knights'),
    columns: [{ label: localize.global('general.level') }, { label: localize.global('general.buildings.fortress1') }, { label: localize.global('general.wood') }, { label: localize.global('general.stone') }],
    rows: buildRows(KNIGHTS, [(level) => level, (level, wood) => formatTableNumber(wood), (level, wood, stone) => formatTableNumber(stone)], { time: false })
  }
])

watch(tab, (value) => {
  visited.value.add(value)

  if (value === 'gold_table' && goldTableRows.value.length === 0) {
    goldTableRows.value = buildGoldTableRows()
  }

  window.scrollTo(0, 0)
})

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

// Turns true once any field of a section is changed, matching the legacy handlers that only ran on input
function useTouched(sources: Ref<unknown>[]) {
  const touched = ref(false)

  watch(sources, () => {
    touched.value = true
  })

  return touched
}

function blankUnless<TValues extends Record<string, string>>(touched: boolean, values: TValues) {
  return touched ? values : (Object.fromEntries(Object.keys(values).map((key) => [key, ''])) as TValues)
}

function roundShort(value: number) {
  return Math.ceil(value * 100) / 100
}

function ceilTo(value: number, step: number) {
  return Math.ceil(value / step) * step
}

// Large values are grouped, smaller ones keep two decimals
function formatValue(value: number) {
  return value >= 999 ? formatSpacedNumber(value) : String(roundShort(value))
}

// The building tables group their digits with a non-breaking space, so a number never wraps mid-way
function formatTableNumber(value: number) {
  return formatSpacedNumber(value, ' ')
}

function formatCost(value: number) {
  return value >= 10 ? formatSpacedNumber(value) : String(roundShort(value))
}

// At most the two largest units, and nothing at all past 100 days
function formatFancyTime(duration: number) {
  const value = Math.ceil(duration)

  const days = Math.trunc(value / (1000 * 60 * 60 * 24))
  const hours = Math.trunc((value % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.trunc((value % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.trunc((value % (1000 * 60)) / 1000)

  if (days > 100) {
    return '-'
  }

  const parts = [days > 0 ? `${days}d` : '', hours > 0 ? `${hours}h` : '', minutes > 0 ? `${minutes}m` : '', seconds > 0 ? `${seconds}s` : '']

  return parts
    .filter((part) => part)
    .slice(0, 2)
    .join(' ')
}

function buildTime(level: number, underworld = false) {
  const multiplier = 1 - 0.05 * quarters.value

  if (underworld ? level > 15 : level > 20) {
    return 51840 * multiplier * 100 * 1000
  }

  const time = BUILD_TIMES[level - 1]

  return ceilTo(time * multiplier, time > 3600 ? 100 : 1) * 1000
}

// Gems grow faster with the quarters too, but their time is not a build time
function gemTime(duration: number) {
  return duration * (1 - quarters.value * 0.05)
}

function getAcademyValues(level: number, academy: number) {
  const hourly = Calculations.experienceAcademyHourly(level, academy)
  const capacity = Calculations.experienceAcademyCapacity(level, academy)

  return [hourly, capacity, (capacity / hourly) * 3600000]
}

function getGoldPitValues(level: number, pit: number) {
  const hourly = Calculations.goldPitHourly(level, pit)
  const capacity = Calculations.goldPitCapacity(level, pit)

  return [capacity, hourly, (3600000 * capacity) / hourly]
}

function getThirst(level: number) {
  return level > 10 ? 10 + (level - 10) * 2 : level
}

function productionColumns() {
  return [
    { label: localize.global('general.level'), width: '10%' },
    { label: localize.global('general.buildings.time'), width: '10%' },
    { label: localize.global('general.buildings.fortress1'), width: '10%' },
    { label: localize.global('general.gold'), width: '10%' },
    { label: localize.global('general.wood'), width: '10%' },
    { label: localize.global('general.stone'), width: '10%' },
    { label: localize.global('general.buildings.hourly'), width: '10%' },
    { label: localize.global('general.buildings.capacity'), width: '10%' },
    { label: localize.global('general.buildings.full'), width: '10%' },
    { label: '', width: '10%' }
  ]
}

function unitColumns(label: string) {
  return [
    { label: localize.global('general.level'), width: '10%' },
    { label: localize.global('general.buildings.time'), width: '10%' },
    { label: localize.global('general.buildings.fortress1'), width: '10%' },
    { label: localize.global('general.gold'), width: '10%' },
    { label: localize.global('general.wood'), width: '10%' },
    { label: localize.global('general.stone'), width: '10%' },
    { label, width: '10%' },
    { label: '', width: '30%' }
  ]
}

function buildRows(data: (number | number[])[], generators: CellGenerator[], options: { time?: boolean; underworld?: boolean } = {}) {
  return data.map((entry, index) => {
    const level = index + 1
    const values = Array.isArray(entry) ? entry : [entry]
    const time = options.time === false ? [] : [formatFancyTime(buildTime(level, options.underworld))]

    return [String(level), ...time, ...generators.map((generator) => String(generator(level, ...values)))]
  })
}

function buildGoldTableRows() {
  const rows: string[][] = []

  for (let attribute = 0; attribute < 3155; attribute++) {
    const price = formatValue(Calculations.goldAttributeCost(attribute))

    if (attribute < 632) {
      const curve = Calculations.gold(attribute + 1)
      const mount = (Math.trunc(curve / 10) * 12) / 100

      rows.push([String(attribute + 1), price, formatValue(curve / 100), formatValue(Math.min(10e6, mount)), formatValue(mount / 3)])
    } else {
      rows.push([String(attribute + 1), price, '', '', ''])
    }
  }

  rows.push(['3156+', formatSpacedNumber(10e6), '', '', ''])

  return rows
}

// Spreadsheets take the numbers without the grouping spaces, and some locales need a comma for the decimals
function copyGoldTable(commaDecimals: boolean) {
  const transform = (value: string) => (commaDecimals ? value.replaceAll(' ', '').replaceAll('.', ',') : value.replaceAll(' ', ''))

  const head = goldTableColumns.value.map((column) => `<th>${column}</th>`).join('')
  const body = goldTableRows.value.map((row) => `<tr>${row.map((cell) => `<td>${transform(cell)}</td>`).join('')}</tr>`).join('')

  const table = document.createElement('table')
  table.innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>`

  document.body.appendChild(table)

  copyElement(table)

  document.body.removeChild(table)
}

function openFeedback() {
  useDialog(FeedbackDialog, { tool: 'attributes' })
}
</script>
