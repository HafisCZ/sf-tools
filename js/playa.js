class Item {
    constructor (data) {
        var dataType = ComplexDataType.fromArray(data);
        dataType.assert(48);

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
}

class Player {
    constructor (data)
    {
        this.Prefix = data.prefix || 's1_de';

        this.Name = data.name;

        if (data.groupname) {
            this.Group = {
                Name: data.groupname,
                Joined: new Date(data.save[data.own ? 443 : 166] * 1000)
            };
        }

        this.Fortress = {
            Wall: data.units[0],
            Warriors : data.units[1],
            Mages : data.units[2],
            Archers : data.units[3],
            Rank : data.fortressrank,
            Honor : data.save[data.own ? 582 : 248],
            Upgrades : data.save[data.own ? 581 : 247],
            Knights : data.save[data.own ? 598 : 258],
            Fortress : data.save[data.own ? 524 : 208],
            LaborerQuarters : data.save[data.own ? 525 : 209],
            WoodcutterGuild : data.save[data.own ? 527 : 210],
            Quarry : data.save[data.own ? 527 : 211],
            GemMine : data.save[data.own ? 528 : 212],
            Academy : data.save[data.own ? 529 : 213],
            ArcheryGuild : data.save[data.own ? 530 : 214],
            Barracks : data.save[data.own ? 531 : 215],
            MageTower : data.save[data.own ? 532 : 216],
            Treasury : data.save[data.own ? 533 : 217],
            Smithy : data.save[data.own ? 534 : 218],
            Fortifications : data.save[data.own ? 535 : 219]
        };

        if (!data.achievements) {
            data.achievements = Array(160).fill(0);
        }

        if (data.achievements.length < 160) {
            data.achievements.splice(140, 0, ... [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
            data.achievements.splice(70, 0, ... [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        }

        this.Achievements = data.achievements.slice(0, 80).reduce(function (array, item, index) {
            array.push({
                Owned: item === 1,
                Progress: data.achievements[index + 80]
            });

            return array;
        }, []);
        this.Achievements.Owned = data.achievements.slice(0, 80).reduce(function (result, a) {
            return result + a
        }, 0);

        this.Achievements.Dehydration = this.Achievements[63].Owned;

        this.ID = data.save[data.own ? 1 : 0];
        this.Identifier = this.Prefix + '_' + this.ID;

        this.LastOnline = new Date(data.save[data.own ? 2 : 1] * 1000);
        this.Level = split(data.save[data.own ? 7 : 2], 16);
        this.XP = data.save[data.own ? 8 : 3];
        this.XPNext = data.save[data.own ? 9 : 4];
        this.Book = data.save[data.own ? 438 : 163] ? data.save[data.own ? 438 : 163] - 10000 : 0;
        this.Honor = data.save[data.own ? 10 : 5];
        this.Rank = data.save[data.own ? 11 : 6];
        this.Race = split(data.save[data.own ? 27 : 18], 4);

        [this.Sex, this.Mirror, this.MirrorPieces] = ComplexDataType.fromValue(data.save[data.own ? 28 : 19]).multiple(o => [ o.byte(), o.byte(), getMirrorPieces(o.short()) ]);
        this.MirrorPieces.Count = this.MirrorPieces.reduce((count, o) => count + (o ? 1 : 0), 0);

        this.Class = split(data.save[data.own ? 29 : 20], 4);

        this.Face = data.own ? {
            Mouth: data.save[17],
            Hair: {
                Type: data.save[18] % 100,
                Color: Math.trunc(data.save[18] / 100)
            },
            Brows: {
                Type: data.save[19] % 100,
                Color: Math.trunc(data.save[19] / 100)
            },
            Eyes: data.save[20],
            Beard: {
                Type: data.save[21] % 100,
                Color: Math.trunc(data.save[21] / 100)
            },
            Nose: data.save[22],
            Ears: data.save[23],
            Extra: data.save[24]
        } : {
            Mouth: data.save[8],
            Hair: {
                Type: data.save[9] % 100,
                Color: Math.trunc(data.save[9] / 100)
            },
            Brows: {
                Type: data.save[10] % 100,
                Color: Math.trunc(data.save[10] / 100)
            },
            Eyes: data.save[11],
            Beard: {
                Type: data.save[12] % 100,
                Color: Math.trunc(data.save[12] / 100)
            },
            Nose: data.save[13],
            Ears: data.save[14],
            Extra: data.save[15]
        };

        this.Strength = data.own ? {
            Total: data.save[30] + data.save[35],
            Base: data.save[30],
            Bonus: data.save[35]
        } : {
            Total: data.save[21] + data.save[26],
            Base: data.save[21],
            Bonus: data.save[26]
        };

        this.Dexterity = data.own ? {
            Total: data.save[31] + data.save[36],
            Base: data.save[31],
            Bonus: data.save[36]
        } : {
            Total: data.save[22] + data.save[27],
            Base: data.save[22],
            Bonus: data.save[27]
        };

        this.Intelligence = data.own ? {
            Total: data.save[32] + data.save[37],
            Base: data.save[32],
            Bonus: data.save[37]
        } : {
            Total: data.save[23] + data.save[28],
            Base: data.save[23],
            Bonus: data.save[28]
        };

        this.Constitution = data.own ? {
            Total: data.save[33] + data.save[38],
            Base: data.save[33],
            Bonus: data.save[38]
        } : {
            Total: data.save[24] + data.save[29],
            Base: data.save[24],
            Bonus: data.save[29]
        };

        this.Luck = data.own ? {
            Total: data.save[34] + data.save[39],
            Base: data.save[34],
            Bonus: data.save[39]
        } : {
            Total: data.save[25] + data.save[30],
            Base: data.save[25],
            Bonus: data.save[30]
        };

        this.Armor = data.save[data.own ? 447 : 168];
        this.Damage = {
            Min: data.save[data.own ? 448 : 169],
            Max: data.save[data.own ? 449 : 170],
            Avg: (data.save[data.own ? 448 : 169] + data.save[data.own ? 449 : 170]) / 2
        };

        this.Items = {
            Head: new Item(data.own ? data.save.slice(48, 60) : data.save.slice(39, 51)),
            Body: new Item(data.own ? data.save.slice(60, 72) : data.save.slice(51, 63)),
            Hand: new Item(data.own ? data.save.slice(72, 84) : data.save.slice(63, 75)),
            Feet: new Item(data.own ? data.save.slice(84, 96) : data.save.slice(75, 87)),
            Neck: new Item(data.own ? data.save.slice(96, 108) : data.save.slice(87, 99)),
            Belt: new Item(data.own ? data.save.slice(108, 120) : data.save.slice(99, 111)),
            Ring: new Item(data.own ? data.save.slice(120, 132) : data.save.slice(111, 123)),
            Misc: new Item(data.own ? data.save.slice(132, 144) : data.save.slice(123, 135)),
            Wpn1: new Item(data.own ? data.save.slice(144, 156) : data.save.slice(135, 147)),
            Wpn2: new Item(data.own ? data.save.slice(156, 168) : data.save.slice(147, 159))
        };

        this.Potions = data.own ? [
            {
                Type: data.save[493] == 16 ? 6 : (data.save[493] == 0 ? 0 : 1 + (data.save[493] - 1) % 5),
                Size: data.save[499]
            },
            {
                Type: data.save[494] == 16 ? 6 : (data.save[494] == 0 ? 0 : 1 + (data.save[494] - 1) % 5),
                Size: data.save[500]
            },
            {
                Type: data.save[495] == 16 ? 6 : (data.save[495] == 0 ? 0 : 1 + (data.save[495] - 1) % 5),
                Size: data.save[501]
            }
        ] : [
            {
                Type: data.save[194] == 16 ? 6 : (data.save[194] == 0 ? 0 : 1 + (data.save[194] - 1) % 5),
                Size: data.save[200]
            },
            {
                Type: data.save[195] == 16 ? 6 : (data.save[195] == 0 ? 0 : 1 + (data.save[195] - 1) % 5),
                Size: data.save[201]
            },
            {
                Type: data.save[196] == 16 ? 6 : (data.save[196] == 0 ? 0 : 1 + (data.save[196] - 1) % 5),
                Size: data.save[202]
            }
        ];

        this.Potions.sort((a, b) => b.Size - a.Size);

        this.Dungeons = data.own ? [
            ... data.save.slice(480, 490),
            data.save[441],
            data.save[442],
            data.save[490] - 120,
            ... split4(data.save[604], 8),
            ... split4(data.save[605], 8),
            ... split4(data.save[606], 8),
            split4(data.save[607], 8)[0]
        ] : [
            ... data.save.slice(183, 193),
            data.save[164],
            data.save[165],
            data.save[193] - 120,
            ... split4(data.save[254], 8),
            ... split4(data.save[255], 8),
            ... split4(data.save[256], 8),
            split4(data.save[257], 8)[0]
        ];

        [/* empty */, this.Dungeons.Group, this.Dungeons.Player] = ComplexDataType.fromValue(data.save[data.own ? 445 : 252]).multiple(o => [ o.short(), o.byte(), o.byte() ]);
        [this.Mount, this.Dungeons.Tower] = ComplexDataType.fromValue(data.save[data.own ? 286 : 159]).multiple(o => [ o.short(), o.short() ]);
    }
}

class Group {
    constructor (data) {
        this.Prefix = data.prefix || 's1_de';
        this.ID = data.save[0];
        this.Identifier = this.Prefix + '_' + this.ID;

        this.Name = data.name;
        this.Rank = data.rank;
        this.MemberCount = data.save[3];
        this.Honor = data.save[13];
        this.MemberIDs = data.save.slice(14, 14 + this.MemberCount).map(mid => (this.Prefix + '_' + mid));
        this.Levels = data.save.slice(64, 64 + this.MemberCount).map(level => level % 1000);
        this.Roles = data.save.slice(314, 314 + this.MemberCount);
        this.Treasures = data.save.slice(214, 214 + this.MemberCount);
        this.Instructors = data.save.slice(264, 264 + this.MemberCount);
        this.Pets = data.save.slice(390, 390 + this.MemberCount);
        this.Members = data.members.slice(0, this.MemberCount);
        this.Pet = data.save[378];
        this.Own = this.Treasures.reduce((a, b) => a + b, 0) > 0;

        if (data.knights) {
            this.Knights = data.knights.slice(0, this.MemberCount);
        }

        for (var i = 0; i < this.MemberCount; i++) {
            if (this.Roles[i] === GUILD_ROLE_INVITED) {
                if (this.Knights) {
                    this.Knights.splice(i, 1);
                }

                this.Roles.splice(i, 1);
                this.Levels.splice(i, 1);
                this.Treasures.splice(i, 1);
                this.Instructors.splice(i, 1);
                this.Pets.splice(i, 1);
                this.MemberIDs.splice(i, 1);
                this.Members.splice(i--, 1);
                this.MemberCount--;
            }
        }

        Group.setStats(this.Levels);
        Group.setStats(this.Pets);
        Group.setStats(this.Treasures);
        Group.setStats(this.Instructors);

        if (this.Knights)
        {
            Group.setStats(this.Knights);
        }
    }

    getFakePlayer (id) {
        var index = this.MemberIDs.indexOf(id);
        return {
            IsFake: true,
            Identifier: id,
            Name: this.Members[index],
            Level: this.Levels[index],
            Fortress: {
                Knights: this.Knights[index]
            },
            Group: {
                Pet: this.Pets[index],
                Instructor: this.Instructors[index],
                Treasure: this.Treasures[index],
                Role: this.Roles[index]
            }
        };
    }

    static setStats (array) {
        array.Sum = array.reduce((total, value) => total + value, 0);
        array.Avg = array.Sum / array.length;
        array.Min = Math.min(... array);
        array.Max = Math.max(... array);
    }
}
