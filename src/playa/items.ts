/*
    A part of localization was extracted from game localization.
    Everything is owned exclusively by Playa Games and by using it you acknowledge that you have usage rights to this content.
    Playa Games has a right to request takedown of this content at support@mar21.eu if needed.
*/
import { globalLocalize } from '@utils/localization'

export const Loca = {
  fill: function (value: number, length: number, text = value.toString()) {
    return '0'.repeat(Math.max(0, length - text.length)) + text
  },
  name: function (itemType: number, itemIndex: number, itemClass?: number) {
    if (itemClass == undefined || itemType >= 8) {
      return globalLocalize(`items.item_type_${this.fill(itemType, 2)}_pic_${this.fill(itemIndex, 3)}`)
    } else {
      const shownClass = itemType > 1 && itemIndex >= 100 ? 1 : itemClass

      return globalLocalize(`items.item_type_${this.fill(itemType, 2)}_class_${shownClass}_pic_${Loca.fill(itemIndex, 3)}`)
    }
  },
  pic: function (itemType: number, itemIndex: number, itemVariant?: number, itemClass?: number) {
    if (itemType >= 10) {
      return `res/items/${itemType}_${itemIndex}_1_1.png`
    }

    return `res/items/${itemType}_${itemIndex}_${(itemVariant ?? 0) + 1}_${itemClass || 1}.png`
  }
}
