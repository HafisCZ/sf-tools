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
        this.GemType = socket >= 10 ? (socket % 10) : -1;
        this.HasSocket = socket > 0;
        this.GemValue = socketPower;
        this.HasGem = socket > 1;
        this.HasRune = attributeType[2] > 0;
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
        this.Value = gold / 100;
        this.Mushrooms = coins;
        this.AttributeTypes = attributeType;
        this.Attributes = attributeValue;
        this.HasEnchantment = enchantmentType > 0;
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
            return [0, 0];
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

            return [Math.floor(num * num2 / 100), Math.max(10, Math.floor(num * num3 / 100) * 10)];
        }
    }

    getBlacksmithUpgradePrice () {
        if (this.Type == 0 || this.Type > 10) {
            return [0, 0];
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

            return [num2, num3];
        }
    }

    getBlacksmithPrice () {
        if (this.Value == 0 && this.Type == 1) {
            return [0, 0];
        } else {
            var num = 0;
            var num2 = 0;
            var upgrades = this.Upgrades;
            var num3 = this.Attributes[0];

            while (this.Upgrades-- > 0) {
                this.Attributes[0] = Math.trunc( this.Attributes[0] / 1.04);
                var price = this.getBlacksmithUpgradePrice();

                num += price[0];
                num2 += price[1];
            }

            this.Upgrades = upgrades;
            this.Attributes[0] = num3;

            return [num, num2];
        }
    }

    getDismantleReward () {
        if (this.Type == 0 || this.Type > 10) {
            return [0, 0];
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
            return [ num2 + sell[0], num3 + sell[1] ];
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
        this.Identifier = data.prefix + '_' + this.ID;

        this.Name = data.name;
        this.Rank = data.rank;
        this.Own = data.own;
        this.Timestamp = data.timestamp;

        this.MemberNames = data.members;
        this.MemberCount = data.save[3];
        this.Honor = data.save[13];
        this.Pet = data.save[378];

        this.Members = data.save.slice(14, 64).map(mid => (data.prefix + '_' + mid));
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
    constructor (data) {
        this.Timestamp = data.timestamp;

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

    getInactiveDuration () {
        var dif = this.Timestamp - this.LastOnline;
        if (dif < 900000) return 0;
        else if (dif < 3600000) return 1;
        else if (dif < 43200000) return 2;
        else if (dif < 86400000) return 3;
        else if (dif < 259200000) return 4;
        else if (dif < 604800000) return 5;
        else if (dif < 1814400000) return 6;
        else return 7;
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
}

class SFOtherPlayer extends SFPlayer {
    constructor (data) {
        super(data);

        var dataType = new ComplexDataType(data.save);
        dataType.assert(256);

        this.ID = dataType.long();
        this.LastOnline = new Date(dataType.long() * 1000);
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
            Base: dataType.long(),
            Bonus: dataType.skip(4).long()
        };
        this.Dexterity = {
            Base: dataType.back(5).long(),
            Bonus: dataType.skip(4).long()
        };
        this.Intelligence = {
            Base: dataType.back(5).long(),
            Bonus: dataType.skip(4).long()
        };
        this.Constitution = {
            Base: dataType.back(5).long(),
            Bonus: dataType.skip(4).long()
        };
        this.Luck = {
            Base: dataType.back(5).long(),
            Bonus: dataType.skip(4).long()
        };
        this.Strength.Total = this.Strength.Base + this.Strength.Bonus;
        this.Dexterity.Total = this.Dexterity.Base + this.Dexterity.Bonus;
        this.Intelligence.Total = this.Intelligence.Base + this.Intelligence.Bonus;
        this.Constitution.Total = this.Constitution.Base + this.Constitution.Bonus;
        this.Luck.Total = this.Luck.Base + this.Luck.Bonus;
        dataType.skip(8); // skip
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
        dataType.skip(1); // skip
        this.Group = {
            ID: dataType.long(),
            Name: data.groupname
        };
        dataType.skip(1); // skip
        this.Book = Math.max(0, dataType.long() - 10000);
        this.Dungeons.Normal[10] = dataType.long();
        this.Dungeons.Normal[11] = dataType.long();
        this.Group.Joined = new Date(dataType.long() * 1000);
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
        this.Dungeons.Normal[0] = dataType.long();
        this.Dungeons.Normal[1] = dataType.long();
        this.Dungeons.Normal[2] = dataType.long();
        this.Dungeons.Normal[3] = dataType.long();
        this.Dungeons.Normal[4] = dataType.long();
        this.Dungeons.Normal[5] = dataType.long();
        this.Dungeons.Normal[6] = dataType.long();
        this.Dungeons.Normal[7] = dataType.long();
        this.Dungeons.Normal[8] = dataType.long();
        this.Dungeons.Normal[9] = dataType.long();
        this.Dungeons.Normal[12] = dataType.long() - 120;
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
            Wood: dataType.skip(8).long(),
            Stone: dataType.long()
        }
        dataType.skip(14); // skip
        this.Fortress.Upgrade = {
            Building: dataType.long(),
            Finish: new Date(dataType.long() * 1000)
        }
        this.Fortress.Upgrades = dataType.skip(1).long();
        this.Fortress.Honor = dataType.long();
        dataType.skip(3); // skip
        dataType.short(); // skip
        this.Dungeons.Group = dataType.byte();
        this.Dungeons.Player = dataType.byte();
        this.Dungeons.Normal[13] = dataType.long();
        this.Dungeons.Shadow = [
            dataType.byte(),
            dataType.byte(),
            dataType.byte(),
            dataType.byte(),
            dataType.byte(),
            dataType.byte(),
            dataType.byte(),
            dataType.byte(),
            dataType.byte(),
            dataType.byte(),
            dataType.byte(),
            dataType.byte(),
            dataType.byte(),
            dataType.byte()
        ];
        dataType.clear(); // skip
        this.Fortress.Knights = dataType.long();

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
        this.Identifier = data.prefix + '_' + this.ID;

        this.Group.Identifier = this.Group.Name ? `${ data.prefix }_${ this.Group.ID }` : null;
        this.PrimaryAttribute = this.getPrimaryAttribute();
    }
}

class SFOwnPlayer extends SFPlayer {
    constructor (data) {
        super(data);

        var dataType = new ComplexDataType(data.save);
        dataType.assert(650);

        dataType.skip(1); // skip
        this.ID = dataType.long();
        this.LastOnline = new Date(dataType.long() * 1000);
        dataType.skip(4); // skip
        this.Level = dataType.short();
        dataType.clear();
        this.XP = dataType.long();
        this.XPNext = dataType.long();
        this.Honor = dataType.long();
        this.Rank = dataType.long();
        dataType.skip(5); // skip
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
            Base: dataType.long(),
            Bonus: dataType.skip(4).long()
        };
        this.Dexterity = {
            Base: dataType.back(5).long(),
            Bonus: dataType.skip(4).long()
        };
        this.Intelligence = {
            Base: dataType.back(5).long(),
            Bonus: dataType.skip(4).long()
        };
        this.Constitution = {
            Base: dataType.back(5).long(),
            Bonus: dataType.skip(4).long()
        };
        this.Luck = {
            Base: dataType.back(5).long(),
            Bonus: dataType.skip(4).long()
        };
        this.Strength.Total = this.Strength.Base + this.Strength.Bonus;
        this.Dexterity.Total = this.Dexterity.Base + this.Dexterity.Bonus;
        this.Intelligence.Total = this.Intelligence.Base + this.Intelligence.Bonus;
        this.Constitution.Total = this.Constitution.Base + this.Constitution.Bonus;
        this.Luck.Total = this.Luck.Base + this.Luck.Bonus;
        dataType.skip(8); // skip
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
            Normal: []
        };
        this.Dungeons.Tower = dataType.short();
        dataType.skip(148); // skip
        this.Group = {
            ID: dataType.long(),
            Name: data.groupname
        };
        dataType.skip(2); // skip
        this.Book = Math.max(0, dataType.long() - 10000);
        dataType.skip(2); // skip
        this.Dungeons.Normal[10] = dataType.long();
        this.Dungeons.Normal[11] = dataType.long();
        this.Group.Joined = new Date(dataType.long() * 1000);
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
        this.Dungeons.Normal[0] = dataType.long();
        this.Dungeons.Normal[1] = dataType.long();
        this.Dungeons.Normal[2] = dataType.long();
        this.Dungeons.Normal[3] = dataType.long();
        this.Dungeons.Normal[4] = dataType.long();
        this.Dungeons.Normal[5] = dataType.long();
        this.Dungeons.Normal[6] = dataType.long();
        this.Dungeons.Normal[7] = dataType.long();
        this.Dungeons.Normal[8] = dataType.long();
        this.Dungeons.Normal[9] = dataType.long();
        this.Dungeons.Normal[12] = dataType.long() - 120;
        dataType.skip(2); // skip
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
        dataType.skip(14); // skip
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
            Fortifications: dataType.long(),
            Wood: dataType.skip(8).long(),
            Stone: dataType.long()
        }
        this.Dungeons.Normal[13] = dataType.long();
        dataType.skip(24); // skip
        this.Fortress.Upgrade = {
            Building: dataType.long(),
            Finish: new Date(dataType.long() * 1000)
        }
        this.Fortress.Upgrades = dataType.skip(8).long();
        this.Fortress.Honor = dataType.long();
        this.Fortress.Rank = dataType.long();
        dataType.skip(14); // skip
        this.Fortress.Knights = dataType.long();
        dataType.skip(5); // skip
        this.Dungeons.Shadow = [
            dataType.byte(),
            dataType.byte(),
            dataType.byte(),
            dataType.byte(),
            dataType.byte(),
            dataType.byte(),
            dataType.byte(),
            dataType.byte(),
            dataType.byte(),
            dataType.byte(),
            dataType.byte(),
            dataType.byte(),
            dataType.byte(),
            dataType.byte()
        ];
        dataType.clear(); // skip
        dataType.skip(15); // skip
        this.Group.Treasure = dataType.long();
        this.Group.Instructor = dataType.long();
        dataType.skip(4); // skip
        this.Group.Pet = dataType.long();

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
        this.Identifier = data.prefix + '_' + this.ID;

        this.Group.Identifier = this.Group.Name ? `${ data.prefix }_${ this.Group.ID }` : null;
        this.PrimaryAttribute = this.getPrimaryAttribute();
    }
}
