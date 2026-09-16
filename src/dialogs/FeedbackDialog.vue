<template>
  <SFDialog :title="localize('title')" size="sm">
    <div class="flex flex-col gap-4">
      <SFSelect v-model="tool" :label="localize('field.tool')" :options="toolOptions" />
      <SFSelect v-model="type" :label="localize('field.type')" :options="typeOptions" />
      <SFInput v-model="email" :label="localize('field.email')" :placeholder="localize('field.email')" type="email" maxlength="50" />
      <SFTextarea v-model="description" :label="localize('field.description')" :placeholder="localize('field.description')" rows="7" maxlength="1000" />
    </div>

    <template #buttons>
      <SFButton block :disabled="isSubmitting" @click="emit('close')">
        {{ localize.global("dialog.shared.cancel") }}
      </SFButton>
      <SFButton variant="primary" block :disabled="isSubmitting ? 'loading' : !isValid" @click="submit">
        {{ localize.global("dialog.shared.submit") }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import SFButton from "@library/SFButton.vue"
import SFDialog from "@library/SFDialog.vue"
import SFInput from "@library/SFInput.vue"
import SFSelect from "@library/SFSelect.vue"
import SFTextarea from "@library/SFTextarea.vue"
import { type SelectOption } from "@utils/components"
import { useLocalize } from "@utils/localization"
import { useSuccessToast } from "@utils/toasts"
import { useSubmit } from "@utils/utils"

defineOptions({
  name: "FeedbackDialog"
})

const props = withDefaults(
  defineProps<{
    /**
     * Tool the feedback is about when the dialog opens, `general` for none
     */
    tool?: string
  }>(),
  {
    tool: "general"
  }
)

const emit = defineEmits<{
  close: []
}>()

// Same tools as ReportDialog in js/views/base.js
const TOOLS = ["analyzer", "attributes", "blacksmith", "calendar", "dungeons", "fortress", "guilds", "hellevator", "hydra", "idle", "inventory", "pets", "simulator", "stats", "underworld"]

const localize = useLocalize("dialog.report")

const tool = ref(props.tool)
const type = ref("issue")
const email = ref("")
const description = ref("")

const toolOptions = computed<SelectOption[]>(() => [{ value: "general", label: "-" }, ...TOOLS.map((value) => ({ value, label: localize.global(`index.${value}.title`) }))])

const typeOptions = computed<SelectOption[]>(() => ["issue", "suggestion"].map((value) => ({ value, label: localize(`type.${value}`) })))

// Email is optional
const isValid = computed(() => tool.value !== "" && type.value !== "" && description.value !== "")

const { submit, isSubmitting } = useSubmit(
  async () => {
    await SiteAPI.post("feedback", {
      tool: tool.value,
      type: type.value,
      email: email.value,
      description: description.value
    })

    emit("close")

    useSuccessToast(localize("toast.success.title"), localize("toast.success.message"))
  },
  () => ({ title: localize("toast.error.title"), message: localize("toast.error.message") })
)
</script>
