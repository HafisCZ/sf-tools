<template>
  <SFDialog :title="localize('title')" size="sm">
    <SFParagraph class="text-center">
      <span class="rich-text" v-html="localize('message')" />
    </SFParagraph>

    <template #buttons>
      <SFButton block :disabled="isSubmitting" @click="emit('close')">
        {{ localize('close') }}
      </SFButton>
      <SFButton variant="primary" block :disabled="isSubmitting && 'loading'" @click="submit">
        {{ localize('save') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import SFParagraph from '@library/SFParagraph.vue'
import { useLocalize } from '@utils/localization'
import { useSubmit } from '@utils/utils'
import { Exporter } from '~/core/exporter'
import { createDump } from '~/data/recovery'

defineOptions({
  name: 'BackupReminderDialog'
})

const emit = defineEmits<{
  close: []
}>()

const localize = useLocalize('dialog.backup_reminder')

const { submit, isSubmitting } = useSubmit(async () => {
  Exporter.json(await createDump(), `recovery_dump_${Exporter.time}`)

  emit('close')
})
</script>
