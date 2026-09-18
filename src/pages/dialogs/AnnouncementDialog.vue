<template>
  <SFDialog :title="props.announcement.title" size="sm">
    <div class="rich-text text-center" v-html="props.announcement.content" />

    <template #buttons>
      <SFButton block @click="accept">
        {{ localize('continue') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import { useLocalize } from '@utils/localization'

defineOptions({
  name: 'AnnouncementDialog'
})

const props = defineProps<{
  /**
   * Announcement to show, its content is HTML
   */
  announcement: Announcement
}>()

const emit = defineEmits<{
  close: []
}>()

const localize = useLocalize('dialog.shared')

function accept() {
  Site.options.announcements_viewed = [...Site.options.announcements_viewed, props.announcement.id]

  emit('close')
}
</script>
