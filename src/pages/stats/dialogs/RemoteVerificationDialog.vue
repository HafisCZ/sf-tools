<template>
  <SFDialog :title="localize('title')" size="sm">
    <SFParagraph class="text-center">
      <span class="rich-text" v-html="localize('message')" />
    </SFParagraph>

    <template #buttons>
      <SFButton block @click="emit('close', false)">
        {{ localize.global('dialog.confirm.cancel') }}
      </SFButton>
      <SFButton variant="primary" block @click="emit('close', true)">
        {{ localize.global('dialog.confirm.ok') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import SFParagraph from '@library/SFParagraph.vue'
import { useLocalize } from '@utils/localization'

defineOptions({
  name: 'RemoteVerificationDialog'
})

const emit = defineEmits<{
  close: [accepted: boolean]
}>()

const localize = useLocalize('dialog.remote_script_verification')
</script>
