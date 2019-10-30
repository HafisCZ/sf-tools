class HighlightEngine
{
    constructor()
    {
        this.sop = new LocalStorageObjectProperty(btoa('HIGHLIGHTING'), {
            book: { min: 50, max: 90 }, pet: { min: 100, max: 200 }, knights: { min: 10, max: 15 }, mount: { min: 1, max: 4 }, badgenew: 0, ienchant: 0, iweapons: 0, iexcess: 0, treasure: { min: 5, max: 20 }, instructor: { min: 5, max: 20 }, badgeold: 0
        });
        this.r = this.sop.value;
    }

    save(rules)
    {
        this.r = rules;
        this.sop.value = this.r;
    }

    rules()
    {
        return this.r;
    }
}

class DatabaseIO
{
    constructor()
    {
        this.sop = new LocalStorageObjectLZProperty(btoa('STORAGE'), []);

        this.storage = this.sop.value;
        this.database = new Database(this.storage);

        this.listeners = [];
    }

    attach(action, func, fimm) { this.listeners.push({ on: action, func: func }); if (fimm) func(); }
    detach(func) { if (this.listeners.includes(func)) this.listeners.splice(this.listeners.findIndex(f => f.func === func), 1); }
    notify(action, ... args) { this.listeners.forEach(function (listener) { if (listener.on === action) listener.func(... args); }); }

    db()
    {
        return this.database;
    }

    entries()
    {
        return this.storage;
    }

    clear()
    {
        this.sop.value = [];

        this.storage = [];
        this.database = new Database([]);

        this.notify('change');
    }

    remove(i)
    {
        this.storage.splice(i, 1);

        this.sop.value = this.storage;
        this.database = new Database(this.storage);

        this.notify('change');
    }

    import (json, timestamp)
    {
        let players = [];
        let groups = [];
        let raws = [];

        for (var [key, val] of Iterator.deep(json))
        {
            if (key === 'text' && (val.includes('otherplayername') || val.includes('othergroup') || val.includes('ownplayername')))
            {
                raws.push(val);
            }
        }

        for (const raw of raws)
        {
            if (raw.includes('othergroupsave') || raw.includes('owngroupsave'))
            {
                let group = {};
                for (var [key, val] of Iterator.parse(raw))
                {
                    if (key.includes('groupname')) group.name = val;
                    else if (key.includes('grouprank')) group.rank = Number(val);
                    else if (key.includes('groupmember')) group.members = val.split(',');
                    else if (key.includes('groupknights')) group.knights = val.split(',').map(a => Number(a));
                    else if (key.includes('groupsave')) group.save = val.split('/').map(a => Number(a));
                    else if (key.includes('groupSave')) group.save = val.split('/').map(a => Number(a));
                }

                if (!groups.find(g => g.name === group.name))
                {
                    groups.push(group);
                }
            }

            if (raw.includes('otherplayername') || raw.includes('ownplayername')) {
                let player = {};
                for (var [key, val] of Iterator.parse(raw))
                {
                    if (key.includes('groupname')) player.groupname = val;
                    else if (key.includes('name')) player.name = val;
                    else if (key.includes('unitlevel')) player.units = val.split('/').map(a => Number(a));
                    else if (key.includes('achievement')) player.achievements = val.split('/').map(a => Number(a));
                    else if (key.includes('fortressrank')) player.fortressrank = Number(val);
                    else if (key.includes('playerlookat')) player.save = val.split('/').map(a => Number(a));
                    else if (key.includes('playerSave')) {
                        player.save = val.split('/').map(a => Number(a));
                        player.own = true;
                    }
                }

                if (!players.find(p => p.name === player.name))
                {
                    players.push(player);
                }
            }
        }

        this.storage.push({
            timestamp: timestamp,
            players: players,
            groups: groups
        });

        this.sop.value = this.storage;
        this.database = new Database(this.storage);
        this.notify('change');
    }
}

class Database
{
    constructor (data)
    {
        data.sort(function (da, db) {
            return da.timestamp - db.timestamp;
        });

        this.Players = {};
        this.Groups = {};

        for (const entry of data)
        {
            for (const groupdata of entry.groups)
            {
                let group = new Group(groupdata);

                if (!this.Groups[group.ID])
                {
                    this.Groups[group.ID] = {
                        List: []
                    };
                }

                this.Groups[group.ID][entry.timestamp] = group;
                this.Groups[group.ID].List.push({
                    timestamp: entry.timestamp,
                    group: group
                });
            }

            for (const playerdata of entry.players)
            {
                let player = new Player(playerdata);

                let gid = player.Group ? Object.keys(this.Groups).find(g => this.Groups[g][entry.timestamp] && this.Groups[g][entry.timestamp].Name == player.Group.Name) : null;
                if (gid)
                {
                    let group = this.Groups[gid][entry.timestamp];
                    let index = group.MemberIDs.findIndex(p => p === player.ID);

                    player.Group.Role = group.Roles[index];
                    player.Group.Treasure = group.Treasures[index];
                    player.Group.Instructor = group.Instructors[index];
                    player.Group.Pet = group.Pets[index];
                    player.Group.Own = group.Own;

                    if (!player.Fortress.Knights) {
                        player.Fortress.Knights = group.Knights[index];
                    }
                }

                if (!this.Players[player.ID])
                {
                    this.Players[player.ID] = {
                        List: []
                    };
                }

                this.Players[player.ID][entry.timestamp] = player;
                this.Players[player.ID].List.push({
                    timestamp: entry.timestamp,
                    player: player
                });
            }
        }

        for (const [pid, instances] of Object.entries(this.Players))
        {
            instances.LatestTimestamp = Math.max(... Object.keys(instances).filter(value => !isNaN(value)));
            instances.Latest = instances[instances.LatestTimestamp];

        }

        for (const [gid, instances] of Object.entries(this.Groups))
        {
            instances.LatestTimestamp = Math.max(... Object.keys(instances).filter(value => !isNaN(value)));
            instances.Latest = instances[instances.LatestTimestamp];
        }

        this.Latest = Math.max(... data.map(instance => instance.timestamp));
    }
}

class Player
{
    constructor (data)
    {
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

        this.Achievements = data.achievements.slice(0, 70).reduce(function (array, item, index) {
            array.push({
                owned: item === 1,
                progress: data.achievements[index + 70]
            });

            return array;
        }, []);
        this.Achievements.Owned = data.achievements.slice(0, 70).reduce(function (result, a) {
            return result + a
        }, 0);

        this.ID = data.save[data.own ? 1 : 0];
        this.LastOnline = new Date(data.save[data.own ? 2 : 1] * 1000);
        this.Level = Util.Math.unpack(data.save[data.own ? 7 : 2], 16);
        this.XP = data.save[data.own ? 8 : 3];
        this.XPNext = data.save[data.own ? 9 : 4];
        this.Book = data.save[data.own ? 438 : 163] ? data.save[data.own ? 438 : 163] - 10000 : 0;
        this.Honor = data.save[data.own ? 10 : 5];
        this.Rank = data.save[data.own ? 11 : 6];
        this.Race = Util.Math.unpack(data.save[data.own ? 27 : 18], 4);
        this.Sex = Util.Math.unpack(data.save[data.own ? 28 : 19], 4);
        this.Class = Util.Math.unpack(data.save[data.own ? 29 : 20], 4);

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
            Head: new Item(ComplexDataType.fromArray(data.own ? data.save.slice(48, 60) : data.save.slice(39, 51))),
            Body: new Item(ComplexDataType.fromArray(data.own ? data.save.slice(60, 72) : data.save.slice(51, 63))),
            Hand: new Item(ComplexDataType.fromArray(data.own ? data.save.slice(72, 84) : data.save.slice(63, 75))),
            Feet: new Item(ComplexDataType.fromArray(data.own ? data.save.slice(84, 96) : data.save.slice(75, 87))),
            Neck: new Item(ComplexDataType.fromArray(data.own ? data.save.slice(96, 108) : data.save.slice(87, 99))),
            Belt: new Item(ComplexDataType.fromArray(data.own ? data.save.slice(108, 120) : data.save.slice(99, 111))),
            Ring: new Item(ComplexDataType.fromArray(data.own ? data.save.slice(120, 132) : data.save.slice(111, 123))),
            Misc: new Item(ComplexDataType.fromArray(data.own ? data.save.slice(132, 144) : data.save.slice(123, 135))),
            Wpn1: new Item(ComplexDataType.fromArray(data.own ? data.save.slice(144, 156) : data.save.slice(135, 147))),
            Wpn2: new Item(ComplexDataType.fromArray(data.own ? data.save.slice(156, 168) : data.save.slice(147, 159)))
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

        this.Dungeons = data.own ? [
            ... data.save.slice(480, 490),
            data.save[441],
            data.save[442],
            data.save[490] - 120,
            ... Util.Math.unpack4(data.save[604], 8),
            ... Util.Math.unpack4(data.save[605], 8),
            ... Util.Math.unpack4(data.save[606], 8),
            Util.Math.unpack4(data.save[607], 8)[0]
        ] : [
            ... data.save.slice(183, 193),
            data.save[164],
            data.save[165],
            data.save[193] - 120,
            ... Util.Math.unpack4(data.save[254], 8),
            ... Util.Math.unpack4(data.save[255], 8),
            ... Util.Math.unpack4(data.save[256], 8),
            Util.Math.unpack4(data.save[257], 8)[0]
        ];
        [this.Dungeons.Group, this.Dungeons.Player] = Util.Math.unpack2(Util.Math.unpack2(data.save[data.own ? 445 : 252], 16)[1], 8);
        [this.Mount, this.Dungeons.Tower] = Util.Math.unpack2(data.save[data.own ? 286 : 159], 16);
    }
}

class Group
{
    constructor (data)
    {
        this.ID = data.save[0];
        this.Name = data.name;
        this.Rank = data.rank;
        this.MemberCount = data.save[3];
        this.Honor = data.save[13];
        this.MemberIDs = data.save.slice(14, 14 + this.MemberCount);
        this.Levels = data.save.slice(64, 64 + this.MemberCount).map(level => level % 1000);
        this.Roles = data.save.slice(314, 314 + this.MemberCount);
        this.Treasures = data.save.slice(214, 214 + this.MemberCount);
        this.Instructors = data.save.slice(264, 264 + this.MemberCount);
        this.Pets = data.save.slice(390, 390 + this.MemberCount);
        this.Members = data.members.slice(0, this.MemberCount);
        this.Pet = data.save[378];
        this.Own = this.Treasures.reduce((a, b) => a + b, 0) > 0;

        if (data.knights)
        {
            this.Knights = data.knights.slice(0, this.MemberCount);
        }

        for (var i = 0; i < this.MemberCount; i++)
        {
            if (this.Roles[i] === GUILD_ROLE_INVITED)
            {
                if (this.Knights) {
                    this.Knights.splice(i, 1);
                }

                this.Levels.splice(i, 1);
                this.Treasures.splice(i, 1);
                this.Instructors.splice(i, 1);
                this.Pets.splice(i, 1);
                this.Members.splice(i--, 1);
                this.MemberCount--;
            }
        }

        Util.ArraySMMA(this.Levels);
        Util.ArraySMMA(this.Pets);
        Util.ArraySMMA(this.Treasures);
        Util.ArraySMMA(this.Instructors);

        if (this.Knights)
        {
            Util.ArraySMMA(this.Knights);
        }
    }
}

class Item {
    constructor (dataType) {
        dataType.assert(48);

        this.type = dataType.short();
        this.socket = dataType.byte();
        this.enchantmentType = dataType.byte();
        this.picIndex = dataType.short();
        this.enchantmentPower = dataType.short();
        this.damageMin = dataType.long();
        this.damageMax = dataType.long();
        this.attributeType = [dataType.long(), dataType.long(), dataType.long()];
        this.attributeValue = [dataType.long(), dataType.long(), dataType.long()];
        this.gold = dataType.long();
        this.coins = dataType.byte();
        this.upgradeLevel = dataType.byte();
        this.socketPower = dataType.short();

        this.index = this.picIndex % 1000;
        this.class = Math.trunc(this.picIndex / 1000) + 1;
    }

    isToiledFlushed () {
        return this.coins == 0;
    }

    hasGem () {
        return this.socket > 1;
    }

    getGemType () {
        return this.socket >= 10 ? this.socket % 10 : -1;
    }

    isEpic () {
        return this.index >= 50;
    }
}

/*
    Helper objects
*/
const BlacksmithHelper = {};
const ItemHelper = {};

/*
    Inidividual helper methods
*/
ItemHelper.hasRune = function (item) {
    for (const attributeType of item.attributeType) {
        if (attributeType > 30) {
            return true;
        }
    }

    return false;
}

BlacksmithHelper.getRandom = function (item, max) {
    return (item.type * 37 + item.picIndex * 83 + item.damageMin * 1731 + item.damageMax * 162) % (max + 1);
}

BlacksmithHelper.getQuality = function (item) {
    if ((item.attributeValue[0] && item.attributeValue[1] && item.attributeValue[3] && item.attributeType[2] < 31) || item.attributeType[0] == 6 || item.attributeType[0] == 21 || item.attributeType[0] == 22 || item.attributeType[0] == 23) {
        return 3;
    } else if (item.attributeValue[0] > 0 && item.attributeValue[1] > 0) {
        return 2;
    } else {
        return 1;
    }
}

BlacksmithHelper.getDismantleReward = function (item) {
    let num = BlacksmithHelper.getLevel(item);
    let quality = BlacksmithHelper.getQuality(item);
    let num2 = 0;
    let num3 = 0;

    if (quality == 1) {
        num2 = 75 + BlacksmithHelper.getRandom(item, 25);
        num3 = BlacksmithHelper.getRandom(item, 1);
    }

    if (quality == 2) {
        num2 = 50 + BlacksmithHelper.getRandom(item, 30);
        num3 = 5 + BlacksmithHelper.getRandom(item, 5);
    }

    if (quality == 3) {
        num2 = 25 + BlacksmithHelper.getRandom(item, 25);
        num3 = 50 + BlacksmithHelper.getRandom(item, 50);
    }

    if (item.type == 1 && item.picIndex > 999) {
        num2 *= 2;
        num3 *= 2;
    }

    return [Math.floor(num * num2 / 100), Math.floor(num * num3 / 100)];
}

BlacksmithHelper.getLevel = function (item) {
    let num = item.attributeValue[0];

    if (item.attributeType[0] == 6 || item.attributeType[0] == 21 || item.attributeType[0] == 22 || item.attributeType[0] == 23) {
        num = Math.trunc(num * 1.2);
    }

    if (this.type == 1 && this.picIndex > 999) {
        num = Math.trunc(num / 2);
    }

    let quality = BlacksmithHelper.getQuality(item);

    if (item.picIndex == 52 || item.picIndex == 1052 || item.picIndex == 2052 || item.picIndex == 66 || item.picIndex == 1066 || item.picIndex == 2066) {
        if (item.attributeType[0] == 5 && item.attributeType[1] <= 0) {
            num = Math.trunc(num / 5);
        }
    } else if (quality == 1 && num > 66) {
        num = Math.trunc(num * 0.75);
    }

    return Math.floor(Math.pow(num, 1.2));
}
