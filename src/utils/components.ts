import { type IconName } from './icons'

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

export type SelectOption = {
  /**
   * Value stored in the model when the option is picked
   */
  value: string
  /**
   * Text shown for the option
   */
  label: string
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
