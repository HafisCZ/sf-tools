<template>
  <SFDialog :title="localize('title')" size="sm" column>
    <div class="flex min-h-0 flex-col gap-4 overflow-y-auto pr-2">
      <section v-if="files.length > 0">
        <SFHeading level="5">{{ localize('label.file') }}</SFHeading>
        <ul class="mt-2 list-disc pl-8">
          <li v-for="file in files" :key="file" class="mb-[5px]">{{ file }}</li>
        </ul>
      </section>
      <section v-for="list in lists" :key="list.label">
        <SFHeading level="5">{{ localize(list.label) }}</SFHeading>
        <ul class="mt-2 list-disc px-12">
          <li v-for="(entry, index) in list.entries" :key="index" class="mb-[5px]">
            <span class="flex justify-between gap-4">
              <span>{{ entry.prefix }} - {{ entry.name }}</span>
              <span>{{ entry.timestamp }}</span>
            </span>
          </li>
        </ul>
      </section>
    </div>
    <SFCheckbox ref="skip-ref" v-model="skipNext" :label="localize('skip_next')" class="shrink-0" />

    <template #buttons>
      <SFButton block :disabled="isSubmitting" @click="emit('close', false)">
        {{ localize('cancel') }}
      </SFButton>
      <SFButton variant="primary" block :disabled="isSubmitting ? 'loading' : !isValid" @click="submit">
        {{ localize('ok') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFCheckbox from '@library/SFCheckbox.vue'
import SFDialog from '@library/SFDialog.vue'
import SFHeading from '@library/SFHeading.vue'
import { formatDate, formatPrefix } from '@utils/formatting'
import { useLocalize } from '@utils/localization'
import { useSubmit } from '@utils/utils'
import { useComponentValidation } from '@utils/validations'
import { Site } from '~/core/site'
import { DatabaseManager, type RemovalData } from '~/data/database-manager'
import { type RawEntity } from '~/data/types'

defineOptions({
  name: 'DataManageDialog'
})

const props = defineProps<{
  /**
   * Files, players, guilds and single entries to remove
   */
  data: RemovalData
}>()

const emit = defineEmits<{
  close: [removed: boolean]
}>()

const localize = useLocalize('dialog.data_manage')

const skipNext = ref(false)

const isValid = useComponentValidation(useTemplateRef('skip-ref'))

const files = computed(() => (props.data.timestamps ?? []).map((timestamp) => formatDate(timestamp)))

const lists = computed(() => {
  const identifiers = props.data.identifiers ?? []
  const instances = props.data.instances ?? []

  const players = [...identifiers.filter((identifier) => DatabaseManager.isPlayer(identifier)).map((identifier) => DatabaseManager.Players[identifier].Latest.Data), ...instances.filter(({ identifier }) => DatabaseManager.isPlayer(identifier))]
  const groups = [...identifiers.filter((identifier) => DatabaseManager.isGroup(identifier)).map((identifier) => DatabaseManager.Groups[identifier].Latest.Data), ...instances.filter(({ identifier }) => DatabaseManager.isGroup(identifier))]

  return [
    { label: 'label.player', entries: players.map(describeEntry) },
    { label: 'label.group', entries: groups.map(describeEntry) }
  ].filter((list) => list.entries.length > 0)
})

const { submit, isSubmitting } = useSubmit(async () => {
  if (skipNext.value) {
    Site.options.unsafe_delete = true
  }

  await DatabaseManager.removeEntries(props.data)

  emit('close', true)
})

function describeEntry({ prefix, name, timestamp }: RawEntity) {
  return { prefix: formatPrefix(prefix), name, timestamp: formatDate(timestamp) }
}
</script>
