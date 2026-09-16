<template>
  <SFDialog :title="props.title" size="sm">
    <SFParagraph class="text-center">{{ props.message }}</SFParagraph>

    <template #buttons>
      <SFButton block :disabled="isSubmitting && (accepted || 'loading')" @click="submit(false)">
        {{ localize('cancel') }}
      </SFButton>
      <SFButton variant="primary" block :disabled="isSubmitting && (!accepted || 'loading')" @click="submit(true)">
        {{ localize('ok') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useLocalize } from '@utils/localization'
import { useSubmit } from '@utils/utils'
import SFButton from './SFButton.vue'
import SFDialog from './SFDialog.vue'
import SFParagraph from './SFParagraph.vue'

defineOptions({
  name: 'SFSimpleDialog'
})

const props = defineProps<{
  /**
   * Title of the dialog, usually the question
   */
  title: string
  /**
   * Text under the title
   */
  message: string
  /**
   * Work to do with the user's choice before the dialog closes. The pressed button shows a spinner until it finishes, and the dialog stays open with an error toast when it throws.
   */
  action?: (accepted: boolean) => void | Promise<void>
}>()

const emit = defineEmits<{
  close: [accepted: boolean]
}>()

const localize = useLocalize('dialog.confirm')

// Which button was pressed, so only that one shows the spinner
const accepted = ref(false)

const { submit, isSubmitting } = useSubmit(async (value: boolean) => {
  accepted.value = value

  await props.action?.(value)

  emit('close', value)
})
</script>
