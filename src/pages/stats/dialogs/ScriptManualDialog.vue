<template>
  <SFDialog :title="localize('title')" size="lg">
    <div class="expression-text flex h-[60vh] w-full">
      <div class="flex w-1/3 flex-col gap-2 border-r border-[#262626] pr-2">
        <button
          v-for="page in pages"
          :key="page.type"
          type="button"
          class="flex cursor-pointer items-center gap-2 rounded-[0.25em] border border-[#3a3a3a] p-4 text-left outline-none hover:bg-page focus-visible:bg-page"
          :class="{ [page.className]: page.type === currentType }"
          :aria-pressed="page.type === currentType"
          @click="currentType = page.type"
        >
          {{ localize(`heading.${page.type}`) }}
        </button>
      </div>
      <div class="flex w-2/3 flex-col gap-4 overflow-y-scroll border-t border-[#262626] p-4">
        <div v-for="(item, index) in currentPage.items" :key="index">
          <div v-html="item.html" />
          <div v-if="item.description" class="font-mono text-[gray]">{{ item.description }}</div>
        </div>
      </div>
    </div>

    <template #buttons>
      <SFButton block @click="emit('close')">
        {{ localize.global('dialog.shared.close') }}
      </SFButton>
    </template>
  </SFDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SFButton from '@library/SFButton.vue'
import SFDialog from '@library/SFDialog.vue'
import { hasTranslation, useLocalize } from '@utils/localization'
import { sortDescending } from '@utils/utils'
import { ScriptCommands } from '~/script/commands'
import { Constants } from '~/script/constants'
import { TABLE_EXPRESSION_CONFIG } from '~/script/expression-config'

defineOptions({
  name: 'ScriptManualDialog'
})

const emit = defineEmits<{
  close: []
}>()

const localize = useLocalize('dialog.script_manual')

const pages = [
  createPage(
    'command',
    'ta-keyword',
    sortDescending([...ScriptCommands.commands()], (command) => (command.metadata.isDeprecated ? 0 : 1)).map((command) => {
      const syntax = command.syntax.encodedText.replace(/(&lt;[a-z|]+&gt;)/g, '<span class="ta-constant">$1</span>').replace(/(\([a-z|]+\))/g, '<span class="ta-value">$1</span>')

      return command.metadata.isDeprecated ? `${syntax} <sup class="text-[gray]">(${localize('deprecated')})</sup>` : syntax
    })
  ),
  createPage('header', 'ta-reserved-public', TABLE_EXPRESSION_CONFIG.all('header', 'public')),
  createPage('header_protected', 'ta-reserved-protected', TABLE_EXPRESSION_CONFIG.all('header', 'protected')),
  createPage('header_group', 'ta-reserved-group', TABLE_EXPRESSION_CONFIG.all('header', 'group')),
  createPage('header_private', 'ta-reserved-private', TABLE_EXPRESSION_CONFIG.all('header', 'private')),
  createPage('header_scoped', 'ta-reserved-scoped', TABLE_EXPRESSION_CONFIG.all('accessor')),
  createPage('function', 'ta-function', TABLE_EXPRESSION_CONFIG.all('function')),
  createPage('variable', 'ta-constant', TABLE_EXPRESSION_CONFIG.all('variable')),
  createPage('enum', 'ta-enum', TABLE_EXPRESSION_CONFIG.all('enumeration')),
  createPage('constant', 'ta-constant', Array.from(Constants.DEFAULT.keys()), Constants.DEFAULT.Values)
]

const currentType = ref(pages[0].type)

const currentPage = computed(() => pages.find((page) => page.type === currentType.value) ?? pages[0])

function createPage(type: string, className: string, list: string[], descriptions?: Map<string, unknown>) {
  return {
    type,
    className,
    items: list.map((item) => {
      const key = item
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .replace(/ /g, '_')
        .replace(/_{2,}/, '_')
        .replace(/^_/, '')

      const description = descriptions?.get(item) || (hasTranslation(`dialog.script_manual.description.${type}.${key}`) ? localize(`description.${type}.${key}`) : '')

      return { html: item, description: String(description) }
    })
  }
}
</script>
