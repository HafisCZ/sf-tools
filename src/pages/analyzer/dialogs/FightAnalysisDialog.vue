<template>
  <SFDialog :title="localize('title')" column>
    <div class="shrink-0">
      <SFParagraph>{{ localize('variables') }}</SFParagraph>
      <SFParagraph type="muted">
        <template v-for="(keyword, index) in keywords" :key="keyword">
          <code>{{ keyword }}</code>
          <template v-if="index < keywords.length - 1">,&nbsp; </template>
        </template>
      </SFParagraph>
    </div>
    <div class="flex min-h-0 flex-col gap-4 overflow-y-auto pr-4">
      <div v-for="(_, index) in selectors" :key="index" class="grid grid-cols-4 gap-[14px]">
        <div class="col-span-3">
          <SFExpressionInput v-model="selectors[index]" :label="localize('selector')" :placeholder="localize('selector')" :highlight="highlight" />
        </div>
        <SFInput :model-value="String(counts[index] ?? '')" :label="localize('count')" readonly class="text-center" />
      </div>
    </div>

    <template #buttons>
      <SFButton variant="primary" block @click="addSelector">
        {{ localize('add') }}
      </SFButton>
      <SFButton block @click="emit('close')">
        {{ localize.global('dialog.shared.close') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import SFExpressionInput from '@library/SFExpressionInput.vue'
import SFInput from '@library/SFInput.vue'
import SFParagraph from '@library/SFParagraph.vue'
import { useLocalize } from '@utils/localization'
import { type Fighter, type GroupFight } from '~/pages/analyzer/analyzer'
import { Constants } from '~/script/constants'
import { Expression, ExpressionScope, type ExpressionEnvironment } from '~/script/expression'
import { DEFAULT_EXPRESSION_CONFIG } from '~/script/expression-config'
import { Highlighter } from '~/script/highlighter'

defineOptions({
  name: 'FightAnalysisDialog'
})

const props = defineProps<{
  /**
   * Fights whose rounds are counted
   */
  fights: GroupFight[]
  /**
   * Fighter counted as player 1
   */
  fighterA: Fighter
  /**
   * Fighter counted as player 2
   */
  fighterB: Fighter
}>()

const emit = defineEmits<{
  close: []
}>()

const ACCESSORS = ['Player 1 Attacking', 'Player 2 Attacking', 'Attacker', 'Attacker State', 'Target', 'Target State', 'Critical', 'Missed', 'Damage', 'Rage', 'Special', 'Type', 'First Round', 'Last Round', 'Attacker State Display', 'Target State Display']

const CONSTANTS = {
  '@attack_normal': 0,
  '@attack_critical': 1,
  '@attack_blocked': 3,
  '@attack_evaded': 4,
  '@attack_critical_blocked': 8,
  '@attack_critical_evaded': 9,
  '@attack_secondary_normal': 10,
  '@attack_secondary_critical': 11,
  '@attack_secondary_blocked': 13,
  '@attack_secondary_evaded': 14,
  '@attack_secondary_critical_blocked': 18,
  '@attack_secondary_critical_evaded': 19,
  '@attack_chain_normal': 20,
  '@attack_chain_critical': 21,
  '@attack_chain_blocked': 23,
  '@attack_chain_evaded': 24,
  '@attack_chain_critical_blocked': 28,
  '@attack_chain_critical_evaded': 29,
  '@attack_catapult': 2,
  '@attack_fireball': 15,
  '@attack_fireball_blocked': 16,
  '@attack_swoop': 5,
  '@attack_swoop_blocked': 6,
  '@attack_swoop_evaded': 7,
  '@attack_revive': 100
}

const localize = useLocalize('dialog.fight_statistical_analysis')

const config = DEFAULT_EXPRESSION_CONFIG.clone()

for (const name of ACCESSORS) {
  config.register('accessor', 'none', name, (object: Record<string, unknown>) => object[name])
}

const environment: ExpressionEnvironment = {
  functions: {},
  variables: {},
  constants: new Constants(new Map(Object.entries(CONSTANTS)))
}

const keywords = config.all('accessor')

const rounds = props.fights.flatMap((fight) =>
  fight.rounds
    .filter((round) => !round.attackTypeSpecial)
    .map((round, index, array) => ({
      Attacker: round.attacker,
      Target: round.target,
      'Attacker State': round.attackerState,
      'Attacker State Display': round.attackerSpecialDisplay,
      'Target State': round.targetState,
      'Target State Display': round.targetSpecialDisplay,
      'Player 1 Attacking': round.attacker.ID === props.fighterA.ID,
      'Player 2 Attacking': round.attacker.ID === props.fighterB.ID,
      Critical: round.attackTypeCritical,
      Missed: round.defenseType,
      Damage: round.attackDamage,
      Rage: round.attackRage,
      Special: round.attackTypeSpecial,
      Type: round.attackType,
      'First Round': index === 0,
      'Last Round': index === array.length - 1
    }))
)

const selectors = ref([''])
const counts = ref<number[]>([])

// A count keeps its last value while its expression is invalid
watch(
  selectors,
  (values) => {
    const scope = new ExpressionScope(environment)

    counts.value = values.map((selector, index) => {
      const expression = Expression.create(selector || 'true', null, config)

      return expression ? rounds.filter((round) => expression.eval(scope.clone().addSelf(round))).length : counts.value[index]
    })
  },
  { deep: true, immediate: true }
)

function highlight(text: string) {
  return { html: Highlighter.expression(text, environment, config).text }
}

function addSelector() {
  selectors.value = [...selectors.value, '']
}
</script>
