<template>
  <SFDialog :title="localize('title')" size="sm">
    <SFParagraph class="text-center">
      <span class="rich-text" v-html="message" />
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
import { computed } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import SFParagraph from '@library/SFParagraph.vue'
import { useLocalize } from '@utils/localization'

defineOptions({
  name: 'DeleteScriptDialog'
})

const props = defineProps<{
  /**
   * Adds the warning about losing edit access to the published script
   */
  remote: boolean
  /**
   * Names of the players, guilds and tables the script is assigned to
   */
  assignments: string[]
}>()

const emit = defineEmits<{
  close: [accepted: boolean]
}>()

const localize = useLocalize('dialog.delete_script')

const message = computed(() => localize('notice') + (props.remote ? localize('notice_bonus_remote') : '') + (props.assignments.length > 0 ? localize('notice_bonus_used', { tables: props.assignments.join(', ') }) : ''))
</script>
