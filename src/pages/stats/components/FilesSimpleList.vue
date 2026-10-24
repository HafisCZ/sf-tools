<template>
  <div>
    <div v-if="props.tags.length > 0" class="mb-2 flex flex-wrap gap-1">
      <button
        v-for="tag in tagButtons"
        :key="tag.value ?? '*'"
        type="button"
        class="cursor-pointer rounded-md border px-3 py-1.5 text-xs font-bold outline-none focus-visible:outline-2 focus-visible:outline-accent"
        :class="tagFilter === tag.value ? (tag.color ? 'border-transparent text-white' : 'border-transparent bg-[#e0e1e2] text-black/60') : 'border-white/60 text-white/90 hover:border-white'"
        :style="tagFilter === tag.value && tag.color ? { backgroundColor: tag.color } : undefined"
        @click="selectTag(tag.value)"
      >
        {{ tag.label }}
      </button>
    </div>
    <table class="w-full table-fixed border-collapse bg-surface text-left">
      <thead>
        <tr class="border-b border-line [&>th]:py-[0.92857143em]">
          <th class="w-[5%] cursor-pointer px-[0.7em] py-[0.5em] text-center" :aria-label="localize('selected.text')" @click="emit('mark-all')">
            <SFIcon name="circle-half-stroke" />
          </th>
          <th class="w-[20%] px-[0.7em] py-[0.5em] text-center">{{ localize('timestamp') }}</th>
          <th class="w-[10%] px-[0.7em] py-[0.5em] text-center">{{ localize('players') }}</th>
          <th class="w-[10%] px-[0.7em] py-[0.5em] text-center">{{ localize('groups') }}</th>
          <th class="w-[15%] px-[0.7em] py-[0.5em]">{{ localize('tags.multiple') }}</th>
          <th class="w-[15%] px-[0.7em] py-[0.5em] text-center">{{ localize('version') }}</th>
          <th class="w-[15%]" />
          <th class="w-[5%]" />
        </tr>
      </thead>
      <tbody>
        <tr v-for="file in visibleItems" :key="file.timestamp" class="border-t border-line select-none" :class="{ 'text-[gray]': file.hidden }">
          <td class="cursor-pointer px-[0.7em] py-[0.5em] text-center" @click="emit('mark', file.timestamp, $event.shiftKey)">
            <SFIcon :name="props.selected.has(file.timestamp) ? 'square-check' : 'square'" />
          </td>
          <td class="px-[0.7em] py-[0.5em] text-center">{{ file.date }}</td>
          <td class="px-[0.7em] py-[0.5em] text-center">{{ file.playerCount }}</td>
          <td class="px-[0.7em] py-[0.5em] text-center">{{ file.groupCount }}</td>
          <td class="px-[0.7em] py-[0.5em]">
            <div class="flex flex-wrap gap-1">
              <span v-for="tag in file.tags" :key="tag.name" class="rounded-[0.28571429rem] px-[0.833em] py-[0.5833em] text-xs leading-none font-bold text-white" :style="{ backgroundColor: stringToColor(tag.name) }">{{ tag.label }}</span>
            </div>
          </td>
          <td class="px-[0.7em] py-[0.5em] text-center">{{ file.version || 'Not known' }}</td>
          <td />
          <td class="cursor-pointer px-[0.7em] py-[0.5em] text-center" @click="emit('edit', file.timestamp)">
            <SFIcon name="wrench" />
          </td>
        </tr>
      </tbody>
    </table>
    <div ref="sentinel-ref" />
  </div>
</template>

<script setup lang="ts">
import { computed, toRef, useTemplateRef } from 'vue'
import SFIcon from '@library/SFIcon.vue'
import { stringToColor } from '@utils/colors'
import { useLocalize } from '@utils/localization'
import { type FileListEntry, useIncrementalList } from '~/pages/stats/stats'

defineOptions({
  name: 'FilesSimpleList'
})

const props = defineProps<{
  /**
   * Shown files, newest first
   */
  files: FileListEntry[]
  /**
   * Timestamps of the selected files
   */
  selected: Set<number>
  /**
   * Tags offered as filter buttons, hidden when empty
   */
  tags: string[]
}>()

const emit = defineEmits<{
  /**
   * A file's checkbox was clicked, `range` is true with Shift held
   */
  mark: [timestamp: number, range: boolean]
  /**
   * The header checkbox was clicked
   */
  'mark-all': []
  /**
   * A file's edit button was clicked
   */
  edit: [timestamp: number]
}>()

const tagFilter = defineModel<string | undefined>('tagFilter', { required: true })

const localize = useLocalize('stats.files')

const { visibleItems } = useIncrementalList(toRef(props, 'files'), 25, useTemplateRef('sentinel-ref'))

const tagButtons = computed(() => [{ value: undefined, label: localize('tags.all'), color: undefined }, { value: '', label: localize('tags.none'), color: undefined }, ...props.tags.map((tag) => ({ value: tag, label: tag, color: stringToColor(tag) }))])

function selectTag(value: string | undefined) {
  if (value !== tagFilter.value) {
    tagFilter.value = value
  } else if (value !== undefined) {
    tagFilter.value = undefined
  }
}
</script>
