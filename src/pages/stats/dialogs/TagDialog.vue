<template>
  <SFDialog :title="localize('title')" size="sm">
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1.5">
        <span class="font-bold text-white">{{ localize('current') }}</span>
        <div class="h-[30vh] overflow-y-auto">
          <div class="flex flex-wrap gap-2">
            <span v-for="(tag, index) in tags" :key="tag" class="flex items-center gap-4 rounded-[0.5em] py-[0.5em] pr-[0.75em] pl-[1em] text-white" :style="{ backgroundColor: stringToColor(tag) }">
              {{ tag }}
              <button type="button" class="flex cursor-pointer items-center text-black outline-none focus-visible:text-white" :aria-label="tag" @click="removeTag(index)">
                <SFIcon name="xmark" />
              </button>
            </span>
          </div>
        </div>
      </div>
      <div class="flex items-end gap-2">
        <div class="flex-1">
          <SFInput ref="insert-ref" v-model="insertName" :label="localize('insert.title')" :placeholder="localize('insert.placeholder')" @keydown.enter="insertTag" />
        </div>
        <SFTooltip :content="localize('insert.tooltip')">
          <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('insert.tooltip')" @click="insertTag">
            <SFIcon name="plus" />
          </SFButton>
        </SFTooltip>
      </div>
    </div>

    <template #buttons>
      <SFButton block :disabled="isSubmitting" @click="emit('close', false)">
        {{ localize('cancel') }}
      </SFButton>
      <SFButton block :disabled="isSubmitting" @click="clearTags">
        {{ localize('clear') }}
      </SFButton>
      <SFButton variant="primary" block :disabled="isSubmitting ? 'loading' : !isValid" @click="submit">
        {{ localize.global('dialog.shared.apply') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import SFIcon from '@library/SFIcon.vue'
import SFInput from '@library/SFInput.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { stringToColor } from '@utils/colors'
import { useLocalize } from '@utils/localization'
import { pushUnique, toArray, unique, useSubmit } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import { DatabaseManager } from '~/data/database-manager'
import { type RawEntity } from '~/data/types'

defineOptions({
  name: 'TagDialog'
})

const props = defineProps<{
  /**
   * Timestamps of whole files to tag
   */
  timestamps?: number[]
  /**
   * Single entries to tag, used when no timestamps are given
   */
  instances?: RawEntity[]
}>()

const emit = defineEmits<{
  close: [changed: boolean]
}>()

const localize = useLocalize('dialog.edit_file_tag')

const tags = ref(props.timestamps ? Object.keys(DatabaseManager.getTagsForTimestamp(props.timestamps)) : unique((props.instances ?? []).flatMap((instance) => toArray(instance.tag))))
const insertName = ref('')

const isValid = useComponentValidation(useTemplateRef('insert-ref'))

const { submit, isSubmitting } = useSubmit(async () => {
  // A plain array, IndexedDB can't store Vue's reactive proxy
  const values = [...tags.value]

  if (props.timestamps) {
    const { players, groups } = DatabaseManager.getFile(undefined, props.timestamps)

    await DatabaseManager.setTags([...players, ...groups], values)
  } else {
    await DatabaseManager.setTags(props.instances ?? [], values)
  }

  emit('close', true)
})

function insertTag() {
  const name = insertName.value.trim()

  if (name) {
    pushUnique(tags.value, name)

    insertName.value = ''
  }
}

function removeTag(index: number) {
  tags.value.splice(index, 1)
}

function clearTags() {
  tags.value = []
}
</script>
