<template>
  <div class="grid grid-cols-16 gap-x-[28px]">
    <section class="col-span-6 flex flex-col gap-4 self-start rounded-md bg-surface p-[1em]" :aria-labelledby="titleId">
      <SFHeading :id="titleId" level="5" class="text-center">{{ localize('title') }}</SFHeading>
      <div class="flex flex-col gap-2">
        <SFCheckbox v-model="alwaysPrevious" :label="localize('always_prev')" />
        <SFCheckbox v-model="stickyHeader" :label="localize('table_sticky_header')" />
        <SFCheckbox v-model="skipGrid" :label="localize('skip_grid_if_single_entry_present')" />
        <SFCheckbox v-model="unsafeDelete" :label="localize('unsafe_delete')" />
        <SFCheckbox v-model="termsAccepted" :label="localize('terms')" />
      </div>
      <SFSelect v-model="defaultTab" :label="localize('tab')" :options="tabOptions" />
      <SFSelect v-model="backupFrequency" :label="localize('backup_reminder_frequency')" :options="backupOptions" />
      <SFInput v-model="loadRows" :label="localize('preload')" @change="saveLoadRows" />
      <SFInput v-model="scriptAuthor" :label="localize('script_author')" @change="saveScriptAuthor" />
      <div class="flex flex-col gap-1.5">
        <span class="font-bold text-white">{{ localize('links.title') }}</span>
        <div class="flex gap-1">
          <SFButton variant="outline" block @click="resetLinks">
            <SFIcon name="link-slash" />
            {{ localize('links.reset') }}
          </SFButton>
          <SFButton variant="outline" block @click="importLinks">
            <SFIcon name="file-import" />
            {{ localize('links.import') }}
          </SFButton>
          <SFButton variant="outline" block @click="exportLinks">
            <SFIcon name="file-export" />
            {{ localize('links.export') }}
          </SFButton>
        </div>
      </div>
      <hr class="border-line" />
      <SFHeading level="5" class="text-center">{{ localize('recovery.title') }}</SFHeading>
      <SFParagraph>
        <span class="rich-text" v-html="localize('recovery.description#')" />
      </SFParagraph>
      <div class="flex gap-1">
        <SFButton variant="outline" block :disabled="isExporting && 'loading'" @click="exportRecovery">
          <SFIcon name="download" />
          {{ localize('recovery.export') }}
        </SFButton>
        <SFButton variant="primary" block @click="importRecovery">
          <SFIcon name="upload" />
          {{ localize('recovery.import') }}
        </SFButton>
      </div>
    </section>
    <section class="col-span-10 flex flex-col gap-2 self-start rounded-md bg-surface p-[1em]" :aria-labelledby="actionsTitleId">
      <div class="grid grid-cols-16 items-center">
        <SFHeading :id="actionsTitleId" level="5" class="col-span-6 col-start-6 text-center">{{ localize('actions.title') }}</SFHeading>
        <div class="col-span-5 flex justify-end gap-1">
          <SFTooltip :content="localize('actions.discard')">
            <SFButton variant="outline" icon :aria-label="localize('actions.discard')" :disabled="!changed" @click="discard">
              <SFIcon name="rotate-left" />
            </SFButton>
          </SFTooltip>
          <SFTooltip :content="localize('actions.save')">
            <SFButton variant="outline" icon :aria-label="localize('actions.save')" :disabled="!changed" @click="save">
              <SFIcon name="floppy-disk" />
            </SFButton>
          </SFTooltip>
        </div>
      </div>
      <div class="h-[30em]">
        <SFExpressionTextarea v-model="content" :highlight="highlight" :suggestions="suggestions" :fields="[FIELD_L, FIELD_R]" :brackets="Expression.TERMINATORS" comment="#" indent line-numbers drop-files replace-tabs save-shortcuts :aria-label="localize('actions.title')" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFCheckbox from '@library/SFCheckbox.vue'
import SFExpressionTextarea from '@library/SFExpressionTextarea.vue'
import SFHeading from '@library/SFHeading.vue'
import SFIcon from '@library/SFIcon.vue'
import SFInput from '@library/SFInput.vue'
import SFParagraph from '@library/SFParagraph.vue'
import SFSelect from '@library/SFSelect.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { type SelectOption } from '@utils/components'
import { useDialog, useFilePicker, useSimpleDialog } from '@utils/dialogs'
import { useLoader } from '@utils/loader'
import { useLocalize } from '@utils/localization'
import { useToast } from '@utils/toasts'
import { useSubmit } from '@utils/utils'
import { DatabaseManager } from '~/data/database-manager'
import { createDump, recoverDump, type RecoveryDump } from '~/data/recovery'
import TermsDialog from '~/pages/dialogs/TermsDialog.vue'
import RecoveryImportDialog from '~/pages/stats/dialogs/RecoveryImportDialog.vue'
import { createScriptSuggestions, highlightScript } from '~/pages/stats/stats'
import { Actions } from '~/script/actions'
import { ScriptType } from '~/script/commands'
import { Expression } from '~/script/expression'
import { FIELD_L, FIELD_R } from '~/script/fields'
import { Exporter } from '~/site/exporter'
import { Site } from '~/site/site'

defineOptions({
  name: 'SettingsView'
})

defineExpose({
  show
})

const TERMS_VERSION = 2

const TABS = ['players_grid', 'groups_grid', 'players', 'scripts', 'files']

const localize = useLocalize('stats.settings')

const loader = useLoader()

const titleId = useId()
const actionsTitleId = useId()

const alwaysPrevious = ref(Site.options.always_prev)
const stickyHeader = ref(Site.options.table_sticky_header)
const skipGrid = ref(Site.options.skip_grid_if_single_entry_present)
const unsafeDelete = ref(Site.options.unsafe_delete)
const termsAccepted = ref(Boolean(Site.options.terms_accepted))
const defaultTab = ref(Site.options.tab)
const backupFrequency = ref(String(Site.options.backup_reminder_frequency))
const loadRows = ref(String(Site.options.load_rows))
const scriptAuthor = ref(Site.options.script_author)

const content = ref('')
const savedContent = ref('')

const suggestions = createScriptSuggestions(ScriptType.Action)
const highlight = highlightScript(ScriptType.Action)

const changed = computed(() => content.value !== savedContent.value)

const tabOptions = computed<SelectOption[]>(() => TABS.map((value) => ({ value, label: localize.global(`stats.topbar.${value}`) })))

const backupOptions = computed<SelectOption[]>(() => ['0', '1', '2'].map((value) => ({ value, label: localize(`backup_reminder_frequency_values.${value}`) })))

const { submit: exportRecovery, isSubmitting: isExporting } = useSubmit(async () => {
  Exporter.json(await createDump(), `recovery_dump_${Exporter.time}`)
})

watch(alwaysPrevious, (value) => {
  Site.options.always_prev = value
})

watch(stickyHeader, (value) => {
  Site.options.table_sticky_header = value
})

watch(skipGrid, (value) => {
  Site.options.skip_grid_if_single_entry_present = value
})

watch(unsafeDelete, (value) => {
  Site.options.unsafe_delete = value
})

watch(termsAccepted, (value) => {
  // The terms dialog saves its version number, which must not be replaced with true
  if (Boolean(Site.options.terms_accepted) !== value) {
    Site.options.terms_accepted = value
  }

  if (!value) {
    useDialog(TermsDialog, { version: TERMS_VERSION }, { callback: () => (termsAccepted.value = true) })
  }
})

watch(defaultTab, (value) => {
  Site.options.tab = value
})

watch(backupFrequency, (value) => {
  Site.options.backup_reminder_frequency = parseInt(value)
})

function show() {
  content.value = savedContent.value = Actions.getScript()
}

function saveLoadRows() {
  const value = parseInt(loadRows.value)

  Site.options.load_rows = isNaN(value) ? Site.options.default('load_rows') : Math.max(1, value)
}

function saveScriptAuthor() {
  Site.options.script_author = scriptAuthor.value.trim()
}

function save() {
  Actions.setScript(content.value)

  void DatabaseManager.refreshTrackers()

  savedContent.value = content.value
}

function discard() {
  content.value = savedContent.value = Actions.getScript()
}

function resetLinks() {
  useSimpleDialog(
    { title: localize('links.reset_title'), message: '' },
    {
      onAccept: async () => {
        await DatabaseManager.resetLinks()
      }
    }
  )
}

function importLinks() {
  useFilePicker({
    accept: '.links.json',
    callback: (files) => {
      useSimpleDialog(
        { title: localize('links.import_title'), message: '' },
        {
          onAccept: async () => {
            await DatabaseManager.importLinks(JSON.parse(await files[0].text()) as Record<string, string[]>)
          }
        }
      )
    }
  })
}

function exportLinks() {
  Exporter.json(DatabaseManager.exportLinks(), `${Exporter.time}.links`)
}

function importRecovery() {
  useFilePicker({
    accept: '.json',
    callback: (files) => {
      useDialog(
        RecoveryImportDialog,
        {},
        {
          callback: (accepted) => {
            if (accepted) void recover(files[0])
          }
        }
      )
    }
  })
}

async function recover(file: File) {
  loader.start()

  useToast({ title: localize('recovery.title'), message: localize('recovery.toast') })

  await recoverDump(JSON.parse(await file.text()) as RecoveryDump)

  window.location.reload()
}
</script>
