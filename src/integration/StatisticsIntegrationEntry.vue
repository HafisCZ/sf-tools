<template>
  <li class="group relative" :role="props.menu ? 'none' : undefined">
    <button type="button" :role="props.menu ? 'menuitem' : undefined" class="flex w-full cursor-pointer items-center gap-2.5 rounded-md p-1.5 text-left outline-none hover:bg-surface-hover focus-visible:bg-surface-hover" @click="emit('select')">
      <span class="relative size-11 shrink-0 overflow-hidden rounded-md bg-[#0c1a20] bg-[radial-gradient(closest-side,rgb(5_121_160/0.9),rgb(5_121_160/0))] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]">
        <img v-if="props.guild" src="/res/group.png" alt="" class="size-full object-contain p-1" />
        <template v-else>
          <CharacterRenderer :data="player" />
          <img :src="getClassImageUrl(player.Class)" alt="" class="absolute bottom-px left-px size-4" />
        </template>
      </span>
      <span class="flex min-w-0 flex-1 flex-col gap-0.5" :class="{ 'group-hover:pr-9 group-has-[:focus-visible]:pr-9': props.hideable }">
        <span class="flex min-w-0 items-center gap-1.5">
          <span class="truncate font-bold text-white">{{ props.entry.Name }}</span>
          <span class="shrink-0 text-[11px] font-bold text-[#7fc8e0] uppercase">{{ formatWorldName(props.entry.Data.prefix) }}</span>
        </span>
        <span class="text-[11.5px] font-bold text-[#f0c042] uppercase">{{ description }}</span>
      </span>
    </button>
    <span v-if="props.hideable" class="absolute top-1/2 right-1.5 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100">
      <SFButton variant="ghost" size="sm" icon :title="localize('hide.label')" :aria-label="localize('hide.label')" @click="emit('hide')">
        <SFIcon name="eye-slash" />
      </SFButton>
    </span>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFIcon from '@library/SFIcon.vue'
import { formatWorldName } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { getClassImageUrl } from '@utils/utils'
import CharacterRenderer from '~/components/CharacterRenderer.vue'
import { type GroupModel } from '~/core/models/group'
import { type PlayerModel } from '~/core/models/player'

defineOptions({
  name: 'StatisticsIntegrationEntry'
})

const props = defineProps<{
  /**
   * Player or guild shown in the row
   */
  entry: PlayerModel | GroupModel
  /**
   * Shows the entry as a guild
   */
  guild?: boolean
  /**
   * Shows a button that hides the entry from the list
   */
  hideable?: boolean
  /**
   * Makes the row an item of a menu, so arrow keys move between rows
   */
  menu?: boolean
}>()

const emit = defineEmits<{
  /**
   * The row was clicked
   */
  select: []
  /**
   * The hide button was clicked
   */
  hide: []
}>()

const localize = useLocalize('integration')

const player = computed(() => props.entry as PlayerModel)

const description = computed(() => {
  if (props.guild) {
    const total = (props.entry as GroupModel).MembersTotal

    return localize(total === 1 ? 'member' : 'members', { count: total })
  } else {
    return `${localize.global('general.level')} ${player.value.Level}`
  }
})
</script>
