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
