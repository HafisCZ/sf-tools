<template>
  <template v-if="props.copy">{{ copyText }}</template>
  <SFTooltip v-else-if="props.state.type === 'druid_rage'" :content="localize('druid_rage')">
    <SFIcon name="paw" class="text-[orangered]" />
  </SFTooltip>
  <SFTooltip v-else-if="props.state.type === 'bard_song'" :content="localize('bard_song')">
    <span class="inline-flex items-center gap-1" :style="{ color: `#${BARD_NOTE_COLORS[props.state.level - 1]}` }">
      {{ props.state.notes }}
      <SFIcon name="music" />
    </span>
  </SFTooltip>
  <SFTooltip v-else-if="props.state.type === 'berserker_rage'" :content="localize('berserker_rage')">
    <SFIcon name="bolt" class="text-[orangered]" />
  </SFTooltip>
  <SFTooltip v-else-if="props.state.type === 'necromancer_minion'" :content="localize(`necromancer_minion_${props.state.minion}`)">
    <SFIcon name="skull-crossbones" class="text-[orangered]" />
  </SFTooltip>
  <span v-else-if="props.state.type === 'paladin_stance'" class="inline-flex items-center justify-center gap-1">
    <SFIcon name="shield-halved" class="text-[orangered]" />
    {{ localize(`paladin_stance_${props.state.stance}`) }}
  </span>
  <SFTooltip v-else :content="localize('plague_doctor_tincture')">
    <SFIcon name="flask" class="text-[orangered]" />
  </SFTooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFIcon from '@library/SFIcon.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { useLocalize } from '@utils/localization'
import { type SpecialDisplay } from '~/pages/analyzer/analyzer'

defineOptions({
  name: 'FighterState'
})

const props = defineProps<{
  /**
   * Special state of the fighter in the round
   */
  state: SpecialDisplay
  /**
   * Shows the state as plain text
   */
  copy?: boolean
}>()

const BARD_NOTE_COLORS = ['c4c4c4', '5e7fc4', 'd1a130']

const localize = useLocalize('analyzer.special_state')

const copyText = computed(() => {
  const state = props.state

  switch (state.type) {
    case 'bard_song':
      return `bard_song_${state.level}`
    case 'necromancer_minion':
      return `necromancer_minion_${state.minion}`
    case 'paladin_stance':
      return `paladin_stance_${state.stance}`
    default:
      return state.type
  }
})
</script>
