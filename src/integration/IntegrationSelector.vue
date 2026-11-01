<template>
  <div class="min-w-0">
    <button
      ref="trigger-ref"
      type="button"
      class="flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-md border bg-surface py-[7px] pr-3.5 pl-[7px] text-left outline-none"
      :class="open ? 'border-white/40' : 'border-line focus-visible:border-accent'"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="toggle"
    >
      <span v-if="modelValue" class="relative size-12 shrink-0 overflow-hidden rounded bg-[#0c1a20] bg-[radial-gradient(closest-side,rgb(5_121_160/0.7),rgb(5_121_160/0))] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]">
        <CharacterRenderer :data="modelValue" />
      </span>
      <span class="flex min-w-0 flex-1 flex-col">
        <template v-if="modelValue">
          <span class="truncate text-[15px] font-bold text-white">{{ modelValue.Name }} @ {{ modelValue.Prefix }}</span>
          <span class="truncate text-xs text-white/60">{{ subtitle }}</span>
        </template>
        <span v-else class="truncate pl-1.5 text-white/40">{{ localize('selector.pick') }}</span>
      </span>
      <SFIcon name="chevron-down" class="text-white/60" :class="{ 'rotate-180': open }" />
    </button>
    <Teleport to="body">
      <SFDropdownMenu v-if="open && position" :anchor="position" :width="position.right - position.left" float="right" position="bottom" class="scroll-pt-12" @close="close">
        <template v-if="inlineSelectorPlayers.length > 0">
          <div class="sticky -top-1 z-10 -mx-1 -mt-1 bg-surface p-1">
            <SFInput v-model="query" type="search" :aria-label="localize('search')" :placeholder="localize('search')" />
          </div>
          <ul role="menu" class="flex flex-col gap-0.5">
            <li v-for="entry in matchingPlayers" :key="entry.LinkId" role="none">
              <button
                type="button"
                role="menuitem"
                :data-selected="entry.LinkId === modelValue?.LinkId || undefined"
                class="flex w-full cursor-pointer items-center gap-2.5 rounded py-1.5 pr-2.5 pl-1.5 text-left outline-none"
                :class="entry.LinkId === modelValue?.LinkId ? 'bg-white/[0.07]' : 'hover:bg-surface-hover focus-visible:bg-surface-hover'"
                @click="select(entry)"
              >
                <span class="relative size-10 shrink-0 overflow-hidden rounded bg-[#0c1a20] bg-[radial-gradient(closest-side,rgb(5_121_160/0.7),rgb(5_121_160/0))] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]">
                  <CharacterRenderer :data="entry" />
                </span>
                <span class="flex min-w-0 flex-1 flex-col">
                  <span class="truncate font-bold">{{ entry.Name }}</span>
                  <span class="truncate text-xs text-white/60">{{ localize('selector.row', { world: entry.Prefix, level: entry.Level, class: localize.global(`general.class${entry.Class}`) }) }}</span>
                </span>
              </button>
            </li>
          </ul>
        </template>
        <div v-else class="flex flex-col gap-1 px-4 py-5 text-center">
          <SFParagraph class="font-bold">{{ localize('selector.none_title') }}</SFParagraph>
          <SFParagraph type="muted" size="sm">{{ localize('selector.none_text') }}</SFParagraph>
        </div>
        <div class="sticky -bottom-1 z-10 -mx-1 -mb-1 mt-1 flex gap-1 border-t border-line bg-surface p-1">
          <SFButton variant="ghost" size="sm" class="flex-1" @click="importEndpoint">
            {{ localize('game') }}
          </SFButton>
          <SFButton variant="ghost" size="sm" class="flex-1" @click="importFiles">
            {{ localize('file') }}
          </SFButton>
        </div>
      </SFDropdownMenu>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDropdownMenu from '@library/SFDropdownMenu.vue'
import SFIcon from '@library/SFIcon.vue'
import SFInput from '@library/SFInput.vue'
import SFParagraph from '@library/SFParagraph.vue'
import { formatSpacedNumber } from '@utils/formatting'
import { useDropdown } from '@utils/interactions'
import { useLocalize } from '@utils/localization'
import CharacterRenderer from '~/components/CharacterRenderer.vue'
import { type PlayerModel } from '~/core/models/player'
import { DatabaseManager } from '~/data/database-manager'
import { importInlineSelectorEndpoint, importInlineSelectorFiles, inlineSelectorPlayers, loadInlineSelectorPlayers } from './inline-selector'

defineOptions({
  name: 'IntegrationSelector'
})

const modelValue = defineModel<PlayerModel | null>({ required: true })

const localize = useLocalize('integration')

const query = ref('')

const triggerElement = useTemplateRef('trigger-ref')

const { open, position, toggle: toggleOpen, close } = useDropdown(triggerElement, triggerElement)

const matchingPlayers = computed(() => {
  const search = query.value.trim().toLowerCase()

  return search ? inlineSelectorPlayers.value.filter((entry) => `${entry.Name} ${entry.Prefix}`.toLowerCase().includes(search)) : inlineSelectorPlayers.value
})

const subtitle = computed(() => {
  const player = modelValue.value

  return player ? localize('selector.level', { level: player.Level, xp: formatSpacedNumber(player.XP), next: formatSpacedNumber(player.XPNext) }) : ''
})

onMounted(() => {
  void loadInlineSelectorPlayers()
})

function toggle() {
  query.value = ''

  toggleOpen()
}

function select(entry: PlayerModel) {
  // The database lists lazy proxies, which can't be cloned into a worker
  modelValue.value = DatabaseManager.getPlayer(entry.LinkId, entry.Timestamp) ?? entry

  close()
}

function importEndpoint() {
  close()

  importInlineSelectorEndpoint()
}

function importFiles() {
  close()

  importInlineSelectorFiles()
}
</script>
