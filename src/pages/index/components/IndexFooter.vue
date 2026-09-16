<template>
  <footer class="pointer-events-none fixed inset-x-0 bottom-0 flex items-end justify-between gap-4 p-3 text-[12.6px] text-white/70">
    <p class="w-1/3">
      <template v-if="BUILD_INFO">
        v{{ MAJOR_VERSION }}.{{ BUILD_INFO.version }}
        <br />
        Last updated on {{ formatDate(BUILD_INFO.timestamp) }} - {{ BUILD_INFO.message }}
      </template>
    </p>
    <div class="flex w-1/3 flex-col items-end gap-0.5 text-right">
      <button type="button" :class="LINK_CLASSES" @click="openFeedback">
        <SFIcon name="message" />
        {{ localize('footer.report') }}
      </button>
      <a href="https://home.sfgame.net" target="_blank" :class="LINK_CLASSES">
        <SFIcon name="basket-shopping" />
        <span v-html="localize('footer.webshop#')" />
      </a>
      <span class="flex items-center gap-1.5">
        <button type="button" :class="LINK_CLASSES" @click="emit('toggleCredits')">
          <SFIcon name="trophy" />
          {{ localize('toggle') }}
        </button>
        &bull;
        <a href="https://crowdin.com/project/sftools" target="_blank" :class="LINK_CLASSES">
          <SFIcon name="language" />
          {{ localize('footer.crowdin') }}
        </a>
      </span>
      <span class="flex items-center gap-1.5">
        <a href="https://beta.sftools.mar21.eu" target="_blank" :class="LINK_CLASSES">
          <SFIcon name="screwdriver-wrench" />
          {{ localize('footer.beta') }}
        </a>
        &bull;
        <a href="https://ko-fi.com/D1D02FFQR" target="_blank" :class="LINK_CLASSES">
          <SFIcon name="mug-saucer" />
          {{ localize('footer.kofi') }}
        </a>
      </span>
      <span class="flex items-center gap-1.5">
        <SFIcon name="copyright" />
        2019 - 2025 | mar21 |
        <SFIcon name="discord" />
        mar21 |
        <SFIcon name="envelope" />
        support@mar21.eu
      </span>
      <span v-html="localize('footer.notice#')" />
    </div>
  </footer>
</template>

<script setup lang="ts">
import SFIcon from '@library/SFIcon.vue'
import { useDialog } from '@utils/dialogs'
import { useLocalize } from '@utils/localization'
import FeedbackDialog from '~/dialogs/FeedbackDialog.vue'

defineOptions({
  name: 'IndexFooter'
})

const emit = defineEmits<{
  toggleCredits: []
}>()

const LINK_CLASSES = 'pointer-events-auto flex cursor-pointer items-center gap-1.5 text-accent hover:underline'

const MAJOR_VERSION = MODULE_VERSION_MAJOR

// Latest commit and build number, compiled in from git by vite.config.ts
const BUILD_INFO = __BUILD_INFO__

const localize = useLocalize('index')

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }).replace(' at', '')
}

function openFeedback() {
  useDialog(FeedbackDialog, {})
}
</script>
