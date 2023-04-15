const PetLocation = {
    BlackForest: 0,
    BlackWaterSwamp: 1,
    BustedLands: 2,
    Erogenion: 3,
    EvernightForest: 4,
    FloodedCaldwell: 5,
    Gnarogrim: 6,
    Maerwyn: 7,
    Magmaron: 8,
    MoldyForest: 9,
    Nevermoor: 10,
    Northrunt: 11,
    PlainsOfOzkorr: 12,
    RottenLands: 13,
    ShadowrockMountain: 14,
    SkullIsland: 15,
    SplitCanyon: 16,
    SprawlingJungle: 17,
    StumbleSteppe: 18,
    SunburnDesert: 19,
    TuskMountain: 20,
    GemMine: 201,
    WeaponShop: 202,
    MagicShop: 203,
    Toilet: 204
};

// Time ranges
const PetTime = {
    any: [
        { start: [0, 0, 0], end: [23, 59, 59] }
    ],
    day: [
        { start: [6, 0, 0], end: [17, 59, 59] }
    ],
    night: [
        { start: [0, 0, 0], end: [5, 59, 59] },
        { start: [18, 0, 0], end: [23, 59, 59] }
    ],
    witch: [
        { start: [0, 0, 0], end: [0, 59, 59] }
    ]
};

// Maximum times a pet lookup can look into the future
const PET_DATE_MAX_LOOKUP = 100;

// Reusable date generators
const PetDateUtils = {
    weekday: function (day) {
        return function * () {
            const date = new Date();
            if (date.getDay() === day) {
                yield date;
            }

            date.setDate(date.getDate() + (((day + 7 - date.getDay()) % 7) || 7));
    
            for (let i = 0; i < PET_DATE_MAX_LOOKUP; i++) {
                yield date;
                date.setDate(date.getDate() + 7);
            }
        }
    },
    season: function (...months) {
        return function * () {
            const date = new Date();

            if (_excludes(months, date.getMonth())) {
                if (date.getMonth() < months[0]) {
                    date.setMonth(months[0], 1);
                } else {
                    date.setFullYear(date.getFullYear() + 1, months[0], 1);
                }
            }

            for (let i = 0; i < PET_DATE_MAX_LOOKUP; i++) {
                yield date;
                date.setDate(date.getDate() + 1);

                if (_excludes(months, date.getMonth())) {
                    date.setFullYear(date.getFullYear() + 1, months[0], 1);
                }
            }
        }
    },
    month: function (month) {
        return function * () {
            const date = new Date();
            if (date.getMonth() > month) {
                date.setFullYear(date.getFullYear() + 1, month, 1);
            } else {
                date.setMonth(month, 1);
            }

            for (let i = 0; i < PET_DATE_MAX_LOOKUP; i++) {
                yield date;
                date.setDate(date.getDate() + 1);

                if (date.getMonth() !== month) {
                    date.setFullYear(date.getFullYear() + 1, month, 1);
                }
            }
        }
    },
    day: function (day, month) {
        return function * () {
            const date = new Date();
            date.setMonth(month, day);
    
            for (let i = 0; i < PET_DATE_MAX_LOOKUP; i++) {
                yield date;
                date.setFullYear(date.getFullYear() + 1, month, day);
            }
        }
    },
    weekend: function (type = null, date = new Date()) {
        return function * () {
            data = new Date(date);
            date.setDate(date.getDate() - date.getDay() + (date.getDay() ? 1 : -6));
            date.setHours(0, 0, 0);
    
            let week = (Math.trunc(date.getTime() / (7 * 24 * 3600 * 1000)) - 1) % 4;
            while (type !== null && week != type) {
                date.setDate(date.getDate() + 7);
                week = (week + 1) % 4;
            }
    
            date.setDate(date.getDate() + 5);
            date.setHours(0, 0, 0);
    
            for (let i = 0; i < 3; i++) {
                yield date;
                date.setDate(date.getDate() + 1);
            }
        }
    },
    easterDay: function (year) {
        const b = Math.floor(year / 100);
        const h = (19 * (year % 19) + b - Math.floor(b / 4) - Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3) + 15) % 30;
        const l = (32 + 2 * (b % 4) + 2 * Math.floor((year % 100) / 4) - h - ((year % 100) % 4)) % 7;
        const m = Math.floor(((year % 19) + 11 * h + 22 * l) / 451);
        const k = (h + l + 7 * m + 114);

        return new Date(year, Math.floor(k / 31) - 1, k % 31 + 1);
    },
    whitsunDay: function (year) {
        const b = Math.floor(year / 100);
        const h = (19 * (year % 19) + b - Math.floor(b / 4) - Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3) + 15) % 30;
        const l = (32 + 2 * (b % 4) + 2 * Math.floor((year % 100) / 4) - h - ((year % 100) % 4)) % 7;
        const m = Math.floor(((year % 19) + 11 * h + 22 * l) / 451);
        const k = (h + l + 7 * m + 114);

        return new Date(year, Math.floor(k / 31) - 1, k % 31 + 1 + 7 * 7);
    }
}

// Specific date range generators
const PetDate = {
    any: function * () {
        const date = new Date();

        for (let i = 0; i < PET_DATE_MAX_LOOKUP; i++) {
            yield date;
            date.setDate(date.getDate() + 1);
        }
    },
    // Days of the week
    sunday: PetDateUtils.weekday(0),
    monday: PetDateUtils.weekday(1),
    tuesday: PetDateUtils.weekday(2),
    wednesday: PetDateUtils.weekday(3),
    thursday: PetDateUtils.weekday(4),
    friday: PetDateUtils.weekday(5),
    saturday: PetDateUtils.weekday(6),
    // Seasons
    summer: PetDateUtils.season(5, 6, 7),
    fall: PetDateUtils.season(8, 9, 10),
    winter: PetDateUtils.season(11, 0, 1),
    spring: PetDateUtils.season(2, 3, 4),
    // Months
    december: PetDateUtils.month(11),
    // Specials
    special_april_fools: PetDateUtils.day(1, 3),
    special_halloween: PetDateUtils.day(31, 9),
    special_valentine: PetDateUtils.day(14, 1),
    special_new_year: function * () {
        const date = new Date();
        date.setMonth(11, 31);

        for (let i = 0; i < PET_DATE_MAX_LOOKUP; i++) {
            yield date;

            if (date.getMonth() == 0) {
                date.setMonth(11, 31);
            } else {
                date.setDate(date.getDate() + 1);
            }
        }
    },
    special_friday_13th: function * () {
        const date = new Date();
        date.setDate(13);

        for (let i = 0; i < PET_DATE_MAX_LOOKUP; i++) {
            if (date.getDay() === 5) {
                yield date;
            }

            date.setMonth(date.getMonth() + 1, 13);
        }
    },
    special_easter: function * () {
        const year = new Date().getFullYear();

        for (let i = 0; i < PET_DATE_MAX_LOOKUP; i++) {
            yield PetDateUtils.easterDay(year + i);
        }
    },
    special_whitsun: function * () {
        const year = new Date().getFullYear();

        for (let i = 0; i < PET_DATE_MAX_LOOKUP; i++) {
            yield PetDateUtils.whitsunDay(year + i);
        }
    },
    special_birthday: (function () {
        const date = new Date();
        date.setMonth(5, 22);

        if (date < new Date()) {
            date.setFullYear(date.getFullYear() + 1);
        }

        return PetDateUtils.weekend(null, date);
    })(),
    // Events
    event_experience: PetDateUtils.weekend(0),
    event_epic: PetDateUtils.weekend(1),
    event_gold: PetDateUtils.weekend(2),
    event_forest: PetDateUtils.weekend(3)
}

function isPetAvailable (hours, generator) {
    const today = new Date();

    for (const date of generator()) {
        for (const { start, end } of hours) {
            const startDate = new Date(date);
            startDate.setHours(...start);
    
            const endDate = new Date(date);
            endDate.setHours(...end);
    
            if (today >= startDate && today <= endDate) {
                // Can be caught right now
                return [startDate, endDate];
            } else if (today > endDate) {
                // Can't be caught anymore today
                continue;
            } else if (today < startDate) {
                // Can be caught in the future
                return [startDate, endDate];
            }
        }
    }
}

const PetData = [
    {
        location: PetLocation.Nevermoor,
        next: isPetAvailable(PetTime.day, PetDate.any),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.Maerwyn,
        next: isPetAvailable(PetTime.night, PetDate.any),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.SprawlingJungle,
        next: isPetAvailable(PetTime.night, PetDate.any),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.SplitCanyon,
        next: isPetAvailable(PetTime.night, PetDate.any),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.BlackForest,
        next: isPetAvailable(PetTime.night, PetDate.monday),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.BlackWaterSwamp,
        next: isPetAvailable(PetTime.witch, PetDate.any),
        time: 'witch',
        condition: true
    },
    {
        location: PetLocation.EvernightForest,
        next: isPetAvailable(PetTime.day, PetDate.summer),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.SkullIsland,
        next: isPetAvailable(PetTime.day, PetDate.winter),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.ShadowrockMountain,
        next: isPetAvailable(PetTime.night, PetDate.friday),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.MoldyForest,
        next: isPetAvailable(PetTime.day, PetDate.fall),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.FloodedCaldwell,
        next: isPetAvailable(PetTime.night, PetDate.monday),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.TuskMountain,
        next: isPetAvailable(PetTime.night, PetDate.tuesday),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.Erogenion,
        next: isPetAvailable(PetTime.night, PetDate.wednesday),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.StumbleSteppe,
        next: isPetAvailable(PetTime.day, PetDate.thursday),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.BlackForest,
        next: isPetAvailable(PetTime.any, PetDate.special_halloween),
        time: 'any',
        condition: true
    },
    {
        location: PetLocation.Gnarogrim,
        next: isPetAvailable(PetTime.any, PetDate.any),
        time: 'any',
        condition: (player) => player.Rank <= 1000 || player.Honor >= 50000
    },
    {
        location: PetLocation.BustedLands,
        next: isPetAvailable(PetTime.any, PetDate.event_experience),
        time: 'any',
        condition: true
    },
    {
        location: PetLocation.RottenLands,
        next: isPetAvailable(PetTime.any, PetDate.special_friday_13th),
        time: 'any',
        condition: true
    },
    {
        location: PetLocation.PlainsOfOzkorr,
        next: isPetAvailable(PetTime.any, PetDate.any),
        time: 'any',
        condition: (player) => _dig(player, 'Dungeons', 'Shadow', 12) === 10
    },
    {
        location: PetLocation.SunburnDesert,
        next: isPetAvailable(PetTime.any, PetDate.any),
        time: 'any',
        condition: (player) => _dig(player, 'Pets', 'Dungeons', 0) === 20
    },
    {
        location: PetLocation.StumbleSteppe,
        next: isPetAvailable(PetTime.day, PetDate.any),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.MoldyForest,
        next: isPetAvailable(PetTime.night, PetDate.any),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.Erogenion,
        next: isPetAvailable(PetTime.day, PetDate.any),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.ShadowrockMountain,
        next: isPetAvailable(PetTime.day, PetDate.any),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.SprawlingJungle,
        next: isPetAvailable(PetTime.night, PetDate.spring),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.Nevermoor,
        next: isPetAvailable(PetTime.day, PetDate.saturday),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.SunburnDesert,
        next: isPetAvailable(PetTime.day, PetDate.summer),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.FloodedCaldwell,
        next: isPetAvailable(PetTime.day, PetDate.fall),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.SkullIsland,
        next: isPetAvailable(PetTime.night, PetDate.monday),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.BustedLands,
        next: isPetAvailable(PetTime.day, PetDate.tuesday),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.TuskMountain,
        next: isPetAvailable(PetTime.day, PetDate.sunday),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.Northrunt,
        next: isPetAvailable(PetTime.night, PetDate.wednesday),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.EvernightForest,
        next: isPetAvailable(PetTime.day, PetDate.thursday),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.BlackWaterSwamp,
        next: isPetAvailable(PetTime.day, PetDate.friday),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.Erogenion,
        next: isPetAvailable(PetTime.any, PetDate.any),
        time: 'any',
        condition: (player) => {
            const group = _dig(player, 'Group', 'Group');
            return group && (group.Rank <= 100 || group.Honor >= 2500);
        }
    },
    {
        location: PetLocation.Northrunt,
        next: isPetAvailable(PetTime.day, PetDate.december),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.SplitCanyon,
        next: isPetAvailable(PetTime.any, PetDate.special_april_fools),
        time: 'any',
        condition: true
    },
    {
        location: PetLocation.Erogenion,
        next: isPetAvailable(PetTime.any, PetDate.event_epic),
        time: 'any',
        condition: true
    },
    {
        location: PetLocation.RottenLands,
        next: isPetAvailable(PetTime.any, PetDate.any),
        time: 'any',
        condition: (player) => _dig(player, 'Dungeons', 'Tower') === 100
    },
    {
        location: PetLocation.PlainsOfOzkorr,
        next: isPetAvailable(PetTime.any, PetDate.any),
        time: 'any',
        condition: (player) => _dig(player, 'Pets', 'Dungeons', 1) === 20
    },
    {
        location: PetLocation.StumbleSteppe,
        next: isPetAvailable(PetTime.day, PetDate.any),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.Gnarogrim,
        next: isPetAvailable(PetTime.night, PetDate.any),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.Erogenion,
        next: isPetAvailable(PetTime.day, PetDate.any),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.BlackForest,
        next: isPetAvailable(PetTime.day, PetDate.any),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.Northrunt,
        next: isPetAvailable(PetTime.night, PetDate.any),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.TuskMountain,
        next: isPetAvailable(PetTime.day, PetDate.summer),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.BlackWaterSwamp,
        next: isPetAvailable(PetTime.day, PetDate.fall),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.SplitCanyon,
        next: isPetAvailable(PetTime.day, PetDate.winter),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.Magmaron,
        next: isPetAvailable(PetTime.day, PetDate.spring),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.Nevermoor,
        next: isPetAvailable(PetTime.night, PetDate.sunday),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.Maerwyn,
        next: isPetAvailable(PetTime.day, PetDate.monday),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.BustedLands,
        next: isPetAvailable(PetTime.night, PetDate.tuesday),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.EvernightForest,
        next: isPetAvailable(PetTime.day, PetDate.wednesday),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.RottenLands,
        next: isPetAvailable(PetTime.day, PetDate.thursday),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.Maerwyn,
        next: isPetAvailable(PetTime.any, PetDate.special_easter),
        time: 'any',
        condition: true
    },
    {
        location: PetLocation.SprawlingJungle,
        next: isPetAvailable(PetTime.any, PetDate.special_whitsun),
        time: 'any',
        condition: true
    },
    {
        location: PetLocation.PlainsOfOzkorr,
        next: isPetAvailable(PetTime.any, PetDate.event_gold),
        time: 'any',
        condition: true
    },
    {
        location: PetLocation.StumbleSteppe,
        next: isPetAvailable(PetTime.any, PetDate.any),
        time: 'any',
        condition: (player) => {
            const fortress = player.Fortress;
            return fortress && fortress.Rank > 0 && (fortress.Rank <= 100 || fortress.Honor >= 2500);
        }
    },
    {
        location: PetLocation.GemMine,
        next: isPetAvailable(PetTime.any, PetDate.any),
        time: 'any',
        condition: (player) => {
            const fortress = player.Fortress;
            return fortress && fortress.GemMine >= 20;
        }
    },
    {
        location: PetLocation.MoldyForest,
        next: isPetAvailable(PetTime.any, PetDate.any),
        time: 'any',
        condition: (player) => _dig(player, 'Pets', 'Dungeons', 2) === 20
    },
    {
        location: PetLocation.Nevermoor,
        next: isPetAvailable(PetTime.day, PetDate.any),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.FloodedCaldwell,
        next: isPetAvailable(PetTime.night, PetDate.any),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.BlackWaterSwamp,
        next: isPetAvailable(PetTime.night, PetDate.any),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.TuskMountain,
        next: isPetAvailable(PetTime.day, PetDate.any),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.BustedLands,
        next: isPetAvailable(PetTime.night, PetDate.tuesday),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.MoldyForest,
        next: isPetAvailable(PetTime.night, PetDate.fall),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.SplitCanyon,
        next: isPetAvailable(PetTime.day, PetDate.monday),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.SunburnDesert,
        next: isPetAvailable(PetTime.day, PetDate.spring),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.PlainsOfOzkorr,
        next: isPetAvailable(PetTime.day, PetDate.winter),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.SprawlingJungle,
        next: isPetAvailable(PetTime.night, PetDate.wednesday),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.StumbleSteppe,
        next: isPetAvailable(PetTime.day, PetDate.thursday),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.BlackForest,
        next: isPetAvailable(PetTime.day, PetDate.summer),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.Magmaron,
        next: isPetAvailable(PetTime.day, PetDate.friday),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.EvernightForest,
        next: isPetAvailable(PetTime.night, PetDate.saturday),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.WeaponShop,
        next: isPetAvailable(PetTime.any, PetDate.any),
        time: 'any',
        condition: true
    },
    {
        location: PetLocation.Maerwyn,
        next: isPetAvailable(PetTime.any, PetDate.event_forest),
        time: 'any',
        condition: true
    },
    {
        location: PetLocation.FloodedCaldwell,
        next: isPetAvailable(PetTime.any, PetDate.special_valentine),
        time: 'any',
        condition: true
    },
    {
        location: PetLocation.EvernightForest,
        next: isPetAvailable(PetTime.any, PetDate.special_new_year),
        time: 'any',
        condition: true
    },
    {
        location: PetLocation.SkullIsland,
        next: isPetAvailable(PetTime.any, PetDate.any),
        time: 'any',
        condition: (player) => _dig(player, 'Dungeons', 'Player') === 50
    },
    {
        location: PetLocation.Gnarogrim,
        next: isPetAvailable(PetTime.any, PetDate.any),
        time: 'any',
        condition: (player) => _dig(player, 'Pets', 'Dungeons', 3) === 20
    },
    {
        location: PetLocation.Magmaron,
        next: isPetAvailable(PetTime.day, PetDate.any),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.SkullIsland,
        next: isPetAvailable(PetTime.day, PetDate.any),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.EvernightForest,
        next: isPetAvailable(PetTime.night, PetDate.any),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.Northrunt,
        next: isPetAvailable(PetTime.day, PetDate.any),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.RottenLands,
        next: isPetAvailable(PetTime.day, PetDate.monday),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.TuskMountain,
        next: isPetAvailable(PetTime.night, PetDate.tuesday),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.SplitCanyon,
        next: isPetAvailable(PetTime.day, PetDate.wednesday),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.FloodedCaldwell,
        next: isPetAvailable(PetTime.day, PetDate.winter),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.MoldyForest,
        next: isPetAvailable(PetTime.night, PetDate.thursday),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.SkullIsland,
        next: isPetAvailable(PetTime.day, PetDate.friday),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.BlackWaterSwamp,
        next: isPetAvailable(PetTime.day, PetDate.saturday),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.Erogenion,
        next: isPetAvailable(PetTime.night, PetDate.fall),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.SprawlingJungle,
        next: isPetAvailable(PetTime.day, PetDate.summer),
        time: 'day',
        condition: true
    },
    {
        location: PetLocation.ShadowrockMountain,
        next: isPetAvailable(PetTime.night, PetDate.sunday),
        time: 'night',
        condition: true
    },
    {
        location: PetLocation.SkullIsland,
        next: isPetAvailable(PetTime.any, PetDate.any),
        time: 'any',
        condition: (player) => {
            const pets = player.Pets;
            return pets && pets.Rank > 0 && (pets.Rank <= 100 || pets.Honor >= 4000);
        }
    },
    {
        location: PetLocation.MagicShop,
        next: isPetAvailable(PetTime.any, PetDate.any),
        time: 'any',
        condition: true
    },
    {
        location: PetLocation.SkullIsland,
        next: isPetAvailable(PetTime.any, PetDate.special_birthday),
        time: 'any',
        condition: true
    },
    {
        location: PetLocation.Toilet,
        next: isPetAvailable(PetTime.any, PetDate.any),
        time: 'any',
        condition: (player) => {
            const toilet = player.Toilet;
            return toilet && toilet.Aura >= 20;
        }
    },
    {
        location: PetLocation.BustedLands,
        next: isPetAvailable(PetTime.any, PetDate.any),
        time: 'any',
        condition: (player) => _dig(player, 'Dungeons', 'Normal', 24) === 10
    },
    {
        location: PetLocation.Nevermoor,
        next: isPetAvailable(PetTime.any, PetDate.any),
        time: 'any',
        condition: (player) => _dig(player, 'Pets', 'Dungeons', 4) === 20
    }
];
