class SFItem {
    constructor (data) {
        var dataType = ComplexDataType.create(data);
        dataType.assert(12);

        var type = dataType.short();
        var socket = dataType.byte();
        var enchantmentType = dataType.byte();
        var picIndex = dataType.short();
        var enchantmentPower = dataType.short();
        var damageMin = dataType.long();
        var damageMax = dataType.long();
        var attributeType = [dataType.long(), dataType.long(), dataType.long()];
        var attributeValue = [dataType.long(), dataType.long(), dataType.long()];
        var gold = dataType.long();
        var coins = dataType.byte();
        var upgradeLevel = dataType.byte();
        var socketPower = dataType.short();

        this.Socket = socket;
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
        this.DamageAverage = (damageMax + damageMin) / 2;
        this.Upgrades = upgradeLevel;
        this.AttributeTypes = attributeType;
        this.Attributes = attributeValue;
        this.HasEnchantment = enchantmentType > 0;

        this.SellPrice = {
            Gold: gold / 100
        }

        var dismantle = this.getDismantleReward();
        this.DismantlePrice = {
            Metal: dismantle.Metal,
            Crystal: dismantle.Crystal
        }

        var sell = this.getBlacksmithPrice();
        this.SellPrice.Metal = sell.Metal;
        this.SellPrice.Crystal = sell.Crystal;
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
        if (this.AttributeTypes[2] == rune) {
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
                this.Attributes[0] = Math.trunc( this.Attributes[0] / 1.04);
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

    getDismantleReward () {
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
                case 2: {
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

            var sell = this.getBlacksmithPrice();
            return {
                Metal: num2 + sell.Metal,
                Crystal: num3 + sell.Crystal
            };
        }
    }
}

class SFFighter {
    constructor (data) {
        var dataType = ComplexDataType.create(data);
        dataType.assert(47);

        this.ID = dataType.long();
        this.Name = dataType.string();
        this.Level = dataType.long();
        this.MaximumLife = dataType.long();
        this.Life = dataType.long();

        this.Strength = dataType.long();
        this.Dexterity = dataType.long();
        this.Intelligence = dataType.long();
        this.Constitution = dataType.long();
        this.Luck = dataType.long();

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

        this.Race = dataType.long();
        this.Gender = dataType.long();
        this.Class = dataType.long();

        this.Wpn1 = new SFItem(dataType.sub(12));
        this.Wpn2 = new SFItem(dataType.sub(12));
    }

    getMonsterID () {
        return -this.Face.Mouth;
    }

    isMonster () {
        return this.Face.Mouth < 0;
    }

    getMaximumDamageReduction () {
        switch (this.Class) {
            case 1:
            case 5:
            case 6:
                return 0.50
            case 3:
            case 4:
                return 0.25;
            case 2:
                return 0.10;
            default:
                return 0;
        }
    }

    getPrimaryAttribute () {
        switch (this.Class) {
            case 1:
            case 5:
            case 6:
                return this.Strength;
            case 3:
            case 4:
                return this.Dexterity;
            case 2:
                return this.Intelligence;
            default:
                return 0;
        }
    }

    getDefenseAtribute (player) {
        switch (player.Class) {
            case 1:
            case 5:
            case 6:
                return this.Strength;
            case 3:
            case 4:
                return this.Dexterity;
            case 2:
                return this.Intelligence;
            default:
                return 0;
        }
    }
}

class SFGroup {
    constructor (data) {
        this.Prefix = data.prefix.replace('_', ' ');
        this.ID = data.save[0];
        this.Identifier = data.prefix + '_g' + this.ID;

        this.Name = data.name;
        this.Rank = data.rank;
        this.Own = data.own;
        this.Timestamp = data.timestamp;

        this.MemberNames = data.members;
        this.MemberCount = data.save[3];
        this.Honor = data.save[13];
        this.Pet = data.save[378];

        this.Members = data.save.slice(14, 64).map(mid => (data.prefix + '_p' + mid));
        this.Roles = data.save.slice(314, 364);
        this.Treasures = data.save.slice(214, 264);
        this.Instructors = data.save.slice(264, 314);
        this.Pets = data.save.slice(390, 440);

        if (data.knights) {
            this.Knights = data.knights.slice(0, 50);
        }

        for (var i = 0; i < this.Members.length; i++) {
            if (this.Roles[i] == 0 || this.Roles[i] == GUILD_ROLE_INVITED) {
                if (this.Knights) {
                    this.Knights.splice(i, 1);
                }

                this.Roles.splice(i, 1);
                this.Treasures.splice(i, 1);
                this.Instructors.splice(i, 1);
                this.Pets.splice(i, 1);
                this.MemberNames.splice(i, 1);
                this.Members.splice(i--, 1);
                this.MemberCount--;
            }
        }
    }
}

class SFPlayer {
    init (data) {
        this.Data = data;

        this.Own = data.own;
        this.Timestamp = data.timestamp;
        this.Toilet = { };

        this.Achievements = [];
        this.Achievements.Owned = 0;
        for (var i = 0; i < 80; i++) {
            this.Achievements.push({
                Owned: data.achievements[i] == 1,
                Progress: data.achievements[i + 80] || 0
            });

            if (data.achievements[i] == 1 && i < data.achievements.length / 2) {
                this.Achievements.Owned++;
            }
        }

        this.Achievements.Dehydration = this.Achievements[63].Owned;
        this.Achievements.Grail = this.Achievements[76].Owned;
    }

    hasGuild () {
        return this.Group.Identifier != null;
    }

    getPrimaryAttribute () {
        switch (this.Class) {
            case 1:
            case 5:
            case 6:
                return this.Strength;
            case 3:
            case 4:
                return this.Dexterity;
            case 2:
                return this.Intelligence;
            default:
                return { };
        }
    }

    getHealth () {
        return Math.trunc(Math.floor((1 + this.Dungeons.Player / 100) * (this.Level + 1) * this.Constitution.Total * ((this.Class == 1 || this.Class == 5) ? 5 : (this.Class == 2 ? 2 : 4))) * (1 + this.Runes.Health / 100) * (this.Potions.Life ? 1.25 : 1));
    }

    getEquipmentBonus (attribute) {
        var bonus = 0;
        for (var item of Object.values(this.Items)) {
            for (var i = 0; i < 3; i++) {
                if (item.AttributeTypes[i] == attribute.Type || item.AttributeTypes[i] == 6 || item.AttributeTypes[i] == attribute.Type + 20 || (attribute.Type > 3 && item.AttributeTypes[i] >= 21 && item.AttributeTypes[i] <= 23)) {
                    bonus += item.Attributes[i];
                }
            }

            if (item.HasGem && (item.GemType == attribute.Type || item.GemType == 6)) {
                bonus += item.GemValue * (item.Type == 1 && this.Class != 4 ? 2 : 1);
            }
        }

        return bonus;
    }

    getClassBonus (attribute) {
        if (this.Class >= 5) {
            return Math.ceil(attribute.Equipment * 11 / 100);
        } else {
            return 0;
        }
    }

    getPotionBonus (attribute) {
        for (var potion of this.Potions) {
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
        attribute.Total = attribute.Base + attribute.Bonus;
        attribute.Equipment = this.getEquipmentBonus(attribute);
        attribute.Class = this.getClassBonus(attribute);
        attribute.Potion = this.getPotionBonus(attribute);
        attribute.Pet =  this.getPetBonus(attribute, pet);
    }

    evaluateCommon () {
        this.Primary = this.getPrimaryAttribute();

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

        for (var item of Object.values(this.Items)) {
            if (item.HasRune) {
                var rune = item.AttributeTypes[2];
                var value = item.Attributes[2];

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
                    // Ignored due to old total resistance
                    /*
                        if (RUNE_VALUE.TOTAL_RESISTANCE(value) > this.Runes.Runes) {
                            this.Runes.Runes = RUNE_VALUE.TOTAL_RESISTANCE(value);
                        }
                    */
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

        if (this.Class == 4) {
            this.Runes.Damage = Math.trunc(this.Runes.Damage / 2);
        }

        this.Health = this.getHealth();

        this.Dungeons.Normal.Total = this.Dungeons.Normal.reduce((a, b) => a + b, 0);
        this.Dungeons.Shadow.Total = this.Dungeons.Shadow.reduce((a, b) => a + b, 0);

        if (this.Action.Status < 0 || this.Action.Finish < this.Timestamp) {
            this.Action.Status = 0;
            this.Action.Index = 0;
        }

        this.Fortress.Upgrade.Building == 0 ? -1 : (12 - this.Fortress.Upgrade.Building);

        if (this.Achievements[50].Owned) {
            this.Fortress.Gladiator = 15;
        } else if (this.Achievements[51].Owned) {
            this.Fortress.Gladiator = 10;
        } else if (this.Achievements[52].Owned) {
            this.Fortress.Gladiator = 5;
        } else if (this.Level < 110) {
            this.Fortress.Gladiator = 0;
        } else {
            this.Fortress.Gladiator = 1;
        }
    }
}

class SFOtherPlayer extends SFPlayer {
    constructor (data) {
        super();

        this.init(data);

        var dataType = new ComplexDataType(data.save);
        dataType.assert(256);

        this.ID = dataType.long();
        this.LastOnline = dataType.long() * 1000 + correctDate(data.prefix);
        this.Level = dataType.short();
        dataType.clear(); // skip
        this.XP = dataType.long();
        this.XPNext = dataType.long();
        this.Honor = dataType.long();
        this.Rank = dataType.long();
        dataType.skip(1); // skip
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
        this.MirrorPieces = getMirrorPieces(dataType.short());
        this.Class = dataType.short();
        dataType.clear(); // skip
        this.Strength = {
            Type: 1,
            Base: dataType.long(),
            Bonus: dataType.skip(4).long()
        };
        this.Dexterity = {
            Type: 2,
            Base: dataType.back(5).long(),
            Bonus: dataType.skip(4).long()
        };
        this.Intelligence = {
            Type: 3,
            Base: dataType.back(5).long(),
            Bonus: dataType.skip(4).long()
        };
        this.Constitution = {
            Type: 4,
            Base: dataType.back(5).long(),
            Bonus: dataType.skip(4).long()
        };
        this.Luck = {
            Type: 5,
            Base: dataType.back(5).long(),
            Bonus: dataType.skip(4).long()
        };
        dataType.skip(5); // skip
        this.Action = {
            Status: dataType.short()
        };
        dataType.short(); // Skip
        this.Action.Index = dataType.short();
        dataType.short(); // Skip
        this.Action.Finish = dataType.long() * 1000 + correctDate(data.prefix);
        this.Items = {
            Head: new SFItem(dataType.sub(12)),
            Body: new SFItem(dataType.sub(12)),
            Hand: new SFItem(dataType.sub(12)),
            Feet: new SFItem(dataType.sub(12)),
            Neck: new SFItem(dataType.sub(12)),
            Belt: new SFItem(dataType.sub(12)),
            Ring: new SFItem(dataType.sub(12)),
            Misc: new SFItem(dataType.sub(12)),
            Wpn1: new SFItem(dataType.sub(12)),
            Wpn2: new SFItem(dataType.sub(12))
        };
        this.Mount = dataType.short();
        this.Dungeons = {
            Normal: []
        };
        this.Dungeons.Tower = dataType.short();
        this.Dungeons.Raid = dataType.short();
        dataType.short();
        this.Group = {
            ID: dataType.long(),
            Name: data.groupname
        };
        dataType.skip(1); // skip
        this.Book = Math.max(0, dataType.long() - 10000);
        this.Dungeons.Normal[10] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Normal[11] = Math.max(0, dataType.long() - 2);
        this.Group.Joined = dataType.long() * 1000 + correctDate(data.prefix);
        this.Flags = {
            Bits: dataType.long()
        };
        this.Armor = dataType.long();
        this.Damage = {
            Min: dataType.long(),
            Max: dataType.long()
        };
        this.Damage.Avg = (this.Damage.Min + this.Damage.Max) / 2;
        dataType.skip(12); // skip
        this.Dungeons.Normal[0] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Normal[1] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Normal[2] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Normal[3] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Normal[4] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Normal[5] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Normal[6] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Normal[7] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Normal[8] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Normal[9] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Normal[12] = Math.max(0, dataType.long() - 122);
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
        this.Potions.sort((a, b) => b.Size - a.Size);
        this.Potions.Life = dataType.long();
        this.Flags.HideFrame = dataType.long();
        this.Flags.NoInvite = dataType.long();
        dataType.skip(2); // skip
        this.Fortress = {
            Wall: data.units[0],
            Warriors: data.units[1],
            Mages: data.units[2],
            Archers: data.units[3],
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
            Building: dataType.long(),
            Finish: dataType.long() * 1000 + correctDate(data.prefix)
        }
        this.Fortress.Upgrades = dataType.skip(1).long();
        this.Fortress.Honor = dataType.long();
        dataType.skip(3); // skip
        dataType.short(); // skip
        this.Dungeons.Group = dataType.byte();
        this.Dungeons.Player = dataType.byte();
        this.Dungeons.Normal[13] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Shadow = [
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2)
        ];
        dataType.clear(); // skip

        dataType = new ComplexDataType(data.pets);
        dataType.assert(6);

        dataType.skip(1); // skip
        this.Pets = {
            Shadow: dataType.long(),
            Light: dataType.long(),
            Earth: dataType.long(),
            Fire: dataType.long(),
            Water: dataType.long()
        };

        this.Name = data.name;
        this.Prefix = data.prefix.replace('_', ' ');
        this.Identifier = data.prefix + '_p' + this.ID;

        this.Group.Identifier = this.Group.Name ? `${ data.prefix }_g${ this.Group.ID }` : null;
        this.evaluateCommon();
    }
}

class SFOwnPlayer extends SFPlayer {
    constructor (data) {
        super();

        this.init(data);

        var dataType = new ComplexDataType(data.save);
        dataType.assert(650);

        dataType.skip(1); // skip
        this.ID = dataType.long();
        this.LastOnline = dataType.long() * 1000 + correctDate(data.prefix);
        dataType.skip(4); // skip
        this.Level = dataType.short();
        dataType.clear();
        this.XP = dataType.long();
        this.XPNext = dataType.long();
        this.Honor = dataType.long();
        this.Rank = dataType.long();
        dataType.skip(2); // skip
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
        this.MirrorPieces = getMirrorPieces(dataType.short());
        this.Class = dataType.short();
        dataType.clear(); // skip
        this.Strength = {
            Type: 1,
            Base: dataType.long(),
            Bonus: dataType.skip(4).long()
        };
        this.Dexterity = {
            Type: 2,
            Base: dataType.back(5).long(),
            Bonus: dataType.skip(4).long()
        };
        this.Intelligence = {
            Type: 3,
            Base: dataType.back(5).long(),
            Bonus: dataType.skip(4).long()
        };
        this.Constitution = {
            Type: 4,
            Base: dataType.back(5).long(),
            Bonus: dataType.skip(4).long()
        };
        this.Luck = {
            Type: 5,
            Base: dataType.back(5).long(),
            Bonus: dataType.skip(4).long()
        };
        dataType.skip(5); // skip
        this.Action = {
            Status: dataType.short()
        };
        dataType.short(); // Skip
        this.Action.Index = dataType.short();
        dataType.short(); // Skip
        this.Action.Finish = dataType.long() * 1000 + correctDate(data.prefix);
        this.Items = {
            Head: new SFItem(dataType.sub(12)),
            Body: new SFItem(dataType.sub(12)),
            Hand: new SFItem(dataType.sub(12)),
            Feet: new SFItem(dataType.sub(12)),
            Neck: new SFItem(dataType.sub(12)),
            Belt: new SFItem(dataType.sub(12)),
            Ring: new SFItem(dataType.sub(12)),
            Misc: new SFItem(dataType.sub(12)),
            Wpn1: new SFItem(dataType.sub(12)),
            Wpn2: new SFItem(dataType.sub(12))
        };
        dataType.skip(118); // skip
        this.Mount = dataType.short();
        this.Dungeons = {
            Normal: [],
            Extra: {
                Normal: [],
                Shadow: []
            }
        };
        this.Dungeons.Tower = dataType.short();
        dataType.skip(146); // skip
        this.Dungeons.Raid = dataType.short();
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
        this.Dungeons.Normal[10] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Normal[11] = Math.max(0, dataType.long() - 2);
        this.Group.Joined = dataType.long() * 1000 + correctDate(data.prefix);
        this.Flags = {
            Bits: dataType.long()
        };
        dataType.short(); // skip
        this.Dungeons.Group = dataType.byte();
        this.Dungeons.Player = dataType.byte();
        dataType.skip(1); // skip
        this.Armor = dataType.long();
        this.Damage = {
            Min: dataType.long(),
            Max: dataType.long()
        };
        this.Damage.Avg = (this.Damage.Min + this.Damage.Max) / 2;
        dataType.skip(30); // skip
        this.Dungeons.Normal[0] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Normal[1] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Normal[2] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Normal[3] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Normal[4] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Normal[5] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Normal[6] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Normal[7] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Normal[8] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Normal[9] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Normal[12] = Math.max(0, dataType.long() - 122);
        this.Toilet = {
            Aura: dataType.long(),
            Fill: dataType.long()
        }
        this.Potions = [{
            Type: getPotionType(dataType.long()),
            Expire: dataType.skip(2).long() * 1000 + correctDate(data.prefix),
            Size: dataType.skip(2).long()
        }, {
            Type: getPotionType(dataType.back(6).long()),
            Expire: dataType.skip(2).long() * 1000 + correctDate(data.prefix),
            Size: dataType.skip(2).long()
        }, {
            Type: getPotionType(dataType.back(6).long()),
            Expire: dataType.skip(2).long() * 1000 + correctDate(data.prefix),
            Size: dataType.skip(2).long()
        }];
        this.Potions.sort((a, b) => b.Size - a.Size);
        this.Potions.Life = dataType.long();
        dataType.skip(12); // skip
        this.Toilet.Capacity = dataType.long();
        dataType.skip(1); // skip
        this.Flags.HideFrame = dataType.long();
        dataType.skip(3); //skip
        this.Flags.NoInvite = dataType.long();
        dataType.skip(2); // skip
        this.Fortress = {
            Wall: data.units[0],
            Warriors: data.units[1],
            Mages: data.units[2],
            Archers: data.units[3],
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
        this.Hourglass = dataType.long();
        dataType.skip(1);
        this.Fortress.Wood = dataType.long();
        this.Fortress.Stone = dataType.long();
        this.Dungeons.Normal[13] = Math.max(0, dataType.long() - 2);
        dataType.skip(11); // skip
        this.Dungeons.Twister = Math.max(0, dataType.long() - 2);
        dataType.skip(3); // skip
        this.Fortress.RaidWood = Math.trunc(dataType.long() / 2);
        this.Fortress.RaidStone = Math.trunc(dataType.long() / 2);
        dataType.skip(7); // skip
        this.Fortress.Upgrade = {
            Building: dataType.long(),
            Finish: dataType.long() * 1000 + correctDate(data.prefix)
        }
        this.Fortress.Upgrades = dataType.skip(8).long();
        this.Fortress.Honor = dataType.long();
        this.Fortress.Rank = dataType.long();
        dataType.skip(7); // skip
        if (dataType.long() * 1000 + correctDate(data.prefix) < data.timestamp) {
            this.Fortress.RaidWood += Math.trunc(this.Fortress.Wood / 10);
            this.Fortress.RaidStone += Math.trunc(this.Fortress.Stone / 10);
        }
        dataType.skip(6); // skip
        this.Fortress.Knights = dataType.long();
        dataType.skip(5); // skip
        this.Dungeons.Shadow = [
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2),
            Math.max(0, dataType.byte() - 2)
        ];
        dataType.clear(); // skip
        dataType.skip(12); // skip
        this.Dungeons.Extra.Normal[1] = Math.max(0, dataType.long() - 2);
        this.Dungeons.Extra.Shadow[1] = Math.max(0, dataType.long() - 2);
        dataType.skip(1); // skip
        this.Group.Treasure = dataType.long();
        this.Group.Instructor = dataType.long();
        dataType.skip(4); // skip
        this.Group.Pet = dataType.long();
        dataType.skip(1);
        this.Dungeons.Extra.Youtube = Math.max(0, dataType.long() - 2);
        dataType.skip(16);
        this.Dungeons.Extra.Normal[2] = Math.max(0, dataType.byte() - 2);
        this.Dungeons.Extra.Shadow[2] = Math.max(0, dataType.byte() - 2);

        this.Dungeons.Extra.Normal[0] = Math.max(0, data.tower[150] - 2);
        this.Dungeons.Extra.Shadow[0] = Math.max(0, data.tower[298] - 2);

        dataType = new ComplexDataType(data.pets);
        dataType.assert(288);

        dataType.skip(104); // skip
        this.Pets = {
            Shadow: dataType.long(),
            Light: dataType.long(),
            Earth: dataType.long(),
            Fire: dataType.long(),
            Water: dataType.long()
        };

        this.Name = data.name;
        this.Prefix = data.prefix.replace('_', ' ');
        this.Identifier = data.prefix + '_p' + this.ID;

        this.Group.Identifier = this.Group.Name ? `${ data.prefix }_g${ this.Group.ID }` : null;
        this.evaluateCommon();

        this.Dungeons.Extra.Normal.Total = this.Dungeons.Normal.Total + this.Dungeons.Extra.Normal.reduce((a, b) => a + b, 0);
        this.Dungeons.Extra.Shadow.Total = this.Dungeons.Shadow.Total + this.Dungeons.Extra.Shadow.reduce((a, b) => a + b, 0);
    }
}
