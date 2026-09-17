<template>
  <SFDialog :title="localize('title')" size="sm">
    <div class="flex flex-col gap-4">
      <SFSelect ref="slot-ref" v-model="slot" :label="`${localize('slot')}:`" :options="slotOptions" />
      <SFInput ref="limit-ref" v-model="limit" :label="`${localize('limit.title')}:`" :placeholder="localize('limit.placeholder')" type="number" min="0" />
      <SFSelect ref="ignored-duration-ref" v-model="ignoredDuration" :label="`${localize('ignored_duration.title')}:`" :options="durationOptions" />
      <div class="flex flex-col gap-1.5">
        <span class="font-bold text-white">{{ localize('ignored_identifiers.title') }}:</span>
        <ul class="flex h-[15em] flex-col gap-2 overflow-y-auto pr-2">
          <li v-for="identifier in ignoredIdentifiers" :key="identifier" class="flex items-center justify-between gap-2 rounded-md border border-line bg-surface py-1 pr-1 pl-3">
            {{ describeIdentifier(identifier) }}
            <SFButton variant="ghost" size="sm" icon @click="removeIdentifier(identifier)">
              <SFIcon name="xmark" />
            </SFButton>
          </li>
        </ul>
      </div>
    </div>

    <template #buttons>
      <SFButton block @click="emit('close')">
        {{ localize.global('dialog.shared.cancel') }}
      </SFButton>
      <SFButton variant="primary" block :disabled="!isValid" @click="save">
        {{ localize.global('dialog.shared.save') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import SFIcon from '@library/SFIcon.vue'
import SFInput from '@library/SFInput.vue'
import SFSelect from '@library/SFSelect.vue'
import { type SelectOption } from '@utils/components'
import { useLocalize } from '@utils/localization'
import { useComponentValidation } from '@utils/validations'

defineOptions({
  name: 'StatisticsIntegrationOptionsDialog'
})

const props = defineProps<{
  /**
   * Current options, edited as a copy
   */
  options: IntegrationOptions
}>()

const emit = defineEmits<{
  close: [options?: IntegrationOptions]
}>()

type IntegrationOptions = {
  limit: number
  slot: number
  ignored_identifiers: string[]
  ignored_duration: number
}

const SLOTS = [0, 1, 2, 3, 4, 5]

// None, 1 day, 1 week, 1 month and 3 months in milliseconds
const DURATIONS = [0, 86400000, 604800000, 2592000000, 7776000000]

const localize = useLocalize('dialog.statistics_integration_options')

const slot = ref(String(props.options.slot))
const limit = ref(String(props.options.limit))
const ignoredDuration = ref(String(props.options.ignored_duration))
const ignoredIdentifiers = ref([...props.options.ignored_identifiers])

const isValid = useComponentValidation(useTemplateRef('slot-ref'), useTemplateRef('limit-ref'), useTemplateRef('ignored-duration-ref'))

const slotOptions = computed<SelectOption[]>(() => SLOTS.map((value) => ({ value: String(value), label: value === 0 ? localize.global('dialog.profile_create.default') : String(value) })))

const durationOptions = computed<SelectOption[]>(() => DURATIONS.map((value) => ({ value: String(value), label: localize(`ignored_duration.${value}`) })))

// Name and server of the saved player or group, or the bare identifier when it is not saved anymore
function describeIdentifier(identifier: string) {
  const history = DatabaseManager.isPlayer(identifier) ? DatabaseManager.getPlayer(identifier) : DatabaseManager.getGroup(identifier)
  const data = history?.Latest.Data

  return data ? `${data.name} @ ${_formatPrefix(data.prefix)}` : identifier
}

function removeIdentifier(identifier: string) {
  ignoredIdentifiers.value = ignoredIdentifiers.value.filter((value) => value !== identifier)
}

function save() {
  emit('close', {
    slot: Number.parseInt(slot.value),
    // An empty field is no limit, same as 0
    limit: Number.parseInt(limit.value) || 0,
    ignored_duration: Number.parseInt(ignoredDuration.value),
    ignored_identifiers: ignoredIdentifiers.value
  })
}
</script>
