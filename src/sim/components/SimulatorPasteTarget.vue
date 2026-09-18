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

const props = defineProps<{
  /**
   * Also takes data from a file dropped anywhere on the page
   */
  useDragDrop?: boolean
}>()

const emit = defineEmits<{
  paste: [value: unknown]
}>()

const localize = useLocalize('simulator')

onMounted(() => {
  document.body.addEventListener('paste', handlePaste)

  if (props.useDragDrop) {
    document.body.addEventListener('dragover', handleDragOver)
    document.body.addEventListener('dragenter', handleDragOver)
    document.body.addEventListener('drop', handleDrop)
  }
})

onBeforeUnmount(() => {
  document.body.removeEventListener('paste', handlePaste)
  document.body.removeEventListener('dragover', handleDragOver)
  document.body.removeEventListener('dragenter', handleDragOver)
  document.body.removeEventListener('drop', handleDrop)
})

function handlePaste(event: ClipboardEvent) {
  if (event.target instanceof HTMLInputElement && event.target.type === 'text') return

  try {
    emit('paste', JSON.parse(event.clipboardData?.getData('text') ?? ''))
  } catch (e) {
    console.info(e)
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
}

// A file without a type is a response saved from the game
async function handleDrop(event: DragEvent) {
  const file = event.dataTransfer?.files[0]

  if (!file || (file.type !== 'text/plain' && file.type !== '')) return

  event.preventDefault()
  event.stopPropagation()

  try {
    const data = JSON.parse(await file.text())

    emit('paste', file.type === 'text/plain' ? data : PlayaResponse.importData(data).players)
  } catch (e) {
    console.info(e)
  }
}
</script>
