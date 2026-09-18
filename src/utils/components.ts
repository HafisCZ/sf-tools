import { type InjectionKey } from 'vue'
import { type IconName } from './icons'

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
   * Highlights the item
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
   * URL of an image shown next to the label
   */
  image?: string
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
}

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
