<template>
  <SFButton ref="trigger-ref" variant="ghost" aria-haspopup="dialog" :aria-expanded="open" @click="toggle">
    <span class="size-[29px] shrink-0 overflow-hidden rounded bg-[#0c1a20] bg-[radial-gradient(closest-side,rgb(5_121_160/0.9),rgb(5_121_160/0))]">
      <CharacterRenderer :data="props.player" />
    </span>
    <span class="max-w-40 truncate">{{ props.player.Name }}</span>
    <span class="text-xs text-[#7fc8e0] uppercase">{{ formatWorldName(props.player.Data.prefix) }}</span>
  </SFButton>
  <Teleport to="body">
    <div v-if="open" ref="container-ref" data-content-container class="fixed inset-x-0 top-[50px] bottom-0 z-[1001] flex flex-col aria-hidden:z-[999]">
      <section ref="panel-ref" role="dialog" :aria-label="localize('choose')" tabindex="-1" class="relative border-b border-line shadow-xl outline-none">
        <img src="/res/backgrounds/classselect.webp" alt="" class="absolute inset-0 size-full object-cover object-[center_40%]" />
        <div class="absolute inset-0 bg-linear-to-b from-page/60 to-page/90" />
        <CharacterShelf :current="props.player" row class="relative" @select="select" />
      </section>
      <div class="flex-1 bg-black/60" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue'
import SFButton from '@library/SFButton.vue'
import { onClickOutsideOf } from '@utils/focus'
import { formatWorldName } from '@utils/formatting'
import { useDropdown } from '@utils/interactions'
import { useLocalize } from '@utils/localization'
import CharacterRenderer from '~/components/CharacterRenderer.vue'
import { type PlayerModel } from '~/core/models/player'
import CharacterShelf from './CharacterShelf.vue'

defineOptions({
  name: 'CharacterSwitcher'
})

const props = defineProps<{
  /**
   * Character the page shows
   */
  player: PlayerModel
}>()

const emit = defineEmits<{
  /**
   * Another saved character was picked
   */
  select: [player: PlayerModel]
}>()

const localize = useLocalize('integration')

const triggerRef = useTemplateRef('trigger-ref')
const containerElement = useTemplateRef('container-ref')
const panelElement = useTemplateRef('panel-ref')

const triggerElement = computed((): HTMLElement | undefined => triggerRef.value?.$el)

const { open, toggle, close } = useDropdown(triggerElement, triggerElement)

onClickOutsideOf([panelElement], closeIfOpen, { esc: true })

watch(
  open,
  (value) => {
    if (value) {
      panelElement.value?.focus()
    }
  },
  { flush: 'post' }
)

function closeIfOpen() {
  // An import dialog opened from the panel covers it, clicks and Esc there belong to the dialog
  if (open.value && containerElement.value?.getAttribute('aria-hidden') !== 'true') {
    close()
  }
}

function select(entry: PlayerModel) {
  close()

  emit('select', entry)
}
</script>
