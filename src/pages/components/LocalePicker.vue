<template>
  <SFDropdown :items="items" :label="label" float="left">
    <img :src="`/res/flags/${currentLocale}.svg`" alt="" class="h-6 w-auto rounded-sm" />
  </SFDropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFDropdown from '@library/SFDropdown.vue'
import { type DropdownItem } from '@utils/components'
import { LOCALES, currentLocale, setLocale } from '@utils/localization'

defineOptions({
  name: 'LocalePicker'
})

const label = computed(() => LOCALES[currentLocale.value] ?? currentLocale.value)

const items = computed<DropdownItem[]>(() =>
  Object.entries(LOCALES).map(([locale, name]) => ({
    label: name,
    image: `/res/flags/${locale}.svg`,
    active: locale === currentLocale.value,
    action: () => void setLocale(locale)
  }))
)
</script>
