<template>
  <PlayerEditor ref="editor-ref" v-model:fighter="fighter" name-readonly :fighters="fighterTabs" :companion="fighter > 0" :equipment="source !== null" @copy="copyPlayer" @view="changeItemView">
    <template #equipment>
      <EquipmentEditor v-if="source" :source="source" :index="fighter" :swaps="swaps[fighter]" :character="characterState" @change="applySwaps" />
    </template>
  </PlayerEditor>
  <SimulatorPasteTarget @paste="insertFighters" />
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { useLocalize } from '@utils/localization'
import { copyJson } from '@utils/utils'
import { PlayerModel } from '~/core/models/player'
import { ModelUtils } from '~/core/models/utils'
import EquipmentEditor from '~/sim/components/EquipmentEditor.vue'
import { FIGHTER_NAME_KEYS, type BreakEquipment } from '~/pages/dungeon-break/dungeon-break'
import PlayerEditor from '~/sim/components/PlayerEditor.vue'
import SimulatorPasteTarget from '~/sim/components/SimulatorPasteTarget.vue'
import { copyDungeonSharedValues, DUNGEON_COMPANION_CLASSES, DUNGEON_SHARED_PATHS } from '~/sim/data/dungeons'
import { handleSimulatorPaste, preparePlayerData } from '~/sim/debug'
import { applyEquipmentSwaps, createCharacterState, LIFE_POTION_TYPE, type CharacterState, type EquipmentSwaps } from '~/sim/equipment'

defineOptions({
  name: 'DungeonBreakEditor'
})

const props = defineProps<{
  /**
   * Picked character, also the source of the items that can be swapped in
   */
  character: PlayerModel
}>()

/**
 * Player and the three companions, null for a companion the character does not have
 */
const fighters = defineModel<(PlayerModel | null)[]>('fighters', { required: true })

/**
 * Edited fighter, 0 for the player and 1 to 3 for the companions
 */
const fighter = defineModel<number>('fighter', { required: true })

const localize = useLocalize('dungeon_break')

const source = shallowRef(props.character.Inventory ? props.character : null)
const swaps = shallowRef<EquipmentSwaps[]>([{}, {}, {}, {}])
const characterState = shallowRef<CharacterState>(createCharacterState(props.character))
const isItemView = ref(false)

let filledSnapshot = ''
let isFillPending = false

const editor = useTemplateRef('editor-ref')

defineExpose({
  get isValid() {
    return editor.value?.isValid ?? true
  },
  get equipment(): BreakEquipment | null {
    const player = source.value

    return player ? { source: player, swaps: swaps.value, state: characterState.value } : null
  }
})

const fighterNames = computed(() => FIGHTER_NAME_KEYS.map((key) => localize.global(key)))

const fighterTabs = computed(() => fighterNames.value.flatMap((name, index) => (fighters.value[index] ? [{ index, name }] : [])))

const editedPlayer = computed((): PlayerModel | null => (editor.value?.isValid ? editor.value.read() : null))

watch(editedPlayer, (player) => {
  if (!player || isFillPending) return

  const snapshot = JSON.stringify(player)

  if (snapshot === filledSnapshot) return

  filledSnapshot = snapshot

  updateFighters(fighters.value.map((entry, index) => (index === fighter.value ? player : entry)))
})

// The companion prop has to reach the editor before it is filled, and the editor still holds the previous fighter until then
watch(fighter, async (index) => {
  isFillPending = true

  await nextTick()

  fillEditor(fighters.value)

  isFillPending = false

  if (isItemView.value) {
    applySwaps(swaps.value[index], characterState.value)
  }
})

onMounted(() => {
  fillEditor(fighters.value)
})

function updateFighters(list: (PlayerModel | null)[]) {
  const [player] = list

  const next = list.map((entry, index) => {
    if (entry) {
      entry.Name = fighterNames.value[index]

      if (index > 0) {
        entry.Class = DUNGEON_COMPANION_CLASSES[index - 1]

        if (player) {
          copyDungeonSharedValues(entry, player)
        }
      }
    }

    return entry
  })

  fighters.value = next

  return next
}

function fillEditor(list: (PlayerModel | null)[]) {
  if (!editor.value) return

  const index = fighter.value
  const [player] = list

  const data = structuredClone(list[index]) ?? new PlayerModel()

  if (index > 0) {
    data.Class = DUNGEON_COMPANION_CLASSES[index - 1]

    if (player) {
      copyDungeonSharedValues(data, player)
    }
  }

  data.Name = fighterNames.value[index]

  editor.value.fill(data)

  filledSnapshot = JSON.stringify(editor.value.read())
}

function changeItemView(open: boolean) {
  isItemView.value = open

  if (open) {
    applySwaps(swaps.value[fighter.value], withLifePotion(characterState.value, fighters.value[fighter.value]))
  }
}

function withLifePotion(state: CharacterState, fighter: PlayerModel | null) {
  const size = fighter?.Potions?.Life ?? 0
  const free = state.potions.findIndex((potion) => potion.type === 0)

  if (!size || free === -1 || state.potions.some((potion) => potion.type === LIFE_POTION_TYPE)) return state

  return { ...state, potions: state.potions.map((potion, index) => (index === free ? { type: LIFE_POTION_TYPE, size } : potion)) }
}

const REBUILD_PATHS = DUNGEON_SHARED_PATHS.filter((path) => path !== 'Potions.Life')

function applySwaps(entries: EquipmentSwaps, character: CharacterState) {
  const player = source.value

  if (!player) return

  const index = fighter.value

  swaps.value = swaps.value.map((entry, position) => (position === index ? entries : entry))
  characterState.value = character

  const rebuilt = applyEquipmentSwaps(player, swaps.value, character)
  const list = ModelUtils.toSimulatorData(rebuilt, true)
  const prepared = preparePlayerData(Array.isArray(list) ? list[index] : list)

  const current = fighters.value[index]

  if (current) {
    copyDungeonSharedValues(prepared, current, REBUILD_PATHS)
  }

  fillEditor(updateFighters(fighters.value.map((entry, position) => (position === index ? prepared : entry))))
}

function hasClass(value: unknown) {
  return typeof value === 'object' && value !== null && 'Class' in value && Boolean(value.Class)
}

function insertFighters(value: unknown) {
  try {
    const data = handleSimulatorPaste(value)

    let list: (PlayerModel | null)[]

    if (Array.isArray(data)) {
      const pasted = data.map((item: unknown) => preparePlayerData(item))

      list = fighters.value.map((fighter, index) => (fighter ? (pasted.at(index) ?? fighter) : null))
    } else if (hasClass(data)) {
      const player = preparePlayerData(data)

      list = fighters.value.map((entry, index) => (index === fighter.value ? player : entry))
    } else {
      return
    }

    source.value = null
    swaps.value = [{}, {}, {}, {}]
    isItemView.value = false

    fillEditor(updateFighters(list))
  } catch (e) {
    console.info(e)
  }
}

function copyPlayer(player: PlayerModel) {
  void copyJson(player)
}
</script>
