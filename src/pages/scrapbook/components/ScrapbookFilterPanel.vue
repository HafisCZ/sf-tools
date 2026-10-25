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
        <SFCheckbox v-for="check in kindChecks" :key="check.value" v-model="check.checked.value">
          {{ localize.global(`general.item${check.value}`) }}
          <span class="ml-auto pl-2 text-white/45">{{ props.kindCounts[check.value] ?? 0 }}</span>
        </SFCheckbox>
      </div>
    </fieldset>
    <template v-if="props.book === 'items'">
      <fieldset class="flex flex-col">
        <legend class="mb-1.5 font-bold text-white">{{ localize('filter.rarity') }}</legend>
        <div class="grid grid-cols-2 gap-x-3 gap-y-1">
          <SFCheckbox v-for="check in rarityChecks" :key="check.value" v-model="check.checked.value">
            {{ localize(`group.${check.value}`) }}
            <span class="ml-auto pl-2 text-white/45">{{ props.rarityCounts[check.value] ?? 0 }}</span>
          </SFCheckbox>
        </div>
      </fieldset>
      <fieldset class="flex flex-col">
        <legend class="mb-1.5 font-bold text-white">{{ localize('filter.origin') }}</legend>
        <div class="flex flex-col gap-y-1">
          <template v-for="check in originChecks" :key="check.value">
            <div class="flex items-center gap-1">
              <SFCheckbox v-model="check.checked.value" :indeterminate="check.indeterminate.value" :label="localize(`origin.${check.value}`)" />
              <SFButton v-if="check.children.length > 0" variant="ghost" icon size="sm" class="-my-1" :aria-label="localize(`origin.${check.value}`)" :aria-expanded="check.expanded.value" :aria-controls="`${id}-${check.value}`" @click="check.expanded.value = !check.expanded.value">
                <SFIcon name="chevron-down" :class="{ '-rotate-90': !check.expanded.value }" />
              </SFButton>
              <span class="ml-auto pl-2 text-white/45">{{ check.count.value }}</span>
            </div>
            <div v-if="check.children.length > 0" v-show="check.expanded.value" :id="`${id}-${check.value}`" class="flex flex-col gap-y-1 pl-6">
              <SFCheckbox v-for="child in check.children" :key="child.value" v-model="child.checked.value">
                {{ localize(`origin.${child.value}`) }}
                <span class="ml-auto pl-2 text-white/45">{{ props.originCounts[child.value] ?? 0 }}</span>
              </SFCheckbox>
            </div>
          </template>
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
import { computed, type Ref, shallowRef, useId } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFCheckbox from '@library/SFCheckbox.vue'
import SFIcon from '@library/SFIcon.vue'
import SFInput from '@library/SFInput.vue'
import SFNumber from '@library/SFNumber.vue'
import SFRadioGroup from '@library/SFRadioGroup.vue'
import SFSelect from '@library/SFSelect.vue'
import SFSlider from '@library/SFSlider.vue'
import { type SelectOption } from '@utils/components'
import { useLocalize } from '@utils/localization'
import { getClassImageUrl, sum } from '@utils/utils'
import { getOriginNotes, MAX_UNLOCK_LEVEL, PLAYER_CLASSES, type ScrapbookBook, type ScrapbookOrigin, type ScrapbookRarity, type ScrapbookStatus } from '~/pages/scrapbook/scrapbook'

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
  /**
   * Number of shown slots per kind
   */
  kindCounts: Record<number, number>
  /**
   * Number of shown slots per rarity
   */
  rarityCounts: Record<string, number>
  /**
   * Number of shown slots per origin, split into notes for the origins that have them
   */
  originCounts: Record<string, number>
}>()

const search = defineModel<string>('search', { required: true })
const status = defineModel<ScrapbookStatus>('status', { required: true })
const wornBy = defineModel<CharacterClass | null>('wornBy', { required: true })
const itemClasses = defineModel<number[]>('itemClasses', { required: true })
const kinds = defineModel<number[]>('kinds', { required: true })
const rarities = defineModel<ScrapbookRarity[]>('rarities', { required: true })
const origins = defineModel<string[]>('origins', { required: true })
const minimumLevel = defineModel<number | null>('minimumLevel', { required: true })
const maximumLevel = defineModel<number | null>('maximumLevel', { required: true })

const STATUSES: ScrapbookStatus[] = ['missing', 'collected', 'marked', 'all']

const ORIGINS: ScrapbookOrigin[] = ['regular', 'toilet', 'event', 'twister']

const localize = useLocalize('scrapbook')

const id = useId()

const itemClassChecks = createChecks(itemClasses, [1, 2, 3, 0])
const kindChecks = createChecks(kinds, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
const rarityChecks = createChecks<ScrapbookRarity>(rarities, ['normal', 'epic'])
const originChecks = ORIGINS.map((origin) => createOriginCheck(origin))

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

function createOriginCheck(origin: ScrapbookOrigin) {
  const notes = getOriginNotes(origin)
  const values = notes.length > 0 ? notes : [origin]
  const selected = computed(() => values.filter((value) => origins.value.includes(value)).length)

  return {
    value: origin,
    checked: computed({
      get: () => selected.value === values.length,
      set: (checked: boolean) => {
        const others = origins.value.filter((value) => !values.includes(value))

        origins.value = checked ? [...others, ...values] : others
      }
    }),
    indeterminate: computed(() => selected.value > 0 && selected.value < values.length),
    count: computed(() => sum(values.map((value) => props.originCounts[value] ?? 0))),
    expanded: shallowRef(false),
    children: createChecks(origins, notes)
  }
}
</script>
