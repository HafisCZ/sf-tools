import { type InjectionKey } from 'vue'
import { type IconName } from './icons'

export type TableSorting = {
  /**
   * Column the rows are sorted by
   */
  column: string
  /**
   * Whether the column is sorted from its first direction or the opposite one
   */
  direction: 'asc' | 'desc'
}

export type TableOptions = {
  /**
   * Cells use smaller padding
   */
  dense: boolean
  sort: {
    /**
     * Direction the column is sorted in, or false when the rows are sorted by another column
     */
    isSortedBy: (column: string) => 'asc' | 'desc' | false
    /**
     * Sorts by the column, turns the sorting around when it already sorts by it, and removes it on the click after that
     */
    sortBy: (column: string, first?: 'asc' | 'desc') => void
  }
}

/**
 * SFTable provides its options under this key to the headers and cells inside it
 */
export const TABLE_OPTIONS_KEY: InjectionKey<TableOptions> = Symbol('SFTable')

/**
 * Options a header or cell outside of a table works with
 */
export const DEFAULT_TABLE_OPTIONS: TableOptions = {
  dense: false,
  sort: {
    isSortedBy: () => false,
    sortBy: () => {}
  }
}

export type DropdownItem = {
  /**
   * Text of the item
   */
  label: string
  /**
   * URL of an image shown before the label
   */
  image?: string
  /**
   * Highlights the item, such as the currently selected value
   */
  active?: boolean
  /**
   * Runs when the item is chosen
   */
  action: () => void
}

export type SelectOption<TValue = string> = {
  /**
   * Value stored in the model when the option is picked
   */
  value: TValue
  /**
   * Text shown for the option
   */
  label: string
  /**
   * URL of an image shown before the label
   */
  image?: string
  /**
   * Shows the label in the accent color
   */
  accent?: boolean
}

export type ToastType = 'default' | 'success' | 'warning' | 'error'

export type ToastParams = {
  /**
   * Bold first line
   */
  title: string
  /**
   * Text under the title
   */
  message: string
  /**
   * Picks the icon and its colour, `default` has no icon
   */
  type?: ToastType
  /**
   * Replaces the icon the type would show
   */
  icon?: IconName
}
