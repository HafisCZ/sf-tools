<template>
  <SFDialog :title="localize('title')" size="sm">
    <SFParagraph class="text-center">{{ localize('notice') }}</SFParagraph>

    <template #buttons>
      <SFButton block @click="emit('close', false)">
        {{ localize.global('dialog.confirm.cancel') }}
      </SFButton>
      <SFButton variant="primary" block :disabled="countdown > 0" @click="emit('close', true)">
        {{ countdown > 0 ? localize.global('dialog.confirm.wait_n_seconds').replace('%1', String(countdown)) : localize.global('dialog.confirm.ok') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import SFParagraph from '@library/SFParagraph.vue'
import { useLocalize } from '@utils/localization'

defineOptions({
  name: 'DeleteAllDialog'
})

const emit = defineEmits<{
  close: [accepted: boolean]
}>()

const localize = useLocalize('dialog.delete_all')

const countdown = ref(2)

const timer = setInterval(() => {
  if (--countdown.value <= 0) {
    clearInterval(timer)
  }
}, 1000)

onBeforeUnmount(() => {
  clearInterval(timer)
})
</script>
