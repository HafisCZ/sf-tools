<template>
  <div v-if="settings" class="flex w-[300px] flex-col bg-page font-sans text-sm leading-5 text-white/90">
    <div class="truncate border-b border-white/10 bg-dialog px-4 py-2.5 text-center font-bold">{{ host }}</div>
    <div class="flex justify-center pt-5 pb-6">
      <SFButton variant="ghost" icon aria-label="Enabled" :aria-pressed="settings.enabled" @click="save({ enabled: !settings.enabled })">
        <SFIcon name="power-off" class="text-[100px] transition-colors" :class="settings.enabled ? 'text-accent' : 'text-white/25'" />
      </SFButton>
    </div>
    <div role="group" aria-label="Site" class="grid grid-cols-3 border-y border-white/10 bg-surface" :class="{ 'opacity-50': !settings.enabled }">
      <button
        v-for="option in SITE_OPTIONS"
        :key="option.value"
        type="button"
        class="flex flex-col items-center gap-1 pt-2.5 pb-2 text-xs leading-4 font-bold outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent enabled:cursor-pointer disabled:cursor-not-allowed"
        :class="option.value === settings.site ? 'bg-surface-hover text-accent' : 'text-white/70 enabled:hover:bg-surface-hover'"
        :aria-pressed="option.value === settings.site"
        :disabled="!settings.enabled"
        @click="save({ site: option.value })"
      >
        <SFIcon :name="option.icon" class="text-[22px]" />
        {{ option.label }}
      </button>
    </div>
    <div v-if="settings.site === 'local'" class="px-4 py-3" :class="{ 'opacity-50': !settings.enabled }">
      <SFInput :model-value="settings.local" aria-label="Local address" :disabled="!settings.enabled" @update:model-value="save({ local: $event })" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFIcon from '@library/SFIcon.vue'
import SFInput from '@library/SFInput.vue'
import { type IconName } from '@utils/icons'
import { getOrigin, readSettings, type Settings, type Site } from '../src/sites'

defineOptions({
  name: 'ExtensionPopup'
})

type SiteOption = {
  value: Site
  label: string
  icon: IconName
}

const SITE_OPTIONS: SiteOption[] = [
  {
    value: 'live',
    label: 'Live',
    icon: 'globe'
  },
  {
    value: 'beta',
    label: 'Beta',
    icon: 'flask'
  },
  {
    value: 'local',
    label: 'Local',
    icon: 'desktop'
  }
]

const settings = shallowRef<Settings | null>(null)

const host = computed(() => {
  if (!settings.value) return ''

  const origin = getOrigin(settings.value)

  return origin ? origin.replace(/^https?:\/\//, '') : settings.value.local
})

onMounted(async () => {
  settings.value = await readSettings()
})

function save(values: Partial<Settings>) {
  settings.value = Object.assign({}, settings.value, values)

  void chrome.storage.local.set({ settings: settings.value })
}
</script>
