<template>
  <SFDialog :title="`${localize('release')} ${VERSION}`" size="sm">
    <ul v-if="Array.isArray(RELEASE)" class="list-disc space-y-2 pl-5 [&_a]:text-accent [&_a]:underline">
      <li v-for="(entry, index) in RELEASE" :key="index" v-html="entry" />
    </ul>
    <div v-else-if="RELEASE" class="flex flex-col gap-4">
      <div v-for="(entries, category) in RELEASE" :key="category">
        <SFHeading level="6" class="mb-2">{{ category }}</SFHeading>
        <ul class="list-disc space-y-2 pl-5 [&_a]:text-accent [&_a]:underline">
          <li v-for="(entry, index) in entries" :key="index" v-html="entry" />
        </ul>
      </div>
    </div>

    <template #buttons>
      <SFButton block @click="accept">
        {{ localize("continue") }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import SFButton from "@library/SFButton.vue"
import SFDialog from "@library/SFDialog.vue"
import SFHeading from "@library/SFHeading.vue"
import { useLocalize } from "@utils/localization"

defineOptions({
  name: "ChangelogDialog"
})

const emit = defineEmits<{
  close: []
}>()

const VERSION = MODULE_VERSION
const RELEASE = CHANGELOG[VERSION]

const localize = useLocalize("dialog.changelog")

function accept() {
  Site.options.version_accepted = VERSION

  emit("close")
}
</script>
