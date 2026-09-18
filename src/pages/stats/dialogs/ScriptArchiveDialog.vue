<template>
  <SFDialog :title="localize('title')" size="sm">
    <div class="flex h-[50vh] flex-col gap-4">
      <SFSelect ref="filter-ref" v-model="filter" :label="localize('filter')" :options="filterOptions" search class="shrink-0" />
      <div class="flex min-h-0 flex-col gap-2 overflow-y-auto pr-2">
        <div v-for="entry in visibleEntries" :key="entry.timestamp" class="flex items-center rounded-[0.25em] border hover:bg-page" :style="{ borderColor: `#${TYPE_COLORS[entry.type] ?? '404040'}60` }">
          <button type="button" class="flex flex-1 cursor-pointer items-center gap-2 p-4 text-left outline-none focus-visible:bg-page" @click="emit('close', entry.content)">
            <SFIcon :name="TYPE_ICONS[entry.type] ?? 'question'" class="shrink-0 text-2xl opacity-45" :style="{ color: `#${TYPE_COLORS[entry.type] ?? '404040'}` }" />
            <span>
              <span class="block">{{ localize(`types.${entry.type}`) }}{{ entry.temporary ? ` ${localize('item.temporary')}` : '' }}: {{ getScriptName(entry.name) }}</span>
              <span class="block text-[gray]">v{{ isNaN(entry.version) ? 1 : entry.version }} - {{ localize('item.description', { change: formatDate(entry.timestamp), expire: formatDate(entry.timestamp + ScriptArchive.DATA_LIFETIME) }) }}</span>
            </span>
          </button>
          <SFTooltip :content="localize.global('editor.copy')">
            <button type="button" class="mr-4 cursor-pointer text-lg text-[gray] outline-none hover:text-white focus-visible:text-white" :aria-label="localize.global('editor.copy')" @click="copyEntry(entry.content)">
              <SFIcon name="copy" />
            </button>
          </SFTooltip>
        </div>
      </div>
    </div>

    <template #buttons>
      <SFButton block @click="clearArchive">
        {{ localize('clear') }}
      </SFButton>
      <SFButton block @click="emit('close')">
        {{ localize.global('dialog.shared.close') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import SFIcon from '@library/SFIcon.vue'
import SFSelect from '@library/SFSelect.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { type SelectOption } from '@utils/components'
import { formatDate } from '@utils/formatting'
import { type IconName } from '@utils/icons'
import { useLocalize } from '@utils/localization'
import { useToast } from '@utils/toasts'
import { copyText } from '@utils/utils'
import { ScriptArchive } from '~/script/archive'
import { Scripts } from '~/script/scripts'

defineOptions({
  name: 'ScriptArchiveDialog'
})

const emit = defineEmits<{
  close: [content?: string]
}>()

const TYPES = ['create', 'overwrite', 'save', 'remove', 'discard']

const TYPE_ICONS: Record<string, IconName> = {
  create: 'plus',
  overwrite: 'pen',
  save: 'floppy-disk',
  remove: 'trash-can',
  discard: 'recycle'
}

const TYPE_COLORS: Record<string, string> = {
  create: '18cc51',
  overwrite: 'fc351c',
  save: '18cc51',
  remove: 'fc351c',
  discard: 'fc351c'
}

const localize = useLocalize('dialog.script_archive')

const entries = ScriptArchive.all()

const filter = ref('')

const filterOptions = computed<SelectOption[]>(() => [{ value: '', label: localize('types.all'), image: 'question' }, ...TYPES.map((type) => ({ value: type, label: localize(`types.${type}`), image: TYPE_ICONS[type] }))])

const visibleEntries = computed(() => (filter.value === '' ? entries : entries.filter((entry) => entry.type === filter.value)))

function getScriptName(name: string | null) {
  if (name) {
    return Scripts.findScript(name)?.name || name
  } else {
    return localize('unknown')
  }
}

function copyEntry(content: string) {
  void copyText(content)

  useToast({ title: localize('title'), message: localize('copy_toast') })
}

function clearArchive() {
  ScriptArchive.clear()

  emit('close')
}
</script>
