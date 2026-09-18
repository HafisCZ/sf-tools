<template>
  <SFExpressionEditor ref="editor-ref" v-model="modelValue" v-bind="props" @save="(leave) => emit('save', leave)" />
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { type ExpressionEditorProps } from '@utils/components'
import SFExpressionEditor from './SFExpressionEditor.vue'

defineOptions({
  name: 'SFExpressionInput'
})

const props = withDefaults(defineProps<ExpressionEditorProps>(), {
  suggestions: () => []
})

const emit = defineEmits<{
  /**
   * Ctrl+S or Ctrl+Shift+S was pressed, `leave` is true for Ctrl+Shift+S
   */
  save: [leave: boolean]
}>()

const modelValue = defineModel<string>({ required: true })

defineExpose({
  focus: () => editor.value?.focus(),
  get isValid() {
    return editor.value?.isValid ?? true
  }
})

const editor = useTemplateRef('editor-ref')
</script>
