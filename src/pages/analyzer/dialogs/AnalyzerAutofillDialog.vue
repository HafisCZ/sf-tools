<template>
  <SFDialog :title="localize('title')" size="sm" column close-via-button @close="emit('close')">
    <div class="shrink-0">
      <SFInput v-model="query" :aria-label="localize('search')" :placeholder="localize('search')" />
    </div>
    <div class="flex min-h-0 flex-col gap-4 overflow-y-auto pr-4">
      <button v-for="(entry, index) in visibleEntries" :key="index" type="button" class="flex cursor-pointer items-center gap-4 rounded border border-line p-2 text-left outline-none hover:bg-surface-hover focus-visible:bg-surface-hover" @click="select(entry)">
        <img v-if="entry.boss.class !== undefined" :src="getClassImageUrl(entry.boss.class)" alt="" class="size-[3em] shrink-0" />
        <span v-else class="size-[3em] shrink-0" />
        <span class="flex flex-col">
          <span class="text-white/50">{{ entry.dungeonName }}</span>
          <span>{{ entry.boss.pos }}. {{ entry.bossName }}</span>
        </span>
        <SFIcon :name="entry.dungeon.companions ? 'users' : 'user'" class="mr-1 ml-auto shrink-0 text-[2em] opacity-45" :class="{ 'text-[#a333c8]': entry.dungeon.companions }" />
      </button>
    </div>
  </SFDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SFDialog from '@library/SFDialog.vue'
import SFIcon from '@library/SFIcon.vue'
import SFInput from '@library/SFInput.vue'
import { useLocalize } from '@utils/localization'
import { getClassImageUrl } from '@utils/utils'
import { type FighterEditorData } from '~/pages/analyzer/analyzer'
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
}>()

const emit = defineEmits<{
  close: [data?: object]
}>()

type AutofillEntry = DungeonEntry & {
  dungeonName: string
  bossName: string
}

const localize = useLocalize('dialog.analyzer_autofill')

const query = ref('')

const entries = computed(() =>
  Object.values(DUNGEON_DATA)
    .filter(({ floors }) => Object.keys(floors).length > 0)
    .sort((a, b) => a.pos - b.pos)
    .flatMap((dungeon) => Object.values(dungeon.floors).map((boss): AutofillEntry => ({ dungeon, boss, dungeonName: getDungeonName(dungeon), bossName: getBossName({ dungeon, boss }) })))
)

const visibleEntries = computed(() => {
  const term = query.value.trim().toLowerCase()

  return term ? entries.value.filter((entry) => entry.dungeonName.toLowerCase().includes(term) || entry.bossName.toLowerCase().includes(term)) : entries.value
})

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

function select(entry: DungeonEntry) {
  emit('close', convert(entry))
}
</script>
