<template>
  <div class="flex flex-col gap-1">
    <SFInput v-model="query" type="search" :aria-label="props.searchLabel" :placeholder="props.searchLabel" />
    <ul v-if="matchingEntries.length > 0" ref="list-ref" :role="props.menu ? 'menu' : undefined" class="flex max-h-80 flex-col overflow-y-auto" @scroll="loadMore">
      <StatisticsIntegrationEntry v-for="entry in renderedEntries" :key="entry.LinkId" :entry="entry" :menu="props.menu" @select="emit('select', entry)" />
    </ul>
    <SFParagraph v-else type="muted" size="sm" class="px-3 py-4 text-center">{{ localize('no_match') }}</SFParagraph>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import SFInput from '@library/SFInput.vue'
import SFParagraph from '@library/SFParagraph.vue'
import { usePagedList } from '@utils/components'
import { useLocalize } from '@utils/localization'
import { type PlayerModel } from '~/core/models/player'
import StatisticsIntegrationEntry from './StatisticsIntegrationEntry.vue'

defineOptions({
  name: 'StatisticsIntegrationWorld'
})

const props = defineProps<{
  /**
   * Players of the world
   */
  entries: PlayerModel[]
  /**
   * Placeholder and accessible name of the search field
   */
  searchLabel: string
  /**
   * Makes the rows items of a menu, so arrow keys move between them
   */
  menu?: boolean
}>()

const emit = defineEmits<{
  /**
   * A player was picked
   */
  select: [entry: PlayerModel]
}>()

const localize = useLocalize('integration')

const query = ref('')

const listElement = useTemplateRef('list-ref')

const matchingEntries = computed(() => {
  const search = query.value.trim().toLowerCase()

  return search ? props.entries.filter((entry) => entry.Name.toLowerCase().includes(search)) : props.entries
})

const PAGE_SIZE = 25

const { renderedItems: renderedEntries, showPage, loadMore } = usePagedList(matchingEntries, PAGE_SIZE, listElement)

showPage(0)

watch(query, () => {
  showPage(0)
  listElement.value?.scrollTo({ top: 0 })
})
</script>
