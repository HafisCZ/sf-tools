const Log = {
    INFO: 0,
    WARN: 1,
    ERROR: 2
};

class Logger
{
    constructor() {
        this.l = [];
    }

    clear()
    {
        this.l = [];
    }

    log(s, msg)
    {
        this.l.push({
            type: s,
            message: msg
        });

        if (s === Log.INFO)
        {
            console.info(msg);
        }
        else if (s === Log.WARN)
        {
            console.warn(msg);
        }
        else if (s === Log.ERROR)
        {
            console.error(msg);
        }

        if (this.l.length >= 50)
        {
            this.l.splice(0, 1);
        }
    }

    * messages()
    {
        for (var i in this.l)
        {
            yield [this.l[i]];
        }
    }
}

class LocalStorageProperty
{
    constructor(key, def)
    {
        this.key = key;
        this.def = def;
    }

    get value()
    {
        return window.localStorage.getItem(this.key) || this.def;
    }

    set value(val)
    {
        window.localStorage.setItem(this.key, val);
    }
}

class LocalStorageBoolProperty extends LocalStorageProperty
{
    constructor(key, def)
    {
        super(key, def);
    }

    get value()
    {
        return window.localStorage.getItem(this.key) === 'true' || this.def;
    }

    set value(val)
    {
        super.value = val;
    }
}

class LocalStorageObjectProperty extends LocalStorageProperty
{
    constructor(key, def)
    {
        super(key, JSON.stringify(def));
    }

    get value()
    {
        return JSON.parse(super.value);
    }

    set value(val)
    {
        super.value = JSON.stringify(val);
    }
}

class LocalStorage
{
    constructor(ver)
    {
        if (localStorage.version != ver)
        {
            sl.log(Log.ERROR, 'ST_VER_NOT_EQUAL');
            nf.show(NotificationType.WARNING, 'Cache inconsistency', 'It appears that your data is outdated. This may cause unusual behaviour unless you import all your data again.');

            localStorage.version = ver;
        }

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
    }
}

class JSONScanner
{
    static* iterate(o, p = [])
    {
        for (var i in o)
        {
            const pp = p.concat(i);
            yield [i, o[i]];

            if (o[i] !== null && typeof(o[i]) == 'object')
            {
                yield* JSONScanner.iterate(o[i], pp);
            }
        }
    }
}

class ResponseParser
{
    static* parse(m)
    {
        var o = m.split('&');

        for (var i in o)
        {
            yield o[i].split(':', 2);
        }
    }
}

class DateFormatter
{
    static format(d)
    {
        return DateFormatter.trail(d.getDate(), 2) + '.' + DateFormatter.trail(d.getMonth(), 2) + '.' + d.getFullYear() + ' ' + DateFormatter.trail(d.getHours(), 2) + ':' + DateFormatter.trail(d.getMinutes(), 2);
    }

    static trail(c, n)
    {
        var r = '' + c;

        while (r.length < n)
        {
            r = '0' + r;
        }

        return r;
    }
}


class SFCore
{
	constructor()
	{
		this.data = st.data.value;
	}

	add(s)
	{
		this.data.push(s);
		st.data.value = this.data;
	}

    * sets()
    {
        for (var i in sf.data)
        {
            yield [i, sf.data[i]];
        }
    }

    * rsets()
    {
        for (var i = sf.data.length - 1, item; item = sf.data[i]; i--)
        {
            yield [i, item];
        }
    }

	remove(i)
	{
		this.data.splice(i, 1);
		st.data.value = this.data;
	}

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

class SFUtil
{
    static itemMods()
    {
        return {
            weapon: {
                warrior: 2,
                scout: 2.5,
                mage: 4.5
            },
            armor: {
                warrior: 15,
                scout: 7.5,
                mage: 3
            },
            item: {
                normal: 2,
                epic3: 1.2,
                epic5: 1,
                epic1: 5
            }
        };
    }

    static itemAttr(player)
    {
        return player.Level + 4 + player.Aura * (player.Witch >= 3 ? 2 + Math.max(0, player.Witch - 3) / 6 : 1);
    }

    static gem(factor, player, group)
    {
        return player.Level * factor * (1 + 0.15 * (player.Fortress.GemMine - 1)) + (group && group.Knights) ? (group.Knights.reduce((a, b) => a + b, 0) / 3) : 0;
    }

    static gemSmall(player, group)
    {
        return gem(0.23, player, group);
    }

    static gemMedium(player, group)
    {
        return gem(0.23, player, group);
    }

    static gemLarge(player, group)
    {
        return gem(0.36, player, group);
    }

    static nor216(v)
    {
        const n = v % Math.pow(2, 16);
        return [n, (v - n) / Math.pow(2, 16)];
    }

    static nor28(v)
    {
        const n = v % Math.pow(2, 8);
        return [n, (v - n) / Math.pow(2, 8)];
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

    static split(s, d = '/')
    {
        return s.split(d).map(v => Number(v));
    }

	static import(label, json)
	{
		var ps = [];
		var gs = [];

		for (var [key, val] of JSONScanner.iterate(json))
		{
			if (key === 'text' && (val.includes('otherplayername') || val.includes('ownplayername')))
			{
				if (val.includes('owngroup'))
				{
					var group = SFImporter.buildGroup(val);

					if (!gs.find(g => g.Name === group.Name))
					{
						gs.push(group);
					}
				}

                var player = SFImporter.buildPlayer(val);

                if (!ps.find(p => p.Name === player.Name))
                {
                    ps.push(player);
                }

                const og = gs.find(g => g.Name === player.Group.Name);
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
			else if (key === 'text' && val.includes('othergroup'))
			{
				var group = SFImporter.buildGroup(val);

				if (!gs.find(g => g.Name === group.Name))
				{
					gs.push(group);
				}
			}
		}

        return {
            Players: ps,
            Groups: gs,
            Label: label
        };
	}

	static buildGroup(data)
	{
		var g = {};

		for (var [k, v] of ResponseParser.parse(data))
		{
			if (k.includes('groupname'))
			{
				g.Name = v;
			}
            else if (k.includes('groupsave') || k.includes('groupSave'))
            {
                var vals = SFImporter.split(v);
                var members = vals[3];

                g.Levels = vals.slice(64, 64 + members).map(l => l % 1000);
                g.Roles = vals.slice(314, 314 + members);
                g.Treasures = vals.slice(214, 214 + members);
                g.Instructors = vals.slice(264, 264 + members);
                g.Pets = vals.slice(390, 390 + members);
            }
            else if (k.includes('groupmember'))
            {
                g.Members = v.split(',');
                g.MemberCount = g.Members.length;
            }
            else if (k.includes('grouprank'))
            {
                g.Rank = v;
            }
            else if (k.includes('groupknights'))
            {
                g.Knights = SFImporter.split(v, ',').slice(0, 50);
            }
		}

        for (var i = 0; i < g.MemberCount; i++)
        {
            if (g.Roles[i] == 4)
            {
                if (g.Knights)
                {
                    g.Knights.splice(i, 1);
                }

                g.Levels.splice(i, 1);
                g.Treasures.splice(i, 1);
                g.Instructors.splice(i, 1);
                g.Pets.splice(i, 1);
                g.Members.splice(i, 1);
                g.MemberCount--;
                i--;
            }
        }

		return g;
	}

	static buildItem(vals)
	{
		var i = {};

		i.SlotID = vals[0];
		i.ItemID = vals[1];
		i.Rating1 = vals[2];
		i.Rating2 = vals[3];
		i.Attribute1Type = vals[4];
		i.Attribute2Type = vals[5];
		i.Attribute3Type = vals[6];
		i.Attribute1 = vals[7];

		if (i.Attribute1Type === 6) {
			i.Attribute3 = vals.Attribute2 = vals.Attribute1;
		} else {
			i.Attribute2 = vals[8];
			i.Attribute3 = vals[9];
		}

		i.Value = vals[10];
		i.Mods = vals[11];

		return i;
	}

	static buildPlayer(data)
	{
		var p = {
            Group: {},
            Fortress: {}
        };

		for (var [k, v] of ResponseParser.parse(data))
		{
			if (k.includes('groupname'))
			{
				p.Group.Name = v;
			}
			else if (k.includes('name'))
			{
				p.Name = v;
			}
			else if (k.includes('unitlevel'))
			{
				var values = SFImporter.split(v);
				p.Fortress.Wall = values[0];
				p.Fortress.Warriors = values[1];
				p.Fortress.Archers = values[2];
				p.Fortress.Mages = values[3];
			}
			else if (k.includes('achievement'))
			{
				p.Achievements = SFImporter.split(v).slice(0, 70).reduce((a, b) => a + b, 0);
			}
			else if (k.includes('fortressrank'))
			{
				p.RankFortress = Number(v);
			}
			else if (k.includes('playerlookat'))
			{
				var vals = SFImporter.split(v);

				p.XP = vals[3];
				p.XPNext = vals[4];
				p.Book = vals[163] - 10000;
				p.Level = vals[173];

				p.HonorPlayer = vals[5];
				p.RankPlayer = vals[6];

				p.Race = vals[18] % 16;
				p.Sex = vals[19] % 16;
				p.Class = vals[20] % 16;

				p.Strength = vals[21] + vals[26];
				p.Dexterity = vals[22] + vals[27];
				p.Intelligence = vals[23] + vals[28];
				p.Constitution = vals[24] + vals[29];
				p.Luck = vals[25] + vals[30];
				p.Armor = vals[168];

				p.Head = SFImporter.buildItem(vals.slice(39, 51));
				p.Body = SFImporter.buildItem(vals.slice(51, 63));
				p.Hand = SFImporter.buildItem(vals.slice(63, 75));
				p.Feet = SFImporter.buildItem(vals.slice(75, 87));
				p.Neck = SFImporter.buildItem(vals.slice(87, 99));
				p.Belt = SFImporter.buildItem(vals.slice(99, 111));
				p.Ring = SFImporter.buildItem(vals.slice(111, 123));
				p.Misc = SFImporter.buildItem(vals.slice(123, 135));

				p.Wpn1 = SFImporter.buildItem(vals.slice(135, 147));
				p.Wpn2 = SFImporter.buildItem(vals.slice(147, 159));

                p.Potions = [
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

				p.HonorFortress = vals[248];
				p.Fortress.Upgrades = vals[247];
				p.Fortress.Knights = vals[258];

                [p.Mount, p.Tower] = SFUtil.nor216(vals[159]);
                [p.DamageBonus, p.LifeBonus] = SFUtil.nor28(vals[252] / Math.pow(2, 16));

				p.Face = vals.slice(8, 18);
                SFImporter.fillFortress(p, vals.slice(208, 220), null);
			}
			else if (k.includes('playerSave'))
			{
				var vals = SFImporter.split(v);

				p.XP = vals[8];
				p.XPNext = vals[9];
				p.Book = vals[438] - 10000;
				p.Level = vals[465];

				p.HonorPlayer = vals[10];
				p.RankPlayer = vals[11];

				p.Race = vals[27] % 16;
				p.Sex = vals[28] % 16;
				p.Class = vals[29] % 16;

				p.Strength = vals[30] + vals[35];
				p.Dexterity = vals[31] + vals[36];
				p.Intelligence = vals[32] + vals[37];
				p.Constitution = vals[33] + vals[38];
				p.Luck = vals[34] + vals[39];
				p.Armor = vals[447];

				p.Head = SFImporter.buildItem(vals.slice(48, 60));
				p.Body = SFImporter.buildItem(vals.slice(60, 72));
				p.Hand = SFImporter.buildItem(vals.slice(72, 84));
				p.Feet = SFImporter.buildItem(vals.slice(84, 96));
				p.Neck = SFImporter.buildItem(vals.slice(96, 108));
				p.Belt = SFImporter.buildItem(vals.slice(108, 120));
				p.Ring = SFImporter.buildItem(vals.slice(120, 132));
				p.Misc = SFImporter.buildItem(vals.slice(132, 144));

				p.Wpn1 = SFImporter.buildItem(vals.slice(144, 156));
				p.Wpn2 = SFImporter.buildItem(vals.slice(156, 168));

                p.Potions = [
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

				p.RankFortress = vals[583];
				p.HonorFortress = vals[582];
				p.Fortress.Upgrades = vals[581];
				p.Fortress.Knights = vals[598];

                p.DamageBonus = vals[623];
                p.LifeBonus = vals[624];

				[p.Mount, p.Tower] = SFUtil.nor216(vals[286]);
                p.MountExpire = new Date(vals[451]);

				p.Face = vals.slice(17, 27);
                SFImporter.fillFortress(p, vals.slice(524, 536), null);
			}
		}

		return p;
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
