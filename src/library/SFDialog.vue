<template>
  <div class="fixed inset-0 flex items-center justify-center bg-black/85 p-4">
    <div ref="dialog-ref" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1" class="flex max-h-full w-full flex-col gap-5 rounded-lg border border-line bg-dialog p-5 text-white/90 shadow-xl outline-none" :class="SIZE_CLASSES[props.size]">
      <SFHeading :id="titleId" level="5">{{ props.title }}</SFHeading>
      <div class="max-h-[60vh] min-h-0 overflow-y-auto pr-2 leading-relaxed">
        <slot />
      </div>
      <div v-if="slots.buttons" class="flex gap-2">
        <slot name="buttons" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, useId, useTemplateRef } from "vue"
import SFHeading from "./SFHeading.vue"

defineOptions({
  name: "SFDialog"
})

const props = withDefaults(
  defineProps<{
    /**
     * Title shown at the top of the dialog, also its accessible name
     */
    title: string
    /**
     * Maximum width: sm 570px, md 760px, lg 950px
     */
    size?: "sm" | "md" | "lg"
  }>(),
  {
    size: "md"
  }
)

const slots = defineSlots<{
  default(): unknown
  buttons?(): unknown
}>()

const SIZE_CLASSES = {
  sm: "max-w-[570px]",
  md: "max-w-[760px]",
  lg: "max-w-[950px]"
}

const titleId = useId()

const dialogElement = useTemplateRef("dialog-ref")

// Move focus off the covered page so keyboard users start inside the dialog
onMounted(() => {
  dialogElement.value?.focus()
})
</script>
