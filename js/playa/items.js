/*
    A part of localization was extracted from game localization.
    Everything is owned exclusively by Playa Games and by using it you acknowledge that you have usage rights to this content.
    Playa Games has a right to request takedown of this content at support@mar21.eu if needed.
*/
const Loca = {
  fill: function (co, ze, text = co.toString()) {
      return '0'.repeat(Math.max(0, ze - text.length)) + text;
  },
  name : function (itemType, itemIndex, itemClass) {
      if (itemClass == undefined || itemType >= 8) {
          return intl(`items.item_type_${this.fill(itemType, 2)}_pic_${this.fill(itemIndex, 3)}`);
      } else {
          if (itemType > 1 && itemIndex >= 100) {
              itemClass = 1;
          }

          return intl(`items.item_type_${this.fill(itemType, 2)}_class_${itemClass}_pic_${Loca.fill(itemIndex, 3)}`);
      }
  },
  pic: function (itemType, itemIndex, itemVariant, itemClass) {
      if (itemType >= 10) {
          itemVariant = 1
          itemClass = 1
      }

      return `res/items/${itemType}_${itemIndex}_${itemVariant || 1}_${itemClass || 1}.png`;
  }
}
