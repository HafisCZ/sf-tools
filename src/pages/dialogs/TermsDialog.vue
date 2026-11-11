<template>
  <SFDialog :title="localize('title')" size="sm" width="420px">
    <div class="flex flex-col gap-4">
      <SFParagraph>SFTools is a free fan site, not affiliated with Playa Games. It is provided as is.</SFParagraph>
      <SFParagraph>
        By using it you accept the
        <a href="terms.html" target="_blank" class="text-accent underline">Terms and Conditions</a>.<br />What data leaves your browser is described in <a href="privacy.html" target="_blank" class="text-accent underline">Privacy</a>.
      </SFParagraph>
    </div>

    <template #buttons>
      <SFButton variant="primary" block @click="accept">
        {{ localize('button.accept_full') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import SFParagraph from '@library/SFParagraph.vue'
import { useLocalize } from '@utils/localization'
import { Site } from '~/core/site'

defineOptions({
  name: 'TermsDialog'
})

const props = defineProps<{
  /**
   * Version of the terms, saved as accepted when the user accepts them
   */
  version: number
}>()

const emit = defineEmits<{
  close: []
}>()

const localize = useLocalize('terms')

function accept() {
  Site.options.terms_accepted = props.version

  emit('close')
}
</script>
