<template>
  <div class="flex flex-col gap-[14px] rounded-md border border-line bg-surface p-2">
    <div class="flex flex-col gap-2">
      <div v-for="slot in slots" :key="slot" class="rounded-md border border-line bg-page">
        <div class="flex items-center">
          <button
            type="button"
            class="flex min-w-0 flex-auto cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left leading-5 outline-none hover:bg-surface-hover focus-visible:bg-surface-hover"
            :aria-label="localize(`slot.${slot}`)"
            :aria-expanded="openSlot === slot"
            aria-haspopup="menu"
            @click="toggleSlot(slot, $event)"
          >
            <img v-if="hasItem(slot)" :src="`/${getItem(slot).ImageUrl}`" alt="" class="size-5 shrink-0 object-contain" />
            <span class="flex min-w-0 flex-auto flex-col">
              <span class="flex min-w-0 gap-2">
                <span class="shrink-0 font-bold">{{ localize(`slot.${slot}`) }}</span>
                <span class="truncate">{{ hasItem(slot) ? getItem(slot).Name : localize('empty') }}</span>
              </span>
              <span class="truncate text-xs text-white/50">{{ describeItem(getItem(slot)) }}</span>
            </span>
          </button>
          <SFTooltip v-if="props.swaps[slot]?.id" :content="localize('take_over', { item: getOriginalName(slot) })">
            <SFButton variant="ghost" icon size="sm" :aria-label="localize('take_over', { item: getOriginalName(slot) })" :aria-pressed="props.swaps[slot]?.takeOver === true" @click="changeEdit(slot, { takeOver: !props.swaps[slot]?.takeOver })">
              <SFIcon name="clone" :class="{ 'text-accent': props.swaps[slot]?.takeOver }" />
            </SFButton>
          </SFTooltip>
          <SFTooltip v-if="props.swaps[slot]" :content="localize('reset_to', { item: getOriginalName(slot) })">
            <SFButton variant="ghost" icon size="sm" :aria-label="localize('reset_to', { item: getOriginalName(slot) })" @click="resetSlot(slot)">
              <SFIcon name="rotate-left" />
            </SFButton>
          </SFTooltip>
          <SFButton v-if="hasItem(slot)" variant="ghost" icon size="sm" class="mr-1" :aria-label="localize('details')" :aria-expanded="expandedSlot === slot" @click="toggleDetails(slot)">
            <SFIcon name="chevron-down" :class="{ 'rotate-180': expandedSlot === slot }" />
          </SFButton>
        </div>

        <div v-if="expandedSlot === slot && hasItem(slot)" class="grid grid-cols-2 gap-2 border-t border-line p-2">
          <SFSelect :model-value="String(getRune(slot).type)" :label="localize('rune')" :options="runeOptions" @update:model-value="(value) => changeRune(slot, Number(value), getRune(slot).value)" />
          <SFNumber :model-value="getRune(slot).value" :label="localize('value')" :min="0" :max="getRuneLimit(getRune(slot).type)" :step="1" :readonly="getRune(slot).type === 0" centered @update:model-value="(value) => changeRune(slot, getRune(slot).type, value ?? 0)" />
          <SFSelect :model-value="String(getGem(slot).type)" :label="localize('gem')" :options="gemOptions" @update:model-value="(value) => changeGem(slot, Number(value), getGem(slot).value)" />
          <SFNumber :model-value="getGem(slot).value" :label="localize('value')" :min="0" :step="1" :readonly="getGem(slot).type === 0" centered @update:model-value="(value) => changeGem(slot, getGem(slot).type, value ?? 0)" />
          <SFSelect :model-value="String(getEnchantment(slot))" :label="localize('enchantment')" :options="yesNoOptions" @update:model-value="(value) => changeEdit(slot, { enchantment: value === 'true' })" />
          <SFNumber :model-value="getItem(slot).Upgrades" :label="localize('upgrades')" :min="0" :max="MAXIMUM_UPGRADES" :step="1" centered @update:model-value="(value) => changeEdit(slot, { upgrades: Math.min(value ?? 0, MAXIMUM_UPGRADES) })" />
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-2 border-t border-line pt-[14px]">
      <SFHeading level="6">{{ localize('potions') }}</SFHeading>
      <SFSelect v-for="(potion, index) in props.character.potions" :key="index" :model-value="getPotionValue(potion)" :options="getPotionOptions(index)" @update:model-value="(value) => changePotion(index, value)" />
    </div>

    <div class="flex flex-col gap-2 border-t border-line pt-[14px]">
      <SFHeading level="6">{{ localize('pets') }}</SFHeading>
      <div class="grid grid-cols-5 gap-2">
        <SFNumber v-for="(habitat, index) in PET_HABITATS" :key="habitat" :model-value="props.character.pets[habitat]" :label="localize.global(`pets.types.${index}`)" :min="0" :max="100" :step="1" centered @update:model-value="(value) => changePet(habitat, value ?? 0)" />
      </div>
    </div>

    <Teleport to="body">
      <SFDropdownMenu v-if="openSlot && position" :anchor="position" :width="position.right - position.left" float="right" position="bottom" @close="closeSlot">
        <ul role="menu" class="flex flex-col">
          <li role="none">
            <button type="button" role="menuitem" class="flex w-full cursor-pointer items-center gap-3 rounded px-3 py-2 text-left outline-none" :class="menuSwap ? 'hover:bg-surface-hover focus-visible:bg-surface-hover' : 'bg-accent/15'" @click="selectItem('')">
              <img v-if="menuCurrent.Type > 0" :src="`/${menuCurrent.ImageUrl}`" alt="" class="size-5 shrink-0 object-contain" />
              <span class="flex min-w-0 flex-1 flex-col">
                <span>{{ menuCurrent.Type > 0 ? menuCurrent.Name : localize('empty') }}</span>
                <span class="text-xs text-white/50">{{ describeItem(menuCurrent) }}</span>
              </span>
            </button>
          </li>
          <template v-for="entry in menuEntries" :key="entry.id">
            <li v-if="entry.header" role="presentation" class="px-3 pt-2 pb-1 text-xs font-bold text-white/50 uppercase">
              {{ localize(`pool.${entry.pool}`) }}
            </li>
            <li role="none">
              <button type="button" role="menuitem" class="flex w-full cursor-pointer items-center gap-3 rounded px-3 py-2 text-left outline-none" :class="menuSwap === entry.id ? 'bg-accent/15' : 'hover:bg-surface-hover focus-visible:bg-surface-hover'" @click="selectItem(entry.id)">
                <img :src="`/${entry.item.ImageUrl}`" alt="" class="size-5 shrink-0 object-contain" />
                <span class="flex min-w-0 flex-1 flex-col">
                  <span>{{ entry.item.Name }}</span>
                  <span class="text-xs text-white/50">{{ describeItem(entry.item) }}</span>
                </span>
              </button>
            </li>
          </template>
        </ul>
      </SFDropdownMenu>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDropdownMenu from '@library/SFDropdownMenu.vue'
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import SFNumber from '@library/SFNumber.vue'
import SFSelect from '@library/SFSelect.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { type SelectOption } from '@utils/components'
import { useInert } from '@utils/interactions'
import { useLocalize } from '@utils/localization'
import { useAnimationFramePosition } from '@utils/position'
import { ItemModel } from '~/core/models/item'
import { type AnyEquipmentSlot, type PetHabitat, type PlayerModel } from '~/core/models/player'
import { buildEditedItem, EQUIPMENT_SLOTS, GEM_TYPES, LIFE_POTION_SIZE, LIFE_POTION_TYPE, listEquipmentCandidates, listEquipmentCharacters, MAXIMUM_UPGRADES, PET_HABITATS, POTION_SIZES, POTION_TYPES, RUNE_LIMITS, type CharacterPotion, type CharacterState, type EquipmentSwaps, type ItemEdit } from '~/sim/equipment'

defineOptions({
  name: 'EquipmentEditor'
})

const props = defineProps<{
  /**
   * Imported character holding the items that can be swapped in
   */
  source: PlayerModel
  /**
   * 0 for the player, 1 to 3 for the companions
   */
  index: number
  /**
   * Item picked for each slot, together with its rune, gem and enchantment
   */
  swaps: EquipmentSwaps
  /**
   * Pets and potions, which the items do not decide
   */
  character: CharacterState
}>()

const emit = defineEmits<{
  /**
   * An item, a potion or a pet was changed
   */
  change: [swaps: EquipmentSwaps, character: CharacterState]
}>()

const ITEM_ATTRIBUTES = ['Strength', 'Dexterity', 'Intelligence', 'Constitution', 'Luck'] as const

const EMPTY_ITEM = ItemModel.empty()

const localize = useLocalize('editor.equipment')

const openSlot = ref<AnyEquipmentSlot | null>(null)
const expandedSlot = ref<AnyEquipmentSlot | null>(null)

let openElement: HTMLElement | null = null

const isSlotOpen = computed(() => openSlot.value !== null)

const position = useAnimationFramePosition(isSlotOpen, () => openElement?.getBoundingClientRect())

useInert(isSlotOpen)

const character = computed(() => listEquipmentCharacters(props.source)[props.index] ?? props.source)

const slots = computed(() => EQUIPMENT_SLOTS.filter((slot) => character.value.Items[slot]))

const candidates = computed(() => Object.fromEntries(slots.value.map((slot) => [slot, listEquipmentCandidates(props.source, slot, character.value)])) as Record<AnyEquipmentSlot, ReturnType<typeof listEquipmentCandidates>>)

const menuSwap = computed(() => (openSlot.value ? props.swaps[openSlot.value]?.id : undefined))

const menuCurrent = computed(() => (openSlot.value ? (character.value.Items[openSlot.value] ?? EMPTY_ITEM) : EMPTY_ITEM))

const menuEntries = computed(() => {
  const list = openSlot.value ? candidates.value[openSlot.value] : []

  return list.map((candidate, index) => ({ ...candidate, header: candidate.pool !== list[index - 1]?.pool }))
})

const runeOptions = computed<SelectOption[]>(() => [{ value: '0', label: localize('none') }, ...Object.keys(RUNE_LIMITS).map((type) => ({ value: type, label: localize.global(`general.rune${Number(type) - 30}`) }))])

const gemOptions = computed<SelectOption[]>(() => [{ value: '0', label: localize('none') }, ...GEM_TYPES.map((type) => ({ value: String(type), label: localize.global(`general.gem${type}`), image: `/res/gem${type}.png` as const }))])

const yesNoOptions = computed<SelectOption[]>(() => [
  { value: 'false', label: localize.global('general.no') },
  { value: 'true', label: localize.global('general.yes') }
])

// Every type the other slots are already drinking, a character cannot take the same potion twice
const usedPotionTypes = computed(() => props.character.potions.map((potion) => potion.type))

function getPotionValue(potion: CharacterPotion) {
  return potion.type > 0 ? `${potion.type}:${potion.size}` : '0'
}

function getPotionOptions(index: number): SelectOption[] {
  const options: SelectOption[] = [{ value: '0', label: localize('none') }]

  for (const type of POTION_TYPES) {
    if (type !== props.character.potions[index].type && usedPotionTypes.value.includes(type)) continue

    options.push({ type: 'divider' })

    // The life potion only comes at full strength
    for (const size of type === LIFE_POTION_TYPE ? [LIFE_POTION_SIZE] : POTION_SIZES) {
      options.push({ value: `${type}:${size}`, label: `${localize.global(`general.potion${type}`)} ${size}%`, image: getPotionImageUrl(type, size) })
    }
  }

  return options
}

function getPotionImageUrl(type: number, size: number) {
  return `/res/potions/potion_${type}_${size}.png` as const
}

function getItem(slot: AnyEquipmentSlot) {
  const current = character.value.Items[slot] ?? EMPTY_ITEM
  const edit = props.swaps[slot]

  return (edit ? buildEditedItem(props.source, props.source.Class, props.index, current, edit) : undefined) ?? current
}

function hasItem(slot: AnyEquipmentSlot) {
  return getItem(slot).Type > 0
}

function getRune(slot: AnyEquipmentSlot) {
  const item = getItem(slot)

  return props.swaps[slot]?.rune ?? { type: item.HasRune ? item.AttributeTypes[2] : 0, value: item.RuneValue }
}

function getGem(slot: AnyEquipmentSlot) {
  const item = getItem(slot)

  return props.swaps[slot]?.gem ?? { type: item.GemType, value: item.GemValue }
}

function getEnchantment(slot: AnyEquipmentSlot) {
  return props.swaps[slot]?.enchantment ?? getItem(slot).HasEnchantment
}

function getRuneLimit(type: number) {
  return RUNE_LIMITS[type] ?? 0
}

function describeItem(item: ItemModel) {
  const parts: string[] = []

  if (item.Type === 1) {
    parts.push(`${item.DamageMin} - ${item.DamageMax}`)
  } else if (item.Type > 1 && item.Type < 8) {
    parts.push(`${item.Armor} ${localize.global('editor.armor')}`)
  }

  for (const name of ITEM_ATTRIBUTES) {
    const attribute = item[name]

    if (attribute.Value > 0) {
      parts.push(`${attribute.Value} ${localize.global(`general.attribute${attribute.Type}`)}`)
    }
  }

  if (item.Upgrades > 0) {
    parts.push(`+${item.Upgrades}`)
  }

  return parts.join(' · ')
}

function getOriginalName(slot: AnyEquipmentSlot) {
  const item = character.value.Items[slot]

  return item && item.Type > 0 ? item.Name : localize('empty')
}

function toggleSlot(slot: AnyEquipmentSlot, event: MouseEvent) {
  if (event.currentTarget instanceof HTMLElement) {
    // The row around the button, so the menu takes the width of the whole row
    openElement = event.currentTarget.parentElement
  }

  openSlot.value = openSlot.value === slot ? null : slot
}

function toggleDetails(slot: AnyEquipmentSlot) {
  expandedSlot.value = expandedSlot.value === slot ? null : slot
}

function closeSlot() {
  openSlot.value = null
}

function change(swaps: EquipmentSwaps) {
  emit('change', swaps, props.character)
}

function changeEdit(slot: AnyEquipmentSlot, edit: Partial<ItemEdit>) {
  change({ ...props.swaps, [slot]: { ...props.swaps[slot], ...edit } })
}

function changeRune(slot: AnyEquipmentSlot, type: number, value: number) {
  changeEdit(slot, { rune: { type, value: Math.min(value, getRuneLimit(type)) } })
}

function changeGem(slot: AnyEquipmentSlot, type: number, value: number) {
  changeEdit(slot, { gem: { type, value } })
}

function resetSlot(slot: AnyEquipmentSlot) {
  const next = { ...props.swaps }

  delete next[slot]

  change(next)
}

function selectItem(id: string) {
  const slot = openSlot.value

  if (!slot) return

  closeSlot()

  change({ ...props.swaps, [slot]: id ? { id } : {} })
}

function changePotion(index: number, value: string) {
  const [type, size] = value.split(':').map(Number)
  const potion = { type, size: size || LIFE_POTION_SIZE }
  const potions = props.character.potions.map((entry, position) => (position === index ? potion : entry))

  emit('change', props.swaps, { ...props.character, potions })
}

function changePet(habitat: PetHabitat, value: number) {
  emit('change', props.swaps, { ...props.character, pets: { ...props.character.pets, [habitat]: value } })
}
</script>
