<template>
  <SFDialog :title="localize('title')" size="sm">
    <div v-if="code === null" class="flex flex-col gap-4">
      <SFSelect v-if="fileOptions.length > 0" ref="file-ref" v-model="fileKey" :label="localize('file')" :options="fileOptions" />
      <SFSelect ref="format-ref" v-model="format" :label="localize('format')" :options="formatOptions" />
      <SFCheckbox ref="public-ref" v-model="publicOnly" :label="localize('public')" class="mt-2" />
    </div>
    <div v-else class="flex flex-col gap-6">
      <div class="flex flex-col gap-2">
        <SFHeading level="5">{{ localize('code') }}:</SFHeading>
        <code class="text-center whitespace-pre">{{ code }}</code>
      </div>
      <SFParagraph type="muted">{{ localize('expire') }}</SFParagraph>
    </div>

    <template #buttons>
      <SFButton block :disabled="isSubmitting" @click="emit('close', false)">
        {{ localize.global('dialog.shared.cancel') }}
      </SFButton>
      <SFButton variant="primary" block :disabled="isSubmitting ? 'loading' : !isValid" @click="submit">
        {{ code === null ? localize('get') : localize.global('dialog.shared.ok') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFCheckbox from '@library/SFCheckbox.vue'
import SFDialog from '@library/SFDialog.vue'
import SFHeading from '@library/SFHeading.vue'
import SFParagraph from '@library/SFParagraph.vue'
import SFSelect from '@library/SFSelect.vue'
import { type SelectOption } from '@utils/components'
import { useLocalize } from '@utils/localization'
import { useSubmit } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import { ModelUtils } from '~/data/model-utils'
import { type RawFile } from '~/data/types'
import { SiteAPI } from '~/site/api'
import { Exporter } from '~/site/exporter'
import { Site } from '~/site/site'

defineOptions({
  name: 'ExportFileDialog'
})

type FileGetter = () => RawFile | Promise<RawFile>

const props = defineProps<{
  /**
   * Creates the exported file, or several named ones to pick from
   */
  files: FileGetter | Record<string, FileGetter>
  /**
   * Start of the downloaded file name
   */
  filesPrefix?: string
}>()

const emit = defineEmits<{
  close: [exported: boolean]
}>()

const FORMATS = ['json', 'code', 'code_reusable']

const localize = useLocalize('stats.share')

const fileKeys = typeof props.files === 'function' ? [] : Object.keys(props.files)

const fileKey = ref(fileKeys[0] ?? '')
const format = ref('json')
const publicOnly = ref(Site.options.export_public_only)
const code = ref<string | null>(null)

const isValid = useComponentValidation(useTemplateRef('file-ref'), useTemplateRef('format-ref'), useTemplateRef('public-ref'))

const fileOptions = computed<SelectOption[]>(() => fileKeys.map((value) => ({ value, label: localize(`files.${value}`) })))

const formatOptions = computed<SelectOption[]>(() => FORMATS.map((value) => ({ value, label: localize(`formats.${value}`) })))

const { submit, isSubmitting } = useSubmit(async () => {
  if (format.value === 'json') {
    Exporter.json(await createFile(), `${props.filesPrefix || 'export'}_${Exporter.time}`)

    emit('close', true)
  } else if (code.value !== null) {
    emit('close', false)
  } else {
    const { file } = await SiteAPI.post<{ file: { key?: string } }>('file_create', {
      content: JSON.stringify({ data: await createFile() }),
      multiple: format.value === 'code_reusable'
    })

    if (file.key) {
      code.value = file.key
    }
  }
})

async function createFile() {
  const getter = typeof props.files === 'function' ? props.files : props.files[fileKey.value]
  const file = await getter()

  if (publicOnly.value) {
    for (const [index, group] of file.groups.entries()) {
      if (group.own) {
        file.groups[index] = ModelUtils.toOtherGroup(group)
      }
    }

    for (const [index, player] of file.players.entries()) {
      if (player.own) {
        file.players[index] = ModelUtils.toOtherPlayer(player)
      }
    }
  }

  return file
}
</script>
