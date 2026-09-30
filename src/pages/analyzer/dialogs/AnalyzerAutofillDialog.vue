<template>
  <SFDialog :title="localize('title')" size="sm">
    <div class="flex flex-col gap-4">
      <SFToggleGroup ref="type-ref" :model-value="type" :options="typeOptions" variant="soft" @update:model-value="selectType" />
      <SFSelect v-if="type === 'enemies'" ref="enemy-ref" v-model="enemy" :label="localize('enemy')" :placeholder="localize('enemy_placeholder')" :options="enemyOptions" search required />
      <SFSelect v-else ref="player-ref" v-model="player" :label="localize('player')" :placeholder="localize('player_placeholder')" :options="playerOptions" search required />
    </div>

    <template #buttons>
      <SFButton block @click="emit('close')">
        {{ localize.global('dialog.shared.cancel') }}
      </SFButton>
      <SFButton variant="primary" block :disabled="!isValid" @click="fill">
        {{ localize.global('dialog.shared.apply') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import SFSelect from '@library/SFSelect.vue'
import SFToggleGroup from '@library/SFToggleGroup.vue'
import { type SelectOption } from '@utils/components'
import { useLocalize } from '@utils/localization'
import { getClassImageUrl } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import { type AnalyzerPlayer, type FighterEditorData } from '~/pages/analyzer/analyzer'
import { CONFIG } from '~/sim/base'
import { createBossWeapon, DUNGEON_DATA, getBossName, getDungeonName, type DungeonEntry, type DungeonRunes } from '~/sim/data/dungeons'

defineOptions({
  name: 'AnalyzerAutofillDialog'
})

const props = defineProps<{
  /**
   * Data filled in when a mirror boss is picked
   */
  mirror: FighterEditorData
  /**
   * Saved characters that can be picked in their own tab
   */
  players: AnalyzerPlayer[]
}>()

const emit = defineEmits<{
  close: [data?: object]
}>()

type AutofillType = 'enemies' | 'players'

const SHADOW_COLOR = '#dec0ff'

const RUNE_LETTERS = ['F', 'C', 'L']

const DUNGEONS = Object.values(DUNGEON_DATA)
  .filter((dungeon) => Object.keys(dungeon.floors).length > 0)
  .sort((a, b) => a.pos - b.pos)

const ENTRIES: DungeonEntry[] = DUNGEONS.flatMap((dungeon) => Object.values(dungeon.floors).map((boss) => ({ dungeon, boss })))

const localize = useLocalize('dialog.analyzer_autofill')

const type = ref<AutofillType>('enemies')
const enemy = shallowRef<DungeonEntry | null>(ENTRIES[0])
const player = shallowRef<AnalyzerPlayer | null>(props.players.at(0) ?? null)

const isValid = useComponentValidation(useTemplateRef('type-ref'), useTemplateRef('enemy-ref'), useTemplateRef('player-ref'))

const typeOptions = computed<SelectOption<AutofillType>[]>(() => [
  { value: 'enemies', label: localize('enemies') },
  { value: 'players', label: localize('players'), disabled: props.players.length === 0 }
])

const enemyOptions = computed<SelectOption<DungeonEntry | null>[]>(() =>
  ENTRIES.map((entry) => ({
    value: entry,
    label: `${entry.boss.pos}. ${getBossName(entry)}`,
    image: entry.boss.class === undefined ? undefined : getClassImageUrl(entry.boss.class),
    imagePosition: 'right',
    description: [getDungeonName(entry.dungeon), formatRunes(entry.boss.runes)].filter(Boolean).join(' · '),
    color: entry.dungeon.companions ? SHADOW_COLOR : undefined
  }))
)

const playerOptions = computed<SelectOption<AnalyzerPlayer | null>[]>(() =>
  props.players.map((entry) => {
    const saves = props.players.filter(({ Name }) => Name === entry.Name)
    const level = `${localize.global('general.level')} ${entry.Level}`

    return {
      value: entry,
      label: entry.Name,
      image: getClassImageUrl(entry.Class),
      imagePosition: 'right',
      description: saves.length > 1 ? `${level} · #${saves.indexOf(entry) + 1}` : level
    }
  })
)

function formatRunes(runes: DungeonRunes | undefined) {
  if (!runes) return ''

  const damage = `${runes.damage} ${RUNE_LETTERS[runes.type - 40]}`
  const resistances = RUNE_LETTERS.flatMap((letter, index) => (runes.res?.[index] ? [`${runes.res[index]} ${letter}`] : [])).join(' ')

  return resistances ? `${damage} / ${resistances}` : damage
}

function getBossRunes(runes: DungeonRunes | undefined) {
  const values = runes?.res ?? [0, 0, 0]

  return {
    Health: 0,
    ResistanceFire: values[0],
    ResistanceCold: values[1],
    ResistanceLightning: values[2]
  }
}

function convert({ dungeon, boss }: DungeonEntry) {
  // Mirror bosses copy the other fighter
  if (boss.class === undefined) {
    return {
      ...props.mirror,
      Dungeons: { Group: 0 },
      Fortress: { Gladiator: 0 }
    }
  }

  return {
    Armor: boss.armor || (dungeon.armor_multiplier || 1) * (boss.level * CONFIG.fromID(boss.class).MaximumDamageReduction),
    Dungeons: { Group: 0 },
    Fortress: { Gladiator: 0 },
    Runes: getBossRunes(boss.runes),
    Items: {
      Hand: {},
      Wpn1: createBossWeapon(boss),
      Wpn2: createBossWeapon(boss)
    }
  }
}

function selectType(value: string | null) {
  if (value !== 'enemies' && value !== 'players') return

  type.value = value
  enemy.value = ENTRIES[0]
  player.value = props.players.at(0) ?? null
}

function fill() {
  if (type.value === 'players') {
    if (player.value) {
      emit('close', player.value)
    }
  } else if (enemy.value) {
    emit('close', convert(enemy.value))
  }
}
</script>
