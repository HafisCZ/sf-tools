<template>
  <div class="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
    <SFInput v-model="search" type="search" :label="localize('filter.search')" />
    <SFRadioGroup v-model="status" :label="localize('filter.status')" :options="statusOptions" />
    <SFSelect v-model="wornBy" :label="localize('filter.worn_by')" :options="wornByOptions" />
    <fieldset class="flex flex-col">
      <legend class="mb-1.5 font-bold text-white">{{ localize('filter.item_class') }}</legend>
      <div class="grid grid-cols-2 gap-x-3 gap-y-1">
        <SFCheckbox v-for="check in itemClassChecks" :key="check.value" v-model="check.checked.value">
          {{ check.value ? localize.global(`general.class${check.value}`) : localize('shared') }}
          <span class="ml-auto pl-2 text-white/45">{{ props.itemClassCounts[check.value] ?? 0 }}</span>
        </SFCheckbox>
      </div>
    </fieldset>
    <fieldset class="flex flex-col">
      <legend class="mb-1.5 font-bold text-white">{{ localize('filter.kind') }}</legend>
      <div class="grid grid-cols-2 gap-x-3 gap-y-1">
        <SFCheckbox v-for="check in kindChecks" :key="check.value" v-model="check.checked.value" :label="localize.global(`general.item${check.value}`)" />
      </div>
    </fieldset>
    <template v-if="props.book === 'items'">
      <fieldset class="flex flex-col">
        <legend class="mb-1.5 font-bold text-white">{{ localize('filter.rarity') }}</legend>
        <div class="grid grid-cols-2 gap-x-3 gap-y-1">
          <SFCheckbox v-for="check in rarityChecks" :key="check.value" v-model="check.checked.value" :label="localize(`group.${check.value}`)" />
        </div>
      </fieldset>
      <fieldset class="flex flex-col">
        <legend class="mb-1.5 font-bold text-white">{{ localize('filter.origin') }}</legend>
        <div class="grid grid-cols-2 gap-x-3 gap-y-1">
          <SFCheckbox v-for="check in originChecks" :key="check.value" v-model="check.checked.value" :label="localize(`origin.${check.value}`)" />
        </div>
      </fieldset>
      <SFSlider v-model:from="minimumLevel" v-model:to="maximumLevel" :label="localize('unlock_level')" :min="1" :max="MAX_UNLOCK_LEVEL" :step="1" :from-label="localize.global('general.min')" :to-label="localize.global('general.max')" />
      <div class="grid grid-cols-2 gap-[14px]">
        <SFNumber v-model="minimumLevel" :label="localize.global('general.min')" :min="1" :max="maximumLevel ?? MAX_UNLOCK_LEVEL" :step="1" />
        <SFNumber v-model="maximumLevel" :label="localize.global('general.max')" :min="minimumLevel ?? 1" :max="MAX_UNLOCK_LEVEL" :step="1" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, type Ref } from 'vue'
import SFCheckbox from '@library/SFCheckbox.vue'
import SFInput from '@library/SFInput.vue'
import SFNumber from '@library/SFNumber.vue'
import SFRadioGroup from '@library/SFRadioGroup.vue'
import SFSelect from '@library/SFSelect.vue'
import SFSlider from '@library/SFSlider.vue'
import { type SelectOption } from '@utils/components'
import { useLocalize } from '@utils/localization'
import { getClassImageUrl } from '@utils/utils'
import { MAX_UNLOCK_LEVEL, PLAYER_CLASSES, type ScrapbookBook, type ScrapbookOrigin, type ScrapbookRarity, type ScrapbookStatus } from '~/pages/scrapbook/scrapbook'

defineOptions({
  name: 'ScrapbookFilterPanel'
})

const props = defineProps<{
  /**
   * Book being filtered, the legendaries book hides the rarity, source and unlock level filters
   */
  book: ScrapbookBook
  /**
   * Number of shown slots per item class, 0 being the shared items
   */
  itemClassCounts: Record<number, number>
}>()

const search = defineModel<string>('search', { required: true })
const status = defineModel<ScrapbookStatus>('status', { required: true })
const wornBy = defineModel<CharacterClass | null>('wornBy', { required: true })
const itemClasses = defineModel<number[]>('itemClasses', { required: true })
const kinds = defineModel<number[]>('kinds', { required: true })
const rarities = defineModel<ScrapbookRarity[]>('rarities', { required: true })
const origins = defineModel<ScrapbookOrigin[]>('origins', { required: true })
const minimumLevel = defineModel<number | null>('minimumLevel', { required: true })
const maximumLevel = defineModel<number | null>('maximumLevel', { required: true })

const STATUSES: ScrapbookStatus[] = ['missing', 'collected', 'marked', 'all']

const localize = useLocalize('scrapbook')

const itemClassChecks = createChecks(itemClasses, [1, 2, 3, 0])
const kindChecks = createChecks(kinds, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
const rarityChecks = createChecks<ScrapbookRarity>(rarities, ['normal', 'epic'])
const originChecks = createChecks<ScrapbookOrigin>(origins, ['regular', 'toilet', 'event', 'twister'])

const statusOptions = computed<SelectOption<ScrapbookStatus>[]>(() => STATUSES.map((value) => ({ value, label: localize(`status.${value}`) })))

const wornByOptions = computed<SelectOption<CharacterClass | null>[]>(() => [{ value: null, label: localize('filter.any_class') }, ...PLAYER_CLASSES.map((playerClass) => ({ value: playerClass, label: localize.global(`general.class${playerClass}`), image: getClassImageUrl(playerClass) }))])

function createChecks<TValue>(list: Ref<TValue[]>, values: TValue[]) {
  return values.map((value) => ({
    value,
    checked: computed({
      get: () => list.value.includes(value),
      set: (checked: boolean) => {
        list.value = checked ? [...list.value, value] : list.value.filter((entry) => entry !== value)
      }
    })
  }))
}
</script>
