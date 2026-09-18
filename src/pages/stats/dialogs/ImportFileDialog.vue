<template>
  <SFDialog :title="localize('title')" size="sm">
    <div class="flex flex-col gap-4 text-center">
      <SFParagraph>{{ localize('prompt') }}</SFParagraph>
      <SFInput ref="key-ref" v-model="key" required :readonly="isSubmitting" :validator="validateKey" class="text-center" @keydown.enter="submit" />
    </div>

    <template #buttons>
      <SFButton block :disabled="isSubmitting" @click="emit('close', false)">
        {{ localize('cancel') }}
      </SFButton>
      <SFButton variant="primary" block :disabled="isSubmitting ? 'loading' : !isValid" @click="submit">
        {{ localize('ok') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import SFInput from '@library/SFInput.vue'
import SFParagraph from '@library/SFParagraph.vue'
import { useLocalize } from '@utils/localization'
import { useSubmit } from '@utils/utils'
import { useComponentValidation, validationError } from '@utils/validations'
import { DatabaseManager } from '~/data/database-manager'
import { SiteAPI } from '~/site/api'

defineOptions({
  name: 'ImportFileDialog'
})

const emit = defineEmits<{
  close: [imported: boolean]
}>()

const localize = useLocalize('stats.files.online')

const key = ref('')
const invalidKey = ref<string | null>(null)

const isValid = useComponentValidation(useTemplateRef('key-ref'))

watch(key, () => {
  invalidKey.value = null
})

const { submit, isSubmitting } = useSubmit(async () => {
  const value = key.value.trim()
  if (!value || !isValid.value) return

  let content: string | undefined

  try {
    const { file } = await SiteAPI.get<{ file: { content: string } }>('file_get', { key: value })

    content = file.content
  } catch {
    content = undefined
  }

  if (content) {
    await DatabaseManager.import((JSON.parse(content) as { data: unknown }).data)

    emit('close', true)
  } else {
    invalidKey.value = value
  }
})

function validateKey(value: string | null) {
  return invalidKey.value !== null && value === invalidKey.value ? validationError(localize('invalid')) : null
}
</script>
