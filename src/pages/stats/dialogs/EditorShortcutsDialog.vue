<template>
  <SFDialog :title="localize('title')" size="sm">
    <div class="flex h-[50vh] flex-col gap-4">
      <div v-for="shortcut in SHORTCUTS" :key="shortcut">
        <div class="font-bold">{{ localize(`shortcuts.${shortcut}.key`) }}</div>
        <div class="text-[gray]" v-html="`&bullet; ${localize(`shortcuts.${shortcut}.description`).replaceAll('>', '>&bullet; ')}`" />
      </div>
    </div>

    <template #buttons>
      <SFButton block @click="emit('close')">
        {{ localize.global('dialog.shared.close') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import { useLocalize } from '@utils/localization'

defineOptions({
  name: 'EditorShortcutsDialog'
})

const emit = defineEmits<{
  close: []
}>()

const SHORTCUTS = ['ctrl_space', 'ctrl_s', 'ctrl_shift_s', 'tab', 'shift_tab', 'ctrl_shift_x', 'ctrl_c', 'ctrl_v', 'ctrl_x']

const localize = useLocalize('dialog.editor_shortcuts')
</script>
