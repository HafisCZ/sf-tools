<template>
  <div class="flex flex-col gap-1.5" :class="{ 'h-full min-h-0': props.multiline }">
    <label v-if="props.label" :for="id" class="font-bold text-white">{{ props.label }}</label>
    <div class="relative flex min-h-0 flex-1 flex-col">
      <textarea
        v-if="props.multiline"
        :id="id"
        ref="field-ref"
        :value="text"
        v-bind="$attrs"
        wrap="off"
        spellcheck="false"
        class="min-h-0 w-full flex-1 resize-none overflow-auto overscroll-none rounded-md border bg-surface pt-[11px] pr-[14px] pb-[11px] font-mono text-[14px] leading-[18px] whitespace-pre text-transparent caret-white/60 outline-none selection:bg-[rgba(100,100,100,0.4)] selection:text-transparent placeholder:text-white/40"
        :class="[BORDER_CLASSES[validationResult?.[0] ?? 'default'], props.lineNumbers ? 'pl-10' : 'pl-[14px]', { 'rounded-b-none': props.statusBar }]"
        :aria-invalid="validationResult?.[0] === 'error'"
        v-on="listeners"
      />
      <input
        v-else
        :id="id"
        ref="field-ref"
        :value="text"
        v-bind="$attrs"
        type="text"
        spellcheck="false"
        autocomplete="off"
        class="w-full rounded-md border bg-surface px-3 py-2 font-mono leading-5 text-transparent caret-white/60 outline-none selection:bg-[rgba(100,100,100,0.4)] selection:text-transparent placeholder:text-white/40"
        :class="BORDER_CLASSES[validationResult?.[0] ?? 'default']"
        :aria-invalid="validationResult?.[0] === 'error'"
        v-on="listeners"
      />
      <div v-if="props.multiline && props.lineNumbers" aria-hidden="true" class="pointer-events-none absolute top-px left-px w-[30px] overflow-hidden text-right text-xs leading-[18px] text-white/40" :class="props.statusBar ? 'bottom-[18px]' : 'bottom-px'">
        <div class="pt-[11px]" :style="{ transform: `translateY(${-scroll.top}px)` }">
          <div v-for="line in lineCount" :key="line" class="h-[18px]">{{ line }}</div>
        </div>
      </div>
      <div aria-hidden="true" class="pointer-events-none absolute top-px right-px overflow-hidden" :class="[props.multiline && props.lineNumbers ? 'left-[41px]' : 'left-px', props.statusBar ? 'bottom-[18px]' : 'bottom-px']">
        <div :class="overlayClasses" :style="{ transform: `translate(${-scroll.left}px, ${-scroll.top}px)` }">
          <div class="expression-text relative w-max font-mono whitespace-pre text-white">
            <div v-html="highlighted.html" />
            <div v-for="(position, index) in bracketPositions" :key="index" class="absolute border border-white/30 pb-px" :style="{ top: `${position.top}px`, left: `${position.left}px` }">&nbsp;</div>
          </div>
        </div>
      </div>
      <div v-if="highlighted.info" aria-hidden="true" class="expression-text pointer-events-none absolute top-0 right-[17px] px-[15px] py-2.5 text-xs text-[#ccc]" v-html="highlighted.info" />
      <div ref="measure-ref" aria-hidden="true" class="invisible absolute top-0 left-0 font-mono whitespace-pre" :class="props.multiline ? 'text-[14px] leading-[18px]' : 'leading-5'" />
      <ul v-if="suggestionsActive" ref="suggestions-ref" role="listbox" class="absolute z-10 max-h-[300px] min-h-[100px] w-[400px] overflow-y-scroll border border-white/15 bg-[#2c2c2c] font-mono text-[14px] leading-[18px] whitespace-nowrap" :style="suggestionsStyle" @mousedown.prevent>
        <li v-for="(suggestion, index) in visibleSuggestions" :key="suggestion.value" role="option" :aria-selected="index === selectedIndex" class="flex cursor-pointer items-center pl-1 whitespace-pre hover:bg-[#3c3c3c]" :class="{ 'bg-[#3c3c3c]': index === selectedIndex }" @click="applySuggestion(suggestion)">
          <SFIcon v-if="suggestion.icon" :name="suggestion.icon" class="mr-[5px] w-[15px] text-[80%] text-[#888888bf]" />
          {{ suggestion.label }}
        </li>
      </ul>
      <div v-if="props.statusBar" class="flex h-[17px] items-center justify-end rounded-b-md bg-[#2e2e2e] pr-[25px] font-mono text-[11px] leading-[11px] text-[#ccc]">
        <span v-if="caret">Ln {{ caret.line }}, Col {{ caret.column }}{{ caret.selected ? ` (${caret.selected} selected)` : '' }}</span>
      </div>
    </div>
    <SFValidation v-if="validationResult" :type="validationResult[0]" :message="validationResult[1]" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { type ExpressionEditorProps, type ExpressionSuggestion } from '@utils/components'
import { invertRecord } from '@utils/utils'
import { createDefaultValidator, useValidation } from '@utils/validations'
import SFIcon from './SFIcon.vue'
import SFValidation from './SFValidation.vue'

defineOptions({
  name: 'SFExpressionEditor',
  inheritAttrs: false
})

const props = withDefaults(
  defineProps<
    ExpressionEditorProps & {
      /**
       * Uses a multi-line text area instead of a single-line input
       */
      multiline?: boolean
    }
  >(),
  {
    suggestions: () => []
  }
)

const emit = defineEmits<{
  /**
   * Ctrl+S or Ctrl+Shift+S was pressed, `leave` is true for Ctrl+Shift+S
   */
  save: [leave: boolean]
}>()

const modelValue = defineModel<string>({ required: true })

defineExpose({
  focus,
  get isValid() {
    return isValid.value
  }
})

type SelectedLine = {
  start: number
  end: number
  index: number
  commentStart?: number
}

const BORDER_CLASSES = {
  default: 'border-line focus:not-read-only:border-accent',
  error: 'border-red-400',
  warning: 'border-yellow-400'
}

const id = useId()

const fieldElement = useTemplateRef<HTMLTextAreaElement | HTMLInputElement>('field-ref')
const measureElement = useTemplateRef('measure-ref')
const suggestionsElement = useTemplateRef('suggestions-ref')

const text = ref(stripFields(modelValue.value))

const scroll = ref({ top: 0, left: 0 })
const caret = ref<{ line: number; column: number; selected: number } | null>(null)
const bracketPositions = shallowRef<{ top: number; left: number }[]>([])

const suggestionsActive = ref(false)
const visibleSuggestions = shallowRef<ExpressionSuggestion[]>([])
const selectedIndex = ref(0)
const suggestionsPosition = ref({ top: 0, left: 0 })

let suggestionsInstant = false

const { validationVisible, validationResult, isValid } = useValidation(modelValue, props, createDefaultValidator(props))

const overlayClasses = computed(() => {
  if (props.multiline) {
    return ['pt-[11px] text-[14px] leading-[18px]', props.lineNumbers ? '' : 'pl-[14px]']
  } else {
    return 'px-3 py-2 leading-5'
  }
})

const highlighted = computed(() => props.highlight(text.value))

const lineCount = computed(() => text.value.split('\n').length)

const closingBrackets = computed(() => props.brackets ?? {})
const openingBrackets = computed(() => invertRecord(closingBrackets.value) as Record<string, string>)
const allBrackets = computed(() => ({ ...closingBrackets.value, ...openingBrackets.value }))

const suggestionsStyle = computed(() => {
  const offset = getContentOffset()

  return {
    top: `${offset.top + suggestionsPosition.value.top - scroll.value.top}px`,
    left: `${offset.left + suggestionsPosition.value.left - scroll.value.left}px`
  }
})

const listeners = {
  input: handleInput,
  keydown: handleKeydown,
  keyup: updateCaret,
  click: handleClick,
  blur: hideSuggestions,
  scroll: updateScroll,
  paste: handlePaste,
  dragover: handleDrag,
  dragenter: handleDrag,
  drop: handleDrop
}

watch(text, (value) => {
  modelValue.value = stripFields(value)
})

watch(modelValue, (value) => {
  if (value !== stripFields(text.value)) {
    setContent(value)
  }
})

function focus() {
  fieldElement.value?.focus()
}

function stripFields(value: string) {
  return props.fields ? value.replaceAll(props.fields[0], '').replaceAll(props.fields[1], '') : value
}

function setContent(value: string) {
  const field = fieldElement.value
  const unchanged = text.value === value
  const start = field?.selectionStart ?? 0
  const end = field?.selectionEnd ?? 0

  text.value = stripFields(value)

  if (field) {
    field.value = text.value

    if (unchanged) {
      field.setSelectionRange(start, end, 'forward')
    } else {
      field.setSelectionRange(0, 0, 'forward')
      field.scrollTo(0, 0)
    }
  }
}

function update() {
  if (fieldElement.value) {
    text.value = fieldElement.value.value
  }
}

function stopAndPrevent(event: Event) {
  event.stopPropagation()
  event.preventDefault()
}

function getContentOffset() {
  const field = fieldElement.value

  if (!field) {
    return { top: 0, left: 0 }
  }

  const style = getComputedStyle(field)

  return {
    top: parseFloat(style.paddingTop) + parseFloat(style.borderTopWidth),
    left: parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth)
  }
}

function measure(content: string) {
  const element = measureElement.value

  if (!element) {
    return { width: 0, height: 0 }
  }

  element.textContent = content || '​'

  const rectangle = element.getBoundingClientRect()

  // Cleared so a long measured line does not widen the page
  element.textContent = ''

  return { width: rectangle.width, height: rectangle.height }
}

function isCharacterEscaped(content: string, index: number, start: number) {
  if (content[index - 1] != '\\') {
    return false
  } else {
    let escaped = true

    for (let i = index - 2; i >= start && content[i] === '\\'; i--) {
      escaped = !escaped
    }

    return escaped
  }
}

function getSelectedLines(field: HTMLTextAreaElement | HTMLInputElement) {
  const value = field.value

  const start = field.selectionStart ?? 0
  const end = field.selectionEnd ?? 0

  const startBlock = start > 0 ? value.lastIndexOf('\n', start - 1) + 1 : 0

  const lines: SelectedLine[] = []
  let line: SelectedLine | null = null
  let lineIndex = 0
  let lineQuote: string | false = false

  for (let i = 0; i < startBlock; i++) {
    if (value[i] === '\n') lineIndex++
  }

  for (let i = startBlock; i <= value.length; i++) {
    if (line === null) {
      line = { start: i, end: -1, index: lineIndex++ }
      lines.push(line)

      lineQuote = false
    }

    if (value[i] === '\n') {
      line.end = i
      line = null

      if (i >= end) {
        break
      }
    } else if (value[i] === "'" || value[i] === '"' || value[i] === '`') {
      if (value[i - 1] === '\\' || (lineQuote && value[i] !== lineQuote)) continue
      else {
        lineQuote = lineQuote ? false : value[i]
      }
    } else if (props.comment && !isCharacterEscaped(value, i, line.start) && value.startsWith(props.comment, i) && !lineQuote) {
      line.commentStart = i
    }
  }

  if (line) line.end = value.length

  const lastLine = lines[lines.length - 1]

  return {
    start,
    end,
    endCharacter: end - lastLine.start,
    endLine: lastLine.index,
    lines
  }
}

function isField(content: string, start: number, end: number) {
  return props.fields !== undefined && content[start] === props.fields[0] && content[end - 1] === props.fields[1]
}

function getSuggestionContent(value: string, start: number, end: number) {
  const line = value.substring(start, end).trimStart()
  const word = line.slice(line.lastIndexOf(line.match(/[^\w@]/g)?.pop() || ' ') + 1)

  return { line, word }
}

function getInstantSuggestions(options: string[]) {
  const known = props.suggestions.filter((suggestion) => options.includes(suggestion.value))
  const instant = options.filter((option, index) => options.indexOf(option) === index && !known.some((suggestion) => suggestion.value === option)).map((option) => ({ value: option, label: option }))

  return [...known, ...instant]
}

function getSuggestions(field: HTMLTextAreaElement | HTMLInputElement) {
  const { start, end, lines, endLine } = getSelectedLines(field)
  const value = field.value

  if (isField(value, start, end)) {
    const { width, height } = measure(value.slice(lines[0].start, start))

    const fieldText = value.slice(start + 1, end - 1)
    if (fieldText.includes('|')) {
      suggestionsInstant = true

      return {
        suggestions: getInstantSuggestions(fieldText.split('|')),
        left: width,
        top: height * (1 + endLine)
      }
    } else {
      return {
        suggestions: props.suggestions.filter((suggestion) => !suggestion.line),
        left: width,
        top: height * (1 + endLine)
      }
    }
  } else {
    const { line, word } = getSuggestionContent(value, lines[lines.length - 1].start, end)
    const { width, height } = measure(value.slice(lines[lines.length - 1].start, end))

    return {
      suggestions: props.suggestions.filter((suggestion) => (suggestion.line ? suggestion.value.startsWith(line) : suggestion.value.startsWith(word))),
      left: width,
      top: height * (1 + endLine)
    }
  }
}

function updateSuggestions() {
  const field = fieldElement.value
  if (!field) return

  const { suggestions, top, left } = getSuggestions(field)

  if (suggestions.length > 0) {
    visibleSuggestions.value = suggestions
    suggestionsPosition.value = { top, left }
    selectedIndex.value = 0
    suggestionsActive.value = true

    void nextTick(() => suggestionsElement.value?.scrollTo(0, 0))
  } else {
    hideSuggestions()
  }
}

function hideSuggestions() {
  suggestionsActive.value = false
  suggestionsInstant = false
}

function moveSuggestion(down: boolean) {
  const count = visibleSuggestions.value.length

  selectedIndex.value = down ? (selectedIndex.value + 1) % count : (selectedIndex.value - 1 + count) % count

  const list = suggestionsElement.value
  const item = list?.children[selectedIndex.value]

  if (list && item instanceof HTMLElement) {
    if (item.offsetTop < list.scrollTop) {
      list.scrollTop = item.offsetTop
    } else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight
    }
  }
}

function applySuggestion(suggestion: ExpressionSuggestion) {
  const field = fieldElement.value
  if (!field) return

  const { start, end, lines } = getSelectedLines(field)
  const { line, word } = getSuggestionContent(field.value, lines[lines.length - 1].start, end)

  let offset = 0
  const fragment = suggestion.value.slice(suggestion.line ? line.length : word.length)

  const fieldSelected = isField(field.value, start, end)
  if (fieldSelected) {
    offset -= end - start
  }

  field.setRangeText(fragment, fieldSelected ? start : end, end)

  if (props.fields && suggestion.value.includes(props.fields[0])) {
    field.setSelectionRange(start, start, 'forward')
  } else {
    field.setSelectionRange(end + fragment.length + offset, end + fragment.length + offset, 'forward')
  }

  hideSuggestions()
  update()

  field.focus()

  focusNextField()
}

function countInSlice(value: string, character: string, start: number, end: number) {
  let count = 0

  for (let i = start; i < end; i++) {
    if (value[i] === character) count++
  }

  return count
}

function selectField(field: HTMLTextAreaElement | HTMLInputElement, start: number, end: number) {
  field.setSelectionRange(start, end, 'forward')

  if (countInSlice(field.value, '|', start, end) > 0) {
    updateSuggestions()
  }
}

function focusPreviousField() {
  const field = fieldElement.value
  if (!field || !props.fields) return false

  const [left, right] = props.fields
  const value = field.value
  const start = field.selectionStart ?? 0

  for (let i = start - 1, fieldEnd: number | null = null; i >= 0; i--) {
    if (value[i] === '\n') fieldEnd = null
    else if (value[i] === right) fieldEnd = i + 1
    else if (value[i] === left && fieldEnd !== null) {
      selectField(field, i, fieldEnd)

      return true
    }
  }

  for (let i = value.length - 1, fieldEnd: number | null = null; i > start; i--) {
    if (value[i] === '\n') fieldEnd = null
    else if (value[i] === right) fieldEnd = i + 1
    else if (value[i] === left && fieldEnd !== null) {
      selectField(field, i, fieldEnd)

      return true
    }
  }

  return false
}

function focusNextField() {
  const field = fieldElement.value
  if (!field || !props.fields) return false

  const [left, right] = props.fields
  const value = field.value
  const end = field.selectionEnd ?? 0

  for (let i = end, fieldStart: number | null = null; i < value.length; i++) {
    if (value[i] === '\n') fieldStart = null
    else if (value[i] === left) fieldStart = i
    else if (value[i] === right && fieldStart !== null) {
      selectField(field, fieldStart, i + 1)

      return true
    }
  }

  for (let i = 0, fieldStart: number | null = null; i < end; i++) {
    if (value[i] === '\n') fieldStart = null
    else if (value[i] === left) fieldStart = i
    else if (value[i] === right && fieldStart !== null) {
      selectField(field, fieldStart, i + 1)

      return true
    }
  }

  return false
}

function toggleComment(field: HTMLTextAreaElement | HTMLInputElement, prefix: string) {
  const content = field.value
  let offset = 0

  const { lines } = getSelectedLines(field)

  if (lines.some(({ start, end }) => start !== end && !content.startsWith(prefix, start))) {
    for (const { start, end } of lines) {
      if (start !== end && !content.startsWith(prefix, start)) {
        field.setRangeText(prefix, start + offset, start + offset)
        offset += prefix.length
      }
    }
  } else {
    for (const { start } of lines) {
      if (content.startsWith(prefix, start)) {
        field.setRangeText('', start + offset, start + offset + prefix.length)
        offset -= prefix.length
      }
    }
  }

  update()
}

function indentLines(field: HTMLTextAreaElement | HTMLInputElement, outdent: boolean) {
  const content = field.value
  let offset = 0

  const { start, end, lines } = getSelectedLines(field)

  if (outdent) {
    for (const line of lines) {
      if (line.start + 1 < line.end && content[line.start] === ' ' && content[line.start + 1] === ' ') {
        field.setRangeText('', line.start + offset, line.start + offset + 2)
        offset -= 2
      } else if (line.start < line.end && content[line.start] === ' ') {
        field.setRangeText('', line.start + offset, line.start + offset + 1)
        offset -= 1
      }
    }
  } else if (start === end) {
    field.setRangeText('  ', start, start, 'end')
  } else {
    for (const line of lines) {
      if (line.start !== line.end) {
        field.setRangeText('  ', line.start + offset, line.start + offset)
        offset += 2
      }
    }
  }

  update()
}

function closeBracket(field: HTMLTextAreaElement | HTMLInputElement, event: KeyboardEvent, opening: string, closing: string) {
  const start = field.selectionStart ?? 0
  const end = field.selectionEnd ?? 0

  if (start === end) {
    const value = field.value

    if (start >= value.length || (/[\n\W]/.test(value[start]) && /[^\\'"`]/.test(value[start]))) {
      field.setRangeText(closing, end, end)
    }
  } else if (getSelectedLines(field).lines.length === 1) {
    stopAndPrevent(event)

    field.setRangeText(opening, start, start)
    field.setRangeText(closing, field.selectionEnd ?? 0, field.selectionEnd ?? 0)
    field.selectionStart = (field.selectionStart ?? 0) + 1

    update()
  }
}

function findBracketPositions(value: string, selectionStart: number, line: SelectedLine) {
  let positionLeft: number | null = null
  let positionRight: number | null = null
  let character: string | null = null

  if (Object.hasOwn(closingBrackets.value, value[selectionStart])) {
    character = closingBrackets.value[value[selectionStart]]
    positionLeft = selectionStart
  } else if (Object.hasOwn(openingBrackets.value, value[selectionStart])) {
    character = openingBrackets.value[value[selectionStart]]
    positionRight = selectionStart
  } else if (Object.hasOwn(closingBrackets.value, value[selectionStart - 1])) {
    character = closingBrackets.value[value[selectionStart - 1]]
    positionLeft = selectionStart - 1
  } else if (Object.hasOwn(openingBrackets.value, value[selectionStart - 1])) {
    character = openingBrackets.value[value[selectionStart - 1]]
    positionRight = selectionStart - 1
  }

  if (character === null) {
    return []
  }

  const { start, end, commentStart } = line
  const stack = [character]
  const contentEnd = commentStart === undefined ? end : commentStart - 1

  if (positionLeft !== null && commentStart !== undefined && positionLeft > commentStart) {
    positionLeft = null
  } else if (positionRight !== null && commentStart !== undefined && positionRight > commentStart) {
    positionRight = null
  } else if (positionLeft === null && positionRight !== null) {
    for (let i = positionRight - 1; i >= start; i--) {
      if (value[i] === stack[0]) {
        stack.shift()

        if (stack.length === 0) {
          positionLeft = i
          break
        }
      } else if (Object.hasOwn(allBrackets.value, value[i])) {
        stack.unshift(allBrackets.value[value[i]])
      }
    }
  } else if (positionRight === null && positionLeft !== null) {
    for (let i = positionLeft + 1; i <= contentEnd; i++) {
      if (value[i] === stack[0]) {
        stack.shift()

        if (stack.length === 0) {
          positionRight = i
          break
        }
      } else if (Object.hasOwn(allBrackets.value, value[i])) {
        stack.unshift(allBrackets.value[value[i]])
      }
    }
  }

  return [positionLeft, positionRight].filter((position) => position !== null)
}

function updateCaret() {
  const field = fieldElement.value
  if (!field) return

  const { start, end, endLine, endCharacter, lines } = getSelectedLines(field)

  caret.value = { line: endLine + 1, column: endCharacter + 1, selected: end - start }

  if (props.brackets && start === end) {
    const line = lines[0]

    bracketPositions.value = findBracketPositions(field.value, start, line).map((position) => {
      const { width, height } = measure(field.value.slice(line.start, position))

      return { top: height * line.index, left: width }
    })
  } else {
    bracketPositions.value = []
  }
}

function updateScroll() {
  const field = fieldElement.value

  if (field) {
    scroll.value = { top: field.scrollTop, left: field.scrollLeft }
  }
}

function handleInput() {
  if (suggestionsActive.value) {
    updateSuggestions()
  }

  update()
}

function handleClick() {
  hideSuggestions()
  updateCaret()
}

function handleKeydown(event: KeyboardEvent) {
  validationVisible.value = true

  const field = fieldElement.value
  if (!field) return

  if (props.useSave && event.ctrlKey && event.key === 's') {
    stopAndPrevent(event)

    emit('save', false)
  } else if (props.useSave && event.ctrlKey && event.shiftKey && event.key === 'S') {
    stopAndPrevent(event)

    emit('save', true)
  } else if ((props.suggestions.length > 0 || props.fields) && event.ctrlKey && event.key === ' ') {
    stopAndPrevent(event)

    updateSuggestions()
  } else if (props.comment && event.ctrlKey && event.shiftKey && event.key === 'X') {
    stopAndPrevent(event)

    toggleComment(field, props.comment)
  } else if (suggestionsActive.value) {
    if (event.key === 'Backspace' && /[\n\W]/.test(field.value[(field.selectionEnd ?? 0) - 1] ?? '')) {
      stopAndPrevent(event)

      hideSuggestions()
    } else if (event.key === 'Escape' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      if (event.key === 'Escape') {
        event.stopPropagation()
      }

      hideSuggestions()
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      stopAndPrevent(event)

      const suggestion = visibleSuggestions.value[selectedIndex.value]
      if (suggestion) {
        applySuggestion(suggestion)
      }
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      stopAndPrevent(event)

      moveSuggestion(event.key === 'ArrowDown')
    } else if (suggestionsInstant) {
      hideSuggestions()
    }
  } else if (props.fields && event.key === 'Tab' && (event.shiftKey ? focusPreviousField() : focusNextField())) {
    stopAndPrevent(event)
  } else if (props.indent && event.key === 'Tab') {
    stopAndPrevent(event)

    indentLines(field, event.shiftKey)
  } else if (props.brackets && Object.hasOwn(props.brackets, event.key)) {
    closeBracket(field, event, event.key, props.brackets[event.key])
  } else if (props.brackets && event.key === 'Backspace') {
    const value = field.value
    const start = field.selectionStart ?? 0

    if (Object.hasOwn(props.brackets, value[start - 1]) && props.brackets[value[start - 1]] === value[start]) {
      field.setRangeText('', start, start + 1)
    }
  }
}

function handlePaste(event: ClipboardEvent) {
  const field = fieldElement.value
  if (!props.replaceTabs || !field) return

  stopAndPrevent(event)

  field.setRangeText((event.clipboardData?.getData('text') ?? '').replace(/\t/g, ' '), field.selectionStart ?? 0, field.selectionEnd ?? 0, 'end')

  update()
}

function handleDrag(event: DragEvent) {
  if (props.useDragAndDrop) {
    stopAndPrevent(event)
  }
}

function handleDrop(event: DragEvent) {
  const file = event.dataTransfer?.files[0]

  if (props.useDragAndDrop && file && (!file.type || file.type === 'text/plain')) {
    stopAndPrevent(event)

    void file.text().then((content) => setContent(content))
  }
}
</script>
