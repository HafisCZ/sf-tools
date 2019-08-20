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
    constructor(win)
    {
        const local = win.localStorage;

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

	remove(i)
	{
		this.data.splice(i, 1);
		st.data.value = this.data;
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

class SFImporter
{
	static import(label, json)
	{
		var ps = [];
		var gs = [];

		for (var [key, val] of JSONScanner.iterate(json))
		{
			if (key === 'text' && (value.includes('otherpname') || value.includes('ownpname')))
			{
				var p = SFImporter.buildPlayer(value);

				if (!ps.find((p) => { return p.Name === p.Name; }))
				{
					ps.push(p);
				}

				if (value.includes('owngroup'))
				{
					var group = SFImporter.buildGroup(value);

					if (!gs.find((g) => { return g.Name === group.Name; }))
					{
						gs.push(group);
					}
				}
			}
			else if (key === 'text' && value.includes('othergroup'))
			{
				var group = SFImporter.buildGroup(value);

				if (!gs.find((g) => { return g.Name === group.Name; }))
				{
					gs.push(group);
				}
			}

			return {
				Players: ps,
				Groups: gs,
				Label: label
			};
		}
	}

	static buildGroup(data)
	{
		var g = {};

		for (var [k, v] of ResponseParser.parse(data))
		{
			if (k.includes('name'))
			{
				g.Name = v;
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
		var p = {};

		for (var [k, v] of ResponseParser.parse(data))
		{
			if (k.includes('groupname'))
			{
				p.Group = v;
			}
			else if (k.includes('name'))
			{
				p.Name = v;
			}
			else if (k.includes('unitlevel'))
			{
				var values = v.split('/');
				p.FortressWall = Number(values[0]);
				p.FortressWarriors = Number(values[1]);
				p.FortressArchers = Number(values[2]);
				p.FortressMages = Number(values[3]);
			}
			else if (k.includes('achievement'))
			{
				p.Achievements = v.split('/').slice(0, 70).map((e) => Number(e)).reduce((a, b) => a + b, 0);
			}
			else if (k.includes('fortressrank'))
			{
				p.RankFortress = Number(v);
			}
			else if (k.includes('otherdescription') || k.includes('owndescription'))
			{
				p.Description = v;
			}
			else if (k.includes('playerlookat'))
			{
				var vals = v.split('/').map((value) => Number(value));

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

				p.Mount = vals[159] % 16;

				p.Potion1 = vals[194] == 16 ? 6 : (vals[194] == 0 ? 0 : 1 + (vals[194] - 1) % 5);
				p.Potion2 = vals[195] == 16 ? 6 : (vals[195] == 0 ? 0 : 1 + (vals[195] - 1) % 5);
				p.Potion3 = vals[196] == 16 ? 6 : (vals[196] == 0 ? 0 : 1 + (vals[196] - 1) % 5);

				p.PotionLen1 = vals[200];
				p.PotionLen2 = vals[201];
				p.PotionLen3 = vals[202];

				p.HonorFortress = vals[248];
				p.FortressUpgrades = vals[247];
				p.FortressKnights = vals[258];

				p.Face = vals.slice(8, 18);
				p.Fortress = vals.slice(208, 220);
			}
			else if (k.includes('playerSave'))
			{
				var vals = v.split('/').map((value) => Number(value));

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

				p.Mount = vals[286] % 16;

				p.Potion1 = vals[493] == 16 ? 6 : (vals[493] == 0 ? 0 : 1 + (vals[493] - 1) % 5);
				p.Potion2 = vals[494] == 16 ? 6 : (vals[494] == 0 ? 0 : 1 + (vals[494] - 1) % 5);
				p.Potion3 = vals[495] == 16 ? 6 : (vals[495] == 0 ? 0 : 1 + (vals[495] - 1) % 5);

				p.PotionLen1 = vals[499];
				p.PotionLen2 = vals[500];
				p.PotionLen3 = vals[501];

				p.RankFortress = vals[583];
				p.HonorFortress = vals[582];
				p.FortressUpgrades = vals[581];
				p.FortressKnights = vals[598];

				p.Face = vals.slice(17, 27);
				p.Fortress = vals.slice(524, 536);
			}
		}

		return p;
	}
}

// Initialize
window.st = new LocalStorage(window);
window.sf = new SFCore();
