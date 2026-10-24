<template>
  <div class="fixed inset-0 flex items-center justify-center bg-black/85 p-4">
    <div ref="dialog-ref" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1" class="flex max-h-full w-full flex-col gap-5 rounded-lg border border-line bg-dialog p-5 text-white/90 shadow-xl outline-none" :class="SIZE_CLASSES[props.size]">
      <div class="flex items-center gap-3">
        <SFHeading :id="titleId" level="5" class="flex-1">{{ props.title }}</SFHeading>
        <SFButton v-if="props.closeViaButton" variant="ghost" icon class="-my-2 -mr-2" :aria-label="localize('close')" @click="emit('close')">
          <SFIcon name="xmark" />
        </SFButton>
      </div>
      <div class="min-h-0 overflow-y-auto pr-2 leading-relaxed" :class="{ 'flex flex-col': props.column }" :style="{ maxHeight: props.height, gap: props.gap }">
        <slot />
      </div>
      <div v-if="slots.buttons" class="flex gap-2">
        <slot name="buttons" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, useId, useTemplateRef } from 'vue'
import { useLocalize } from '@utils/localization'
import SFButton from './SFButton.vue'
import SFHeading from './SFHeading.vue'
import SFIcon from './SFIcon.vue'

defineOptions({
  name: 'SFDialog'
})

const props = withDefaults(
  defineProps<{
    /**
     * Title shown at the top of the dialog, also its accessible name
     */
    title: string
    /**
     * Maximum width: sm 570px, md 760px, lg 950px, xl 1250px
     */
    size?: 'sm' | 'md' | 'lg' | 'xl'
    /**
     * Maximum height of the content as a CSS length
     */
    height?: string
    /**
     * Lays the content out as a flex column, for content that keeps a part of itself in place and scrolls the rest
     */
    column?: boolean
    /**
     * Space between the content children as a CSS length, only takes effect together with column
     */
    gap?: string
    /**
     * Shows an X button in the top right corner that emits close
     */
    closeViaButton?: boolean
  }>(),
  {
    size: 'md',
    height: '60vh',
    column: false,
    gap: '1rem',
    closeViaButton: false
  }
)

const emit = defineEmits<{
  close: []
}>()

const slots = defineSlots<{
  default(): unknown
  buttons?(): unknown
}>()

const SIZE_CLASSES = {
  sm: 'max-w-[570px]',
  md: 'max-w-[760px]',
  lg: 'max-w-[950px]',
  xl: 'max-w-[1250px]'
}

const localize = useLocalize('dialog.shared')

const titleId = useId()

const dialogElement = useTemplateRef('dialog-ref')

onMounted(() => {
  dialogElement.value?.focus()
})
</script>
