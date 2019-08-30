class LocalStorage
{
    constructor()
    {
        this.scrapbook = {
            min: new LocalStorageProperty('h0', 70),
            max: new LocalStorageProperty('h1', 90)
        };

        this.knights = {
            min: new LocalStorageProperty('h2', 10),
            max: new LocalStorageProperty('h3', 15)
        };

        this.mount = {
            min: new LocalStorageProperty('h4', 1),
            max: new LocalStorageProperty('h5', 4)
        };

        this.pet = {
            min: new LocalStorageProperty('h6', 150),
            max: new LocalStorageProperty('h7', 300)
        };

        this.highlight = new LocalStorageBoolProperty('h', true);

        this.gear = {
            upgrades: new LocalStorageProperty('g0', 5),
            ignore_gems: new LocalStorageBoolProperty('g1', false),
            ignore_weapons: new LocalStorageBoolProperty('g2', false),
            ignore_excess: new LocalStorageBoolProperty('g3', false),
        };

        this.data = new LocalStorageObjectProperty('d', []);
        this.visited = new LocalStorageBoolProperty('f', false);
    }
}

class SFCore
{
	constructor()
	{
        this.rdata = st.data.value;
        this.inflate();
	}

    inflate()
    {
        this.data = [];

        for (const set of this.rdata)
        {
            this.data.push(new SFSet(set));
        }
    }

    swap(i, j)
    {
        [this.rdata[i], this.rdata[j]] = [this.rdata[j], this.rdata[i]];

        st.data.value = this.rdata;
        this.inflate();
    }

	add(s)
	{
		this.rdata.push(s);

		st.data.value = this.rdata;
        this.inflate();
	}

    remove(i)
	{
		this.rdata.splice(i, 1);

		st.data.value = this.rdata;
        this.inflate();
	}

    * sets() { for (var i = 0; i < this.data.length; i++) yield [i, this.data[i]]; }
    * rsets() { for (var i = this.data.length - 1, item; item = this.data[i]; i--) yield [i, item]; }

    // Delete the rest ?? idkev

    set(s)
    {
        return this.data[s];
    }

    * players(s)
    {
        for (var i in this.data[s].Players)
        {
            yield [i, this.data[s].Players[i]];
        }
    }

    * groups(s)
    {
        for (var i in this.data[s].Groups)
        {
            yield [i, this.data[s].Groups[i]];
        }
    }

	player(s, p)
	{
		return this.data[s].Players[p];
	}

	group(s, g)
	{
		return this.data[s].Groups[g];
	}
}

class SFSet
{
    constructor(data)
    {
        this.Players = [];
        this.Groups = [];
        this.Label = data.Label;

        for (const val of data.Raws)
        {
            if (val.includes('otherplayername') || val.includes('ownplayername'))
            {
                if (val.includes('owngroup') && val.includes('groupmember'))
                {
                    var group = new SFGroup(val);

                    if (!this.Groups.find(g => g.Name === group.Name))
                    {
                        this.Groups.push(group);
                    }
                }

                var player = new SFPlayer(val);

                if (!this.Players.find(p => p.Name === player.Name))
                {
                    this.Players.push(player);
                }

                const og = this.Groups.find(g => g.Name === player.Group.Name);
                if (og && og.Knights)
                {
                    const i = og.Members.findIndex(m => m === player.Name);

                    player.Group.Role = og.Roles[i];
                    player.Group.Treasure = og.Treasures[i];
                    player.Group.Instructor = og.Instructors[i];
                    player.Group.Pet = og.Pets[i];

                    if (player.Knights === 0)
                    {
                        player.Knights = og.Knights[i];
                    }
                }
            }
            else if (val.includes('othergroup'))
            {
                var group = new SFGroup(val);

                if (!this.Groups.find(g => g.Name === group.Name))
                {
                    this.Groups.push(group);
                }
            }
        }
    }
}

class SFPlayer
{
    constructor(data)
    {
        this.Group = {};
        this.Fortress = {};

        for (var [k, v] of SFUtil.parse(data))
        {
            if (k.includes('groupname'))
            {
                this.Group.Name = v;
            }
            else if (k.includes('name'))
            {
                this.Name = v;
            }
            else if (k.includes('unitlevel'))
            {
                var values = SFUtil.split(v);
                this.Fortress.Wall = values[0];
                this.Fortress.Warriors = values[1];
                this.Fortress.Archers = values[2];
                this.Fortress.Mages = values[3];
            }
            else if (k.includes('achievement'))
            {
                this.Achievements = SFUtil.split(v).slice(0, 70).reduce((a, b) => a + b, 0);
            }
            else if (k.includes('fortressrank'))
            {
                this.RankFortress = Number(v);
            }
            else if (k.includes('playerlookat'))
            {
                var vals = SFUtil.split(v);

                this.LastOnline = new Date(vals[1] * 1000);

                this.XP = vals[3];
                this.XPNext = vals[4];
                this.Book = vals[163] - 10000;
                this.Level = vals[173];

                this.HonorPlayer = vals[5];
                this.RankPlayer = vals[6];

                this.Race = vals[18] % 16;
                this.Sex = vals[19] % 16;
                this.Class = vals[20] % 16;

                this.Strength = vals[21] + vals[26];
                this.Dexterity = vals[22] + vals[27];
                this.Intelligence = vals[23] + vals[28];
                this.Constitution = vals[24] + vals[29];
                this.Luck = vals[25] + vals[30];
                this.Armor = vals[168];

                this.Head = new SFItem(vals.slice(39, 51));
                this.Body = new SFItem(vals.slice(51, 63));
                this.Hand = new SFItem(vals.slice(63, 75));
                this.Feet = new SFItem(vals.slice(75, 87));
                this.Neck = new SFItem(vals.slice(87, 99));
                this.Belt = new SFItem(vals.slice(99, 111));
                this.Ring = new SFItem(vals.slice(111, 123));
                this.Misc = new SFItem(vals.slice(123, 135));

                this.Wpn1 = new SFItem(vals.slice(135, 147));
                this.Wpn2 = new SFItem(vals.slice(147, 159));

                this.Potions = [
                    {
                        Type: vals[194] == 16 ? 6 : (vals[194] == 0 ? 0 : 1 + (vals[194] - 1) % 5),
                        Size: vals[200]
                    },
                    {
                        Type: vals[195] == 16 ? 6 : (vals[195] == 0 ? 0 : 1 + (vals[195] - 1) % 5),
                        Size: vals[201]
                    },
                    {
                        Type: vals[196] == 16 ? 6 : (vals[196] == 0 ? 0 : 1 + (vals[196] - 1) % 5),
                        Size: vals[202]
                    }
                ];

                this.HonorFortress = vals[248];
                this.Fortress.Upgrades = vals[247];
                this.Fortress.Knights = vals[258];

                //[this.Aura, this.AuraFill] = SFUtil.nor28(vals[242]);
                [this.Mount, this.Tower] = SFUtil.nor216(vals[159]);
                [this.DamageBonus, this.LifeBonus] = SFUtil.nor28(vals[252] / Math.pow(2, 16));

                this.Face = vals.slice(8, 18);
                SFPlayer.fillFortress(this, vals.slice(208, 220), null);
            }
            else if (k.includes('playerSave'))
            {
                var vals = SFUtil.split(v);

                this.LastOnline = new Date(vals[2] * 1000);

                this.XP = vals[8];
                this.XPNext = vals[9];
                this.Book = vals[438] - 10000;
                this.Level = vals[465];

                this.HonorPlayer = vals[10];
                this.RankPlayer = vals[11];

                this.Race = vals[27] % 16;
                this.Sex = vals[28] % 16;
                this.Class = vals[29] % 16;

                this.Strength = vals[30] + vals[35];
                this.Dexterity = vals[31] + vals[36];
                this.Intelligence = vals[32] + vals[37];
                this.Constitution = vals[33] + vals[38];
                this.Luck = vals[34] + vals[39];
                this.Armor = vals[447];

                this.Head = new SFItem(vals.slice(48, 60));
                this.Body = new SFItem(vals.slice(60, 72));
                this.Hand = new SFItem(vals.slice(72, 84));
                this.Feet = new SFItem(vals.slice(84, 96));
                this.Neck = new SFItem(vals.slice(96, 108));
                this.Belt = new SFItem(vals.slice(108, 120));
                this.Ring = new SFItem(vals.slice(120, 132));
                this.Misc = new SFItem(vals.slice(132, 144));

                this.Wpn1 = new SFItem(vals.slice(144, 156));
                this.Wpn2 = new SFItem(vals.slice(156, 168));

                this.Potions = [
                    {
                        Type: vals[493] == 16 ? 6 : (vals[493] == 0 ? 0 : 1 + (vals[493] - 1) % 5),
                        Size: vals[499],
                        Expire: new Date(vals[496])
                    },
                    {
                        Type: vals[494] == 16 ? 6 : (vals[494] == 0 ? 0 : 1 + (vals[494] - 1) % 5),
                        Size: vals[500],
                        Expire: new Date(vals[497])
                    },
                    {
                        Type: vals[495] == 16 ? 6 : (vals[495] == 0 ? 0 : 1 + (vals[495] - 1) % 5),
                        Size: vals[501],
                        Expire: new Date(vals[498])
                    }
                ];

                this.RankFortress = vals[583];
                this.HonorFortress = vals[582];
                this.Fortress.Upgrades = vals[581];
                this.Fortress.Knights = vals[598];

                this.DamageBonus = (vals[509] - vals[509] % 64) / 32;

                this.LifeBonus = ((vals[445] / Math.pow(2, 16)) - (vals[445] / Math.pow(2, 16)) % 256) / 256;

                this.Aura = vals[491];
                this.AuraFill = vals[492];

                [this.Mount, this.Tower] = SFUtil.nor216(vals[286]);
                this.MountExpire = new Date(vals[451]);

                this.Face = vals.slice(17, 27);
                SFPlayer.fillFortress(this, vals.slice(524, 536), null);
            }
        }
    }

    static fillFortress(p, f, u)
    {
        p.Fortress.Fortress = f[0];
        p.Fortress.LaborerQuarters = f[1];
        p.Fortress.WoodcutterGuild = f[2];
        p.Fortress.Quarry = f[3];
        p.Fortress.GemMine = f[4];
        p.Fortress.Academy = f[5];
        p.Fortress.ArcheryGuild = f[6];
        p.Fortress.Barracks = f[7];
        p.Fortress.MageTower = f[8];
        p.Fortress.Treasury = f[9];
        p.Fortress.Smithy = f[10];
        p.Fortress.Fortifications = f[11];

        p.Fortress.HeartOfDarkness = 0;
        p.Fortress.UnderworldGate = 0;
        p.Fortress.SoulExtractor = 0;
        p.Fortress.TortureChamber = 0;
        p.Fortress.GoblinPit = 0;
        p.Fortress.TrollBlock = 0;
        p.Fortress.Keeper = 0;
        p.Fortress.GladiatorTrainer = 0;
        p.Fortress.GoldPit = 0;
        p.Fortress.TimeMachine = 0;
    }
}

class SFItem
{
    constructor(data)
    {
		this.SlotID = data[0];
		this.ItemID = data[1];
		this.Rating1 = data[2];
		this.Rating2 = data[3];
		this.Attribute1Type = data[4];
		this.Attribute2Type = data[5];
		this.Attribute3Type = data[6];
		this.Attribute1 = data[7];

		if (this.Attribute1Type === 6) {
			this.Attribute3 = this.Attribute1;
            this.Attribute2 = this.Attribute1;
		} else {
			this.Attribute2 = data[8];
			this.Attribute3 = data[9];
		}

		this.Value = data[10];
		this.Mods = data[11];
    }

    getGem()
    {
        return [SFUtil.nor216(this.SlotID)[1] % 64, SFUtil.nor216(this.Mods)[1]];
    }

    getUpgrades()
    {
        return (this.Mods % Math.pow(2, 16)) / 256;
    }

    getEnchantment()
    {
        return this.ItemID != this.ItemID % Math.pow(2, 16);
    }
}

class SFGroup
{
    constructor(data)
    {
		for (var [k, v] of SFUtil.parse(data))
		{
			if (k.includes('groupname'))
			{
				this.Name = v;
			}
            else if (k.includes('groupsave') || k.includes('groupSave'))
            {
                var vals = SFUtil.split(v);
                this.MemberCount = vals[3];

                this.Levels = vals.slice(64, 64 + this.MemberCount).map(l => l % 1000);
                this.Roles = vals.slice(314, 314 + this.MemberCount);
                this.Treasures = vals.slice(214, 214 + this.MemberCount);
                this.Instructors = vals.slice(264, 264 + this.MemberCount);
                this.Pets = vals.slice(390, 390 + this.MemberCount);
            }
            else if (k.includes('groupmember'))
            {
                this.Members = v.split(',');
            }
            else if (k.includes('grouprank'))
            {
                this.Rank = v;
            }
            else if (k.includes('groupknights'))
            {
                this.Knights = SFUtil.split(v, ',').slice(0, this.MemberCount);
            }
		}

        for (var i = 0; i < this.MemberCount; i++)
        {
            if (this.Roles[i] == 4)
            {
                if (this.Knights)
                {
                    this.Knights.splice(i, 1);
                }

                this.Levels.splice(i, 1);
                this.Treasures.splice(i, 1);
                this.Instructors.splice(i, 1);
                this.Pets.splice(i, 1);
                this.Members.splice(i, 1);
                this.MemberCount--;
                i--;
            }
        }

        SFGroup.stats(this.Levels);
        SFGroup.stats(this.Pets);

        if (this.Knights)
        {
            SFGroup.stats(this.Knights);
            SFGroup.stats(this.Instructors);
            SFGroup.stats(this.Treasures);
        }
    }

    static stats(arr)
    {
        arr.Sum = arr.reduce((a, b) => a + b, 0);
        arr.Avg = Math.trunc(arr.Sum / arr.length);
        arr.Min = Math.min(...arr);
        arr.Max = Math.max(...arr);
    }
}

class SFImporter
{
    static importFile(f, c)
    {
        var r = new FileReader();
        r.readAsText(f, 'UTF-8');
        r.onload = function (e) {
            try
            {
                sf.add(SFImporter.import(DateFormatter.format(new Date(f.lastModified)), JSON.parse(e.target.result)));
                c();
            }
            catch(e)
            {
                nf.show(NotificationType.DANGER, 'File import failed', 'It appears that your file is not compatible. Please try again or use another file.');
            }
        };
    }

	static import(label, json)
	{
		var vs = [];

		for (var [key, val] of JSONScanner.iterate(json))
		{
			if (key === 'text' && (val.includes('otherplayername') || val.includes('othergroup') || val.includes('ownplayername')))
			{
                if (!vs.includes(val))
                {
                   vs.push(val);
                }
			}
		}

        nf.show(NotificationType.SUCCESS, label, 'Successfully imported!');

        return {
            Raws: vs,
            Label: label
        };
	}

}

const NotificationType = {
    DANGER: 'danger',
    WARNING: 'warning',
    SUCCESS: 'success',
    ERROR: 'danger'
}

class Notificator
{
    constructor(e)
    {
        this.parent = e;
        this.iter = 0;
        this.notes = {};
    }

    show(style, header, body)
    {
        $(this.parent).append(`<p nid="${this.iter}" class="note note-${style} animated fadeInDown"><strong>${header}:</strong> ${body}</p>`);

        const note = $(`${this.parent}>p`).last();
        note.on('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function() {
            nf.state($(this).attr('nid'));
        });

        this.notes[this.iter] = 1;

        this.iter++;
    }

    state(i)
    {
        if (this.notes[i] === 1)
        {
            $(`${this.parent}>p[nid=${i}]`).removeClass('fadeInDown').addClass('delay-3s fadeOutUp');
            this.notes[i] = 2;
        }
        else if (this.notes[i] == 2)
        {
            $(`${this.parent}>p[nid=${i}]`).remove();
        }
    }
}

class SFExporter
{
    static jsonBlob(data, compare)
    {
        var out = data;

        if (compare)
        {
            data.Players.forEach(function (p) {
                var cp = compare.Players.find(a => a.Name === p.Name);
                if (cp) {
                    var dp = {
                        Level: p.Level - cp.Level,
                        RankPlayer: p.RankPlayer - cp.RankPlayer,
                        RankFortress: p.RankFortress - cp.RankFortress,
                        HonorPlayer: p.HonorPlayer - cp.HonorPlayer,
                        HonorFortress: p.HonorFortress - cp.HonorFortress,
                        LifeBonus: p.LifeBonus - cp.LifeBonus,
                        DamageBonus: p.DamageBonus - cp.DamageBonus,
                        Tower: p.Tower - cp.Tower,
                        Achievements: p.Achievements - cp.Achievements,
                        Book: p.Book - cp.Book,
                        Fortress : {
                            Upgrades: p.Fortress.Upgrades - cp.Fortress.Upgrades,
                            Wall: p.Fortress.Wall - cp.Fortress.Wall,
                            Warriors: p.Fortress.Warriors - cp.Fortress.Warriors,
                            Archers: p.Fortress.Archers - cp.Fortress.Archers,
                            Mages: p.Fortress.Mages - cp.Fortress.Mages,
                        },
                        Strength: p.Strength - cp.Strength,
                        Constitution: p.Constitution - cp.Constitution,
                        Dexterity: p.Dexterity - cp.Dexterity,
                        Luck: p.Luck - cp.Luck,
                        Intelligence: p.Intelligence - cp.Intelligence,
                        Armor: p.Armor - cp.Armor,
                        XP: p.XP - cp.XP,
                        XPNext: p.XPNext - cp.XPNext
                    }

                    if (p.Group)
                    {
                        dp.Group = {
                            Treasure: p.Group.Treasure - cp.Group.Treasure,
                            Instructor: p.Group.Instructor - cp.Group.Instructor,
                            Pet: p.Group.Pet - cp.Group.Pet
                        };

                        dp.Fortress.Knights = p.Fortress.Knights - cp.Fortress.Knights;
                    }

                    p.Compare = dp;
                }
            });

            data.Groups.forEach(function (g) {
                var cg = compare.Groups.find(a => a.Name === g.Name);
                if (cg) {
                    var dg = {
                        MemberCount: g.MemberCount - cg.MemberCount,
                        Rank: g.Rank - cg.Rank,
                        Levels: {
                            Sum: g.Levels.Sum - cg.Levels.Sum,
                            Avg: g.Levels.Avg - cg.Levels.Avg,
                            Min: g.Levels.Min - cg.Levels.Min,
                            Max: g.Levels.Max - cg.Levels.Max
                        },
                        Pets: {
                            Sum: g.Pets.Sum - cg.Pets.Sum,
                            Avg: g.Pets.Avg - cg.Pets.Avg,
                            Min: g.Pets.Min - cg.Pets.Min,
                            Max: g.Pets.Max - cg.Pets.Max
                        },
                        Treasures: {
                            Sum: g.Treasures.Sum - cg.Treasures.Sum,
                            Avg: g.Treasures.Avg - cg.Treasures.Avg,
                            Min: g.Treasures.Min - cg.Treasures.Min,
                            Max: g.Treasures.Max - cg.Treasures.Max
                        },
                        Instructors: {
                            Sum: g.Instructors.Sum - cg.Instructors.Sum,
                            Avg: g.Instructors.Avg - cg.Instructors.Avg,
                            Min: g.Instructors.Min - cg.Instructors.Min,
                            Max: g.Instructors.Max - cg.Instructors.Max
                        },
                        Knights: {
                            Sum: g.Knights.Sum - cg.Knights.Sum,
                            Avg: g.Knights.Avg - cg.Knights.Avg,
                            Min: g.Knights.Min - cg.Knights.Min,
                            Max: g.Knights.Max - cg.Knights.Max
                        }
                    }

                    g.Compare = dg;
                }
            });
        }

        return new Blob([JSON.stringify(out)], {
            type: 'application/json;charset=utf-8'
        });
    }

    static pngBlob(data, compare)
    {
        var out = [];

        // Unimplemented

        return new Blob([out.join('')], {
            type: 'image/png;charset=utf-8'
        });
    }
}
