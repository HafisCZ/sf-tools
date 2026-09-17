/**
 * Drops the fraction and separates the digits into groups of three, such as `1 234 567`
 */
export function formatSpacedNumber(value: number, delimiter = ' ') {
  return String(Math.trunc(value)).replace(/\B(?=(\d{3})+(?!\d))/g, delimiter)
}
