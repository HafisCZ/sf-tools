class ItemModel {
    static empty () {
        return new ItemModel(new Array(12).fill(0), 0, 0);
    }

    constructor (data, slotType, slotIndex) {
        let dataType = new ComplexDataType(data);
        dataType.assert(12);

        let type = dataType.short();
        let socket = dataType.byte();
        let enchantmentType = dataType.byte();
        let picIndex = dataType.short();
        let enchantmentPower = dataType.short();
        let damageMin = dataType.long();
        let damageMax = dataType.long();
        let attributeType = [dataType.long(), dataType.long(), dataType.long()];
        let attributeValue = [dataType.long(), dataType.long(), dataType.long()];
        let gold = dataType.long();
        let coins = dataType.byte();
        let upgradeLevel = dataType.byte();
        let socketPower = dataType.short();

        if (attributeType[1] === 4 && attributeType[2] === 5) {
            // Legacy attribute
            attributeType = [20 + attributeType[0], 0, 0];
            attributeValue = [attributeValue[0], 0, 0];
        }

        this.Data = data;
        this.SlotType = slotType;
        this.SlotIndex = slotIndex;
        this.GemType = socket >= 10 ? (1 + (socket % 10)) : 0;
        this.HasSocket = socket > 0;
        this.GemValue = socketPower;
        this.HasGem = socket > 1;
        this.HasRune = attributeType[2] > 30;
        this.Class = Math.trunc(picIndex / 1000) + 1;
        this.PicIndex = picIndex;
        this.Index = picIndex % 1000;
        this.IsEpic = type < 11 && this.Index >= 50;
        this.Type = type;
        this.IsFlushed = coins == 0 && gold == 0 && type > 0 && type < 11;
        this.HasValue = (coins > 0 || gold > 0 || (upgradeLevel > 0 && gold != 0 && type != 1));
        this.Enchantment = enchantmentType;
        this.Armor = damageMin;
        this.DamageMin = damageMin;
        this.DamageMax = damageMax;
        this.Upgrades = upgradeLevel;
        this.UpgradeMultiplier = Math.pow(1.03, upgradeLevel);
        this.AttributeTypes = attributeType;
        this.Attributes = attributeValue;
        this.HasEnchantment = enchantmentType > 0;
        this.Color = (this.Index >= 50 || this.Type == 10) ? 0 : ((damageMax + damageMin + _sum(attributeType) + _sum(attributeValue)) % 5);
        this.ColorClass = (this.Type >= 8) ? 0 : this.Class;

        this.SellPrice = {
            Gold: gold / 100,
            Mushrooms: coins
        }

        var dismantle = this.getDismantleReward();
        this.DismantlePrice = {
            Metal: dismantle.Metal,
            Crystal: dismantle.Crystal
        }

        var sell = this.getBlacksmithPrice();
        this.SellPrice.Metal = sell.Metal;
        this.SellPrice.Crystal = sell.Crystal;

        this.Strength = this.getAttribute(1);
        this.Dexterity = this.getAttribute(2);
        this.Intelligence = this.getAttribute(3);
        this.Constitution = this.getAttribute(4);
        this.Luck = this.getAttribute(5);

        this.RuneType = this.getRuneType();
        this.RuneValue = this.getRuneValue();
    }

    get ImageUrl () {
        if (!this._ImageUrlSet) {
            this._ImageUrlSet = true;
            this._ImageUrl = Loca.pic(this.Type, this.Index, this.Color, this.Class);
        }

        return this._ImageUrl;
    }

    get Name () {
        if (!this._NameSet) {
            this._NameSet = true;
            this._Name = Loca.name(this.Type, this.Index, this.Class);
        }

        return this._Name;
    }

    morph (from, to, force = false) {
        if ((this.Type <= 7 || force) && this.SellPrice.Gold > 0) {
            var data = [ ... this.Data ];
            for (var i = 0; i < 3; i++) {
                if (data[i + 4] == from) {
                    data[i + 4] = to;
                } else if (data[i + 4] == from + 20) {
                    data[i + 4] = to + 20;
                }
            }

            return new ItemModel(data, this.SlotType, this.SlotIndex);
        } else {
            return new ItemModel(this.Data, this.SlotType, this.SlotIndex);
        }
    }

    setPic (pic) {
        this.Index = pic;
        this.PicIndex = (this.Class - 1) * 1000 + pic;
    }

    static forceCorrectRune (item) {
        if (item.AttributeTypes[2] < 31) {
            item.Attributes[2] = 0;
        }
    }

    getScrapbookPosition () {
        let boundary_start = _dig(SCRAPBOOK_BOUNDARIES, this.ColorClass, this.Type - 1, this.IsEpic ? 1 : 0);
        let position = this.Index - 1;
        if (this.IsEpic) {
            position -= 49;
        } else if (this.Type != 10) {
            position *= 5;
            position += this.Color;
        }

        return Math.max(0, boundary_start + position);
    }

    clone () {
        return new ItemModel(this.Data, this.SlotType, this.SlotIndex);
    }

    getAttribute (id) {
        for (var i = 0; i < 3; i++) {
            if (this.AttributeTypes[i] == id || this.AttributeTypes[i] == 6 || this.AttributeTypes[i] == 20 + id || (id > 3 && this.AttributeTypes[i] >= 21 && this.AttributeTypes[i] <= 23)) {
                return {
                    Type: id,
                    Value: this.Attributes[i]
                };
            }
        }

        return {
            Type: id,
            Value: 0
        };
    }

    getRuneType () {
        return Math.max(0, this.AttributeTypes[2] - 30);
    }

    getRuneValue () {
        return this.AttributeTypes[2] > 30 ? this.Attributes[2] : 0;
    }

    getBlacksmithQuality () {
        if (this.Attributes[0] > 0 && this.Attributes[1] > 0 && this.Attributes[2] > 0 && this.AttributeTypes[2] < 31) {
            return 3;
        } else if (this.AttributeTypes[0] >= 21 && this.AttributeTypes[0] <= 23) {
            return 3;
        } else if (this.AttributeTypes[0] == 6) {
            return 3;
        } else if (this.Attributes[0] > 0 && this.Attributes[1] > 0) {
            return 2;
        } else {
            return 1;
        }
    }

    getRune (rune) {
        if (this.AttributeTypes[2] - 30 == rune) {
            return this.Attributes[2];
        } else {
            return 0;
        }
    }

    getItemLevel () {
        var num = this.Attributes[0];

        if (this.AttributeTypes[0] == 6) {
            num = Math.trunc(num * 1.2);
        }

        if (this.Type == 1 && this.PicIndex > 999) {
            num = Math.trunc(num / 2);
        }

        if (this.PicIndex == 52 || this.PicIndex == 1052 || this.PicIndex == 2052 || this.PicIndex == 66 || this.PicIndex == 1066 || this.PicIndex == 2066) {
            if (this.AttributeTypes[0] == 5 && this.AttributeTypes[1] <= 0) {
                num = Math.trunc(num / 5);
            }
        } else if (this.getBlacksmithQuality() == 1 && num > 66) {
            num = Math.trunc(num * 0.75);
        }

        return Math.floor(Math.pow(num, 1.2));
    }

    getBlacksmithRandom (max) {
        return (this.Type * 37 + this.PicIndex * 83 + this.DamageMin * 1731 + this.DamageMax * 162) % (max + 1);
    }

    getBlacksmithSocketPrice () {
        if (this.type == 0 || this.Type == 2 || this.Type > 10) {
            return {
                Metal: 0,
                Crystal: 0
            };
        } else {
            var num = this.getItemLevel();
            var quality = this.getBlacksmithQuality();
            var num2 = 500;
            var num3 = 0;

            switch (quality) {
                case 1: {
                    num3 = 25;
                    break;
                }
                case 2: {
                    num3 = 50;
                    break;
                }
                case 3: {
                    num3 = 100;
                    break;
                }
                default: {
                    num2 = 0;
                    break;
                }
            }

            return {
                Metal: Math.floor(num * num2 / 100),
                Crystal: Math.max(10, Math.floor(num * num3 / 100) * 10)
            };
        }
    }

    upgradeTo (upgrades) {
        upgrades = Math.max(0, Math.min(20, upgrades));
        if (upgrades > this.Upgrades) {
            while (this.Upgrades != upgrades) {
                this.Upgrades++;
                for (var j = 0; j < 3; j++) {
                    if (this.AttributeTypes[j] < 30) {
                        this.Attributes[j] = Math.trunc(1.03 * this.Attributes[j]);
                    }
                }
            }
        } else if (upgrades < this.Upgrades) {
            while (this.Upgrades != upgrades) {
                this.Upgrades--;
                for (var j = 0; j < 3; j++) {
                    if (this.AttributeTypes[j] < 30) {
                        this.Attributes[j] = Math.trunc((1 / 1.03) * this.Attributes[j]);
                    }
                }
            }
        }
    }

    getBlacksmithUpgradePriceRange (max = 20) {
        var attributes = [ ...this.Attributes ];
        var upgrades = this.Upgrades;
        var price = {
            Metal: 0,
            Crystal: 0
        };

        for (var i = this.Upgrades; i < max; i++) {
            var p = this.getBlacksmithUpgradePrice();
            price.Metal += p.Metal;
            price.Crystal += p.Crystal;

            this.Upgrades++;
            for (var j = 0; j < 3; j++) {
                if (this.AttributeTypes[j] < 30) {
                    this.Attributes[j] = Math.trunc(1.03 * this.Attributes[j]);
                }
            }
        }

        this.Attributes = attributes;
        this.Upgrades = upgrades;

        return price;
    }

    getBlacksmithUpgradePrice () {
        if (this.Type == 0 || this.Type > 10) {
            return {
                Metal: 0,
                Crystal: 0
            };
        } else {
            var num = this.getItemLevel();
            var quality = this.getBlacksmithQuality();
            var num2 = 50;
            var num3 = 0;

            switch (quality) {
                case 1: {
                    num3 = 25;
                    break;
                }
                case 2: {
                    num3 = 50;
                    break;
                }
                case 3: {
                    num3 = 75;
                    break;
                }
            }

            switch (this.Upgrades) {
                case 0: {
                    num2 *= 3;
                    num3 = 0;
                    break;
                }
                case 1: {
                    num2 *= 4;
                    num3 = 1;
                    break;
                }
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7: {
                    num2 *= this.Upgrades + 3;
                    num3 *= this.Upgrades - 1;
                    break;
                }
                case 8: {
                    num2 *= 12;
                    num3 *= 8;
                    break;
                }
                case 9: {
                    num2 *= 15;
                    num3 *= 10;
                    break;
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
                    num2 *= 15 + this.Upgrades - 9;
                    num3 *= 10 + 2 * (this.Upgrades - 9);
                    break;
                }
            }

            num2 = Math.floor(num * num2 / 100);
            num3 = Math.floor(num * num3 / 100);
            if (this.Type == 1 && this.PicIndex > 999) {
                num2 *= 2;
                num3 *= 2;
            }

            return {
                Metal: num2,
                Crystal: num3
            };
        }
    }

    getBlacksmithPrice () {
        if (this.SellPrice.Gold == 0 && this.Type == 1) {
            return {
                Metal: 0,
                Crystal: 0
            };
        } else {
            var num = 0;
            var num2 = 0;
            var upgrades = this.Upgrades;
            var num3 = this.Attributes[0];

            while (this.Upgrades-- > 0) {
                this.Attributes[0] = Math.ceil( this.Attributes[0] / 1.04);
                var price = this.getBlacksmithUpgradePrice();

                num += price.Metal;
                num2 += price.Crystal;
            }

            this.Upgrades = upgrades;
            this.Attributes[0] = num3;

            return {
                Metal: num,
                Crystal: num2
            };
        }
    }

    getDismantlePrice () {
        if (this.Type == 0 || this.Type > 10) {
            return {
                Metal: 0,
                Crystal: 0
            };
        } else {
            var num = this.getItemLevel();
            var quality = this.getBlacksmithQuality();
            var num2 = 0;
            var num3 = 0;

            switch (quality) {
                case 1: {
                    num2 = 75 + this.getBlacksmithRandom(25);
                    num3 = this.getBlacksmithRandom(1);
                    break;
                }
                case 2: {
                    num2 = 50 + this.getBlacksmithRandom(30);
                    num3 = 5 + this.getBlacksmithRandom(5);
                    break;
                }
                case 3: {
                    num2 = 25 + this.getBlacksmithRandom(25);
                    num3 = 50 + this.getBlacksmithRandom(50);
                    break;
                }
            }

            num2 = Math.floor(num * num2 / 100);
            num3 = Math.floor(num * num3 / 100);
            if (this.Type == 1 && this.PicIndex > 999) {
                num2 *= 2;
                num3 *= 2;
            }

            return {
                Metal: num2,
                Crystal: num3
            };
        }
    }

    getDismantleReward () {
        if (this.Type == 0 || this.Type > 10) {
            return {
                Metal: 0,
                Crystal: 0
            };
        } else {
            var dism = this.getDismantlePrice();
            var sell = this.getBlacksmithPrice();
            return {
                Metal: dism.Metal + sell.Metal,
                Crystal: dism.Crystal + sell.Crystal
            };
        }
    }
}

class SFGroup {
    constructor (data) {
        this.Data = data;

        this.Prefix = _formatPrefix(data.prefix);
        this.ID = data.save[0];
        this.Identifier = data.prefix + '_g' + this.ID;

        this.Name = data.name;
        this.Rank = data.rank;
        this.Own = data.own;
        this.Timestamp = data.timestamp;

        this.MembersPresent = 0;

        this.Honor = data.save[13];
        this.Pet = data.save[378];
        this.Hydra = data.save[379];

        let dataType = new ComplexDataType(data.save.slice(4, 8));
        dataType.short();
        this.PortalLife = dataType.short();
        dataType.short();
        this.PortalLife += dataType.short() * 65536;
        dataType.short();
        this.PortalPercent = dataType.short();
        dataType.short();
        this.PortalFloor = dataType.short();

        this.Members = data.save.slice(14, 64).map(mid => (data.prefix + '_p' + mid));
        this.States = data.save.slice(64, 114).map(level => Math.trunc(level / 1000));
        this.Roles = data.save.slice(314, 364);
        this.LastActives = data.save.slice(114, 164).map(ts => parseInt(ts) * 1000 + data.offset);
        this.Names = data.names;

        this.IsUnderAttack = data.save[364] > 0;
        this.IsAttacking = data.save[366] > 0;

        this.Treasures = data.save.slice(214, 264);
        this.Instructors = data.save.slice(264, 314);
        this.Pets = data.save.slice(390, 440);

        if (data.knights) {
            this.Knights = data.knights.slice(0, 50);
        }

        for (let i = 0; i < this.Members.length; i++) {
            if (this.Roles[i] == 0 || this.Roles[i] == GUILD_ROLE_INVITED) {
                if (this.Knights) {
                    this.Knights.splice(i, 1);
                }

                this.Roles.splice(i, 1);
                this.Treasures.splice(i, 1);
                this.Instructors.splice(i, 1);
                this.Pets.splice(i, 1);
                this.States.splice(i, 1);
                this.Names.splice(i, 1);
                this.LastActives.splice(i, 1);
                this.Members.splice(i--, 1);
            }
        }

        this.MembersTotal = this.Members.length;
        this.TotalKnights = data.save[370];
        this.TotalInstructor = Math.trunc(Math.min(_sum(this.Instructors), 500) / 5);
        this.TotalTreasure = Math.trunc(Math.min(_sum(this.Treasures), 500) / 5);
    }
}

class DungeonHelper {
    static template () {
        const open = DungeonHelper.DUNGEON_OPEN;
        const locked = DungeonHelper.DUNGEON_LOCKED;

        return {
            Normal: [],
            Shadow: [],
            Group: locked,
            Player: locked,
            Tower: open,
            Twister: open,
            Raid: locked,
            Youtube: locked
        }
    }

    static fromData (legacyDungeons, dungeonData) {
        const dungeons = DungeonHelper.template();

        if (_dig(dungeonData, 'light')) {
            // Standard dungeons
            const normal = dungeonData.light;
            const shadow = dungeonData.shadow;

            for (const [index, dungeonIndex] of DungeonHelper.PLAYA_TO_INTERNAL_MAPPING_ENTRIES) {
                dungeons.Normal[index] = normal[dungeonIndex];
                dungeons.Shadow[index] = shadow[dungeonIndex];
            }

            // Special dungeons
            dungeons.Tower = normal[14];
            dungeons.Twister = shadow[14];
            dungeons.Player = normal[17];
            dungeons.Youtube = shadow[17];
        } else {
            // Convert old dungeon data to new format
            for (const dungeonIndex of DungeonHelper.LEGACY_TO_INTERNAL_MAPPING) {
                dungeons.Normal[dungeonIndex] = (legacyDungeons.Normal[dungeonIndex] || 0) + DungeonHelper.DUNGEON_LOCKED;
                dungeons.Shadow[dungeonIndex] = (legacyDungeons.Shadow[dungeonIndex] || 0) + DungeonHelper.DUNGEON_LOCKED;
            }

            for (const dungeonIndex of DungeonHelper.LEGACY_MISSING) {
                dungeons.Normal[dungeonIndex] = DungeonHelper.DUNGEON_LOCKED;
                dungeons.Shadow[dungeonIndex] = DungeonHelper.DUNGEON_LOCKED;
            }

            // Convert legacy 20 floor dungeons
            for (const type of ['Normal', 'Shadow']) {
                for (const [sourceDungeon, targetDungeon] of DungeonHelper.LEGACY_SPLIT_TO_INTERNAL_MAPPING) {
                    const value = (_dig(legacyDungeons, type, sourceDungeon) || 0) + DungeonHelper.DUNGEON_LOCKED;

                    dungeons[type][sourceDungeon] = Math.min(value, 10);
                    dungeons[type][targetDungeon] = value >= 10 ? value - 10 : DungeonHelper.DUNGEON_LOCKED;
                }
            }

            dungeons.Tower = legacyDungeons.Tower || 0;
            dungeons.Twister = (legacyDungeons.Twister || 0) + DungeonHelper.DUNGEON_LOCKED;
            dungeons.Player = legacyDungeons.Player || 0;
            dungeons.Youtube = (legacyDungeons.Youtube || 0) + DungeonHelper.DUNGEON_LOCKED;
        }

        // Copy over untouched data
        dungeons.Group = legacyDungeons.Group || 0;
        dungeons.Raid = legacyDungeons.Raid || 0;

        // Computations
        const dungeonProgress = (a, b) => a + Math.max(0, b);
        dungeons.Normal.Total = dungeons.Normal.reduce(dungeonProgress, 0);
        dungeons.Shadow.Total = dungeons.Shadow.reduce(dungeonProgress, 0);

        const dungeonUnlock = (a, b) => a + (b > -2 ? 1 : 0);
        dungeons.Normal.Unlocked = dungeons.Normal.reduce(dungeonUnlock, 0);
        dungeons.Shadow.Unlocked = dungeons.Shadow.reduce(dungeonUnlock, 0);

        return dungeons;
    }
}

DungeonHelper.DUNGEON_OPEN = -1;
DungeonHelper.DUNGEON_LOCKED = -2;

DungeonHelper.PLAYA_TO_INTERNAL_MAPPING = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29
];

DungeonHelper.PLAYA_TO_INTERNAL_MAPPING_ENTRIES = Object.entries(DungeonHelper.PLAYA_TO_INTERNAL_MAPPING);

DungeonHelper.LEGACY_TO_INTERNAL_MAPPING = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 16, 17, 18
];

DungeonHelper.LEGACY_MISSING = [
    19, 20, 21, 22, 23
];

DungeonHelper.LEGACY_SPLIT_TO_INTERNAL_MAPPING = [
    [12, 27],
    [13, 24],
    [14, 25],
    [15, 26]
];

class PlayerModel {
    constructor (data) {
        if (data) {
            this._initShared(data);

            if (data.own) {
                this._initOwn(data);
            } else {
                this._initOther(data);
            }
        }
    }

    static getResources (data) {
        const resourcesData = new ComplexDataType(data);
        resourcesData.skip(1);

        return {
            Mushrooms: resourcesData.long(),
            Gold: resourcesData.long(),
            Coins: resourcesData.long(),
            Hourglass: resourcesData.long(),
            Wood: resourcesData.long(),
            SecretWood: resourcesData.long(),
            Stone: resourcesData.long(),
            SecretStone: resourcesData.long(),
            Metal: resourcesData.long(),
            Crystals: resourcesData.long(),
            ShadowFood: resourcesData.long(),
            LightFood: resourcesData.long(),
            EarthFood: resourcesData.long(),
            FireFood: resourcesData.long(),
            WaterFood: resourcesData.long()
        }
    }

    _initOwn (data) {
        const legacyDungeons = DungeonHelper.template();
        const resources = PlayerModel.getResources(data.resources);

        let dataType = new ComplexDataType(data.save);
        dataType.assert(650);

        dataType.skip(1); // skip
        this.ID = dataType.long();
        this.LastOnline = dataType.long() * 1000 + data.offset;
        this.Registered = dataType.long() * 1000 + data.offset;
        dataType.skip(3); // skip
        this.Level = dataType.short();
        dataType.clear();
        this.XP = dataType.long();
        this.XPNext = dataType.long();
        this.Honor = dataType.long();
        this.Rank = dataType.long();
        dataType.short();
        this.DevilPercent = dataType.short();
        dataType.skip(1); // skip
        this.Mushrooms = {
            Current: dataType.long(),
            Total: dataType.long()
        }
        dataType.skip(1);
        this.Face = {
            Mouth: dataType.long(),
            Hair: {
                Type: dataType.long() % 100,
                Color: Math.trunc(dataType.back(1).long() / 100)
            },
            Brows: {
                Type: dataType.long() % 100,
                Color: Math.trunc(dataType.back(1).long() / 100)
            },
            Eyes: dataType.long(),
            Beard: {
                Type: dataType.long() % 100,
                Color: Math.trunc(dataType.back(1).long() / 100)
            },
            Nose: dataType.long(),
            Ears: dataType.long(),
            Special: dataType.long(),
            Special2: dataType.long(),
            Portrait: dataType.long()
        };
        this.Race = dataType.short();
        dataType.clear(); // skip
        this.Gender = dataType.byte();
        this.Mirror = dataType.byte();
        this.MirrorPieces = PlayerModel.getMirrorPieces(dataType.short());
        this.Class = dataType.short();
        dataType.clear(); // skip
        PlayerModel.loadAttributes(this, dataType, false);
        this.Action = {
            Status: dataType.short()
        };
        dataType.short(); // Skip
        this.Action.Index = dataType.short();
        dataType.short(); // Skip
        this.Action.Finish = dataType.long() * 1000 + data.offset;
        this.Items = PlayerModel.loadEquipment(dataType, 1);
        this.Inventory = {
            Backpack: [],
            Chest: [],
            Shop: [],
            Dummy: {},
            Bert: {},
            Mark: {},
            Kunigunde: {}
        };
        for (let i = 0; i < 5; i++) {
            const item = new ItemModel(dataType.sub(12), 6, i + 1);
            if (item.Type > 0) {
                this.Inventory.Backpack.push(item);
            }
        }
        dataType.skip(58); // skip
        this.Mount = dataType.short();
        this.MountValue = PlayerModel.getMount(this.Mount);

        legacyDungeons.Tower = dataType.short();

        dataType.skip(1);
        for (let i = 0; i < 6; i++) {
            const item = new ItemModel(dataType.sub(12), 7, i + 1);
            if (item.Type > 0) {
                this.Inventory.Shop.push(item);
            }
        }
        dataType.skip(1);
        for (let i = 0; i < 6; i++) {
            const item = new ItemModel(dataType.sub(12), 8, i + 1);
            if (item.Type > 0) {
                this.Inventory.Shop.push(item);
            }
        }

        legacyDungeons.Raid = dataType.short();

        dataType.short();
        dataType.skip(1); // skip
        this.Group = {
            ID: dataType.long(),
            Name: data.groupname
        };
        dataType.skip(1); // skip
        this.Mushrooms.Paid = dataType.long();
        this.Mushrooms.Free = this.Mushrooms.Total - this.Mushrooms.Paid;
        this.Book = Math.max(0, dataType.long() - 10000);
        dataType.skip(2); // skip

        legacyDungeons.Normal[10] = dataType.long();
        legacyDungeons.Normal[11] = dataType.long();

        this.Group.Joined = dataType.long() * 1000 + data.offset;
        this.Flags = PlayerModel.getFlags(dataType.long());
        dataType.short(); // skip

        legacyDungeons.Group = dataType.byte();
        legacyDungeons.Player = dataType.byte();

        dataType.skip(1); // skip
        this.Armor = dataType.long();
        this.Damage = {
            Min: dataType.long(),
            Max: dataType.long()
        };
        this.Damage.Avg = (this.Damage.Min + this.Damage.Max) / 2;
        dataType.skip(1); // skip
        this.MountExpire = dataType.long() * 1000 + data.offset,
        dataType.skip(3);
        this.ThirstReroll = dataType.long() * 1000 + data.offset;
        this.ThirstLeft = dataType.long();
        this.UsedBeers = dataType.long();
        dataType.skip(22); // skip

        legacyDungeons.Normal[0] = dataType.long();
        legacyDungeons.Normal[1] = dataType.long();
        legacyDungeons.Normal[2] = dataType.long();
        legacyDungeons.Normal[3] = dataType.long();
        legacyDungeons.Normal[4] = dataType.long();
        legacyDungeons.Normal[5] = dataType.long();
        legacyDungeons.Normal[6] = dataType.long();
        legacyDungeons.Normal[7] = dataType.long();
        legacyDungeons.Normal[8] = dataType.long();
        legacyDungeons.Normal[9] = dataType.long();
        legacyDungeons.Normal[12] = dataType.long() - 120;

        this.Toilet = {
            Aura: dataType.long(),
            Fill: dataType.long()
        }
        this.Potions = [{
            Type: getPotionType(dataType.long()),
            Expire: dataType.skip(2).long() * 1000 + data.offset,
            Size: dataType.skip(2).long()
        }, {
            Type: getPotionType(dataType.back(6).long()),
            Expire: dataType.skip(2).long() * 1000 + data.offset,
            Size: dataType.skip(2).long()
        }, {
            Type: getPotionType(dataType.back(6).long()),
            Expire: dataType.skip(2).long() * 1000 + data.offset,
            Size: dataType.skip(2).long()
        }];
        _sortDesc(this.Potions, potion => potion.Size);
        this.Potions.Life = dataType.long();
        dataType.skip(12); // skip
        this.Toilet.Capacity = dataType.long();
        dataType.skip(1); // skip
        this.Flags.GoldFrameDisabled = !!dataType.long();
        dataType.skip(3); //skip
        this.Flags.InvitesDisabled = !!dataType.long();
        dataType.skip(2); // skip
        this.Fortress = {
            Rank: data.fortressrank,
            Fortress: dataType.long(),
            LaborerQuarters: dataType.long(),
            WoodcutterGuild: dataType.long(),
            Quarry: dataType.long(),
            GemMine: dataType.long(),
            Academy: dataType.long(),
            ArcheryGuild: dataType.long(),
            Barracks: dataType.long(),
            MageTower: dataType.long(),
            Treasury: dataType.long(),
            Smithy: dataType.long(),
            Fortifications: dataType.long()
        }
        dataType.skip(6);
        this.Hourglass = dataType.long() || resources.Hourglass;
        dataType.skip(1);
        this.Fortress.Wood = dataType.long() || resources.Wood;
        this.Fortress.Stone = dataType.long() || resources.Stone;

        legacyDungeons.Normal[13] = dataType.long();

        dataType.skip(11); // skip

        legacyDungeons.Twister = dataType.long();

        dataType.skip(3); // skip
        this.Fortress.RaidWood = Math.trunc(dataType.long() / 2);
        this.Fortress.RaidStone = Math.trunc(dataType.long() / 2);
        dataType.skip(1); // skip
        this.Fortress.WoodcutterMax = dataType.long();
        this.Fortress.QuarryMax = dataType.long();
        this.Fortress.AcademyMax = dataType.long();
        this.Fortress.MaxWood = dataType.long();
        this.Fortress.MaxStone = dataType.long();
        dataType.skip(1); // skip
        this.Fortress.Upgrade = {
            Building: dataType.long() - 1,
            Finish: dataType.long() * 1000 + data.offset,
            Start: dataType.long() * 1000 + data.offset
        }
        dataType.skip(4);
        this.Coins = dataType.long() || resources.Coins;
        dataType.skip(2);
        this.Fortress.Upgrades = dataType.long();
        this.Fortress.Honor = dataType.long();
        this.Fortress.Rank = dataType.long();
        dataType.skip(8); // skip
        if (dataType.long() * 1000 + data.offset < data.timestamp) {
            this.Fortress.RaidWood += Math.trunc(this.Fortress.Wood / 10);
            this.Fortress.RaidStone += Math.trunc(this.Fortress.Stone / 10);
        }
        dataType.skip(5); // skip
        this.Fortress.Knights = dataType.long();
        dataType.skip(5); // skip

        legacyDungeons.Shadow = dataType.byteArray(14);

        dataType.clear(); // skip
        dataType.skip(12); // skip
        legacyDungeons.Normal[15] = dataType.long();
        legacyDungeons.Shadow[15] = dataType.long();
        dataType.skip(1); // skip
        this.Group.Treasure = dataType.long();
        this.Group.Instructor = dataType.long();
        dataType.skip(4); // skip
        this.Group.Pet = dataType.long();
        dataType.skip(1);

        legacyDungeons.Youtube = dataType.long();

        dataType.skip(16);

        legacyDungeons.Normal[16] = dataType.byte();
        legacyDungeons.Shadow[16] = dataType.byte();

        dataType.short();
        dataType.skip(5);

        legacyDungeons.Normal[17] = dataType.short();
        legacyDungeons.Shadow[17] = dataType.short();

        dataType.skip(2);
        this.CalendarType = dataType.long();
        this.Underworld = {
            TimeMachineMushrooms: dataType.long(),
            Upgrade: {
                Building: 0,
                Finish: -1,
                Start: -1
            }
        };
        dataType.skip(3);
        this.LegendaryDungeonTries = dataType.long();
        dataType.skip(2);
        this.UsedAdventureTime = dataType.long();
        dataType.skip(5);
        this.ClientVersion = dataType.long();
        this.AdventureSkips = dataType.long();
        this.Summer = {
            Missions: [
                {
                    Type: dataType.long(),
                    Current: dataType.skip(2).long(),
                    Target: dataType.skip(2).long(),
                    Points: dataType.skip(2).long()
                },
                {
                    Type: dataType.back(9).long(),
                    Current: dataType.skip(2).long(),
                    Target: dataType.skip(2).long(),
                    Points: dataType.skip(2).long()
                },
                {
                    Type: dataType.back(9).long(),
                    Current: dataType.skip(2).long(),
                    Target: dataType.skip(2).long(),
                    Points: dataType.skip(2).long()
                }
            ],
            TotalPoints: dataType.long()
        }
        dataType.skip(3);

        legacyDungeons.Normal[18] = dataType.short();
        legacyDungeons.Shadow[18] = dataType.short();

        dataType.skip(7);
        this.Fortress.SecretWood = dataType.long() || resources.SecretWood;
        this.Fortress.SecretWoodLimit = dataType.long();
        this.Fortress.SecretStone = dataType.long() || resources.SecretStone;
        this.Fortress.SecretStoneLimit = dataType.long();
        dataType.skip(1);

        if (data.idle) {
            this.Idle = {
                Sacrifices: data.idle[2],
                Buildings: _sliceLen(data.idle, 3, 10),
                Money: data.idle[73],
                ReadyRunes: data.idle[75],
                Runes: data.idle[76],
                Upgrades: {
                    Speed: _sliceLen(data.idle, 43, 10),
                    Money: _sliceLen(data.idle, 53, 10)
                }
            };

            if (data.idle[77]) {
                for (let i = 0; i < 10; i++) {
                    this.Idle.Upgrades.Money[i]++;
                }
            }

            this.Idle.Upgrades.Total = _sum(this.Idle.Upgrades.Speed) + _sum(this.Idle.Upgrades.Money);
        }

        dataType = new ComplexDataType(data.pets);
        dataType.skip(2);

        const petLevels = dataType.sub(100);

        let shadowCount = 0;
        let lightCount = 0;
        let earthCount = 0;
        let fireCount = 0;
        let waterCount = 0;
        let shadowLevel = 0;
        let lightLevel = 0;
        let earthLevel = 0;
        let fireLevel = 0;
        let waterLevel = 0;

        if (petLevels.length) {
            for (let i = 0; i < 20; i++) {
                shadowCount += petLevels[i] > 0 ? 1 : 0;
                shadowLevel += petLevels[i];
            }

            for (let i = 0; i < 20; i++) {
                lightCount += petLevels[i + 20] > 0 ? 1 : 0;
                lightLevel += petLevels[i + 20];
            }

            for (let i = 0; i < 20; i++) {
                earthCount += petLevels[i + 40] > 0 ? 1 : 0;
                earthLevel += petLevels[i + 40];
            }

            for (let i = 0; i < 20; i++) {
                fireCount += petLevels[i + 60] > 0 ? 1 : 0;
                fireLevel += petLevels[i + 60];
            }

            for (let i = 0; i < 20; i++) {
                waterCount += petLevels[i + 80] > 0 ? 1 : 0;
                waterLevel += petLevels[i + 80];
            }
        }

        dataType.skip(1);
        this.Pets = {
            Levels: petLevels,
            ShadowLevels: petLevels.slice(0, 20),
            LightLevels: petLevels.slice(20, 40),
            EarthLevels: petLevels.slice(40, 60),
            FireLevels: petLevels.slice(60, 80),
            WaterLevels: petLevels.slice(80, 100),
            ShadowCount: shadowCount,
            LightCount: lightCount,
            EarthCount: earthCount,
            FireCount: fireCount,
            WaterCount: waterCount,
            ShadowLevel: shadowLevel,
            LightLevel: lightLevel,
            EarthLevel: earthLevel,
            FireLevel: fireLevel,
            WaterLevel: waterLevel,
            TotalCount: dataType.long(),
            Shadow: dataType.long(),
            Light: dataType.long(),
            Earth: dataType.long(),
            Fire: dataType.long(),
            Water: dataType.long()
        };
        dataType.skip(101);
        this.Pets.Dungeons = dataType.sub(5);
        dataType.skip(18);
        this.Pets.Rank = dataType.long();
        this.Pets.Honor = dataType.long();
        dataType.skip(20);
        this.Metal = dataType.long() || resources.Metal;
        this.Crystals = dataType.long() || resources.Crystals;
        dataType.skip(2);
        this.Pets.ShadowFood = dataType.long() || resources.ShadowFood;
        this.Pets.LightFood = dataType.long() || resources.LightFood;
        this.Pets.EarthFood = dataType.long() || resources.EarthFood;
        this.Pets.FireFood = dataType.long() || resources.FireFood;
        this.Pets.WaterFood = dataType.long() || resources.WaterFood;
        this.Pets.TotalLevel = shadowLevel + lightLevel + fireLevel + earthLevel + waterLevel;

        this.Name = data.name;
        this.Prefix = _formatPrefix(data.prefix);
        this.Identifier = data.prefix + '_p' + this.ID;

        this.Group.Identifier = this.Group.Name ? `${ data.prefix }_g${ this.Group.ID }` : null;

        if (data.tower) {
            legacyDungeons.Normal[14] = data.tower[150];
            legacyDungeons.Shadow[14] = data.tower[298];
        } else {
            legacyDungeons.Normal[14] = 0;
            legacyDungeons.Shadow[14] = 0;
        }

        this.Dungeons = DungeonHelper.fromData(legacyDungeons, data.dungeons);
        this.evaluateCommon();

        if (data.chest) {
            dataType = new ComplexDataType(data.chest);
            for (let i = 0; i < 45 && dataType.atLeast(12); i++) {
                const item = new ItemModel(dataType.sub(12), 6, i + 6);
                if (item.Type > 0) {
                    if (i >= 15) {
                        this.Inventory.Chest.push(item);
                    } else {
                        this.Inventory.Backpack.push(item);
                    }
                }
            }
        }

        if (data.dummy) {
            this.Inventory.Dummy = PlayerModel.loadEquipment(new ComplexDataType(data.dummy), 5);
        }

        dataType = new ComplexDataType(data.witch);
        this.Witch.Stage = dataType.long();
        this.Witch.Items = dataType.long();
        this.Witch.ItemsNext = Math.max(0, dataType.long());
        this.Witch.Item = dataType.long();
        this.Witch.Items = Math.min(this.Witch.Items, this.Witch.ItemsNext);

        dataType.skip(2);

        this.Witch.Finish = dataType.long() * 1000 + data.offset;
        if (this.Witch.Finish < this.Timestamp) {
            this.Witch.Finish = 0;
        }

        dataType.skip(1);

        this.Witch.Scrolls = [];
        for (let i = 0; i < 9; i++) {
            dataType.skip();

            const picIndex = dataType.long();
            const date = dataType.long() * 1000 + data.offset;
            const type = picIndex % 1000;

            this.Witch.Scrolls[PlayerModel.getScroll(type)] = {
                Date: date,
                Type: type,
                Owned: _between(date, 0, this.Timestamp)
            };
        }

        this.Witch.Stage = _lenWhere(this.Witch.Scrolls, (scroll) => scroll.Owned);

        if (data.tower) {
            this.Underworld.GoblinUpgrades = data.tower[146];
            this.Underworld.TrollUpgrades = data.tower[294];
            this.Underworld.KeeperUpgrades = data.tower[442];

            dataType = new ComplexDataType(data.tower.slice(448));
            this.Underworld.Heart = dataType.long();
            this.Underworld.Gate = dataType.long();
            this.Underworld.GoldPit = dataType.long();
            this.Underworld.Extractor = dataType.long();
            this.Underworld.GoblinPit = dataType.long();
            this.Underworld.Torture = dataType.long();
            this.Fortress.Gladiator = dataType.long();
            this.Underworld.TrollBlock = dataType.long();
            this.Underworld.TimeMachine = dataType.long();
            this.Underworld.Keeper = dataType.long();
            this.Underworld.Souls = dataType.long();
            this.Underworld.ExtractorSouls = dataType.long();
            this.Underworld.ExtractorMax = dataType.long();
            this.Underworld.MaxSouls = dataType.long();
            dataType.skip(1);
            this.Underworld.ExtractorHourly = dataType.long();
            this.Underworld.GoldPitGold = dataType.long() / 100;
            this.Underworld.GoldPitMax = dataType.long() / 100;
            this.Underworld.GoldPitHourly = dataType.long() / 100;
            dataType.skip(1);
            this.Underworld.Upgrade = {
                Building: dataType.long() - 1,
                Finish: dataType.long() * 1000 + data.offset,
                Start: dataType.long() * 1000 + data.offset
            };
            dataType.skip(2);
            this.Underworld.TimeMachineThirst = dataType.long();
            this.Underworld.TimeMachineMax = dataType.long();
            this.Underworld.TimeMachineDaily = dataType.long();
        }

        if (_notEmpty(data.tower)) {
            dataType = new ComplexDataType(data.tower);

            dataType.skip(3);
            var bert = CompanionModel.fromTower(dataType);
            this.Inventory.Bert = PlayerModel.loadEquipment(dataType, 2);

            dataType.skip(6);
            var mark = CompanionModel.fromTower(dataType);
            this.Inventory.Mark = PlayerModel.loadEquipment(dataType, 3);

            dataType.skip(6);
            var kuni = CompanionModel.fromTower(dataType);
            this.Inventory.Kunigunde = PlayerModel.loadEquipment(dataType, 4);

            this.Companions = {
                Bert: new CompanionModel(this, bert, this.Inventory.Bert, WARRIOR),
                Mark: new CompanionModel(this, mark, this.Inventory.Mark, MAGE),
                Kunigunde: new CompanionModel(this, kuni, this.Inventory.Kunigunde, SCOUT)
            };
        }

        this.Scrapbook = decodeScrapbook(data.scrapbook);
        this.ScrapbookLegendary = decodeScrapbook(data.scrapbook_legendary);

        this.WebshopID = PlayaResponse.unescape(data.webshopid);
    }

    _initOther (data) {
        const legacyDungeons = DungeonHelper.template();

        let dataType = new ComplexDataType(data.save);
        dataType.assert(256);

        this.ID = dataType.long();
        this.LastOnline = dataType.long() * 1000 + data.offset;
        this.Level = dataType.short();
        dataType.clear(); // skip
        this.XP = dataType.long();
        this.XPNext = dataType.long();
        this.Honor = dataType.long();
        this.Rank = dataType.long();
        dataType.short();
        this.DevilPercent = dataType.short();
        this.Face = {
            Mouth: dataType.long(),
            Hair: {
                Type: dataType.long() % 100,
                Color: Math.trunc(dataType.back(1).long() / 100)
            },
            Brows: {
                Type: dataType.long() % 100,
                Color: Math.trunc(dataType.back(1).long() / 100)
            },
            Eyes: dataType.long(),
            Beard: {
                Type: dataType.long() % 100,
                Color: Math.trunc(dataType.back(1).long() / 100)
            },
            Nose: dataType.long(),
            Ears: dataType.long(),
            Special: dataType.long(),
            Special2: dataType.long(),
            Portrait: dataType.long()
        };
        this.Race = dataType.short();
        dataType.clear(); // skip
        this.Gender = dataType.byte();
        this.Mirror = dataType.byte();
        this.MirrorPieces = PlayerModel.getMirrorPieces(dataType.short());
        this.Class = dataType.short();
        dataType.clear(); // skip
        PlayerModel.loadAttributes(this, dataType);
        this.Action = {
            Status: dataType.short()
        };
        dataType.short(); // Skip
        this.Action.Index = dataType.short();
        dataType.short(); // Skip
        this.Action.Finish = dataType.long() * 1000 + data.offset;
        this.Items = PlayerModel.loadEquipment(dataType, 1);
        this.Mount = dataType.short();
        this.MountValue = PlayerModel.getMount(this.Mount);

        legacyDungeons.Tower = dataType.short();
        legacyDungeons.Raid = dataType.short();

        dataType.short();
        this.Group = {
            ID: dataType.long(),
            Name: data.groupname
        };
        dataType.skip(1); // skip
        this.Book = Math.max(0, dataType.long() - 10000);

        legacyDungeons.Normal[10] = dataType.long();
        legacyDungeons.Normal[11] = dataType.long();

        this.Group.Joined = dataType.long() * 1000 + data.offset;
        this.Flags = PlayerModel.getFlags(dataType.long());
        this.Armor = dataType.long();
        this.Damage = {
            Min: dataType.long(),
            Max: dataType.long()
        };
        this.Damage.Avg = (this.Damage.Min + this.Damage.Max) / 2;
        dataType.skip(12); // skip

        legacyDungeons.Normal[0] = dataType.long();
        legacyDungeons.Normal[1] = dataType.long();
        legacyDungeons.Normal[2] = dataType.long();
        legacyDungeons.Normal[3] = dataType.long();
        legacyDungeons.Normal[4] = dataType.long();
        legacyDungeons.Normal[5] = dataType.long();
        legacyDungeons.Normal[6] = dataType.long();
        legacyDungeons.Normal[7] = dataType.long();
        legacyDungeons.Normal[8] = dataType.long();
        legacyDungeons.Normal[9] = dataType.long();
        legacyDungeons.Normal[12] = dataType.long() - 120;

        this.Potions = [{
            Type: getPotionType(dataType.long()),
            Size: dataType.skip(5).long()
        }, {
            Type: getPotionType(dataType.back(6).long()),
            Size: dataType.skip(5).long()
        }, {
            Type: getPotionType(dataType.back(6).long()),
            Size: dataType.skip(5).long()
        }];
        _sortDesc(this.Potions, potion => potion.Size);
        this.Potions.Life = dataType.long();
        this.Flags.GoldFrameDisabled = !!dataType.long();
        this.Flags.InvitesDisabled = !!dataType.long();
        dataType.skip(2); // skip
        this.Fortress = {
            Rank: data.fortressrank,
            Fortress: dataType.long(),
            LaborerQuarters: dataType.long(),
            WoodcutterGuild: dataType.long(),
            Quarry: dataType.long(),
            GemMine: dataType.long(),
            Academy: dataType.long(),
            ArcheryGuild: dataType.long(),
            Barracks: dataType.long(),
            MageTower: dataType.long(),
            Treasury: dataType.long(),
            Smithy: dataType.long(),
            Fortifications: dataType.long(),
            RaidWood: dataType.skip(8).long(),
            RaidStone: dataType.long()
        }
        dataType.skip(14); // skip
        this.Fortress.Upgrade = {
            Building: dataType.long() - 1,
            Finish: dataType.long() * 1000 + data.offset,
            Start: dataType.long() * 1000 + data.offset
        }
        this.Fortress.Upgrades = dataType.long();
        this.Fortress.Honor = dataType.long();
        dataType.skip(3); // skip
        dataType.short(); // skip

        legacyDungeons.Group = dataType.byte();
        legacyDungeons.Player = dataType.byte();
        legacyDungeons.Normal[13] = dataType.long();
        legacyDungeons.Shadow = dataType.byteArray(14);

        dataType.skip(3);

        dataType = new ComplexDataType(data.pets);
        dataType.skip(1); // skip
        this.Pets = {
            Shadow: dataType.long(),
            Light: dataType.long(),
            Earth: dataType.long(),
            Fire: dataType.long(),
            Water: dataType.long()
        };

        this.Name = data.name;
        this.Prefix = _formatPrefix(data.prefix);
        this.Identifier = data.prefix + '_p' + this.ID;

        this.Group.Identifier = this.Group.Name ? `${ data.prefix }_g${ this.Group.ID }` : null;

        this.Dungeons = DungeonHelper.fromData(legacyDungeons, null);
        this.evaluateCommon();
    }

    _initShared (data) {
        this.Data = data;
        this.Own = data.own;
        this.Timestamp = data.timestamp;
        this.Toilet = {};
        this.Witch = {};

        this.Achievements = [];
        this.Achievements.Owned = 0;

        const achievements = data.achievements || [];
        const half = Math.trunc(achievements.length / 2);
        for (let i = 0; i < ACHIEVEMENTS_COUNT; i++) {
            if (i >= half) {
                this.Achievements.push({
                    Owned: false,
                    Progress: 0
                });
            } else {
                this.Achievements.push({
                    Owned: achievements[i] == 1,
                    Progress: achievements[i + half] || 0
                });

                if (achievements[i] == 1) {
                    this.Achievements.Owned++;
                }
            }
        }

        this.Achievements.PetLover = this.Achievements[36].Owned;
        this.Achievements.Dehydration = this.Achievements[63].Owned;
        this.Achievements.Grail = this.Achievements[76].Owned;

        if (data.gtsave) {
            this.GroupTournament = {
                Tokens: data.gtsave.tokens,
                Floor: data.gtsave.floor,
                FloorMax: data.gtsave.floor_max
            }
        }
    }

    hasGuild () {
        return this.Group.Identifier != null;
    }

    getPrimaryAttribute () {
        return this[this.Config.Attribute];
    }

    getHealthMultiplier () {
        return this.Config.HealthMultiplier;
    }

    getMaximumDamageReduction () {
        return this.Config.MaximumDamageReduction;
    }

    getHealth () {
        let ma = this.getHealthMultiplier();
        let mb = (100 + this.Dungeons.Player) / 100;
        let mc = this.Potions.Life ? 1.25 : 1;
        let md = (100 + this.Runes.Health) / 100;

        return Math.trunc(Math.floor(Math.floor(this.Constitution.Total * ma * (this.Level + 1) * mb) * mc) * md);
    }

    getEquipmentBonus (attribute) {
        let bonus = 0;
        for (const item of Object.values(this.Items)) {
            for (let i = 0; i < 3; i++) {
                if (item.AttributeTypes[i] == attribute.Type || item.AttributeTypes[i] == 6 || item.AttributeTypes[i] == attribute.Type + 20 || (attribute.Type > 3 && item.AttributeTypes[i] >= 21 && item.AttributeTypes[i] <= 23)) {
                    bonus += item.Attributes[i];
                }
            }

            if (item.HasGem && (item.GemType == attribute.Type || item.GemType == 6 || (item.GemType == 7 && (attribute.Type == this.Primary.Type || attribute.Type == 4)))) {
                bonus += item.GemValue * (item.Type == 1 && this.Class != ASSASSIN ? 2 : 1);
            }
        }

        return bonus;
    }

    getEquipmentItemBonus (attribute) {
        let bonus = 0;
        for (const item of Object.values(this.Items)) {
            for (let i = 0; i < 3; i++) {
                if (item.AttributeTypes[i] == attribute.Type || item.AttributeTypes[i] == 6 || item.AttributeTypes[i] == attribute.Type + 20 || (attribute.Type > 3 && item.AttributeTypes[i] >= 21 && item.AttributeTypes[i] <= 23)) {
                    bonus += item.Attributes[i];
                }
            }
        }

        return bonus;
    }

    getEquipmentUpgradeBonus (attribute) {
        let bonus = 0;
        for (const item of Object.values(this.Items)) {
            if (item.Upgrades > 0) {
                for (let i = 0; i < 3; i++) {
                    if (item.AttributeTypes[i] == attribute.Type || item.AttributeTypes[i] == 6 || item.AttributeTypes[i] == attribute.Type + 20 || (attribute.Type > 3 && item.AttributeTypes[i] >= 21 && item.AttributeTypes[i] <= 23)) {
                        bonus += item.Attributes[i] - Math.floor(item.Attributes[i] / item.UpgradeMultiplier);
                    }
                }
            }
        }

        return bonus;
    }

    getEquipmentGemBonus (attribute) {
        let bonus = 0;
        for (const item of Object.values(this.Items)) {
            if (item.HasGem && (item.GemType == attribute.Type || item.GemType == 6 || (item.GemType == 7 && (attribute.Type == this.Primary.Type || attribute.Type == 4)))) {
                bonus += item.GemValue * (item.Type == 1 && this.Class != 4 ? 2 : 1);
            }
        }

        return bonus;
    }

    getClassBonus (attribute) {
        if (this.Class == BATTLEMAGE || this.Class == BERSERKER) {
            return Math.ceil((this.Class == BATTLEMAGE ? attribute.Equipment : attribute.Items) * 11 / 100);
        } else {
            return 0;
        }
    }

    getPotionSize (attribute) {
        for (const potion of this.Potions) {
            if (potion.Type == attribute.Type) {
                return potion.Size;
            }
        }

        return 0;
    }

    getPotionIndex (attribute) {
        for (let i = 0; i < this.Potions.length; i++) {
            if (this.Potions[i].Type == attribute.Type) {
                return i;
            }
        }

        return -1;
    }

    getPotionBonus (attribute) {
        for (const potion of this.Potions) {
            if (potion.Type == attribute.Type) {
                return Math.ceil((attribute.Base + attribute.Class + attribute.Equipment) * potion.Size / 100);
            }
        }

        return 0;
    }

    getPetBonus (attribute, pet) {
        return Math.ceil((attribute.Base + attribute.Equipment + attribute.Class + attribute.Potion) * pet / 100);
    }

    addCalculatedAttributes (attribute, pet) {
        attribute.Items = this.getEquipmentItemBonus(attribute);
        attribute.Gems = this.getEquipmentGemBonus(attribute);
        attribute.Upgrades = this.getEquipmentUpgradeBonus(attribute);
        attribute.Equipment = attribute.Items + attribute.Gems;
        attribute.ItemsBase = attribute.Items - attribute.Upgrades;
        attribute.Class = this.getClassBonus(attribute);
        attribute.Potion = this.getPotionBonus(attribute);
        attribute.Pet =  this.getPetBonus(attribute, pet);
        attribute.PotionIndex = this.getPotionIndex(attribute);
        attribute.PetBonus = pet;
        attribute.NextCost = calculateAttributePrice(attribute.Purchased ? attribute.Purchased : (attribute.Base - this.Achievements.Owned * 5));
        attribute.TotalCost = calculateTotalAttributePrice(attribute.Purchased ? attribute.Purchased : (attribute.Base - this.Achievements.Owned * 5));
        attribute.PotionSize = this.getPotionSize(attribute);

        if (!attribute.Bonus) {
            attribute.Total = attribute.Base + attribute.Pet + attribute.Potion + attribute.Class + attribute.Equipment;
        } else {
            attribute.Total = attribute.Base + attribute.Bonus;
        }
    }

    evaluateCommon () {
        this.Config = CONFIG.fromIndex(this.Class);

        this.Primary = this.getPrimaryAttribute();
        this.ClassBonus = this.Class == BATTLEMAGE || this.Class == BERSERKER;

        this.addCalculatedAttributes(this.Strength, this.Pets.Water);
        this.addCalculatedAttributes(this.Dexterity, this.Pets.Light);
        this.addCalculatedAttributes(this.Intelligence, this.Pets.Earth);
        this.addCalculatedAttributes(this.Constitution, this.Pets.Shadow);
        this.addCalculatedAttributes(this.Luck, this.Pets.Fire);

        this.Runes = {
            Gold: 0,
            Chance: 0,
            Quality: 0,
            XP: 0,
            Health: 0,
            ResistanceFire: 0,
            ResistanceCold: 0,
            ResistanceLightning: 0,
            Damage: 0,
            DamageFire: 0,
            DamageCold: 0,
            DamageLightning: 0,
            Damage2: 0,
            Damage2Fire: 0,
            Damage2Cold: 0,
            Damage2Lightning: 0,
            Resistance: 0,
            Runes: 0,
            Achievements: 0
        };

        if (this.Achievements[74].Owned) {
            this.Runes.Runes = 33;
            this.Runes.Achievements = 33;
        } else if (this.Achievements[73].Owned) {
            this.Runes.Runes = 24;
            this.Runes.Achievements = 24;
        } else if (this.Achievements[72].Owned) {
            this.Runes.Runes = 18;
            this.Runes.Achievements = 18;
        } else if (this.Achievements[71].Owned) {
            this.Runes.Runes = 12;
            this.Runes.Achievements = 12;
        } else if (this.Achievements[70].Owned) {
            this.Runes.Runes = 6;
            this.Runes.Achievements = 6;
        }

        let partCold = 0;
        let partFire = 0;
        let partLightning = 0;

        for (const item of Object.values(this.Items)) {
            if (item.HasRune && item.Type != 1) {
                const rune = item.AttributeTypes[2];
                const value = item.Attributes[2];

                if (rune == 31) {
                    this.Runes.Gold += value;
                    if (RUNE_VALUE.GOLD(value) > this.Runes.Runes) {
                        this.Runes.Runes = RUNE_VALUE.GOLD(value);
                    }
                } else if (rune == 32) {
                    this.Runes.Chance += value;
                    if (RUNE_VALUE.EPIC_FIND(value) > this.Runes.Runes) {
                        this.Runes.Runes = RUNE_VALUE.EPIC_FIND(value);
                    }
                } else if (rune == 33) {
                    this.Runes.Quality += value;
                    if (RUNE_VALUE.ITEM_QUALITY(value) > this.Runes.Runes) {
                        this.Runes.Runes = RUNE_VALUE.ITEM_QUALITY(value);
                    }
                } else if (rune == 34) {
                    this.Runes.XP += value;
                    if (RUNE_VALUE.XP(value) > this.Runes.Runes) {
                        this.Runes.Runes = RUNE_VALUE.XP(value);
                    }
                } else if (rune == 35) {
                    this.Runes.Health += value;
                    if (RUNE_VALUE.HEALTH(value) > this.Runes.Runes) {
                        this.Runes.Runes = RUNE_VALUE.HEALTH(value);
                    }
                } else if (rune == 36) {
                    this.Runes.ResistanceFire += value;
                    partFire += value;
                    if (RUNE_VALUE.SINGLE_RESISTANCE(value) > this.Runes.Runes) {
                        this.Runes.Runes = RUNE_VALUE.SINGLE_RESISTANCE(value);
                    }
                } else if (rune == 37) {
                    this.Runes.ResistanceCold += value;
                    partCold += value;
                    if (RUNE_VALUE.SINGLE_RESISTANCE(value) > this.Runes.Runes) {
                        this.Runes.Runes = RUNE_VALUE.SINGLE_RESISTANCE(value);
                    }
                } else if (rune == 38) {
                    this.Runes.ResistanceLightning += value;
                    partLightning += value;
                    if (RUNE_VALUE.SINGLE_RESISTANCE(value) > this.Runes.Runes) {
                        this.Runes.Runes = RUNE_VALUE.SINGLE_RESISTANCE(value);
                    }
                } else if (rune == 39) {
                    this.Runes.ResistanceFire += value;
                    this.Runes.ResistanceCold += value;
                    this.Runes.ResistanceLightning += value;
                    this.Runes.Resistance += value;
                }
            }
        }

        if (this.Items.Wpn1.AttributeTypes[2] >= 40) {
            const rune = this.Items.Wpn1.AttributeTypes[2];
            const value = this.Items.Wpn1.Attributes[2];

            this.Runes.Damage += value;
            if (RUNE_VALUE.ELEMENTAL_DAMAGE(value) > this.Runes.Runes) {
                this.Runes.Runes = RUNE_VALUE.ELEMENTAL_DAMAGE(value);
            }

            if (rune == 40) {
                this.Runes.DamageFire = value;
            } else if (rune == 41) {
                this.Runes.DamageCold = value;
            } else if (rune == 42) {
                this.Runes.DamageLightning = value;
            }
        }

        if (this.Class == ASSASSIN && this.Items.Wpn2.AttributeTypes[2] >= 40) {
            const rune = this.Items.Wpn2.AttributeTypes[2];
            const value = this.Items.Wpn2.Attributes[2];

            this.Runes.Damage2 += value;
            if (RUNE_VALUE.ELEMENTAL_DAMAGE(value) > this.Runes.Runes) {
                this.Runes.Runes = RUNE_VALUE.ELEMENTAL_DAMAGE(value);
            }

            if (rune == 40) {
                this.Runes.Damage2Fire = value;
            } else if (rune == 41) {
                this.Runes.Damage2Cold = value;
            } else if (rune == 42) {
                this.Runes.Damage2Lightning = value;
            }
        }

        this.Damage2 = {
            Min: this.Items.Wpn2.DamageMin,
            Max: this.Items.Wpn2.DamageMax
        };
        this.Damage2.Avg = (this.Damage2.Min + this.Damage2.Max) / 2;

        this.Runes.Gold = Math.min(50, this.Runes.Gold);
        this.Runes.Chance = Math.min(50, this.Runes.Chance);
        this.Runes.Quality = Math.min(5, this.Runes.Quality);
        this.Runes.XP = Math.min(10, this.Runes.XP);
        this.Runes.Health = Math.min(15, this.Runes.Health);

        this.Runes.Resistance += Math.min(25, Math.trunc(partFire / 3));
        this.Runes.Resistance += Math.min(25, Math.trunc(partCold / 3));
        this.Runes.Resistance += Math.min(25, Math.trunc(partLightning / 3));
        this.Runes.Resistance = Math.min(75, this.Runes.Resistance);

        this.Runes.ResistanceFire = Math.min(75, this.Runes.ResistanceFire);
        this.Runes.ResistanceCold = Math.min(75, this.Runes.ResistanceCold);
        this.Runes.ResistanceLightning = Math.min(75, this.Runes.ResistanceLightning);

        this.Runes.Damage = Math.min(60, this.Runes.Damage);
        this.Runes.DamageFire = Math.min(60, this.Runes.DamageFire);
        this.Runes.DamageCold = Math.min(60, this.Runes.DamageCold);
        this.Runes.DamageLightning = Math.min(60, this.Runes.DamageLightning);

        this.Runes.Damage2 = Math.min(60, this.Runes.Damage2);
        this.Runes.Damage2Fire = Math.min(60, this.Runes.Damage2Fire);
        this.Runes.Damage2Cold = Math.min(60, this.Runes.Damage2Cold);
        this.Runes.Damage2Lightning = Math.min(60, this.Runes.Damage2Lightning);

        this.Health = this.getHealth();

        this.OriginalAction = {
            Status: this.Action.Status,
            Finish: this.Action.Finish,
            Index: this.Action.Index
        };

        if (this.Action.Status < 0) {
            this.Action.Status += 256;
        }

        if (this.Action.Status == 0) {
            this.Action.Index = 0;
            this.Action.Finish = 0;
        }

        this.Potions.LifeIndex = this.Potions.findIndex(x => x.Type == 6);

        this.XPTotal = this.XP + EXPERIENCE_TOTAL[Math.min(393, this.Level)] + Math.max(0, this.Level - 393) * 1500000000;

        this.Fortress.RaidHonor = this.Fortress.Honor - 10 * (
            this.Fortress.Fortress +
            this.Fortress.LaborerQuarters +
            this.Fortress.WoodcutterGuild +
            this.Fortress.Quarry +
            this.Fortress.GemMine +
            this.Fortress.Academy +
            this.Fortress.ArcheryGuild +
            this.Fortress.Barracks +
            this.Fortress.MageTower +
            this.Fortress.Treasury +
            this.Fortress.Smithy +
            this.Fortress.Fortifications
        );

        if (this.Data.units) {
            this.Fortress.Wall = this.Data.units[0];
            this.Fortress.Warriors = this.Data.units[1];
            this.Fortress.Mages = this.Data.units[2];
            this.Fortress.Archers = this.Data.units[3];
        }

        if (this.Class === WARRIOR) {
            this.BlockChance = this.Items.Wpn2.Armor;
        }
    }

    injectGroup (group) {
        if (group) {
            // Find index of player in the group
            const gi = group.Members.findIndex(identifier => identifier == this.Identifier);

            // Add guild information
            this.Group.Group = group;
            this.Group.Role = group.Roles[gi];
            this.Group.Index = gi;
            this.Group.Rank = group.Rank;
            this.Group.ReadyDefense = group.States[gi] == 1 || group.States[gi] == 3;
            this.Group.ReadyAttack = group.States[gi] > 1;

            if (this.LastOnline < 6e11) {
                this.LastOnline = group.LastActives[gi];
            }

            if (group.Own) {
                this.Group.Own = true;
                this.Group.Pet = group.Pets[gi];
                this.Group.Treasure = group.Treasures[gi];
                this.Group.Instructor = group.Instructors[gi];

                if (!this.Fortress.Knights && group.Knights) {
                    this.Fortress.Knights = group.Knights[gi];
                }
            } else {
                this.Group.Pet = group.Pets[gi];
            }
        }

    }

    static loadEquipment (dataType, inventoryType) {
        return {
            Head: new ItemModel(dataType.sub(12), inventoryType, 1),
            Body: new ItemModel(dataType.sub(12), inventoryType, 2),
            Hand: new ItemModel(dataType.sub(12), inventoryType, 3),
            Feet: new ItemModel(dataType.sub(12), inventoryType, 4),
            Neck: new ItemModel(dataType.sub(12), inventoryType, 5),
            Belt: new ItemModel(dataType.sub(12), inventoryType, 6),
            Ring: new ItemModel(dataType.sub(12), inventoryType, 7),
            Misc: new ItemModel(dataType.sub(12), inventoryType, 8),
            Wpn1: new ItemModel(dataType.sub(12), inventoryType, 9),
            Wpn2: new ItemModel(dataType.sub(12), inventoryType, 10)
        };
    }

    static getScroll (value) {
        const scrollMap = {
            11: 0,
            31: 1,
            41: 2,
            51: 3,
            61: 4,
            71: 5,
            81: 6,
            91: 7,
            101: 8
        };

        return scrollMap[value];
    }

    static getMount (value) {
        const mountMap = [
            '', 10, 20, 30, 50
        ]

        return mountMap[value];
    }

    static getFlags (value) {
        let background = 0;
        for (let i = 2; i >= 0; i--) {
            if ((value & (1 << (6 + i))) != 0) {
                background = i + 1;
            }
        }

        return {
            GroupTournamentBackground: background,
            GoldFrame: (value & (1 << 5)) != 0,
            OfficialCreator: (value & (1 << 9)) != 0
        }
    }

    static getMirrorPieces (value) {
        let p = 0;

        for (let i = 0; i < 15; i++) {
            if ((value >> i) & 1) p++;
        }

        return p;
    }

    static loadAttributes (player, dataType, skipPurchased = true) {
        player.Strength = {
            Type: 1,
            Base: dataType.long(),
            Bonus: dataType.skip(4).long()
        };

        player.Dexterity = {
            Type: 2,
            Base: dataType.back(5).long(),
            Bonus: dataType.skip(4).long()
        };

        player.Intelligence = {
            Type: 3,
            Base: dataType.back(5).long(),
            Bonus: dataType.skip(4).long()
        };

        player.Constitution = {
            Type: 4,
            Base: dataType.back(5).long(),
            Bonus: dataType.skip(4).long()
        };

        player.Luck = {
            Type: 5,
            Base: dataType.back(5).long(),
            Bonus: dataType.skip(4).long()
        };

        // Skip purchased attributes
        if (skipPurchased) {
            dataType.skip(5);
        } else {
            player.Strength.Purchased = dataType.long();
            player.Dexterity.Purchased = dataType.long();
            player.Intelligence.Purchased = dataType.long();
            player.Constitution.Purchased = dataType.long();
            player.Luck.Purchased = dataType.long();
        }
    }
}

class CompanionModel extends PlayerModel {
    constructor (player, comp, items, pclass) {
        super(null);

        this.ID = -390 - pclass;
        this.Name = intl(`general.companion${pclass}_full`, { player: player.Name });
        this.Level = comp.Level;
        this.Class = pclass;
        this.Armor = comp.Armor;
        this.Damage = comp.Damage;
        this.Potions = player.Potions;
        this.Pets = player.Pets;
        this.Dungeons = player.Dungeons;
        this.Achievements = player.Achievements;
        this.Fortress = player.Fortress;
        this.Underworld = player.Underworld;

        this.Items = items;
        for (const [ key, item ] of Object.entries(this.Items)) {
            if (player.Class == BATTLEMAGE && this.Class == MAGE && item.Class == MAGE && item.Type > 1) {
                // When player is BattleMage and it's Mage equipment -> Strength into Intelligence
                this.Items[key] = item.morph(1, 3);
            } else if (player.Class == ASSASSIN && this.Class == WARRIOR && item.Class == WARRIOR && item.Type == 1) {
                // When player is Assassin and it's Warrior weapon -> Dexterity into Strength
                this.Items[key] = item.morph(2, 1);
            } else if (player.Class == DEMONHUNTER && this.Class == WARRIOR && item.Class == WARRIOR && item.Type > 1) {
                // When player is DemonHunter and it's Warrior equipment -> Dexterity into Strength
                this.Items[key] = item.morph(2, 1);
            } else if (player.Class == DRUID && this.Class == SCOUT && item.Class == SCOUT && item.Type > 1) {
                // When player is Druid and it's Scout equipment -> Intelligence into Dexterity
                this.Items[key] = item.morph(3, 2);
            } else if (player.Class == BARD && this.Class == SCOUT && item.Class == SCOUT && item.Type > 1) {
                // When player is Bard and it's Scout equipment -> Intelligence into Dexterity
                this.Items[key] = item.morph(3, 2);
            }
        }

        this.Strength = comp.Strength;
        this.Dexterity = comp.Dexterity;
        this.Intelligence = comp.Intelligence;
        this.Constitution = comp.Constitution;
        this.Luck = comp.Luck;

        this.evaluateCommon(player);
    }

    evaluateCommon(player) {
        this.Config = CONFIG.fromIndex(this.Class);

        this.Primary = this.getPrimaryAttribute();

        this.addCalculatedAttributes(this.Strength, player.Pets.Water);
        this.addCalculatedAttributes(this.Dexterity, player.Pets.Light);
        this.addCalculatedAttributes(this.Intelligence, player.Pets.Earth);
        this.addCalculatedAttributes(this.Constitution, player.Pets.Shadow);
        this.addCalculatedAttributes(this.Luck, player.Pets.Fire);

        this.Runes = {
            Gold: 0,
            Chance: 0,
            Quality: 0,
            XP: 0,
            Health: 0,
            ResistanceFire: 0,
            ResistanceCold: 0,
            ResistanceLightning: 0,
            Damage: 0,
            DamageFire: 0,
            DamageCold: 0,
            DamageLightning: 0,
            Resistance: 0
        };

        for (const item of Object.values(this.Items)) {
            if (item.HasRune) {
                const rune = item.AttributeTypes[2];
                const value = item.Attributes[2];

                if (rune == 31) {
                    this.Runes.Gold += value;
                    if (RUNE_VALUE.GOLD(value) > this.Runes.Runes) {
                        this.Runes.Runes = RUNE_VALUE.GOLD(value);
                    }
                } else if (rune == 32) {
                    this.Runes.Chance += value;
                    if (RUNE_VALUE.EPIC_FIND(value) > this.Runes.Runes) {
                        this.Runes.Runes = RUNE_VALUE.EPIC_FIND(value);
                    }
                } else if (rune == 33) {
                    this.Runes.Quality += value;
                    if (RUNE_VALUE.ITEM_QUALITY(value) > this.Runes.Runes) {
                        this.Runes.Runes = RUNE_VALUE.ITEM_QUALITY(value);
                    }
                } else if (rune == 34) {
                    this.Runes.XP += value;
                    if (RUNE_VALUE.XP(value) > this.Runes.Runes) {
                        this.Runes.Runes = RUNE_VALUE.XP(value);
                    }
                } else if (rune == 35) {
                    this.Runes.Health += value;
                    if (RUNE_VALUE.HEALTH(value) > this.Runes.Runes) {
                        this.Runes.Runes = RUNE_VALUE.HEALTH(value);
                    }
                } else if (rune == 36) {
                    this.Runes.ResistanceFire += value;
                    this.Runes.Resistance += Math.trunc(value / 3);
                    if (RUNE_VALUE.SINGLE_RESISTANCE(value) > this.Runes.Runes) {
                        this.Runes.Runes = RUNE_VALUE.SINGLE_RESISTANCE(value);
                    }
                } else if (rune == 37) {
                    this.Runes.ResistanceCold += value;
                    this.Runes.Resistance += Math.trunc(value / 3);
                    if (RUNE_VALUE.SINGLE_RESISTANCE(value) > this.Runes.Runes) {
                        this.Runes.Runes = RUNE_VALUE.SINGLE_RESISTANCE(value);
                    }
                } else if (rune == 38) {
                    this.Runes.ResistanceLightning += value;
                    this.Runes.Resistance += Math.trunc(value / 3);
                    if (RUNE_VALUE.SINGLE_RESISTANCE(value) > this.Runes.Runes) {
                        this.Runes.Runes = RUNE_VALUE.SINGLE_RESISTANCE(value);
                    }
                } else if (rune == 39) {
                    this.Runes.ResistanceFire += value;
                    this.Runes.ResistanceCold += value;
                    this.Runes.ResistanceLightning += value;
                    this.Runes.Resistance += value;
                } else if (rune == 40) {
                    this.Runes.DamageFire += value;
                    this.Runes.Damage += value;
                    if (RUNE_VALUE.ELEMENTAL_DAMAGE(value) > this.Runes.Runes) {
                        this.Runes.Runes = RUNE_VALUE.ELEMENTAL_DAMAGE(value);
                    }
                } else if (rune == 41) {
                    this.Runes.DamageCold += value;
                    this.Runes.Damage += value;
                    if (RUNE_VALUE.ELEMENTAL_DAMAGE(value) > this.Runes.Runes) {
                        this.Runes.Runes = RUNE_VALUE.ELEMENTAL_DAMAGE(value);
                    }
                } else if (rune == 42) {
                    this.Runes.DamageLightning += value;
                    this.Runes.Damage += value;
                    if (RUNE_VALUE.ELEMENTAL_DAMAGE(value) > this.Runes.Runes) {
                        this.Runes.Runes = RUNE_VALUE.ELEMENTAL_DAMAGE(value);
                    }
                }
            }
        }

        this.Runes.Gold = Math.min(50, this.Runes.Gold);
        this.Runes.Chance = Math.min(50, this.Runes.Chance);
        this.Runes.Quality = Math.min(5, this.Runes.Quality);
        this.Runes.XP = Math.min(10, this.Runes.XP);
        this.Runes.Health = Math.min(15, this.Runes.Health);
        this.Runes.Resistance = Math.min(75, this.Runes.Resistance);
        this.Runes.ResistanceFire = Math.min(75, this.Runes.ResistanceFire);
        this.Runes.ResistanceCold = Math.min(75, this.Runes.ResistanceCold);
        this.Runes.ResistanceLightning = Math.min(75, this.Runes.ResistanceLightning);
        this.Runes.Damage = Math.min(60, this.Runes.Damage);
        this.Runes.DamageFire = Math.min(60, this.Runes.DamageFire);
        this.Runes.DamageCold = Math.min(60, this.Runes.DamageCold);
        this.Runes.DamageLightning = Math.min(60, this.Runes.DamageLightning);
    }

    static fromTower (dataType) {
        const data = {
            Level: dataType.long()
        };
        dataType.skip(3);
        PlayerModel.loadAttributes(data, dataType);

        data.Armor = dataType.long();
        data.Damage = {
            Min: dataType.long(),
            Max: dataType.long()
        };
        data.Damage.Avg = Math.trunc((data.Damage.Min + data.Damage.Max) / 2);

        return data;
    }
}

class ModelUtils {
    static toSimulatorData (model, includeCompanions = false) {
        if (includeCompanions && typeof model.Companions !== 'undefined') {
            return [
                ModelUtils._toSimulatorData(model),
                ModelUtils._toSimulatorData(model.Companions.Bert),
                ModelUtils._toSimulatorData(model.Companions.Mark),
                ModelUtils._toSimulatorData(model.Companions.Kunigunde),
            ]
        } else {
            return ModelUtils._toSimulatorData(model);
        }
    }

    static toOtherGroup (group) {
        const copy = {
            own: 0
        };
    
        for (const field of _CONVERT_OTHER_GROUP_FIELDS) {
            copy[field] = group[field];
        }    
    
        return copy;
    }
    
    static toOtherPlayer (player) {
        const copy = {
            own: 0
        };
    
        for (const field of _CONVERT_OTHER_PLAYER_FIELDS) {
            copy[field] = player[field];
        }
    
        if (player.pets) {
            copy.pets = [0, ...player.pets.slice(104, 109)];
        }
    
        copy.save = _CONVERT_PLAYER_SAVE.reduce((memo, sourceIndex, targetIndex) => {
            if (sourceIndex !== null) {
                memo[targetIndex] = player.save[sourceIndex];
            }
            
            return memo;
        }, Array.from({ length: _OTHER_PLAYER_SAVE_LENGTH }).fill(0));
    
        copy.fortressrank = copy.fortressrank || player.save[583];
    
        return copy;
    }
    
    static _toSimulatorData (model) {
        return {
            Armor: model.Armor,
            Class: model.Class,
            Name: model.Name,
            Level: model.Level,
            Identifier: model.Identifier,
            Prefix: model.Prefix,
            BlockChance: model.BlockChance,
            Constitution: {
                Total: model.Constitution.Total
            },
            Dexterity: {
                Total: model.Dexterity.Total
            },
            Dungeons: {
                Player: model.Dungeons.Player,
                Group: model.Dungeons.Group
            },
            Fortress: {
                Gladiator: model.Fortress.Gladiator || 0,
            },
            Intelligence: {
                Total: model.Intelligence.Total
            },
            Strength: {
                Total: model.Strength.Total
            },
            Potions: {
                Life: model.Potions.Life
            },
            Luck: {
                Total: model.Luck.Total
            },
            Runes: {
                Health: model.Runes.Health,
                ResistanceCold: model.Runes.ResistanceCold,
                ResistanceFire: model.Runes.ResistanceFire,
                ResistanceLightning: model.Runes.ResistanceLightning
            },
            Items: {
                Hand: {
                    HasEnchantment: model.Items.Hand.HasEnchantment
                },
                Wpn1: {
                    AttributeTypes: {
                        2: model.Items.Wpn1.AttributeTypes[2]
                    },
                    Attributes: {
                        2: model.Items.Wpn1.Attributes[2]
                    },
                    DamageMax: model.Items.Wpn1.DamageMax,
                    DamageMin: model.Items.Wpn1.DamageMin,
                    HasEnchantment: model.Items.Wpn1.HasEnchantment
                },
                Wpn2: {
                    AttributeTypes: {
                        2: model.Items.Wpn2.AttributeTypes[2]
                    },
                    Attributes: {
                        2: model.Items.Wpn2.Attributes[2]
                    },
                    DamageMax: model.Items.Wpn2.DamageMax,
                    DamageMin: model.Items.Wpn2.DamageMin,
                    HasEnchantment: model.Items.Wpn2.HasEnchantment
                }
            }
        };
    }
}

const _CONVERT_OTHER_GROUP_FIELDS = ['prefix', 'timestamp', 'offset', 'name', 'rank', 'names', 'identifier', 'group', 'save'];
const _CONVERT_OTHER_PLAYER_FIELDS = ['prefix', 'timestamp', 'offset', 'name', 'identifier', 'class', 'groupname', 'units', 'fortressrank', 'group', 'version'];

const _OTHER_PLAYER_SAVE_LENGTH = 261;
const _CONVERT_PLAYER_SAVE = [
    1, 2, 7, 8, 9, 10, 11, null,
    // Face data
    17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
    // Class data
    27, 28, 29,
    // Attributes
    30, 31, 32, 33, 34,
    35, 36, 37, 38, 39,
    null, null, null, null, null,
    // Actions
    null, null, null,
    // Items
    48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59,
    60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71,
    72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83,
    84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95,
    96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107,
    108, 109, 110, 112, 113, 114, 115, 116, 117, 118, 119, 120,
    121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132,
    133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144,
    145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156,
    157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168,
    // Mount & Tower & Raids & Group
    286, 433, 435,
    null,
    // Scrapbook
    438,
    // Dungeons
    null, null,
    // Group
    443,
    // Special flags
    444,
    // Armor & Damage
    447, 448, 449,
    // Skips
    null, null, null, null, null, null,
    null, null, null, null, null, null,
    // Skips - dungeons
    null, null, null, null, null, null,
    null, null, null, null, null,
    // Potions
    493, 494, 495, null, null, null, 499, 500, 501,
    502,
    // Flags
    517, 521,
    null, null,
    // Fortress
    524, 525, 526, 527, 528, 529, 530, 531, 532, 533, 534, 535,
    // Skip
    null, null, null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null,
    // Upgrades & Honor
    581, 582,
    null, null, null,
    // Group & Player dungeons
    445
];
