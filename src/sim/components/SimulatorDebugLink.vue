<template>
  <button type="button" class="pointer-events-auto flex cursor-pointer items-center gap-1.5 hover:underline max-md:mx-auto" @click="toggle">
    <SFIcon name="bug" />
    {{ localize(isSimulatorDebug ? 'debug_disable' : 'debug_enable') }}
  </button>
</template>

<script setup lang="ts">
import SFIcon from '@library/SFIcon.vue'
import { useLocalize } from '@utils/localization'
import { isSimulatorDebug } from '../debug'

defineOptions({
  name: 'SimulatorDebugLink'
})

const localize = useLocalize('simulator')

function toggle() {
  const url = new URL(window.location.href)
  if (isSimulatorDebug) {
    url.searchParams.delete('debug')
  } else {
    url.searchParams.set('debug', '')
  }
  window.location.href = url.toString()
}
</script>
