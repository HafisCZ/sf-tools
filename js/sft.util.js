const GUILD_ROLE_LEADER = 1;
const GUILD_ROLE_OFFICER = 2;
const GUILD_ROLE_MEMBER = 3;
const GUILD_ROLE_INVITED = 4;
const WEEKEND_EPIC = 0;
const WEEKEND_GOLD = 1;
const WEEKEND_RESOURCE = 2;
const WEEKEND_EXPERIENCE = 3;
const ACHIEVEMENT_TOTAL = 70;
const SCRAPBOOK_TOTAL = 2160;
const ATTRIBUTE_STRENGTH = 1;
const ATTRIBUTE_DEXTERITY = 2;
const ATTRIBUTE_INTELLIGENCE = 3;
const ATTRIBUTE_CONSTITUTION = 4;
const ATTRIBUTE_LUCK = 5;
const ATTRIBUTE_ALL = 6;
const POTION_LIFE = 16;
const TIME_WEEK = 604800000;
const WARRIOR = 1;
const MAGE = 2;
const SCOUT = 3;
const ASSASSIN = 4;
const BATTLEMAGE = 5;
const BERSERKER = 6;

const Strings = {
    Potions: [
        'None',
        'Strength',
        'Dexterity',
        'Intelligence',
        'Constitution',
        'Luck',
        'Life'
    ],

    Images: {
        Class: {
            1: 'class_warrior.png',
            2: 'class_mage.png',
            3: 'class_hunter.png',
            4: 'class_assassin.png',
            5: 'class_warlock.png',
            6: 'class_berserker.png'
        },
        Group: 'icon_group.png'
    }
};

const Util = {

    ToPotionAttributeType: function (value) {
        return value < 16 ? ((value - 1) % 5) : ATTRIBUTE_ALL;
    },

    WeekendType: [
        'EPIC',
        'GOLD',
        'RESOURCE',
        'EXPERIENCE'
    ],

    Achievements: [
        ['Finally 18', 'Reach level 18', 1],
        ['Globetrotter', 'Visit all locations in one day', 1],
        ['Dragon Rider', 'Dragon Griffin or Griffin Dragon mount', 1],
        ['Naturism', '24 hours without equipment', 24],
        ['Rip-off Rip-off', 'Beat the Gambler 3 times in a row', 3],
        ['Heavy Spinner', 'Spin the Wheel 20 times in one day', 20],
        ['Square Eyes', 'Collect 1,000 Lucky Coins', 1000],
        ['Lucky Fellow', 'Find 100 mushrooms on quests', 100],
        ['Raider', 'Raid 100 fortresses', 100],
        ['Invincible', 'Win 10 arena fights in one day', 10],
        ['Song of the Blacksmith', 'Hoard 10,000 crystals', 1],
        ['Sky is the Limit', 'Improve an item 10 times', 1],
        ['Miner', 'Mine 100 things', 100],
        ['Collecting Mania', 'Scrapbook 90% complete', 1],
        ['Anniversary', 'Play for 1 year', 1],
        ['For Seven Days', 'Play 7 days in a row', 7],
        ['Always On', 'Play 30 days in a row', 30],
        ['Reliable', 'Be actively involved in a guild 10 days', 10],
        ['Elite Guild', 'Reach 5,000 Guild Honor', 1],
        ['Big Spender', 'Spend 10 mushrooms on personal guild skill', 10],
        ['Hero', 'Reach level 100', 1],
        ['Elite', 'Reach level 200', 1],
        ['Tip of the Iceberg', 'Reach level 300', 1],
        ['Superhero', 'Reach level 400', 1],
        ['Epic Superhero', 'Reach level 500', 1],
        ['Jeweler', 'Gems in all equipped items', 1],
        ['Black Gold', 'Wear 9 items with black gems', 1],
        ['Fashion-conscious', 'Wear 6 items of the same set', 1],
        ['Epic Purist', 'Have only epics equipped', 1],
        ['Epic Companions', 'Equip companions with epics only', 1],
        ['Alter Ego', 'Complete Magic Mirror', 1],
        ['Witchcraft', 'Wear only enchanted items', 1],
        ['Shroomer', 'Buy mushrooms from the dealer', 1],
        ['Urgent Need', 'Find the Toilet Key', 1],
        ['Shadow World Cruise', 'Defeat the first enemy in Shadow World', 1],
        ['Pet Lover', 'Find the pet nest', 1],
        ['Pet Fattening', 'Feed pets 15 times in one day', 15],
        ['Animal Trainer', 'Upgrade a pet to level 100', 1],
        ['Petshop Boy', 'Reach 5,000 Pet Honor', 1],
        ['Cryptozoologist', 'Find all pets', 1],
        ['Storyteller', 'Clear the Tower', 1],
        ['Boss of Easteros', 'Clear Easteros (dungeon 14)', 1],
        ['Dark Wanderer', 'Clear Demon Portal (single player)', 1],
        ['Shadow Player', 'Clear Shadow World', 1],
        ['Twister Tamer', 'Clear the Twister', 1],
        ['Mule', 'Backpack fully upgraded and full', 1],
        ['King of Kings', 'Reach 5,000 Fortress Honor', 1],
        ['The Count', 'Upgrade all fortress buildings to level 15', 1],
        ['The King', 'Fully upgrade all fortress buildings', 1],
        ['Collect \'Em All', 'Collect all 49 previous achievements', 1],
        ['Metropolis', 'Upgrade all Underworld buildings to level 15', 1],
        ['Big City', 'Upgrade all Underworld buildings to level 10', 1],
        ['Small City', 'Upgrade all Underworld buildings to level 5', 1],
        ['Gold Storage', '25,000,000 gold mined', 25000000],
        ['Soul Storage', '25,000,000 souls reaped', 25000000],
        ['Slaughterer of the Best', 'Defeat rank 1 in your Underworld', 1],
        ['Top 100 Topper', 'Defeat a top 100 hero in your Underworld', 1],
        ['Top 1,000 Topper', 'Defeat a top 1,000 hero in your Underworld', 1],
        ['Horror of Heroes', 'Defeat 1,000 heroes in your Underworld', 1000],
        ['Time Hole', '25 straight quests in the Time Machine', 1],
        ['Academic Orders', 'Clear the Time-honored School of Magic (Shadow)', 1],
        ['Good vs. Evil', 'Clear Hemorridor (Shadow)', 1],
        ['Commentary Cracker', 'Clear the Continuous Loop of Idols', 1],
        ['Dehydration', 'Behead the Hydra with the decisive blow', 1],
        ['Deep Mining Master', 'Upgrade Mine and Gold Pit to level 50', 100],
        ['Special Agent', 'Complete 100 Daily Missions', 100],
        ['St. Nicholas', 'Unequip shoes and ion inventory on December 6, 00:01', 1],
        ['Reinvent the Wheel', 'Find the enhanced Wheel of Fortune', 1],
        ['Second Screen', 'Play on different devices', 1],
        ['Day X', 'We\'ll let you know when the time has come', 1]
    ],

    GetNextWeekend: function (date = Date.now())
    {
        date = new Date(date);
        date.setDate(date.getDate() - date.getDay() + (date.getDay() ? 1 : -6));
        date.setHours(0, 0, 0);
        let week = Math.trunc(date.getTime() / (7 * 24 * 3600 * 1000)) % 4;
        let beg = new Date(date.getTime() + 5 * 24 * 60 * 60 * 1000 + 1);
        let end = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000);
        return [this.WeekendType[week], DateFormatter.formatDate(beg), DateFormatter.formatDate(end)];
    },

    GetNextWeekends: function (count, timestamp = Date.now())
    {
        return Array.from({ length: count }, (v, i) => i).map(i => this.GetNextWeekend(timestamp + i * 7 * 24 * 60 * 60 * 1000));
    },

    ArraySMMA: function (array, truncate_average = true)
    {
        array.Sum = array.reduce((total, value) => total + value, 0);
        array.Avg = truncate_average ? Math.trunc(array.Sum / array.length) : (array.Sum / array.length);
        array.Min = Math.min(... array);
        array.Max = Math.max(... array);
    },

    Math: {
        unpack: (v, b) => v % Math.pow(2, b),
        unpack2: (v, b) => [v % Math.pow(2, b), (v >> b) % Math.pow(2, b)],
        unpack3: (v, b) => [v % Math.pow(2, b), (v >> b) % Math.pow(2, b), (v >> (2 * b)) % Math.pow(2, b)],
        unpack4: (v, b) => [v % Math.pow(2, b), (v >> b) % Math.pow(2, b), (v >> (2 * b)) % Math.pow(2, b), (v >> (3 * b)) % Math.pow(2, b)]
    },

    FormatDiff : function (a, b) {
        if (a > b) {
            return ` <span>+${a - b}</span>`;
        } else if (a < b) {
            return ` <span>${a - b}</span>`;
        } else {
            return '';
        }
    }

};

const Iterator = {
    get: function * (array)
    {
        for (var i = 0, item; item = array[i]; i++)
        {
            yield [i, item];
        }
    },

    reversed: function * (array)
    {
        for (var i = array.length - 1, item; item = array[i]; i--)
        {
            yield [i, item];
        }
    },

    parse: function * (m)
    {
        var o = m.split('&');

        for (var i in o)
        {
            yield o[i].split(':', 2);
        }
    },

    deep: function * (object, trace = [])
    {
        for (var index in object)
        {
            const ptrace = trace.concat(index);
            yield [index, object[index]];

            if (object[index] != null && typeof(object[index]) == 'object')
            {
                yield* Iterator.deep(object[index], ptrace);
            }
        }
    }
}

class ReadableDate
{
    constructor (date)
    {
        this.date = new Date(date);
    }

    toString()
    {
        return ReadableDate.trail(this.date.getDate(), 2) + '.' + ReadableDate.trail(this.date.getMonth() + 1, 2) + '.' + this.date.getFullYear() + ' ' + ReadableDate.trail(this.date.getHours(), 2) + ':' + ReadableDate.trail(this.date.getMinutes(), 2);
    }

    static trail(c, n)
    {
        return '0'.repeat(n - c.toString().length) + c;
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

class LocalStorageObjectLZProperty extends LocalStorageProperty
{
    constructor(key, def)
    {
        super(key, LZString.compressToUTF16(JSON.stringify(def)));
    }

    get value()
    {
        return JSON.parse(LZString.decompressFromUTF16(super.value));
    }

    set value(val)
    {
        super.value = LZString.compressToUTF16(JSON.stringify(val));
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

/*
    UTIL FUNCTIONS
*/
Math.units = [
    [1E87, 'Ocv'],
    [1E84, 'Spv'],
    [1E81, 'Sxv'],
    [1E78, 'Qiv'],
    [1E75, 'Qav'],
    [1E72, 'Tv'],
    [1E69, 'Dv'],
    [1E66, 'Uv'],
    [1E63, 'v'],
    [1E60, 'N'],
    [1E57, 'O'],
    [1E54, 'St'],
    [1E51, 'Sd'],
    [1E48, 'Qd'],
    [1E45, 'Qt'],
    [1E42, 'T'],
    [1E39, 'D'],
    [1E36, 'U'],
    [1E33, 'd'],
    [1E30, 'n'],
    [1E27, 'o'],
    [1E24, 'S'],
    [1E21, 's'],
    [1E18, 'Q'],
    [1E15, 'q'],
    [1E12, 't'],
    [1E9, 'B']
];

Math.format = (n) => {
    if (n < 1E9) {
        let p = n.toString().split('e');
        return `${p[0].split('').map((c, i, a) => ((a.length - 1 - i) % 3 == 0 && (a.length - 2 - i) > 0) ? `${c} ` : c).join('')}${p.length > 1 ? p[1] : ''}`;
    } else {
        for (let i = 0, u; u = Math.units[i]; i++) {
            if (n >= u[0]) {
                return `${(Math.trunc((n / u[0]) * 1000) / 1000)} ${u[1]}`;
            }
        }
    }
};

Math.clamp = (number, min, max) => number < min ? min : (number > max ? max : number);

Date.toNiceString = (seconds) => {
    let s = (seconds % 60);
    let m = ((seconds - seconds % 60) / 60) % 60;
    let h = ((seconds - seconds % 3600) / 3600) % 24;
    let d = (seconds - seconds % 86400) / 86400;
    if (d) {
        return `${d}D ${h}H ${m}M ${s}S`;
    } else if (h) {
        return `${h}H ${m}M ${s}S`;
    } else if (m) {
        return `${m}M ${s}S`;
    } else {
        return `${s}S`;
    }
}
