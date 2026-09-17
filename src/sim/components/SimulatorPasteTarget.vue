<template>
  <div class="pointer-events-none absolute top-[5em] right-[2em] hidden size-[8.5em] flex-col justify-center border-[3px] border-dashed border-[#a9d1ce] p-[0.5em] text-center text-[#5f827f] min-[993px]:flex">
    <span v-html="localize('paste_target#')" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useLocalize } from '@utils/localization'

defineOptions({
  name: 'SimulatorPasteTarget'
})

const emit = defineEmits<{
  paste: [value: unknown]
}>()

const localize = useLocalize('simulator')

onMounted(() => {
  document.body.addEventListener('paste', handlePaste)
})

onBeforeUnmount(() => {
  document.body.removeEventListener('paste', handlePaste)
})

// Pastes into text fields are left to the fields
function handlePaste(event: ClipboardEvent) {
  if (event.target instanceof HTMLInputElement && event.target.type === 'text') return

  try {
    emit('paste', JSON.parse(event.clipboardData?.getData('text') ?? ''))
  } catch (e) {
    console.info(e)
  }
}
</script>
