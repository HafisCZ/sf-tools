<template>
  <div class="-mb-16 grid h-[calc(100vh-50px-3em)] grid-cols-[335px_auto_200px] gap-[2em] overflow-y-hidden">
    <div class="flex min-h-0 flex-col gap-4">
      <div class="flex flex-col gap-1.5">
        <label :for="targetId" class="font-bold text-white">{{ localize('target') }}</label>
        <div class="flex gap-2">
          <div :id="targetId" class="min-w-0 flex-1">
            <SFSelect v-model="targetModel" :options="targetOptions" search :readonly="!!returnTo && targetExplicit" />
          </div>
          <SFTooltip v-if="!script || !target || !Scripts.isAssignedTo(target, script.key)" :content="localize('sidebar.assign')">
            <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('sidebar.assign')" :disabled="!script || !target" @click="assign">
              <SFIcon name="link" />
            </SFButton>
          </SFTooltip>
          <SFTooltip v-else :content="localize('sidebar.unassign')">
            <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('sidebar.unassign')" @click="unassign">
              <SFIcon name="link-slash" />
            </SFButton>
          </SFTooltip>
        </div>
      </div>
      <div class="flex flex-col gap-1.5">
        <span class="font-bold text-white">{{ localize('script') }}</span>
        <div class="flex h-[180px] flex-col justify-between gap-4 rounded-[0.25em] border border-[#3a3a3a] bg-page p-4">
          <div v-if="!script" class="flex-1" />
          <div v-else class="flex h-full min-h-0 flex-col justify-between">
            <div class="min-w-0">
              <div class="truncate font-bold" :title="script.name">{{ script.name }}</div>
              <div class="mt-2 line-clamp-2 whitespace-pre text-[gray]" :title="script.description || ''">{{ script.description || '' }}</div>
            </div>
            <div class="flex justify-between text-[gray]">
              <span class="flex items-center gap-1">
                <SFIcon name="desktop" />
                v{{ script.version }} - {{ formatDate(script.updated_at) }}
              </span>
              <span v-if="script.remote" class="flex items-center gap-1">
                <SFTooltip :content="localize(script.remote.verified ? 'tooltip.remote_verified' : 'tooltip.remote')">
                  <span class="relative">
                    <SFIcon name="satellite-dish" />
                    <SFIcon v-if="script.remote.verified" name="check" class="absolute -right-1 -bottom-1 text-[0.6em] text-[#21ba45]" />
                  </span>
                </SFTooltip>
                <SFTooltip :content="localize('tooltip.remote_copy')">
                  <button type="button" class="cursor-pointer font-mono leading-[14px] select-none" @click="copyRemoteKey(script.remote.key)">{{ script.remote.key }}</button>
                </SFTooltip>
              </span>
            </div>
          </div>
          <div class="flex w-full gap-2">
            <SFTooltip :content="localize('sidebar.save')">
              <SFButton variant="outline" icon class="min-h-9.5 flex-1" :aria-label="localize('sidebar.save')" :disabled="!changed" @click="saveScript($event.ctrlKey)">
                <SFIcon :name="ctrlDown && returnTo ? 'reply' : 'floppy-disk'" />
              </SFButton>
            </SFTooltip>
            <SFTooltip :content="localize('sidebar.edit')">
              <SFButton variant="outline" icon class="min-h-9.5 flex-1" :aria-label="localize('sidebar.edit')" :disabled="!script" @click="editScript">
                <SFIcon name="pencil" />
              </SFButton>
            </SFTooltip>
            <SFTooltip v-if="!script?.remote" :content="localize('sidebar.remote_add')">
              <SFButton variant="outline" icon class="min-h-9.5 flex-1" :aria-label="localize('sidebar.remote_add')" :disabled="isPublishing ? 'loading' : !script" @click="publish">
                <SFIcon name="satellite-dish" />
              </SFButton>
            </SFTooltip>
            <SFDropdown v-else :items="remoteItems" :label="localize('sidebar.remote_add')" variant="outline" float="right" class="flex-1 [&>button]:flex-1">
              <span class="relative">
                <SFIcon name="satellite-dish" />
                <SFIcon v-if="script.remote.version !== script.version" name="exclamation" class="absolute -top-1 -right-1.5 text-[0.7em] text-accent" />
              </span>
            </SFDropdown>
            <SFTooltip :content="localize('sidebar.remove')">
              <SFButton variant="outline" icon class="ml-4 min-h-9.5 flex-1" :aria-label="localize('sidebar.remove')" :disabled="!script" @click="confirmRemove">
                <SFIcon name="trash" />
              </SFButton>
            </SFTooltip>
          </div>
        </div>
      </div>
      <SFInput v-model="listSearch" :label="localize('list')" :placeholder="localize('list_search')" />
      <div class="flex h-full min-h-0 flex-col gap-4 overflow-y-scroll pr-2">
        <button type="button" class="flex cursor-pointer items-center gap-2 rounded-[0.25em] border border-dashed border-[#3a3a3a] bg-page p-4 text-[gray] outline-none hover:bg-surface focus-visible:bg-surface" @click="addScript">
          <SFIcon name="plus" class="text-xl" />
          {{ localize('list_add') }}
        </button>
        <ScriptListItem v-for="item in visibleScripts" :key="item.key" :script="item" :selected="script?.key === item.key" :assigned="!!target && Scripts.isAssignedTo(target, item.key)" @select="selectScript(item.key)" @pin="togglePin(item.key)" />
      </div>
    </div>
    <div class="h-full min-h-0">
      <SFExpressionTextarea ref="editor-ref" v-model="content" :highlight="highlight" :suggestions="suggestions" :fields="[FIELD_L, FIELD_R]" :brackets="Expression.TERMINATORS" comment="#" indent line-numbers status-bar use-drag-and-drop replace-tabs use-save :aria-label="localize('script')" @save="saveScript" />
    </div>
    <div class="flex flex-col gap-2">
      <SFButton v-if="returnTo" variant="outline" block @click="returnBack">
        <SFIcon name="reply" />
        {{ localize('sidebar.close') }}
      </SFButton>
      <SFButton variant="outline" block :disabled="!script || !changed" @click="resetScript">
        <SFIcon name="recycle" />
        {{ localize('sidebar.reset') }}
      </SFButton>
      <SFHeading level="5" class="mt-2">{{ localize('sidebar.header.help') }}</SFHeading>
      <SFButton variant="outline" block @click="useDialog(ScriptManualDialog, {})">
        <SFIcon name="lightbulb" />
        {{ localize('sidebar.manual') }}
      </SFButton>
      <SFButton variant="outline" block @click="openWiki">
        <SFIcon name="book" />
        {{ localize('sidebar.wiki') }}
      </SFButton>
      <SFButton variant="outline" block @click="useDialog(EditorShortcutsDialog, {})">
        <SFIcon name="keyboard" />
        {{ localize('sidebar.shortcuts') }}
      </SFButton>
      <SFHeading level="5" class="mt-2">{{ localize('sidebar.header.library') }}</SFHeading>
      <SFButton variant="outline" block @click="openRepository">
        <SFIcon name="bars-staggered" />
        {{ localize('sidebar.scripts') }}
      </SFButton>
      <SFButton variant="outline" block :disabled="archiveEmpty" @click="openArchive($event.ctrlKey)">
        <SFIcon :name="canRecover ? 'box-open' : 'box-archive'" />
        {{ canRecover ? localize('sidebar.recover', { version: (script?.version ?? 1) - 1 }) : localize('sidebar.archive') }}
      </SFButton>
      <SFHeading level="5" class="mt-2">{{ localize('sidebar.header.actions') }}</SFHeading>
      <SFButton variant="outline" block @click="copyText(content)">
        <SFIcon name="copy" />
        {{ localize('sidebar.copy') }}
      </SFButton>
      <SFButton variant="outline" block @click="importScript">
        <SFIcon name="file" />
        {{ localize('sidebar.import') }}
      </SFButton>
      <SFButton variant="outline" block @click="Exporter.txt(content, `script_${Exporter.time}`)">
        <SFIcon name="download" />
        {{ localize('sidebar.export') }}
      </SFButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDropdown from '@library/SFDropdown.vue'
import SFExpressionTextarea from '@library/SFExpressionTextarea.vue'
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import SFInput from '@library/SFInput.vue'
import SFSelect from '@library/SFSelect.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { type DropdownItem, type SelectOption } from '@utils/components'
import { useDialog, useFilePicker, useSimpleDialog } from '@utils/dialogs'
import { formatDate } from '@utils/formatting'
import { useLoader } from '@utils/loader'
import { useLocalize } from '@utils/localization'
import { useToast } from '@utils/toasts'
import { copyText, getErrorMessage, useSubmit } from '@utils/utils'
import { SiteAPI } from '~/core/api'
import { Exporter } from '~/core/exporter'
import { Site } from '~/core/site'
import { StoreCache } from '~/core/store'
import { DatabaseManager } from '~/data/database-manager'
import ScriptListItem from '~/pages/stats/components/ScriptListItem.vue'
import DeleteScriptDialog from '~/pages/stats/dialogs/DeleteScriptDialog.vue'
import EditorShortcutsDialog from '~/pages/stats/dialogs/EditorShortcutsDialog.vue'
import RemoteVerificationDialog from '~/pages/stats/dialogs/RemoteVerificationDialog.vue'
import ScriptArchiveDialog from '~/pages/stats/dialogs/ScriptArchiveDialog.vue'
import ScriptEditDialog from '~/pages/stats/dialogs/ScriptEditDialog.vue'
import ScriptManualDialog from '~/pages/stats/dialogs/ScriptManualDialog.vue'
import ScriptRepositoryDialog from '~/pages/stats/dialogs/ScriptRepositoryDialog.vue'
import { createScriptSuggestions, highlightScript, TABLE_VIEWS, useStatsNavigation, type ScriptEditResult, type StatsShowParams } from '~/pages/stats/stats'
import { ScriptArchive } from '~/script/archive'
import { ScriptType } from '~/script/commands'
import { DefaultScripts } from '~/script/default-scripts'
import { Expression } from '~/script/expression'
import { FIELD_L, FIELD_R } from '~/script/fields'
import { Scripts, type ApiScript, type StoredScript } from '~/script/scripts'

defineOptions({
  name: 'ScriptsView'
})

defineExpose({
  show,
  hide
})

const localize = useLocalize('stats.scripts')

const navigation = useStatsNavigation()

const loader = useLoader()

const targetId = useId()

const editor = useTemplateRef('editor-ref')

const script = shallowRef<StoredScript | null>(null)
const target = ref<string | undefined>(undefined)
const targetExplicit = ref(false)
const returnTo = shallowRef<(() => void) | null>(null)
const content = ref('')
const listSearch = ref('')
const ctrlDown = ref(false)
const revision = ref(0)
const targetOptions = ref<SelectOption[]>([])

const suggestions = createScriptSuggestions(ScriptType.Table)
const highlight = highlightScript(ScriptType.Table)

const targetModel = computed({
  get: () => target.value || '',
  set: (value) => show({ identifier: value, origin: { view: 'scripts' } })
})

const changed = computed(() => {
  void revision.value

  return script.value ? content.value !== script.value.content : content.value !== ''
})

const visibleScripts = computed(() => {
  void revision.value

  const search = listSearch.value.toLowerCase()

  return Scripts.sortedList().filter((item) => item.name.toLowerCase().startsWith(search))
})

const archiveEmpty = computed(() => {
  void revision.value

  return ScriptArchive.empty()
})

const canRecover = computed(() => ctrlDown.value && hasArchivedPreviousVersion())

const remoteItems = computed((): DropdownItem[] => {
  void revision.value

  const remote = script.value?.remote

  return [
    { label: localize('sidebar.remote_update'), image: 'cloud-arrow-up', disabled: remote?.version === script.value?.version, action: () => void updateRemote() },
    { type: 'divider' },
    remote?.visibility === 'public' ? { label: localize('sidebar.remote_mark_private'), image: 'eye-slash', action: () => void setRemoteVisibility('private') } : { label: localize('sidebar.remote_mark_public'), image: 'globe', action: requestPublic },
    { label: localize('sidebar.remote_refresh'), image: 'rotate', action: () => void refreshRemote() },
    { type: 'divider' },
    { label: localize('sidebar.remote_remove'), image: 'cloud-arrow-down', action: confirmUnpublish }
  ]
})

const { submit: publish, isSubmitting: isPublishing } = useSubmit(
  async () => {
    if (!verifyRemoteRequirements()) return

    const current = script.value as StoredScript
    const { key, name, version, description, content: scriptContent } = current

    const { script: remote } = await SiteAPI.post<{ script: ApiScript }>('script_create', { name, description, version, author: Site.options.script_author, content: scriptContent })

    applyRemote(key, remote, true)
  },
  (error) => ({ title: localize('remote_action_error'), message: getErrorMessage(error) })
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('keyup', handleKeyup)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('keyup', handleKeyup)
})

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Control' && !ctrlDown.value) {
    ctrlDown.value = true
  } else if (event.key === 'Escape' && navigation.current === 'scripts' && returnTo.value && !document.querySelector('[data-content-container]')) {
    hide()

    returnTo.value()
  }
}

function handleKeyup(event: KeyboardEvent) {
  if (event.key === 'Control' && ctrlDown.value) {
    ctrlDown.value = false
  }
}

function updateSidebars() {
  revision.value++
}

function setEditorContent(value: string) {
  content.value = value

  void nextTick(() => editor.value?.focus())
}

function getDefaultScript(identifier: string) {
  if (identifier === 'player' || identifier === 'players' || identifier === 'group' || identifier === 'groups') {
    return identifier
  } else if (DatabaseManager.isPlayer(identifier)) {
    return 'player'
  } else {
    return 'group'
  }
}

function setScript(key: string) {
  script.value = Scripts.findScript(key) ?? null

  setEditorContent(script.value?.content || '')
}

function show(params: StatsShowParams) {
  const origin = params.origin

  if (origin && TABLE_VIEWS.includes(origin.view)) {
    returnTo.value = () => navigation.returnTo(origin.view)
  } else if (origin !== undefined) {
    returnTo.value = null
  }

  script.value = null

  if (params.key !== undefined) {
    setScript(params.key)
  } else {
    targetExplicit.value = params.identifier !== undefined
    target.value = params.identifier || origin?.identifier

    if (target.value && params.blank !== true) {
      const assigned = Scripts.findAssignedScript(target.value) || Scripts.findAssignedScript(getDefaultScript(target.value))

      if (assigned) {
        setScript(assigned.key)
      } else {
        setEditorContent(DefaultScripts.getContent(getDefaultScript(target.value)))
      }
    } else {
      setEditorContent('')
    }
  }

  listSearch.value = ''

  updateSidebars()
  updateTarget()
}

function hide() {
  if (script.value) {
    if (script.value.content !== content.value) {
      ScriptArchive.add('discard', script.value.key, script.value.version, content.value)
    }
  } else {
    ScriptArchive.add('discard', null, 1, content.value)
  }
}

function getTargetName(identifier: string) {
  return DatabaseManager.GroupNames[identifier] ?? DatabaseManager.PlayerNames[identifier] ?? identifier
}

function createTargetOption(identifier: string): SelectOption {
  return { value: identifier, label: getTargetName(identifier), image: DatabaseManager.isPlayer(identifier) ? 'user' : 'box-archive' }
}

function updateTarget() {
  const options: SelectOption[] = [
    { value: '', label: localize('targets.none'), image: 'globe' },
    { type: 'header', label: localize('targets_category.default') },
    { value: 'players', label: localize.global('stats.topbar.players'), image: 'database' },
    { value: 'groups', label: localize.global('stats.topbar.groups'), image: 'database' },
    { value: 'player', label: localize.global('stats.topbar.players_grid'), image: 'user' },
    { value: 'group', label: localize.global('stats.topbar.groups_grid'), image: 'box-archive' },
    { type: 'header', label: localize('targets_category.existing') }
  ]

  if (target.value && !Scripts.RESERVED_SCRIPT_IDENTIFIERS.includes(target.value)) {
    options.push(createTargetOption(target.value))
  }

  const assignments = Scripts.getAssigns(true).filter((identifier) => !Scripts.RESERVED_SCRIPT_IDENTIFIERS.includes(identifier))

  options.push(...assignments.map(createTargetOption).sort((a, b) => ('label' in a && 'label' in b ? a.label.localeCompare(b.label) : 0)))

  targetOptions.value = options
}

function hasArchivedPreviousVersion() {
  void revision.value

  return Boolean(script.value && script.value.version > 1 && ScriptArchive.find('overwrite', script.value.key, script.value.version - 1))
}

function returnBack() {
  returnTo.value?.()
}

function resetScript() {
  hide()

  show({ key: script.value?.key })
}

function selectScript(key: string) {
  hide()
  setScript(key)
  updateSidebars()
}

function togglePin(key: string) {
  const item = Scripts.findScript(key) as StoredScript

  Scripts.update(key, { favorite: !item.favorite }, false)

  updateSidebars()
}

function save() {
  script.value = Scripts.update((script.value as StoredScript).key, { content: content.value })

  updateSidebars()
}

function saveScript(allowReturn: boolean) {
  if (!changed.value) return

  if (script.value) {
    save()

    if (allowReturn && returnTo.value) {
      returnTo.value()
    }
  } else {
    useDialog(
      ScriptEditDialog,
      { script: { content: content.value }, contentLock: '_current' },
      {
        callback: (result?: ScriptEditResult) => {
          if (result) {
            script.value = Scripts.create({ ...result.script, content: result.script.content ?? '' })

            if (target.value) {
              Scripts.assign(target.value, script.value.key)
            }

            updateSidebars()

            if (allowReturn && returnTo.value) {
              returnTo.value()
            }
          }
        }
      }
    )
  }
}

function addScript() {
  useDialog(
    ScriptEditDialog,
    { script: { content: content.value }, contentLock: null },
    {
      callback: (result?: ScriptEditResult) => {
        if (result) {
          if (result.source !== '_current') {
            hide()
          }

          const { key } = Scripts.create({ ...result.script, content: result.script.content ?? '' })

          if (target.value) {
            Scripts.assign(target.value, key)
          }

          setScript(key)
          updateSidebars()
        }
      }
    }
  )
}

function editScript() {
  const current = script.value
  if (!current) return

  useDialog(
    ScriptEditDialog,
    { script: current, contentLock: null },
    {
      callback: (result?: ScriptEditResult) => {
        if (result) {
          script.value = Scripts.update(current.key, { name: result.script.name, description: result.script.description, tables: result.script.tables })

          updateSidebars()
        }
      }
    }
  )
}

function remove() {
  const current = script.value as StoredScript

  Scripts.remove(current.key)

  if (target.value && Scripts.isAssignedTo(target.value, current.key)) {
    Scripts.unassign(target.value)

    if (returnTo.value) {
      returnTo.value()
    } else {
      show({ identifier: target.value, blank: true })
    }
  } else {
    show({ identifier: target.value, blank: true })
  }
}

function confirmRemove() {
  const current = script.value
  if (!current) return

  const assignments = Scripts.getAssigns(current.key).map((identifier) => {
    if (DatabaseManager.isPlayer(identifier)) {
      return DatabaseManager.PlayerNames[identifier] ?? identifier
    } else if (DatabaseManager.isGroup(identifier)) {
      return DatabaseManager.GroupNames[identifier] ?? identifier
    } else {
      return identifier
    }
  })

  useDialog(
    DeleteScriptDialog,
    { remote: !!current.remote, assignments },
    {
      callback: (accepted) => {
        if (accepted) remove()
      }
    }
  )
}

function assign() {
  if (target.value && script.value) {
    Scripts.assign(target.value, script.value.key)

    updateSidebars()
  }
}

function unassign() {
  if (target.value) {
    Scripts.unassign(target.value)

    updateSidebars()
  }
}

function openWiki() {
  window.open('https://github.com/HafisCZ/sf-tools/wiki', '_blank')
}

function openRepository() {
  useDialog(
    ScriptRepositoryDialog,
    {},
    {
      callback: (remoteScript) => {
        if (remoteScript) {
          useDialog(
            ScriptEditDialog,
            { script: remoteScript, contentLock: '_current' },
            {
              callback: (result?: ScriptEditResult) => {
                if (result) {
                  const { key } = Scripts.create({ ...result.script, content: result.script.content ?? '' })

                  hide()
                  setScript(key)
                  updateSidebars()
                }
              }
            }
          )
        }
      }
    }
  )
}

function openArchive(ctrlKey: boolean) {
  const current = script.value

  if (ctrlKey && current && hasArchivedPreviousVersion()) {
    setEditorContent(ScriptArchive.find('overwrite', current.key, current.version - 1)?.content ?? '')

    updateSidebars()
  } else {
    useDialog(
      ScriptArchiveDialog,
      {},
      {
        callback: (archived) => {
          if (archived !== undefined) {
            setEditorContent(archived)
          }
        }
      }
    )
  }
}

function importScript() {
  useFilePicker({
    accept: 'text/plain',
    multiple: true,
    callback: (files) => {
      void files[0].text().then((text) => setEditorContent(text))
    }
  })
}

function copyRemoteKey(key: string) {
  void copyText(key)

  useToast({ title: localize('remote_copy_toast.title'), message: localize('remote_copy_toast.message') })
}

function verifyRemoteRequirements() {
  if (Site.options.script_author) {
    return true
  } else {
    useToast({ title: localize('remote_author_missing.title'), message: localize('remote_author_missing.message'), type: 'warning' })

    return false
  }
}

function applyRemote(key: string, remote: ApiScript | null, register: boolean) {
  script.value = Scripts.markRemote(key, remote)

  StoreCache.invalidate('remote_scripts')

  if (register && remote) {
    Scripts.remoteAdd(remote.key, { version: remote.version, updated_at: Date.parse(remote.updated_at) })
  }

  updateSidebars()
}

async function runRemoteAction(action: (current: StoredScript) => Promise<void>) {
  loader.start()

  try {
    await action(script.value as StoredScript)
  } catch (error) {
    useToast({ title: localize('remote_action_error'), message: getErrorMessage(error), type: 'error' })
  } finally {
    loader.stop()
  }
}

async function updateRemote() {
  if (!verifyRemoteRequirements()) return

  await runRemoteAction(async (current) => {
    const { key, name, version, description, content: scriptContent, remote } = current
    const { script: updated } = await SiteAPI.post<{ script: ApiScript }>('script_update', { name, description, version, author: Site.options.script_author, content: scriptContent, key: remote?.key, secret: remote?.secret })

    applyRemote(key, updated, true)
  })
}

async function refreshRemote() {
  await runRemoteAction(async ({ key, remote }) => {
    const { script: refreshed } = await SiteAPI.get<{ script: ApiScript }>('script_info', { key: remote?.key ?? '', secret: remote?.secret ?? '' })

    applyRemote(key, refreshed, false)
  })
}

async function setRemoteVisibility(visibility: 'public' | 'private') {
  await runRemoteAction(async ({ key, remote }) => {
    const { script: updated } = await SiteAPI.post<{ script: ApiScript }>('script_update', { key: remote?.key, secret: remote?.secret, visibility })

    applyRemote(key, updated, false)
  })
}

function requestPublic() {
  if (script.value?.remote?.verified) {
    void setRemoteVisibility('public')
  } else {
    useDialog(
      RemoteVerificationDialog,
      {},
      {
        callback: (accepted) => {
          if (accepted) void setRemoteVisibility('public')
        }
      }
    )
  }
}

function confirmUnpublish() {
  useSimpleDialog(
    { title: localize.global('dialog.delete_remote_script.title'), message: localize.global('dialog.delete_remote_script.message') },
    {
      callback: (accepted) => {
        if (accepted) {
          void runRemoteAction(async ({ key, remote }) => {
            await SiteAPI.get('script_delete', { key: remote?.key ?? '', secret: remote?.secret ?? '' })

            applyRemote(key, null, false)

            Scripts.remoteRemove(remote?.key ?? '')
          })
        }
      }
    }
  )
}
</script>
