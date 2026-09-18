<template>
  <SFDialog :title="localize('title')" size="sm">
    <SFInput ref="timestamp-ref" v-model="timestamp" :label="localize('timestamp')" @keydown.enter="submit" />

    <template #buttons>
      <SFButton block :disabled="isSubmitting" @click="emit('close', false)">
        {{ localize('cancel') }}
      </SFButton>
      <SFButton variant="primary" block :disabled="isSubmitting ? 'loading' : !isValid" @click="submit">
        {{ localize('save') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import SFInput from '@library/SFInput.vue'
import { formatDate, parseDate } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { useSubmit } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import { DatabaseManager } from '~/data/database-manager'

defineOptions({
  name: 'FileEditDialog'
})

const props = defineProps<{
  /**
   * Timestamp of the file
   */
  timestamp: number
}>()

const emit = defineEmits<{
  close: [changed: boolean]
}>()

const localize = useLocalize('dialog.file_edit')

const timestamp = ref(formatDate(props.timestamp))

const isValid = useComponentValidation(useTemplateRef('timestamp-ref'))

const { submit, isSubmitting } = useSubmit(async () => {
  const minutes = Math.trunc(Number(parseDate(timestamp.value)) / 60000)

  if (minutes && minutes != Math.trunc(props.timestamp / 60000)) {
    await DatabaseManager.updateTimestamp(props.timestamp, minutes * 60000)

    emit('close', true)
  } else {
    emit('close', false)
  }
})
</script>
