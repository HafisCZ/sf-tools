<template>
  <SFDialog :title="localize('title')" size="lg">
    <div class="flex h-[60vh] flex-col gap-4">
      <div :class="{ 'pointer-events-none opacity-45': adding }" class="shrink-0">
        <SFInput ref="search-ref" v-model="search" :placeholder="localize('search')" :aria-label="localize('search')" />
      </div>
      <div v-if="adding" class="flex min-h-0 flex-1 flex-col items-center justify-center">
        <div class="flex w-1/2 flex-col gap-4">
          <div ref="key-container-ref">
            <SFInput ref="key-ref" v-model="addKey" :label="localize('list_add_key')" required maxlength="12" class="text-center" @keydown.enter="submitAdd" />
          </div>
          <SFCheckbox ref="create-ref" v-model="addCreate" :label="localize('list_add_create')" />
          <div class="flex gap-2">
            <SFButton block :disabled="isAdding" @click="adding = false">
              {{ localize.global('dialog.shared.cancel') }}
            </SFButton>
            <SFButton variant="primary" block :disabled="isAdding ? 'loading' : !isAddValid" @click="submitAdd">
              {{ localize('list_add_accept') }}
            </SFButton>
          </div>
        </div>
      </div>
      <div v-else-if="scripts === null" class="flex min-h-0 flex-1 items-center justify-center opacity-50">
        <img src="/res/favicon.png" alt="" class="w-[100px] animate-spin" />
      </div>
      <div v-else class="flex min-h-0 flex-col gap-2 overflow-y-auto pr-2">
        <button v-if="!search" type="button" class="flex min-h-[80px] cursor-pointer items-center justify-center gap-2 rounded-[0.25em] border border-dashed border-[#3a3a3a] p-4 text-[gray] outline-none hover:bg-page focus-visible:bg-page" @click="showAdd">
          <SFIcon name="plus" class="text-2xl opacity-45" />
          {{ localize('list_add') }}
        </button>
        <div v-for="script in visibleScripts" :key="script.identifier" class="grid grid-cols-[58%_20%_15%_5%] items-center gap-2 rounded-[0.25em] border border-[#3a3a3a] hover:bg-page">
          <button type="button" class="col-span-2 grid cursor-pointer grid-cols-subgrid items-center p-4 pr-0 text-left outline-none focus-visible:bg-page" :disabled="isSelecting" @click="selectScript(script.identifier)">
            <span class="flex flex-col gap-2">
              <span class="flex items-center gap-2">
                <SFTooltip :content="localize(`list.${getVisibility(script)}`)">
                  <SFIcon :name="VISIBILITY_ICONS[getVisibility(script)]" />
                </SFTooltip>
                {{ script.name }}
              </span>
              <span class="text-[gray]">{{ localize(script.uses === undefined ? 'list.about' : 'list.about_with_uses', { author: script.author, uses: script.uses }) }}</span>
              <span class="whitespace-pre text-[gray]">{{ script.description || localize('list.no_description') }}</span>
            </span>
            <span class="flex flex-col gap-2 text-center" :class="{ invisible: !script.key }">
              <span>
                v{{ script.version }}
                <span v-if="isNewer(script)" class="text-accent">{{ localize('list.new') }}</span>
              </span>
              <span class="text-[gray]">{{ script.updated_at ? formatDate(Date.parse(script.updated_at)) : '' }}</span>
            </span>
          </button>
          <div :class="{ invisible: !script.key }">
            <input type="text" readonly :value="script.key" :aria-label="localize('list_add_key')" class="w-32 rounded-md border border-line bg-surface px-3 py-1.5 text-center font-mono text-white/90 outline-none" />
          </div>
          <div :class="{ invisible: !Scripts.remoteGet(script.key ?? '') }">
            <SFTooltip :content="localize('list.remove')">
              <SFButton variant="outline" size="sm" icon class="text-accent" :aria-label="localize('list.remove')" @click="removeRemote(script.key ?? '')">
                <SFIcon name="xmark" />
              </SFButton>
            </SFTooltip>
          </div>
        </div>
      </div>
    </div>

    <template #buttons>
      <SFButton block @click="emit('close')">
        {{ localize.global('dialog.shared.close') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFCheckbox from '@library/SFCheckbox.vue'
import SFDialog from '@library/SFDialog.vue'
import SFIcon from '@library/SFIcon.vue'
import SFInput from '@library/SFInput.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { formatDate } from '@utils/formatting'
import { type IconName } from '@utils/icons'
import { useLocalize } from '@utils/localization'
import { useErrorToast } from '@utils/toasts'
import { sortDescending, useSubmit } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import { DefaultScripts } from '~/script/default-scripts'
import { Scripts, type StoredScript } from '~/script/scripts'
import { SiteAPI } from '~/site/api'
import { StoreCache } from '~/site/store'

defineOptions({
  name: 'ScriptRepositoryDialog'
})

const emit = defineEmits<{
  close: [script?: Pick<StoredScript, 'name' | 'description' | 'content'>]
}>()

type RepositoryScript = {
  identifier: string
  key?: string
  name: string
  description?: string
  author?: string
  version?: number
  updated_at?: string
  uses?: number
  visibility?: string
}

type RemoteScript = Omit<RepositoryScript, 'identifier'> & {
  key: string
  content: string
}

const VISIBILITY_ICONS: Record<string, IconName> = {
  private: 'eye-slash',
  default: 'box-archive',
  public: 'globe'
}

const localize = useLocalize('dialog.script_repository')

const search = ref('')
const scripts = shallowRef<RepositoryScript[] | null>(null)

const adding = ref(false)
const addKey = ref('')
const addCreate = ref(true)

const keyContainer = useTemplateRef('key-container-ref')

const isAddValid = useComponentValidation(useTemplateRef('key-ref'), useTemplateRef('create-ref'))

const visibleScripts = computed(() => {
  const value = search.value.toLowerCase()

  return (scripts.value ?? []).filter((script) => script.name.toLowerCase().includes(value))
})

const { submit: submitAdd, isSubmitting: isAdding } = useSubmit(
  async () => {
    if (!isAddValid.value) return

    const key = addKey.value
    const { script } = await SiteAPI.get<{ script: RemoteScript }>('script_info', { key })

    StoreCache.invalidate('remote_scripts')

    Scripts.remoteAdd(script.key, { version: script.version ?? 1, updated_at: Date.parse(script.updated_at ?? '') })

    if (addCreate.value) {
      const { script: remoteScript } = await SiteAPI.get<{ script: RemoteScript }>('script_get', { key })

      emit('close', toStoredScript(remoteScript))
    } else {
      adding.value = false

      void loadScripts()
    }
  },
  () => ({ title: localize('error_fetch.title'), message: localize('error_fetch.message') })
)

const { submit: selectScript, isSubmitting: isSelecting } = useSubmit(
  async (identifier: string) => {
    if (DefaultScripts.exists(identifier)) {
      const { name, content } = DefaultScripts.get(identifier)

      emit('close', { name: name ?? '', description: '', content })
    } else {
      const { script } = await SiteAPI.get<{ script: RemoteScript }>('script_get', { key: identifier })

      emit('close', toStoredScript(script))
    }
  },
  () => ({ title: localize('error_fetch.title'), message: localize('error_fetch.message') })
)

function toStoredScript({ name, description, content }: RemoteScript) {
  return { name, description: description ?? '', content }
}

onMounted(() => {
  void loadScripts()
})

async function loadScripts() {
  scripts.value = null

  const list: RepositoryScript[] = []

  try {
    const remoteScripts = await StoreCache.use('remote_scripts', () => SiteAPI.get<{ scripts: RemoteScript[] }>('script_list', { include: Scripts.remoteList() }).then(({ scripts }) => scripts), StoreCache.hours(1))

    for (const script of sortDescending([...remoteScripts], ({ updated_at }) => (updated_at ? Date.parse(updated_at) : 0))) {
      list.push({ ...script, identifier: script.key })
    }
  } catch {
    useErrorToast(localize('error_fetch.title'), localize('error_fetch.message'))
  }

  for (const [type, script] of DefaultScripts.entries()) {
    if (script.author) {
      list.push({ identifier: type, name: script.name ?? '', author: script.author })
    }
  }

  scripts.value = list
}

function getVisibility(script: RepositoryScript) {
  const key = script.key ?? script.identifier

  if (Scripts.remoteGet(key) && script.visibility === 'private') {
    return 'private'
  } else if (DefaultScripts.exists(key)) {
    return 'default'
  } else {
    return 'public'
  }
}

function isNewer(script: RepositoryScript) {
  const saved = Scripts.remoteGet(script.key ?? '')

  return saved !== undefined && script.version !== undefined && saved.version < script.version
}

function showAdd() {
  adding.value = true
  addKey.value = ''
  addCreate.value = true

  void nextTick(() => keyContainer.value?.querySelector('input')?.focus())
}

function removeRemote(key: string) {
  Scripts.remoteRemove(key)

  StoreCache.invalidate('remote_scripts')

  scripts.value = (scripts.value ?? []).filter((script) => script.key !== key)
}
</script>
