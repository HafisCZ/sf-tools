<template>
  <PageFooter>
    <SFParagraph v-if="BUILD_INFO">
      v{{ MAJOR_VERSION }}.{{ BUILD_INFO.version }}
      <br />
      Last updated on {{ formatDate(BUILD_INFO.timestamp) }} - {{ BUILD_INFO.message }}
    </SFParagraph>

    <template #links>
      <span class="flex items-center gap-1.5">
        <FooterLink icon="trophy" @click="emit('toggleCredits')">
          {{ localize('toggle') }}
        </FooterLink>
        &bull;
        <FooterLink icon="message" @click="openFeedback">
          {{ localize('footer.report') }}
        </FooterLink>
      </span>
      <FooterLink icon="basket-shopping" href="https://home.sfgame.net">
        <span v-html="localize('footer.webshop#')" />
      </FooterLink>
      <span class="flex items-center gap-1.5">
        <FooterLink icon="language" href="https://crowdin.com/project/sftools">
          {{ localize('footer.crowdin') }}
        </FooterLink>
        &bull;
        <FooterLink icon="screwdriver-wrench" href="https://beta.sftools.mar21.eu">
          {{ localize('footer.beta') }}
        </FooterLink>
      </span>
      <FooterCopyright />
      <span v-html="localize('footer.notice#')" />
    </template>
  </PageFooter>
</template>

<script setup lang="ts">
import SFParagraph from '@library/SFParagraph.vue'
import { useDialog } from '@utils/dialogs'
import { useLocalize } from '@utils/localization'
import { MODULE_VERSION_MAJOR } from '~/core/site'
import FeedbackDialog from '~/dialogs/FeedbackDialog.vue'
import FooterCopyright from '~/pages/components/FooterCopyright.vue'
import FooterLink from '~/pages/components/FooterLink.vue'
import PageFooter from '~/pages/components/PageFooter.vue'

defineOptions({
  name: 'IndexFooter'
})

const emit = defineEmits<{
  toggleCredits: []
}>()

const MAJOR_VERSION = MODULE_VERSION_MAJOR

const BUILD_INFO = __BUILD_INFO__

const localize = useLocalize('index')

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }).replace(' at', '')
}

function openFeedback() {
  useDialog(FeedbackDialog, {})
}
</script>
