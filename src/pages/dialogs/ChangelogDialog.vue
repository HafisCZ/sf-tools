<template>
  <SFDialog :title="`${localize('release')} ${VERSION}`" size="sm">
    <SFList v-if="Array.isArray(RELEASE)" class="rich-text">
      <li v-for="(entry, index) in RELEASE" :key="index" v-html="entry" />
    </SFList>
    <div v-else-if="RELEASE" class="flex flex-col gap-4">
      <div v-for="(entries, category) in RELEASE" :key="category">
        <SFHeading level="6" class="mb-2">{{ category }}</SFHeading>
        <SFList class="rich-text">
          <li v-for="(entry, index) in entries" :key="index" v-html="entry" />
        </SFList>
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
import SFList from "@library/SFList.vue"
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
