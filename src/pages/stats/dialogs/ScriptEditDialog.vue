<template>
  <SFDialog :title="localize(creating ? 'title.create' : 'title.edit')" size="sm">
    <div class="flex flex-col gap-4">
      <div ref="name-container-ref">
        <SFInput ref="name-ref" v-model="name" :label="localize('name')" required @keydown.enter="save" />
      </div>
      <SFTextarea ref="description-ref" v-model="description" :label="localize('description')" rows="3" />
      <div class="flex flex-col gap-1.5">
        <span class="font-bold text-white">{{ localize('tables') }}</span>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="table in TABLES"
            :key="table.name"
            type="button"
            class="flex cursor-pointer items-center gap-2 rounded-[0.25em] border border-[#3a3a3a] p-3 pl-4 text-left outline-none hover:bg-page focus-visible:bg-page"
            :class="{ 'opacity-50': !tables.includes(table.name) }"
            :aria-pressed="tables.includes(table.name)"
            @click="toggleTable(table.name)"
          >
            <SFIcon :name="tables.includes(table.name) ? table.icon : 'xmark'" />
            {{ localize.global(table.label) }}
          </button>
        </div>
      </div>
      <div v-if="creating" :class="{ 'pointer-events-none opacity-45': props.contentLock }">
        <SFSelect ref="source-ref" v-model="source" :label="localize('source')" :options="sourceOptions" search />
      </div>
    </div>

    <template #buttons>
      <SFButton block @click="emit('close')">
        {{ localize.global('dialog.shared.cancel') }}
      </SFButton>
      <SFButton variant="primary" block :disabled="!isValid" @click="save">
        {{ localize.global('dialog.shared.save') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import SFIcon from '@library/SFIcon.vue'
import SFInput from '@library/SFInput.vue'
import SFSelect from '@library/SFSelect.vue'
import SFTextarea from '@library/SFTextarea.vue'
import { type SelectOption } from '@utils/components'
import { formatDate } from '@utils/formatting'
import { type IconName } from '@utils/icons'
import { useLocalize } from '@utils/localization'
import { useComponentValidation } from '@utils/validations'
import { type ScriptEditResult } from '~/pages/stats/stats'
import { DefaultScripts } from '~/script/default-scripts'
import { Scripts, type StoredScript } from '~/script/scripts'

defineOptions({
  name: 'ScriptEditDialog'
})

const props = defineProps<{
  /**
   * Edited script, a new script is created when it has no key
   */
  script: Partial<StoredScript>
  /**
   * Source of the new script's content, also stops it from being changed
   */
  contentLock?: string | null
}>()

const emit = defineEmits<{
  close: [result?: ScriptEditResult]
}>()

const TABLES: { name: string; icon: IconName; label: string }[] = [
  { name: 'players', icon: 'database', label: 'stats.topbar.players' },
  { name: 'groups', icon: 'database', label: 'stats.topbar.groups' },
  { name: 'player', icon: 'user', label: 'stats.topbar.players_grid' },
  { name: 'group', icon: 'box-archive', label: 'stats.topbar.groups_grid' }
]

const localize = useLocalize('dialog.script_edit')

const creating = props.script.key === undefined

const name = ref(creating ? (props.script.name ?? `New script ${formatDate(Date.now())}`) : (props.script.name ?? ''))
const description = ref(props.script.description ?? '')
const tables = ref(props.script.tables || ['players', 'player', 'group'])
const source = ref(props.contentLock || '_current')

const nameContainer = useTemplateRef('name-container-ref')

const isValid = useComponentValidation(useTemplateRef('name-ref'), useTemplateRef('description-ref'), useTemplateRef('source-ref'))

const sourceOptions = computed<SelectOption[]>(() => [
  { value: '_empty', label: localize('content.empty'), image: 'minus' },
  { value: '_current', label: localize('content.current'), image: 'minus' },
  { type: 'header', label: localize('category.defaults') },
  { value: '_players', label: localize.global('stats.topbar.players'), image: 'database' },
  { value: '_groups', label: localize.global('stats.topbar.groups'), image: 'database' },
  { value: '_player', label: localize.global('stats.topbar.players_grid'), image: 'user' },
  { value: '_group', label: localize.global('stats.topbar.groups_grid'), image: 'box-archive' },
  { type: 'header', label: localize('category.clone') },
  ...Scripts.sortedList().map((script) => ({ value: script.key, label: script.name, image: 'box-archive' as const }))
])

onMounted(() => {
  if (creating) {
    setTimeout(() => nameContainer.value?.querySelector('input')?.focus(), 100)
  }
})

function toggleTable(table: string) {
  if (tables.value.includes(table)) {
    tables.value = tables.value.filter((value) => value !== table)
  } else if (table === 'groups') {
    tables.value = ['groups']
  } else {
    tables.value = [...tables.value.filter((value) => value !== 'groups'), table]
  }
}

function getContentFromSource(value: string) {
  switch (value) {
    case '_empty':
      return ''
    case '_current':
      return props.script.content ?? ''
    case '_players':
      return DefaultScripts.getContent('players')
    case '_groups':
      return DefaultScripts.getContent('groups')
    case '_player':
      return DefaultScripts.getContent('player')
    case '_group':
      return DefaultScripts.getContent('group')
    default:
      return Scripts.getContent(value)
  }
}

function save() {
  if (!isValid.value) return

  const script = {
    name: name.value.trim(),
    description: description.value.trim(),
    tables: [...tables.value]
  }

  if (creating) {
    emit('close', { script: { ...script, content: getContentFromSource(source.value) }, source: source.value })
  } else {
    emit('close', { script, source: null })
  }
}
</script>
