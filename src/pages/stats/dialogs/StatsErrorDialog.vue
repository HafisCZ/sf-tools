<template>
  <SFDialog :title="localize('title')" size="sm">
    <div class="flex flex-col gap-4 text-center">
      <SFHeading level="5">
        <span class="rich-text" v-html="localize.global('database.fatal_error#')" />
      </SFHeading>
      <SFParagraph>{{ props.message }}</SFParagraph>
      <SFParagraph class="font-bold">
        <span class="rich-text" v-html="localize('notice#')" />
      </SFParagraph>
    </div>

    <template #buttons>
      <SFButton block @click="refresh">
        {{ localize('refresh') }}
      </SFButton>
      <SFButton block @click="revert">
        {{ localize('revert') }}
      </SFButton>
      <SFButton block @click="openTemporary">
        {{ localize('temporary') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import SFHeading from '@library/SFHeading.vue'
import SFParagraph from '@library/SFParagraph.vue'
import { useLocalize } from '@utils/localization'
import { ProfileManager } from '~/core/profiles'

defineOptions({
  name: 'StatsErrorDialog'
})

const props = defineProps<{
  /**
   * Message of the error
   */
  message: string
}>()

const localize = useLocalize('dialog.error')

function refresh() {
  window.location.reload()
}

function revert() {
  ProfileManager.setActiveProfile('default')

  window.location.reload()
}

function openTemporary() {
  window.location.href = '/stats.html?temp'
}
</script>
