<template>
  <div ref="root-ref">
    <div class="relative flex items-start rounded-md border border-line bg-surface focus-within:border-accent">
      <div class="relative min-w-0 flex-1">
        <div aria-hidden="true" class="expression-text pointer-events-none min-h-9 py-2 pl-3 font-mono leading-5 wrap-anywhere whitespace-pre-wrap text-white/90">
          <span v-for="(part, index) in mirrorParts.before" :key="`before-${index}`" :class="getPartClasses(part)">{{ part.text }}</span
          ><span class="text-white/30">{{ ghost }}</span
          ><span v-for="(part, index) in mirrorParts.after" :key="`after-${index}`" :class="getPartClasses(part)">{{ part.text }}</span>
        </div>
        <textarea
          ref="field-ref"
          :value="modelValue"
          rows="1"
          spellcheck="false"
          autocomplete="off"
          class="absolute inset-0 size-full resize-none overflow-hidden bg-transparent py-2 pl-3 font-mono leading-5 wrap-anywhere whitespace-pre-wrap text-transparent caret-white/60 outline-none selection:bg-[rgba(100,100,100,0.4)] selection:text-transparent placeholder:text-white/40"
          :placeholder="props.placeholder"
          :aria-label="props.placeholder"
          @input="handleInput"
          @keydown="handleKeydown"
          @keyup="updateCaret"
          @click="handleClick"
          @select="updateCaret"
          @focus="handleFocus"
          @blur="handleBlur"
        />
      </div>
      <div class="flex h-9 shrink-0 items-center gap-0.5 pr-1.5 pl-2 text-white/60">
        <span class="mr-1.5 text-xs whitespace-nowrap text-white/40" :class="{ invisible: !focused || suggestionRows.length }">{{ localize('query.shortcut') }}</span>
        <button type="button" class="flex size-7 cursor-pointer items-center justify-center rounded hover:bg-white/10 hover:text-white" :aria-label="localize('query.clear')" @click="clear">
          <SFIcon name="xmark" />
        </button>
        <button type="button" class="flex size-7 cursor-pointer items-center justify-center rounded hover:bg-white/10 hover:text-white" :class="{ 'text-accent': historyOpen }" :aria-label="localize('query.history')" :aria-expanded="historyOpen" @click="historyOpen = !historyOpen">
          <SFIcon name="angles-down" />
        </button>
      </div>
      <ul v-if="suggestionRows.length" ref="list-ref" role="listbox" class="expression-text absolute -inset-x-px top-full z-20 mt-1.5 max-h-[60vh] overflow-y-auto rounded-md border border-line bg-surface py-1 text-left shadow-xl" @mousedown.prevent>
        <li
          v-for="(row, index) in suggestionRows"
          :key="row.suggestion.insert"
          role="option"
          :aria-selected="index === selectedIndex"
          class="grid cursor-pointer grid-cols-[minmax(0,230px)_minmax(0,1fr)] items-center gap-3.5 px-3 py-[7px] hover:bg-surface-hover"
          :class="{ 'bg-accent/12 hover:bg-accent/12': index === selectedIndex }"
          @click="acceptSuggestion(row.suggestion)"
        >
          <span class="overflow-hidden font-mono text-[13px] text-ellipsis whitespace-pre"
            ><span v-for="(part, partIndex) in row.parts" :key="partIndex" :class="getPartClasses(part)">{{ part.text }}</span></span
          >
          <span class="truncate text-[12.5px] text-white/60">{{ row.suggestion.description ? localize(`query.keys.${row.suggestion.description}`) : '' }}</span>
        </li>
      </ul>
      <div v-if="historyOpen" class="absolute -inset-x-px top-full z-20 mt-1.5 max-h-[60vh] overflow-y-auto rounded-md border border-line bg-surface py-1.5 text-left shadow-xl">
        <div class="px-3.5 pt-2 pb-1 text-[11px] font-bold tracking-wider text-white/45 uppercase">{{ localize('query.starred') }}</div>
        <div v-for="entry in starredEntries" :key="`starred-${entry.query}`" class="flex items-center gap-1.5 pr-2 pl-1 hover:bg-surface-hover">
          <button type="button" class="expression-text min-w-0 flex-1 cursor-pointer overflow-hidden px-2.5 py-2 text-left font-mono text-[12.5px] text-ellipsis whitespace-pre" @click="pick(entry.query)">
            <span v-for="(part, index) in entry.parts" :key="index" :class="getPartClasses(part)">{{ part.text }}</span>
          </button>
          <button type="button" class="flex size-7 cursor-pointer items-center justify-center rounded text-accent hover:bg-white/10" :aria-label="localize('query.unstar')" @click="unstar(entry.query)">
            <SFIcon name="star-solid" />
          </button>
        </div>
        <div v-if="!starredEntries.length" class="px-3.5 pt-1.5 pb-2.5 text-[12.5px] text-white/45">{{ localize('query.starred_empty') }}</div>
        <div class="px-3.5 pt-2 pb-1 text-[11px] font-bold tracking-wider text-white/45 uppercase">{{ localize('query.recent') }}</div>
        <div v-for="entry in recentEntries" :key="`recent-${entry.query}`" class="flex items-center gap-1.5 pr-2 pl-1 hover:bg-surface-hover">
          <button type="button" class="expression-text min-w-0 flex-1 cursor-pointer overflow-hidden px-2.5 py-2 text-left font-mono text-[12.5px] text-ellipsis whitespace-pre" @click="pick(entry.query)">
            <span v-for="(part, index) in entry.parts" :key="index" :class="getPartClasses(part)">{{ part.text }}</span>
          </button>
          <button type="button" class="flex size-7 cursor-pointer items-center justify-center rounded text-white/60 hover:bg-white/10 hover:text-white" :aria-label="localize('query.star')" @click="star(entry.query)">
            <SFIcon name="star" />
          </button>
        </div>
        <div v-if="!recentEntries.length" class="px-3.5 pt-1.5 pb-2.5 text-[12.5px] text-white/45">{{ localize('query.recent_empty') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, useTemplateRef, watch } from 'vue'
import SFIcon from '@library/SFIcon.vue'
import { onClickOutsideOf } from '@utils/focus'
import { useLocalize } from '@utils/localization'
import { saveStarredFilters, useStarredFilters } from '~/pages/stats/stats'
import { highlightQuery, parseQuery, suggestQuery, type QueryLanguage, type QueryPart, type QueryPartKind, type QuerySuggestion, type QueryValueKind } from '~/script/query'

defineOptions({
  name: 'FilterInput'
})

const props = defineProps<{
  /**
   * Text shown while the field is empty, also its accessible name
   */
  placeholder: string
  /**
   * Filters, options, headers and known values the query understands
   */
  language: QueryLanguage
}>()

const emit = defineEmits<{
  /**
   * The value was committed with Enter, by leaving the field, by picking a saved filter or an example, by a fix or by clearing it
   */
  change: [value: string]
}>()

const modelValue = defineModel<string>({ required: true })

const PART_CLASSES: Record<QueryPartKind, string> = {
  plain: '',
  text: 'text-white/90',
  string: 'text-[#d9d9a6]',
  key: 'text-accent',
  value: 'text-[#ffd9a0]',
  tag: 'text-[#3fd0b8]',
  header: 'text-[#f07af2]',
  number: 'text-[#8cb4ff]',
  operator: 'text-[#bdbdbd]',
  logic: 'text-[#b48cff]',
  bracket: '',
  option: 'text-[#7ddc8b]',
  'option-value': 'text-[#c4f0cb]',
  error: 'text-[#ff8a8a]',
  script: ''
}

const DEPTH_CLASSES = ['text-[#b48cff]', 'text-[#e3c46a]', 'text-[#ff8fb1]']

const AUTO_CLOSE_BEFORE = /^[\s),]?$/

const ISSUE_CLASSES = {
  error: 'underline decoration-[#ff5c5c] decoration-wavy underline-offset-3 [text-decoration-skip-ink:none]',
  warning: 'underline decoration-[#e9c46a] decoration-dotted underline-offset-3',
  pending: 'underline decoration-white/50 decoration-dotted underline-offset-3'
}

const localize = useLocalize('stats')

const rootElement = useTemplateRef('root-ref')
const fieldElement = useTemplateRef('field-ref')
const listElement = useTemplateRef('list-ref')

const caret = ref(0)
const focused = ref(false)
const menuOpen = ref(false)
const showAll = ref(false)
const activeIndex = ref(0)
const historyOpen = ref(false)
const history = ref<string[]>([])
const cachedLanguage = shallowRef<QueryLanguage | null>(null)

const starred = useStarredFilters()

let committedValue = modelValue.value

const language = computed(() => cachedLanguage.value ?? props.language)

const parsed = computed(() => parseQuery(modelValue.value, language.value))

const parts = computed(() => highlightQuery(parsed.value.tokens, focused.value ? caret.value : undefined))

const suggestions = computed(() => {
  if (!focused.value || !menuOpen.value) {
    return null
  }

  return suggestQuery(modelValue.value, caret.value, language.value, showAll.value || !modelValue.value.trim())
})

const suggestionRows = computed(() => (suggestions.value?.items ?? []).map((suggestion) => ({ suggestion, parts: getSuggestionParts(suggestion) })))

const selectedIndex = computed(() => Math.min(activeIndex.value, Math.max(suggestionRows.value.length - 1, 0)))

const ghost = computed(() => {
  const range = suggestions.value
  const suggestion = range?.items[selectedIndex.value]

  if (!range || !suggestion || !/^\)*$/.test(modelValue.value.slice(caret.value))) {
    return ''
  }

  const typed = modelValue.value.slice(range.start, caret.value).toLowerCase()
  const replaced = modelValue.value.slice(caret.value, range.end)
  const completion = typed && suggestion.insert.toLowerCase().startsWith(typed) ? suggestion.insert.slice(typed.length) : ''

  return replaced && completion.endsWith(replaced) ? completion.slice(0, -replaced.length) : completion
})

const mirrorParts = computed(() => {
  const position = ghost.value ? caret.value : modelValue.value.length
  const before: QueryPart[] = []
  const after: QueryPart[] = []

  let offset = 0

  for (const part of parts.value) {
    const cut = Math.min(Math.max(position - offset, 0), part.text.length)

    if (cut > 0) {
      before.push({ ...part, text: part.text.slice(0, cut) })
    }

    if (cut < part.text.length) {
      after.push({ ...part, text: part.text.slice(cut) })
    }

    offset += part.text.length
  }

  return { before, after }
})

const starredEntries = computed(() => starred.value.map(createEntry))

const recentEntries = computed(() => history.value.map(createEntry))

watch(suggestions, (value) => {
  if (value && !value.items.length) {
    menuOpen.value = false
  }
})

watch([selectedIndex, suggestionRows], async () => {
  await nextTick()

  const list = listElement.value
  const item = list?.children[selectedIndex.value]

  if (list && item instanceof HTMLElement) {
    if (item.offsetTop < list.scrollTop) {
      list.scrollTop = item.offsetTop
    } else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight
    }
  }
})

onClickOutsideOf(
  [rootElement],
  () => {
    historyOpen.value = false
  },
  { esc: true }
)

function createEntry(query: string) {
  return { query, parts: highlightQuery(parseQuery(query, language.value).tokens) }
}

function createCachedLanguage(source: QueryLanguage): QueryLanguage {
  const cache = new Map<QueryValueKind, string[]>()

  return {
    ...source,
    values: (kind) => {
      let values = cache.get(kind)

      if (!values) {
        values = source.values(kind)

        cache.set(kind, values)
      }

      return values
    }
  }
}

function getPartClasses(part: QueryPart) {
  let color = PART_CLASSES[part.kind]

  if (part.kind === 'script') {
    color = part.className ?? ''
  } else if (part.kind === 'bracket') {
    color = DEPTH_CLASSES[part.depth ?? 0]
  }

  return [color, part.issue ? ISSUE_CLASSES[part.issue] : '', { 'opacity-50': part.escape, 'rounded-xs bg-white/15 outline outline-white/40': part.match }]
}

function getSuggestionParts(suggestion: QuerySuggestion): QueryPart[] {
  switch (suggestion.kind) {
    case 'value':
    case 'string':
    case 'tag':
    case 'header':
      return [{ text: suggestion.label, kind: suggestion.kind }]
    case 'function':
      return [{ text: suggestion.label, kind: 'script', className: 'ta-function' }]
    default:
      return highlightQuery(parseQuery(suggestion.label, language.value).tokens).map((part) => ({ ...part, issue: undefined }))
  }
}

function commit(value: string) {
  committedValue = value

  emit('change', value)
}

function setValue(value: string, position: number) {
  modelValue.value = value
  caret.value = position

  void nextTick(() => {
    fieldElement.value?.focus()
    fieldElement.value?.setSelectionRange(position, position)
  })
}

function editValue(value: string, position: number) {
  setValue(value, position)

  showAll.value = false
  activeIndex.value = 0
}

function updateCaret() {
  const position = fieldElement.value?.selectionStart ?? 0

  if (position !== caret.value) {
    caret.value = position
    activeIndex.value = 0
  }
}

function handleInput(event: Event) {
  const element = event.target as HTMLTextAreaElement

  modelValue.value = element.value.replace(/[\r\n]+/g, ' ')
  caret.value = element.selectionStart
  showAll.value = false
  activeIndex.value = 0
}

function handleClick() {
  menuOpen.value = false

  updateCaret()
}

function handleFocus() {
  cachedLanguage.value = createCachedLanguage(props.language)
  focused.value = true
  historyOpen.value = false

  updateCaret()
}

function handleBlur() {
  focused.value = false
  menuOpen.value = false
  showAll.value = false
  cachedLanguage.value = null

  if (modelValue.value !== committedValue) {
    commit(modelValue.value)
  }
}

function handleKeydown(event: KeyboardEvent) {
  const items = suggestions.value?.items ?? []
  const element = event.target as HTMLTextAreaElement
  const text = modelValue.value
  const position = element.selectionStart
  const next = text[position] ?? ''
  const editable = !event.isComposing && position === element.selectionEnd

  if (event.key === 'ArrowDown' && items.length) {
    event.preventDefault()

    activeIndex.value = (selectedIndex.value + 1) % items.length
  } else if (event.key === 'ArrowUp' && items.length) {
    event.preventDefault()

    activeIndex.value = (selectedIndex.value - 1 + items.length) % items.length
  } else if ((event.key === 'Tab' || event.key === 'Enter') && items.length) {
    event.preventDefault()

    acceptSuggestion(items[selectedIndex.value])
  } else if (event.key === 'Enter') {
    event.preventDefault()

    addHistory(modelValue.value)
    commit(modelValue.value)
  } else if (event.key === 'Escape' && menuOpen.value) {
    event.preventDefault()

    menuOpen.value = false
  } else if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && menuOpen.value) {
    menuOpen.value = false
  } else if (event.key === ' ' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault()

    menuOpen.value = true
    showAll.value = true
    activeIndex.value = 0
  } else if (event.key === 'Tab' && !event.shiftKey && editable && next === ')') {
    event.preventDefault()

    editValue(text, position + 1)
  } else if (event.key === '(' && editable && AUTO_CLOSE_BEFORE.test(next)) {
    event.preventDefault()

    editValue(`${text.slice(0, position)}()${text.slice(position)}`, position + 1)
  } else if (event.key === ')' && editable && next === ')') {
    event.preventDefault()

    editValue(text, position + 1)
  } else if (event.key === 'Backspace' && editable && !event.ctrlKey && !event.altKey && !event.metaKey && text[position - 1] === '(' && next === ')') {
    event.preventDefault()

    editValue(text.slice(0, position - 1) + text.slice(position + 1), position - 1)
  }
}

function acceptSuggestion(suggestion: QuerySuggestion) {
  const range = suggestions.value

  if (!range) {
    return
  }

  const text = modelValue.value

  let value = text.slice(0, range.start) + suggestion.insert + text.slice(range.end)
  let position = range.start + suggestion.insert.length

  if (suggestion.insert.endsWith('(') && AUTO_CLOSE_BEFORE.test(value[position] ?? '')) {
    value = `${value.slice(0, position)})${value.slice(position)}`
  } else if (!suggestion.keepOpen && value[position] !== ' ') {
    value = `${value.slice(0, position)} ${value.slice(position)}`
    position++
  }

  editValue(value, position)

  menuOpen.value = suggestion.keepOpen
}

function pick(query: string) {
  historyOpen.value = false

  setValue(query, query.length)
  commit(query)
}

function clear() {
  historyOpen.value = false

  setValue('', 0)
  commit('')
}

function addHistory(value: string) {
  if (value && history.value[0] !== value && !starred.value.includes(value)) {
    history.value = [value, ...history.value.filter((entry) => entry !== value)].slice(0, 5)
  }
}

function star(query: string) {
  history.value = history.value.filter((entry) => entry !== query)

  saveStarredFilters([...starred.value, query])
}

function unstar(query: string) {
  saveStarredFilters(starred.value.filter((entry) => entry !== query))
}
</script>
