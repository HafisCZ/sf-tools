<template>
  <div ref="container-ref" class="flex">
    <SFTooltip :content="localize('topbar.scripts')">
      <SFButton variant="outline" icon class="min-h-9.5 min-w-9.5" :aria-label="localize('topbar.scripts')" aria-haspopup="menu" :aria-expanded="open" :class="{ 'text-accent!': props.assigned }" @click="navigate" @contextmenu.prevent="toggle">
        <SFIcon name="gear" />
      </SFButton>
    </SFTooltip>
    <Teleport to="body">
      <SFDropdownMenu v-if="open && position" :items="items" :anchor="position" float="left" position="bottom" @close="close" />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, useTemplateRef } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDropdownMenu from '@library/SFDropdownMenu.vue'
import SFIcon from '@library/SFIcon.vue'
import SFTooltip from '@library/SFTooltip.vue'
import { type DropdownItem } from '@utils/components'
import { useInert } from '@utils/interactions'
import { useLocalize } from '@utils/localization'
import { useAnimationFramePosition } from '@utils/position'
import { useStatsNavigation } from '~/pages/stats/stats'
import { Scripts } from '~/script/scripts'

defineOptions({
  name: 'ScriptButton'
})

const props = defineProps<{
  /**
   * Table or entry opened in the script editor on click
   */
  identifier: string
  /**
   * Table type the quick swap menu lists compatible scripts for
   */
  table: 'players' | 'groups' | 'player' | 'group'
  /**
   * Shows that a script is assigned to the table
   */
  assigned: boolean
  /**
   * Key of the script picked in the quick swap menu
   */
  override: string | null
}>()

const emit = defineEmits<{
  /**
   * A script was picked in the quick swap menu, picking the active one again turns the swap off
   */
  swap: [key: string]
}>()

const localize = useLocalize('stats')

const navigation = useStatsNavigation()

const open = ref(false)
const items = shallowRef<DropdownItem[]>([])

const containerElement = useTemplateRef('container-ref')

const position = useAnimationFramePosition(open, () => containerElement.value?.getBoundingClientRect())

useInert(open)

function navigate() {
  navigation.show('scripts', { identifier: props.identifier })
}

function toggle() {
  items.value = [{ type: 'header', label: localize('scripts.quick_swap') }, ...Scripts.sortedList(props.table).map(({ key, name }) => ({ label: name, active: props.override === key, action: () => emit('swap', key) }))]

  open.value = !open.value
}

function close() {
  open.value = false
}
</script>
