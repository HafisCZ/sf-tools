<template>
  <FooterLink icon="message" @click="openFeedback">
    {{ localize('report') }}
  </FooterLink>
  <FooterLink icon="basket-shopping" href="https://home.sfgame.net">
    <span v-html="localize('webshop#')" />
  </FooterLink>
  <FooterCopyright />
</template>

<script setup lang="ts">
import { useDialog } from '@utils/dialogs'
import { useLocalize } from '@utils/localization'
import { type FeedbackTool } from '~/dialogs/feedback'
import FeedbackDialog from '~/dialogs/FeedbackDialog.vue'
import FooterCopyright from '~/pages/components/FooterCopyright.vue'
import FooterLink from '~/pages/components/FooterLink.vue'

defineOptions({
  name: 'PageFooterLinks'
})

const props = defineProps<{
  /**
   * Tool the feedback form opens with
   */
  tool: FeedbackTool
}>()

const localize = useLocalize('index.footer')

function openFeedback() {
  useDialog(FeedbackDialog, { tool: props.tool })
}
</script>
