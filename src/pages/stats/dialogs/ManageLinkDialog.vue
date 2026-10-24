<template>
  <SFDialog :title="localize('title')" size="sm">
    <div class="flex flex-col gap-4">
      <div class="font-bold">{{ localize(`${mode}.heading1`) }}</div>
      <div class="flex flex-col gap-1">
        <div v-for="(item, index) in sourceItems" :key="index" class="flex rounded-[0.25em] border border-[#3a3a3a] p-2">
          <span class="flex basis-1/2 items-center gap-2">
            <SFIcon :name="DatabaseManager.isPlayer(item.Identifier) ? 'user' : 'box-archive'" />
            {{ item.Name }}
          </span>
          <span class="basis-1/2">{{ item.Prefix }}</span>
        </div>
      </div>
      <div class="font-bold">{{ localize(`${mode}.heading2`) }}</div>
      <div class="flex flex-col gap-1">
        <div v-for="(item, index) in targetItems" :key="index" class="flex rounded-[0.25em] border border-[#3a3a3a] p-2">
          <span class="flex basis-1/2 items-center gap-2">
            <SFIcon :name="DatabaseManager.isPlayer(item.Identifier) ? 'user' : 'box-archive'" />
            {{ item.Name }}
          </span>
          <span class="basis-1/2">{{ item.Prefix }}</span>
        </div>
      </div>
      <div class="mt-4 flex items-center gap-2">
        <SFIcon name="triangle-exclamation" class="shrink-0 text-accent" />
        <span class="rich-text" v-html="localize(`${mode}.warning`)" />
      </div>
    </div>

    <template #buttons>
      <SFButton block :disabled="isSubmitting" @click="emit('close', false)">
        {{ localize.global('dialog.shared.cancel') }}
      </SFButton>
      <SFButton variant="primary" block :disabled="isSubmitting && 'loading'" @click="submit">
        {{ localize.global('dialog.shared.apply') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import SFIcon from '@library/SFIcon.vue'
import { useLocalize } from '@utils/localization'
import { sortDescending, useSubmit } from '@utils/utils'
import { DatabaseManager, type GroupHistory, type PlayerHistory } from '~/data/database-manager'

defineOptions({
  name: 'ManageLinkDialog'
})

const props = defineProps<{
  /**
   * Link ids of the merged players or guilds, a single one is split instead
   */
  linkIds: string[]
}>()

const emit = defineEmits<{
  close: [changed: boolean]
}>()

const localize = useLocalize('dialog.manage_link')

const objects = sortDescending(
  props.linkIds.map((linkId) => DatabaseManager.getAny(linkId) as PlayerHistory | GroupHistory),
  (object) => object.LatestTimestamp
)

const mode = props.linkIds.length > 1 ? 'link' : 'unlink'

const sourceItems = mode === 'link' ? objects.flatMap((object) => Object.values(object.Links)) : [objects[0].Latest]
const targetItems = mode === 'link' ? [objects[0].Latest] : Object.values(objects[0].Links)

const { submit, isSubmitting } = useSubmit(async () => {
  if (mode === 'link') {
    await DatabaseManager.link(
      objects.map((object) => object.Latest.LinkId),
      objects[0].Latest.LinkId
    )
  } else {
    await DatabaseManager.unlink(objects[0].Latest.LinkId)
  }

  emit('close', true)
})
</script>
