<template>
  <SFDialog :title="localize('title')" size="sm">
    <PlayerEditor ref="editor-ref" name-hidden class-hidden />

    <template #buttons>
      <SFButton block @click="emit('close')">
        {{ localize('close') }}
      </SFButton>
      <SFButton variant="primary" block :disabled="!isValid" @click="insert">
        {{ localize('insert') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import { useLocalize } from '@utils/localization'
import { useComponentValidation } from '@utils/validations'
import PlayerEditor from '../components/PlayerEditor.vue'

defineOptions({
  name: 'SimulatorPresetDialog'
})

const emit = defineEmits<{
  close: [player?: PlayerModel]
}>()

const localize = useLocalize('dialog.simulator_custom_preset')

const editor = useTemplateRef('editor-ref')

const isValid = useComponentValidation(editor)

function insert() {
  emit('close', editor.value?.read())
}
</script>
