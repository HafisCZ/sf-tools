<template>
  <SFDialog :title="localize('title')" size="sm">
    <!-- Text copied from TermsAndConditionsDialog in js/views/base.js -->
    <div class="flex flex-col gap-4">
      <section>
        <SFHeading level="6" type="accent" class="mb-2 text-center">§1 General use</SFHeading>
        <ul class="list-disc space-y-2 pl-5">
          <li>It is advised to never share HAR files as they <b>might</b> contain private data such as IP address and cookies.</li>
          <li>The site is distributed <b>AS IS</b> without any warranties. You are fully responsible for use of this site.</li>
          <li>You're free to share, copy and modify the site, but you are not allowed to distribute it or any of it's parts without explicit approval.</li>
          <li>You agree to limit data collection from the game to reasonable amounts.</li>
          <li>
            You agree to follow the Shakes & Fidget
            <a href="https://cdn.playa-games.com/res/sfgame3/legal/html/terms_en.html" target="_blank" class="text-accent underline">Terms and Conditions</a>
          </li>
          <li>You are not allowed to automate any part of this tool.</li>
        </ul>
      </section>
      <section>
        <SFHeading level="6" type="accent" class="mb-2 text-center">§2 Endpoint</SFHeading>
        <ul class="list-disc space-y-2 pl-5">
          <li>Endpoint is a Unity application bundled with the tool that allows you to log into the game and collect limited data about yourself, your guild members and your friends without the lengthy process of creating a HAR file.</li>
          <li>It is not possible to capture any other players than those listed above.</li>
          <li>Everything happens locally in a identical way to playing the game through browser.</li>
        </ul>
      </section>
      <section>
        <SFHeading level="6" type="accent" class="mb-2 text-center"> §3 File sharing and script publishing </SFHeading>
        <ul class="list-disc space-y-2 pl-5">
          <li>All data shared via the above functions is not protected in any other way other than the share key.</li>
          <li>Shared content might be deleted at any point of time, additionally shared files may be used only up to full 2 days.</li>
        </ul>
      </section>
      <section>
        <SFHeading level="6" type="accent" class="mb-2 text-center">§4 Sentry</SFHeading>
        <ul class="list-disc space-y-2 pl-5">
          <li>All errors raised during use of this tool will be reported to the developer via Sentry.io tool.</li>
          <li>These reports are anonymous so that it is not possible to track their origin.</li>
          <li>Please note that certain ad blockers might prevent Sentry from working.</li>
          <li>If you want to contribute to this project it is recommend keeping ad blockers disabled for this site.</li>
        </ul>
      </section>
    </div>

    <template #buttons>
      <SFButton variant="primary" block @click="accept">
        {{ localize("button.accept_full") }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import SFButton from "@library/SFButton.vue"
import SFDialog from "@library/SFDialog.vue"
import SFHeading from "@library/SFHeading.vue"
import { useLocalize } from "@utils/localization"

defineOptions({
  name: "TermsDialog"
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

const localize = useLocalize("terms")

function accept() {
  Site.options.terms_accepted = props.version

  emit("close")
}
</script>
