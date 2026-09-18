import { sum } from '@utils/utils'
import { Loca } from '~/playa/items'
import { ComplexDataType } from './complex-data-type'
import { type BlacksmithResources, type ItemAttribute } from './types'

export type ItemSellPrice = BlacksmithResources & {
  Gold: number
  Mushrooms: number
}

export class ItemModel {
  static LEGACY = 0
  static MODERN = 1

  static empty() {
    return new ItemModel(ItemModel.MODERN, new Array<number>(19).fill(0), 0, 0)
  }

  declare Version: number
  declare Data: number[]
  declare SlotType: number
  declare SlotIndex: number
  declare GemType: number
  declare HasSocket: boolean
  declare GemValue: number
  declare HasGem: boolean
  declare HasRune: boolean
  declare Class: number
  declare PicIndex: number
  declare Index: number
  declare IsEpic: boolean
  declare Type: number
  declare IsFlushed: boolean
  declare HasValue: boolean
  declare Enchantment: number
  declare Armor: number
  declare ItemLevel: number
  declare DamageMin: number
  declare DamageMax: number
  declare Upgrades: number
  declare UpgradeMultiplier: number
  declare AttributeTypes: number[]
  declare Attributes: number[]
  declare HasEnchantment: boolean
  declare Color: number
  declare ColorClass: number
  declare RuneType: number
  declare RuneValue: number

  declare _SellPrice: { Gold: number; Mushrooms: number; Metal?: number; Crystal?: number }
  declare _SellPriceSet?: boolean
  declare _StrengthSet?: boolean
  declare _Strength?: ItemAttribute
  declare _DexteritySet?: boolean
  declare _Dexterity?: ItemAttribute
  declare _IntelligenceSet?: boolean
  declare _Intelligence?: ItemAttribute
  declare _ConstitutionSet?: boolean
  declare _Constitution?: ItemAttribute
  declare _LuckSet?: boolean
  declare _Luck?: ItemAttribute
  declare _DismantlePriceSet?: boolean
  declare _DismantlePrice?: BlacksmithResources
  declare _ImageUrlSet?: boolean
  declare _ImageUrl?: string
  declare _NameSet?: boolean
  declare _Name?: string

  constructor(version: number, data: number[], slotType: number, slotIndex: number) {
    let type, socket, enchantmentType, picIndex, damageMin, damageMax, attributeType, attributeValue, gold, coins, upgradeLevel, socketPower, itemLevel

    const dataType = new ComplexDataType(data)
    if (version === ItemModel.LEGACY) {
      dataType.assert(12)

      type = dataType.short()
      socket = dataType.byte()
      enchantmentType = dataType.byte()
      picIndex = dataType.short()
      dataType.short()
      damageMin = dataType.long()
      damageMax = dataType.long()
      attributeType = [dataType.long(), dataType.long(), dataType.long()]
      attributeValue = [dataType.long(), dataType.long(), dataType.long()]
      gold = dataType.long()
      coins = dataType.byte()
      upgradeLevel = dataType.byte()
      socketPower = dataType.short()
      itemLevel = 0
    } else {
      dataType.assert(19)

      // Item type
      type = dataType.long()
      // Socket - 0 for no socket, 1 for socket and 2+ for slotted gems
      socket = dataType.long()
      // Enchantment type
      enchantmentType = dataType.long()
      // Picture index
      picIndex = dataType.long()
      // Enchantment power
      dataType.long()
      // Damage Min / Armor
      damageMin = dataType.long()
      // Damage Max
      damageMax = dataType.long()
      // Attribute Types
      attributeType = [dataType.long(), dataType.long(), dataType.long()]
      // Attribute Values
      attributeValue = [dataType.long(), dataType.long(), dataType.long()]
      // Gold valuee
      gold = dataType.long()
      // Mushroom value
      coins = dataType.long()
      // Upgrade level
      upgradeLevel = dataType.long()
      // Socketted gem power
      socketPower = dataType.long()
      // Item level
      itemLevel = dataType.long()
      // Secret
      dataType.long()
    }

    // Apply fixes for legacy attributes
    if (attributeType[1] === 4 && attributeType[2] === 5) {
      attributeType = [20 + attributeType[0], 0, 0]
      attributeValue = [attributeValue[0], 0, 0]
    }

    this.Version = version
    this.Data = data
    this.SlotType = slotType
    this.SlotIndex = slotIndex
    this.GemType = socket >= 10 ? 1 + (socket % 10) : 0
    this.HasSocket = socket > 0
    this.GemValue = socketPower
    this.HasGem = socket > 1
    this.HasRune = attributeType[2] > 30
    this.Class = Math.trunc(picIndex / 1000) + 1
    this.PicIndex = picIndex
    this.Index = picIndex % 1000
    this.IsEpic = type < 11 && this.Index >= 50
    this.Type = type
    this.IsFlushed = coins == 0 && gold == 0 && type > 0 && type < 11
    this.HasValue = coins > 0 || gold > 0 || (upgradeLevel > 0 && gold != 0 && type != 1)
    this.Enchantment = enchantmentType
    this.Armor = damageMin
    this.ItemLevel = itemLevel
    this.DamageMin = damageMin
    this.DamageMax = damageMax
    this.Upgrades = upgradeLevel
    this.UpgradeMultiplier = Math.pow(1.03, upgradeLevel)
    this.AttributeTypes = attributeType
    this.Attributes = attributeValue
    this.HasEnchantment = enchantmentType > 0
    this.Color = this.Index >= 50 || this.Type == 10 ? 0 : (damageMax + damageMin + sum(attributeType) + sum(attributeValue)) % 5
    this.ColorClass = this.Type >= 8 ? 0 : this.Class
    this.RuneType = Math.max(0, this.AttributeTypes[2] - 30)
    this.RuneValue = this.AttributeTypes[2] > 30 ? this.Attributes[2] : 0

    this._SellPrice = {
      Gold: gold / 100,
      Mushrooms: coins
    }
  }

  get Strength() {
    if (!this._StrengthSet) {
      this._StrengthSet = true
      this._Strength = this.getAttribute(1)
    }

    return this._Strength as ItemAttribute
  }

  get Dexterity() {
    if (!this._DexteritySet) {
      this._DexteritySet = true
      this._Dexterity = this.getAttribute(2)
    }

    return this._Dexterity as ItemAttribute
  }

  get Intelligence() {
    if (!this._IntelligenceSet) {
      this._IntelligenceSet = true
      this._Intelligence = this.getAttribute(3)
    }

    return this._Intelligence as ItemAttribute
  }

  get Constitution() {
    if (!this._ConstitutionSet) {
      this._ConstitutionSet = true
      this._Constitution = this.getAttribute(4)
    }

    return this._Constitution as ItemAttribute
  }

  get Luck() {
    if (!this._LuckSet) {
      this._LuckSet = true
      this._Luck = this.getAttribute(5)
    }

    return this._Luck as ItemAttribute
  }

  get DismantlePrice() {
    if (!this._DismantlePriceSet) {
      this._DismantlePriceSet = true
      this._DismantlePrice = this.getDismantleReward()
    }

    return this._DismantlePrice as BlacksmithResources
  }

  get SellPrice() {
    if (!this._SellPriceSet) {
      this._SellPriceSet = true

      const sell = this.getBlacksmithPrice()
      this._SellPrice.Metal = sell.Metal
      this._SellPrice.Crystal = sell.Crystal
    }

    return this._SellPrice as ItemSellPrice
  }

  get ImageUrl() {
    if (!this._ImageUrlSet) {
      this._ImageUrlSet = true
      this._ImageUrl = Loca.pic(this.Type, this.Index, this.Color, this.Class)
    }

    return this._ImageUrl as string
  }

  get Name() {
    if (!this._NameSet) {
      this._NameSet = true
      this._Name = Loca.name(this.Type, this.Index, this.Class)
    }

    return this._Name as string
  }

  morph(from: number, to: number, force = false) {
    if ((this.Type <= 7 || force) && this.SellPrice.Gold > 0) {
      const data = [...this.Data]

      if (this.Version === ItemModel.LEGACY) {
        for (let i = 0; i < 3; i++) {
          if (data[i + 4] == from) {
            data[i + 4] = to
          } else if (data[i + 4] == from + 20) {
            data[i + 4] = to + 20
          }
        }
      } else {
        for (let i = 0; i < 3; i++) {
          if (data[i + 7] == from) {
            data[i + 7] = to
          } else if (data[i + 7] == from + 20) {
            data[i + 7] = to + 20
          }
        }
      }

      return new ItemModel(this.Version, data, this.SlotType, this.SlotIndex)
    } else {
      return new ItemModel(this.Version, this.Data, this.SlotType, this.SlotIndex)
    }
  }

  setPic(pic: number) {
    this.Index = pic
    this.PicIndex = (this.Class - 1) * 1000 + pic
  }

  static forceCorrectRune(item: ItemModel | undefined) {
    if (item && item.AttributeTypes[2] < 31) {
      item.Attributes[2] = 0
    }
  }

  getScrapbookPosition() {
    const boundaryStart = ItemModel.SCRAPBOOK_BOUNDARIES[this.ColorClass]?.[this.Type - 1]?.[this.IsEpic ? 1 : 0]
    let position = this.Index - 1
    if (this.IsEpic) {
      position -= 49
    } else if (this.Type != 10) {
      position *= 5
      position += this.Color
    }

    return Math.max(0, Number(boundaryStart) + position)
  }

  clone() {
    return new ItemModel(this.Version, this.Data, this.SlotType, this.SlotIndex)
  }

  getAttribute(id: number): ItemAttribute {
    for (let i = 0; i < 3; i++) {
      if (this.AttributeTypes[i] == id || this.AttributeTypes[i] == 6 || this.AttributeTypes[i] == 20 + id || (id > 3 && this.AttributeTypes[i] >= 21 && this.AttributeTypes[i] <= 23)) {
        return {
          Type: id,
          Value: this.Attributes[i]
        }
      }
    }

    return {
      Type: id,
      Value: 0
    }
  }

  getBlacksmithQuality() {
    if (this.Attributes[0] > 0 && this.Attributes[1] > 0 && this.Attributes[2] > 0 && this.AttributeTypes[2] < 31) {
      return 3
    } else if (this.AttributeTypes[0] >= 21 && this.AttributeTypes[0] <= 23) {
      return 3
    } else if (this.AttributeTypes[0] == 6) {
      return 3
    } else if (this.Attributes[0] > 0 && this.Attributes[1] > 0) {
      return 2
    } else {
      return 1
    }
  }

  getRune(rune: number) {
    if (this.AttributeTypes[2] - 30 == rune) {
      return this.Attributes[2]
    } else {
      return 0
    }
  }

  getItemLevel() {
    let num = this.Attributes[0]

    if (this.AttributeTypes[0] == 6) {
      num = Math.trunc(num * 1.2)
    }

    if (this.Type == 1 && this.PicIndex > 999) {
      num = Math.trunc(num / 2)
    }

    if (this.PicIndex == 52 || this.PicIndex == 1052 || this.PicIndex == 2052 || this.PicIndex == 66 || this.PicIndex == 1066 || this.PicIndex == 2066) {
      if (this.AttributeTypes[0] == 5 && this.AttributeTypes[1] <= 0) {
        num = Math.trunc(num / 5)
      }
    } else if (this.getBlacksmithQuality() == 1 && num > 66) {
      num = Math.trunc(num * 0.75)
    }

    return Math.floor(Math.pow(num, 1.2))
  }

  getBlacksmithRandom(max: number) {
    return (this.Type * 37 + this.PicIndex * 83 + this.DamageMin * 1731 + this.DamageMax * 162) % (max + 1)
  }

  getBlacksmithSocketPrice() {
    if (this.Type == 2 || this.Type > 10) {
      return {
        Metal: 0,
        Crystal: 0
      }
    } else {
      const num = this.getItemLevel()
      const quality = this.getBlacksmithQuality()
      let num2 = 500
      let num3 = 0

      switch (quality) {
        case 1: {
          num3 = 25
          break
        }
        case 2: {
          num3 = 50
          break
        }
        case 3: {
          num3 = 100
          break
        }
        default: {
          num2 = 0
          break
        }
      }

      return {
        Metal: Math.floor((num * num2) / 100),
        Crystal: Math.max(10, Math.floor((num * num3) / 100) * 10)
      }
    }
  }

  upgradeTo(value: number) {
    const upgrades = Math.max(0, Math.min(20, value))
    if (upgrades > this.Upgrades) {
      while (this.Upgrades != upgrades) {
        this.Upgrades++
        for (let j = 0; j < 3; j++) {
          if (this.AttributeTypes[j] < 30) {
            this.Attributes[j] = Math.trunc(1.03 * this.Attributes[j])
          }
        }
      }
    } else if (upgrades < this.Upgrades) {
      while (this.Upgrades != upgrades) {
        this.Upgrades--
        for (let j = 0; j < 3; j++) {
          if (this.AttributeTypes[j] < 30) {
            this.Attributes[j] = Math.trunc((1 / 1.03) * this.Attributes[j])
          }
        }
      }
    }
  }

  getBlacksmithUpgradePriceRange(max = 20) {
    const attributes = [...this.Attributes]
    const upgrades = this.Upgrades
    const price = {
      Metal: 0,
      Crystal: 0
    }

    for (let i = this.Upgrades; i < max; i++) {
      const p = this.getBlacksmithUpgradePrice()
      price.Metal += p.Metal
      price.Crystal += p.Crystal

      this.Upgrades++
      for (let j = 0; j < 3; j++) {
        if (this.AttributeTypes[j] < 30) {
          this.Attributes[j] = Math.trunc(1.03 * this.Attributes[j])
        }
      }
    }

    this.Attributes = attributes
    this.Upgrades = upgrades

    return price
  }

  getBlacksmithUpgradePrice(): BlacksmithResources {
    if (this.Type == 0 || this.Type > 10) {
      return {
        Metal: 0,
        Crystal: 0
      }
    } else {
      const num = this.getItemLevel()
      const quality = this.getBlacksmithQuality()
      let num2 = 50
      let num3 = 0

      switch (quality) {
        case 1: {
          num3 = 25
          break
        }
        case 2: {
          num3 = 50
          break
        }
        case 3: {
          num3 = 75
          break
        }
      }

      switch (this.Upgrades) {
        case 0: {
          num2 *= 3
          num3 = 0
          break
        }
        case 1: {
          num2 *= 4
          num3 = 1
          break
        }
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
        case 7: {
          num2 *= this.Upgrades + 3
          num3 *= this.Upgrades - 1
          break
        }
        case 8: {
          num2 *= 12
          num3 *= 8
          break
        }
        case 9: {
          num2 *= 15
          num3 *= 10
          break
        }
        case 10:
        case 11:
        case 12:
        case 13:
        case 14:
        case 15:
        case 16:
        case 17:
        case 18:
        case 19: {
          num2 *= 15 + this.Upgrades - 9
          num3 *= 10 + 2 * (this.Upgrades - 9)
          break
        }
      }

      num2 = Math.floor((num * num2) / 100)
      num3 = Math.floor((num * num3) / 100)
      if (this.Type == 1 && this.PicIndex > 999) {
        num2 *= 2
        num3 *= 2
      }

      return {
        Metal: num2,
        Crystal: num3
      }
    }
  }

  getBlacksmithPrice(): BlacksmithResources {
    if (this.SellPrice.Gold == 0 && this.Type == 1) {
      return {
        Metal: 0,
        Crystal: 0
      }
    } else {
      let num = 0
      let num2 = 0
      const upgrades = this.Upgrades
      const num3 = this.Attributes[0]

      while (this.Upgrades-- > 0) {
        this.Attributes[0] = Math.ceil(this.Attributes[0] / 1.04)
        const price = this.getBlacksmithUpgradePrice()

        num += price.Metal
        num2 += price.Crystal
      }

      this.Upgrades = upgrades
      this.Attributes[0] = num3

      return {
        Metal: num,
        Crystal: num2
      }
    }
  }

  getDismantlePrice(): BlacksmithResources {
    if (this.Type == 0 || this.Type > 10) {
      return {
        Metal: 0,
        Crystal: 0
      }
    } else {
      const num = this.getItemLevel()
      const quality = this.getBlacksmithQuality()
      let num2 = 0
      let num3 = 0

      switch (quality) {
        case 1: {
          num2 = 75 + this.getBlacksmithRandom(25)
          num3 = this.getBlacksmithRandom(1)
          break
        }
        case 2: {
          num2 = 50 + this.getBlacksmithRandom(30)
          num3 = 5 + this.getBlacksmithRandom(5)
          break
        }
        case 3: {
          num2 = 25 + this.getBlacksmithRandom(25)
          num3 = 50 + this.getBlacksmithRandom(50)
          break
        }
      }

      num2 = Math.floor((num * num2) / 100)
      num3 = Math.floor((num * num3) / 100)
      if (this.Type == 1 && this.PicIndex > 999) {
        num2 *= 2
        num3 *= 2
      }

      return {
        Metal: num2,
        Crystal: num3
      }
    }
  }

  getDismantleReward(): BlacksmithResources {
    if (this.Type == 0 || this.Type > 10) {
      return {
        Metal: 0,
        Crystal: 0
      }
    } else {
      const dismantle = this.getDismantlePrice()
      const sell = this.getBlacksmithPrice()
      return {
        Metal: dismantle.Metal + sell.Metal,
        Crystal: dismantle.Crystal + sell.Crystal
      }
    }
  }

  static SCRAPBOOK_BOUNDARIES: Record<number, [number, number]>[] = [
    {
      '7': [800, 1010],
      '8': [1050, 1210],
      '9': [1250, 1324]
    },
    {
      '0': [1364, 1664],
      '1': [1704, 1804],
      '2': [1844, 1944],
      '3': [1984, 2084],
      '4': [2124, 2224],
      '5': [2264, 2364],
      '6': [2404, 2504]
    },
    {
      '0': [2544, 2644],
      '2': [2684, 2784],
      '3': [2824, 2924],
      '4': [2964, 3064],
      '5': [3104, 3204],
      '6': [3244, 3344]
    },
    {
      '0': [3384, 3484],
      '2': [3524, 3624],
      '3': [3664, 3764],
      '4': [3804, 3904],
      '5': [3944, 4044],
      '6': [4084, 4184]
    }
  ]
}
