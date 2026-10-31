import { computed, nextTick, ref, toValue, type InjectionKey, type MaybeRefOrGetter } from 'vue'
import { type IconName } from './icons'
import { type ValidationProps } from './validations'

export type TableSorting = {
  /**
   * Column the rows are sorted by
   */
  column: string
  /**
   * `asc` is the column's first direction, `desc` the opposite one
   */
  direction: 'asc' | 'desc'
}

export type TableOptions = {
  dense: boolean
  sort: {
    isSortedBy: (column: string) => 'asc' | 'desc' | false
    sortBy: (column: string, first?: 'asc' | 'desc') => void
  }
}

export const TABLE_OPTIONS_KEY: InjectionKey<TableOptions> = Symbol('SFTable')

export const DEFAULT_TABLE_OPTIONS: TableOptions = {
  dense: false,
  sort: {
    isSortedBy: () => false,
    sortBy: () => {}
  }
}

export type SelectHeader = {
  /**
   * Marks the entry as a header row
   */
  type: 'header'
  /**
   * Text of the header
   */
  label: string
}

export type SelectDivider = {
  /**
   * Marks the entry as a divider line
   */
  type: 'divider'
}

export type DropdownItem =
  | {
      /**
       * Text of the item
       */
      label: string
      /**
       * Icon name or image URL shown before the label
       */
      image?: IconName | `/${string}`
      /**
       * Highlights the item
       */
      active?: boolean
      /**
       * Shows the item without letting it be chosen
       */
      disabled?: boolean
      /**
       * Runs when the item is chosen
       */
      action: () => void
    }
  | SelectHeader
  | SelectDivider

export function isSelectable<TItem extends object>(item: TItem): item is Exclude<TItem, SelectHeader | SelectDivider> {
  return !('type' in item)
}

export function usePagedList<TItem>(items: MaybeRefOrGetter<TItem[]>, pageSize: MaybeRefOrGetter<number | undefined>, list: MaybeRefOrGetter<Element | null | undefined>) {
  const renderStart = ref(0)
  const renderEnd = ref(0)

  const renderedItems = computed(() => (toValue(pageSize) ? toValue(items).slice(renderStart.value, renderEnd.value) : toValue(items)))

  function showPage(index: number) {
    const size = toValue(pageSize)

    if (!size) return

    renderStart.value = Math.max(0, Math.min(index - Math.floor(size / 2), toValue(items).length - size))
    renderEnd.value = renderStart.value + size
  }

  async function loadMore(event: Event) {
    const size = toValue(pageSize)
    const container = event.currentTarget

    if (!size || !(container instanceof HTMLElement)) return

    if (container.scrollHeight - container.scrollTop - container.clientHeight < container.clientHeight && renderEnd.value < toValue(items).length) {
      renderEnd.value += size
    }

    if (container.scrollTop < container.clientHeight && renderStart.value > 0) {
      const anchor = toValue(list)?.firstElementChild
      const top = anchor?.getBoundingClientRect().top ?? 0

      renderStart.value = Math.max(0, renderStart.value - size)

      await nextTick()

      if (anchor) {
        container.scrollTop += anchor.getBoundingClientRect().top - top
      }
    }
  }

  return { renderStart, renderedItems, showPage, loadMore }
}

export type ExpressionSuggestion = {
  /**
   * Text inserted into the field
   */
  value: string
  /**
   * Text shown in the list
   */
  label: string
  /**
   * Icon shown before the label
   */
  icon?: IconName
  /**
   * Matches the whole line up to the caret instead of only the last word
   */
  line?: boolean
}

export type ExpressionHighlight = {
  /**
   * HTML drawn over the field
   */
  html: string
  /**
   * HTML shown in the corner of the field, hidden when empty
   */
  info?: string
}

export type ExpressionEditorProps = ValidationProps<string> & {
  /**
   * Text shown above the field, also its accessible name
   */
  label?: string
  /**
   * Shows an error while the field is empty
   */
  required?: boolean
  /**
   * Turns the value into the highlighted HTML drawn over the field
   */
  highlight: (value: string) => ExpressionHighlight
  /**
   * Entries offered by Ctrl+Space and while typing
   */
  suggestions?: ExpressionSuggestion[]
  /**
   * Characters that open and close a field, Tab and Shift+Tab jump between fields and `a|b` inside a field offers its choices
   */
  fields?: [left: string, right: string]
  /**
   * Opening characters mapped to their closing ones, closed automatically and highlighted in pairs
   */
  brackets?: Record<string, string>
  /**
   * Text that starts a comment, Ctrl+Shift+X adds or removes it at the start of the selected lines
   */
  comment?: string
  /**
   * Tab and Shift+Tab indent and outdent the selected lines by two spaces
   */
  indent?: boolean
  /**
   * Shows line numbers next to the text
   */
  lineNumbers?: boolean
  /**
   * Shows the caret line, column and selection length under the field
   */
  statusBar?: boolean
  /**
   * Replaces the value with the text of a dropped text file
   */
  useDragAndDrop?: boolean
  /**
   * Turns tabs in pasted text into spaces
   */
  replaceTabs?: boolean
  /**
   * Ctrl+S and Ctrl+Shift+S emit `save`
   */
  useSave?: boolean
}

export type SelectOption<TValue = string> =
  | {
      /**
       * Value stored in the model when the option is picked
       */
      value: TValue
      /**
       * Text shown for the option
       */
      label: string
      /**
       * Icon name or image URL shown next to the label
       */
      image?: IconName | `/${string}`
      /**
       * Side of the label the image is shown on
       */
      imagePosition?: 'left' | 'right'
      /**
       * Smaller grey text shown under the label
       */
      description?: string
      /**
       * CSS colour of the label
       */
      color?: string
      /**
       * Shows the label in the accent color
       */
      accent?: boolean
      /**
       * Shows the option greyed out and keeps it from being picked
       */
      disabled?: boolean
    }
  | SelectHeader
  | SelectDivider

export type ToastType = 'default' | 'success' | 'warning' | 'error'

export type ToastParams = {
  /**
   * Title shown in bold
   */
  title: string
  /**
   * Text under the title
   */
  message: string
  /**
   * Picks the icon and its colour
   */
  type?: ToastType
  /**
   * Replaces the icon the type would show
   */
  icon?: IconName
}
