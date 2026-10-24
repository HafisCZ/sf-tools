<template>
  <div>
    <table class="w-full table-fixed border-collapse bg-surface text-left">
      <thead>
        <tr class="border-b border-line [&>th]:py-[0.92857143em]">
          <th class="cursor-pointer px-[0.7em] py-[0.5em] text-center" :aria-label="localize('selected.text')" @click="emit('mark-all')">
            <SFIcon name="circle-half-stroke" />
          </th>
          <th class="w-[16%] px-[0.7em] py-[0.5em] text-center">{{ localize('timestamp') }}</th>
          <th class="w-[12%] px-[0.7em] py-[0.5em] text-center">{{ localize('prefix') }}</th>
          <th class="w-[8%] px-[0.7em] py-[0.5em] text-center">{{ localize('type') }}</th>
          <th class="w-[17%] px-[0.7em] py-[0.5em]">{{ localize('name') }}</th>
          <th class="w-[20%] px-[0.7em] py-[0.5em]">{{ localize('group') }}</th>
          <th class="w-[17%] px-[0.7em] py-[0.5em]">{{ localize('tags.multiple') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in visibleItems" :key="entry.key" class="border-t border-line select-none" :class="{ 'text-[gray]': entry.hidden }">
          <td class="cursor-pointer px-[0.7em] py-[0.5em] text-center" @click="emit('mark', entry.key, $event.shiftKey)">
            <SFIcon :name="props.selected.has(entry.key) ? 'square-check' : 'square'" />
          </td>
          <td class="px-[0.7em] py-[0.5em] text-center">{{ entry.date }}</td>
          <td class="px-[0.7em] py-[0.5em] text-center">{{ entry.prefix }}</td>
          <td class="px-[0.7em] py-[0.5em] text-center">
            <SFIcon :name="entry.player ? 'user' : 'users'" :class="entry.player ? 'text-[#2185d0]' : 'text-[#f2711c]'" />
          </td>
          <td class="px-[0.7em] py-[0.5em]">{{ entry.name }}</td>
          <td class="px-[0.7em] py-[0.5em]">{{ entry.group }}</td>
          <td class="px-[0.7em] py-[0.5em]">
            <div class="flex flex-wrap gap-1">
              <span v-for="tag in entry.tags" :key="tag" class="rounded-[0.28571429rem] px-[0.833em] py-[0.5833em] text-xs leading-none font-bold text-white" :style="{ backgroundColor: stringToColor(tag) }">{{ tag }}</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <div ref="sentinel-ref" />
  </div>
</template>

<script setup lang="ts">
import { toRef, useTemplateRef } from 'vue'
import SFIcon from '@library/SFIcon.vue'
import { stringToColor } from '@utils/colors'
import { useLocalize } from '@utils/localization'
import { type EntryListEntry, useIncrementalList } from '~/pages/stats/stats'

defineOptions({
  name: 'FilesAdvancedList'
})

const props = defineProps<{
  /**
   * Shown players and guilds, newest first
   */
  entries: EntryListEntry[]
  /**
   * Keys of the selected entries
   */
  selected: Set<string>
}>()

const emit = defineEmits<{
  /**
   * An entry's checkbox was clicked, `range` is true with Shift held
   */
  mark: [key: string, range: boolean]
  /**
   * The header checkbox was clicked
   */
  'mark-all': []
}>()

const localize = useLocalize('stats.files')

const { visibleItems } = useIncrementalList(toRef(props, 'entries'), 25, useTemplateRef('sentinel-ref'))
</script>
