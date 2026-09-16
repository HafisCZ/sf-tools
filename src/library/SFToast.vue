<template>
  <button type="button" class="flex w-full cursor-pointer items-start gap-3 rounded-md border border-line bg-surface p-3 text-left shadow-xl" @click="emit('close')">
    <SFIcon v-if="icon" :name="icon" class="mt-0.5" :class="TYPE_COLOR_CLASSES[props.type]" />
    <span class="flex flex-col gap-1">
      <span class="font-bold text-white">{{ props.title }}</span>
      <span class="text-white/75">{{ props.message }}</span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { type ToastType } from "@utils/components"
import { type IconName } from "@utils/icons"
import SFIcon from "./SFIcon.vue"

defineOptions({
  name: "SFToast"
})

const props = withDefaults(
  defineProps<{
    /**
     * Bold first line
     */
    title: string
    /**
     * Text under the title
     */
    message: string
    /**
     * Picks the icon and its colour, `default` has no icon
     */
    type?: ToastType
    /**
     * Replaces the icon the type would show
     */
    icon?: IconName
  }>(),
  {
    type: "default"
  }
)

const emit = defineEmits<{
  close: []
}>()

const TYPE_ICONS: Record<ToastType, IconName | undefined> = {
  default: undefined,
  success: "circle-check",
  warning: "triangle-exclamation",
  error: "circle-exclamation"
}

const TYPE_COLOR_CLASSES: Record<ToastType, string> = {
  default: "text-white",
  success: "text-green-500",
  warning: "text-amber-500",
  error: "text-red-500"
}

const icon = computed(() => props.icon ?? TYPE_ICONS[props.type])
</script>
