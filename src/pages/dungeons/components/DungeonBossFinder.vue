<template>
  <div ref="container-ref" class="flex">
    <SFTooltip :content="localize('find_boss')">
      <SFButton variant="ghost" size="sm" icon aria-haspopup="menu" :aria-expanded="open" :aria-label="localize('find_boss')" @click="toggle">
        <SFIcon name="magnifying-glass" />
      </SFButton>
    </SFTooltip>
    <Teleport to="body">
      <SFDropdownMenu v-if="open && position" :anchor="position" :width="320" float="left" position="bottom" class="scroll-pt-12" @close="close" @scroll="loadMore">
        <div class="sticky -top-1 z-10 -mx-1 -mt-1 bg-surface p-1">
          <input
            v-model="query"
            type="search"
            :aria-label="localize('find_boss_search')"
            :placeholder="localize('find_boss_search')"
            class="w-full rounded border border-line bg-page px-3 py-2 leading-5 text-white/90 outline-none placeholder:text-white/40 focus:border-accent"
            @input="showPage(0)"
            @keydown.enter.prevent="selectFirstMatch"
          />
        </div>
        <ul v-if="matchingEntries.length > 0" ref="list-ref" role="menu" class="flex flex-col">
          <li v-for="entry in renderedEntries" :key="entry.key" role="none">
            <button type="button" role="menuitem" :data-selected="isSelected(entry) || undefined" class="flex w-full cursor-pointer items-center gap-3 rounded px-3 py-2 text-left outline-none" :class="isSelected(entry) ? 'bg-accent/15' : 'hover:bg-surface-hover focus-visible:bg-surface-hover'" @click="select(entry)">
              <span class="flex min-w-0 flex-1 flex-col">
                <span :style="{ color: entry.color }">{{ entry.label }}</span>
                <span class="text-xs text-white/50">{{ entry.description }}</span>
              </span>
              <img v-if="entry.image" :src="entry.image" alt="" class="size-5 object-contain" />
            </button>
          </li>
        </ul>
        <p v-else class="px-3 py-2 text-white/50">{{ localize('find_boss_empty') }}</p>
      </SFDropdownMenu>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDropdownMenu from '@library/SFDropdownMenu.vue'
import SFIcon from '@library/SFIcon.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { usePagedList } from '@utils/components'
import { useDropdown } from '@utils/interactions'
import { useLocalize } from '@utils/localization'
import { compact, getClassImageUrl } from '@utils/utils'
import { RUNE_FIRE_DAMAGE } from '~/sim/base'
import { DUNGEON_DATA, getBossName, getDungeonName, type DungeonRunes } from '~/sim/data/dungeons'

defineOptions({
  name: 'DungeonBossFinder'
})

type BossEntry = {
  dungeon: string
  boss: string
  key: string
  label: string
  description: string
  image?: string
  color?: string
}

const props = defineProps<{
  /**
   * Dungeon of the boss shown as picked
   */
  dungeonId: string
  /**
   * Key of the boss shown as picked within its dungeon's floors
   */
  bossId: string
}>()

const emit = defineEmits<{
  select: [dungeon: string, boss: string]
}>()

const localize = useLocalize('dungeons')

const query = ref('')

const containerElement = useTemplateRef('container-ref')
const listElement = useTemplateRef('list-ref')

const SHADOW_COLOR = '#dec0ff'

const DUNGEONS = Object.values(DUNGEON_DATA)
  .filter((dungeon) => Object.keys(dungeon.floors).length > 0)
  .sort((a, b) => a.pos - b.pos)

const entries = computed((): BossEntry[] =>
  DUNGEONS.flatMap((dungeon) =>
    Object.entries(dungeon.floors).map(([id, boss]) => ({
      dungeon: String(dungeon.id),
      boss: id,
      key: `${dungeon.id}-${id}`,
      label: `${boss.pos}. ${getBossName({ dungeon, boss })}`,
      description: compact([getDungeonName(dungeon), formatRunes(boss.runes)]).join(' · '),
      image: boss.class === undefined ? undefined : getClassImageUrl(boss.class),
      color: dungeon.companions ? SHADOW_COLOR : undefined
    }))
  )
)

const matchingEntries = computed(() => {
  const search = query.value.trim().toLowerCase()

  return search ? entries.value.filter((entry) => entry.label.toLowerCase().includes(search) || entry.description.toLowerCase().includes(search)) : entries.value
})

const PAGE_SIZE = 50

const { renderedItems: renderedEntries, showPage, loadMore } = usePagedList(matchingEntries, PAGE_SIZE, listElement)

const { open, position, toggle: toggleOpen, close } = useDropdown(containerElement, () => containerElement.value?.querySelector('button'))

const RUNE_LETTERS = ['F', 'C', 'L']

function formatRunes(runes: DungeonRunes | undefined) {
  if (!runes) return ''

  const damage = `${runes.damage} ${RUNE_LETTERS[runes.type - RUNE_FIRE_DAMAGE]}`
  const resistances = RUNE_LETTERS.flatMap((letter, index) => (runes.res?.[index] ? [`${runes.res[index]} ${letter}`] : [])).join(' ')

  return resistances ? `${damage} / ${resistances}` : damage
}

function isSelected(entry: BossEntry) {
  return entry.dungeon === props.dungeonId && entry.boss === props.bossId
}

function toggle() {
  query.value = ''
  toggleOpen()

  if (open.value) {
    showPage(entries.value.findIndex(isSelected))
  }
}

function select({ dungeon, boss }: BossEntry) {
  emit('select', dungeon, boss)

  close()
}

function selectFirstMatch() {
  const entry = matchingEntries.value.at(0)

  if (entry) {
    select(entry)
  }
}
</script>
