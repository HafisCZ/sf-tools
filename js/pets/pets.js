const PetTime = {
    Any: 0,
    Day: 1,
    Night: 2,
    FirstHour: 3
};

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
    MagicShop: 202,
    Toilet: 203
};

const CompactWeekend = {
    Type: {
        'Experience': 0,
        'Epic': 1,
        'Gold': 2,
        'Forest': 3
    },
    getNext: function (type, date = Date.now()) {
        date = new Date(date);
        date.setDate(date.getDate() - date.getDay() + (date.getDay() ? 1 : -6));
        date.setHours(0, 0, 0);

        let week = (Math.trunc(date.getTime() / (7 * 24 * 3600 * 1000)) - 1) % 4;
        while (week != type) {
            date.setDate(date.getDate() + 7);
            week = (week + 1) % 4;
        }

        let beg = date.getTime() + 4 * 24 * 60 * 60 * 1000 + 1;
        let end = date.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000;
        return [beg, end];
    },
    getNextAny: function (date = Date.now()) {
        date = new Date(date);
        date.setDate(date.getDate() - date.getDay() + (date.getDay() ? 1 : -6));
        date.setHours(0, 0, 0);
        let beg = date.getTime() + 4 * 24 * 60 * 60 * 1000 + 1;
        let end = date.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000;
        return [beg, end];
    }
}

const PetDate = {
    Any: d => true,
    Summer: d => d.getMonth() >= 5 && d.getMonth() <= 7,
    Fall: d => d.getMonth() >= 8 && d.getMonth() <= 10,
    Winter: d => d.getMonth() >= 11 || d.getMonth() <= 1,
    Spring: d => d.getMonth() >= 2 && d.getMonth() <= 4,
    Monday: d => d.getDay() == 1,
    Tuesday: d => d.getDay() == 2,
    Wednesday: d => d.getDay() == 3,
    Thursday: d => d.getDay() == 4,
    Friday: d => d.getDay() == 5,
    Saturday: d => d.getDay() == 6,
    Sunday: d => d.getDay() == 0,
    January: d => d.getMonth() == 0,
    February: d => d.getMonth() == 1,
    March: d => d.getMonth() == 2,
    April: d => d.getMonth() == 3,
    May: d => d.getMonth() == 4,
    June: d => d.getMonth() == 5,
    July: d => d.getMonth() == 6,
    August: d => d.getMonth() == 7,
    September: d => d.getMonth() == 8,
    October: d => d.getMonth() == 9,
    November: d => d.getMonth() == 10,
    December: d => d.getMonth() == 11,
    Halloween: d => d.getDate() == 31 && d.getMonth() == 9,
    Friday13th: d => d.getDay() == 5 && d.getDate() == 13,
    AprilFools: d => d.getDate() == 1 && d.getMonth() == 3,
    NewYear: d => d.getDate() == 31 && d.getMonth() == 11 || d.getDate() == 1 && d.getMonth() == 0,
    Valentine: d => d.getDate() == 14 && d.getMonth() == 1,
    Birthday: d => {
        var range = CompactWeekend.getNextAny(new Date(`6/22/${ d.getFullYear() }`));
        return d.getTime() >= range[0] && d.getTime() <= range[1];
    },
    Easter: d => {
        var easter = (function (year) {
            var b = Math.floor(year / 100);
            var h = (19 * (year % 19) + b - Math.floor(b / 4) - Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3) + 15) % 30;
            var l = (32 + 2 * (b % 4) + 2 * Math.floor((year % 100) / 4) - h - ((year % 100) % 4)) % 7;
            var m = Math.floor(((year % 19) + 11 * h + 22 * l) / 451);
            var n0 = (h + l + 7 * m + 114);

            return new Date(year, Math.floor(n0 / 31) - 1, n0 % 31 + 1);
        }(d.getFullYear()));
        return easter.getDate() == d.getDate() && easter.getMonth() == d.getMonth();
    },
    EventXP: d => {
        var range = CompactWeekend.getNext(0, d);
        return d.getTime() >= range[0] && d.getTime() <= range[1];
    },
    EventEpic: d => {
        var range = CompactWeekend.getNext(1, d);
        return d.getTime() >= range[0] && d.getTime() <= range[1];
    },
    EventGold: d => {
        var range = CompactWeekend.getNext(2, d);
        return d.getTime() >= range[0] && d.getTime() <= range[1];
    },
    EventForest: d => {
        var range = CompactWeekend.getNext(3, d);
        return d.getTime() >= range[0] && d.getTime() <= range[1];
    },
    Whitsun: d => {
        var whitsun = (function (year) {
            var b = Math.floor(year / 100);
            var h = (19 * (year % 19) + b - Math.floor(b / 4) - Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3) + 15) % 30;
            var l = (32 + 2 * (b % 4) + 2 * Math.floor((year % 100) / 4) - h - ((year % 100) % 4)) % 7;
            var m = Math.floor(((year % 19) + 11 * h + 22 * l) / 451);
            var n0 = (h + l + 7 * m + 114);

            return new Date(year, Math.floor(n0 / 31) - 1, n0 % 31 + 1 + 7 * 7);
        }(d.getFullYear()));
        var range = CompactWeekend.getNextAny(whitsun);
        return d.getTime() >= range[0] && d.getTime() <= range[1] + 24 * 60 * 60 * 1000;
    }
}

const Pets = [
    {
        Location: PetLocation.Nevermoor,
        Time: PetTime.Day,
        Date: PetDate.Any,
        Special: false
    },
    {
        Location: PetLocation.Maerwyn,
        Time: PetTime.Night,
        Date: PetDate.Any,
        Special: false
    },
    {
        Location: PetLocation.SprawlingJungle,
        Time: PetTime.Night,
        Date: PetDate.Any,
        Special: false
    },
    {
        Location: PetLocation.SplitCanyon,
        Time: PetTime.Night,
        Date: PetDate.Any,
        Special: false
    },
    {
        Location: PetLocation.BlackForest,
        Time: PetTime.Night,
        Date: PetDate.Monday,
        Special: false
    },
    {
        Location: PetLocation.BlackWaterSwamp,
        Time: PetTime.FirstHour,
        Date: PetDate.Any,
        Special: false
    },
    {
        Location: PetLocation.EvernightForest,
        Time: PetTime.Day,
        Date: PetDate.Summer,
        Special: false
    },
    {
        Location: PetLocation.SkullIsland,
        Time: PetTime.Day,
        Date: PetDate.Winter,
        Special: false
    },
    {
        Location: PetLocation.ShadowrockMountain,
        Time: PetTime.Night,
        Date: PetDate.Friday,
        Special: false
    },
    {
        Location: PetLocation.MoldyForest,
        Time: PetTime.Day,
        Date: PetDate.Fall,
        Special: false
    },
    {
        Location: PetLocation.FloodedCaldwell,
        Time: PetTime.Night,
        Date: PetDate.Monday,
        Special: false
    },
    {
        Location: PetLocation.TuskMountain,
        Time: PetTime.Night,
        Date: PetDate.Tuesday,
        Special: false
    },
    {
        Location: PetLocation.Erogenion,
        Time: PetTime.Night,
        Date: PetDate.Wednesday,
        Special: false
    },
    {
        Location: PetLocation.StumbleSteppe,
        Time: PetTime.Day,
        Date: PetDate.Thursday,
        Special: false
    },
    {
        Location: PetLocation.BlackForest,
        Time: PetTime.Any,
        Date: PetDate.Halloween,
        Special: false
    },
    {
        Location: PetLocation.Gnarogrim,
        Time: PetTime.Any,
        Date: PetDate.Any,
        Special: true
    },
    {
        Location: PetLocation.BustedLands,
        Time: PetTime.Any,
        Date: PetDate.EventXP,
        Special: false
    },
    {
        Location: PetLocation.RottenLands,
        Time: PetTime.Any,
        Date:  PetDate.Friday13th,
        Special: false
    },
    {
        Location: PetLocation.PlainsOfOzkorr,
        Time: PetTime.Any,
        Date: PetDate.Any,
        Special: true
    },
    {
        Location: PetLocation.SunburnDesert,
        Time: PetTime.Any,
        Date: PetDate.Any,
        Special: true
    },
    {
        Location: PetLocation.StumbleSteppe,
        Time: PetTime.Day,
        Date: PetDate.Any,
        Special: false
    },
    {
        Location: PetLocation.MoldyForest,
        Time: PetTime.Night,
        Date: PetDate.Any,
        Special: false
    },
    {
        Location: PetLocation.Erogenion,
        Time: PetTime.Day,
        Date: PetDate.Any,
        Special: false
    },
    {
        Location: PetLocation.ShadowrockMountain,
        Time: PetTime.Day,
        Date: PetDate.Any,
        Special: false
    },
    {
        Location: PetLocation.SprawlingJungle,
        Time: PetTime.Night,
        Date: PetDate.Spring,
        Special: false
    },
    {
        Location: PetLocation.Nevermoor,
        Time: PetTime.Day,
        Date: PetDate.Saturday,
        Special: false
    },
    {
        Location: PetLocation.SunburnDesert,
        Time: PetTime.Day,
        Date: PetDate.Summer,
        Special: false
    },
    {
        Location: PetLocation.FloodedCaldwell,
        Time: PetTime.Day,
        Date: PetDate.Fall,
        Special: false
    },
    {
        Location: PetLocation.SkullIsland,
        Time: PetTime.Night,
        Date: PetDate.Monday,
        Special: false
    },
    {
        Location: PetLocation.BustedLands,
        Time: PetTime.Day,
        Date: PetDate.Tuesday,
        Special: false
    },
    {
        Location: PetLocation.TuskMountain,
        Time: PetTime.Day,
        Date: PetDate.Sunday,
        Special: false
    },
    {
        Location: PetLocation.Northrunt,
        Time: PetTime.Night,
        Date: PetDate.Wednesday,
        Special: false
    },
    {
        Location: PetLocation.EvernightForest,
        Time: PetTime.Day,
        Date: PetDate.Thursday,
        Special: false
    },
    {
        Location: PetLocation.BlackWaterSwamp,
        Time: PetTime.Day,
        Date: PetDate.Friday,
        Special: false
    },
    {
        Location: PetLocation.Erogenion,
        Time: PetTime.Any,
        Date: PetDate.Any,
        Special: true
    },
    {
        Location: PetLocation.Northrunt,
        Time: PetTime.Any,
        Date: PetDate.December,
        Special: false
    },
    {
        Location: PetLocation.SplitCanyon,
        Time: PetTime.Any,
        Date: PetDate.AprilFools,
        Special: false
    },
    {
        Location: PetLocation.Erogenion,
        Time: PetTime.Any,
        Date: PetDate.EventEpic,
        Special: false
    },
    {
        Location: PetLocation.RottenLands,
        Time: PetTime.Any,
        Date: PetDate.Any,
        Special: true
    },
    {
        Location: PetLocation.PlainsOfOzkorr,
        Time: PetTime.Any,
        Date: PetDate.Any,
        Special: true
    },
    {
        Location: PetLocation.StumbleSteppe,
        Time: PetTime.Day,
        Date: PetDate.Any,
        Special: false
    },
    {
        Location: PetLocation.Gnarogrim,
        Time: PetTime.Night,
        Date: PetDate.Any,
        Special: false
    },
    {
        Location: PetLocation.Erogenion,
        Time: PetTime.Day,
        Date: PetDate.Any,
        Special: false
    },
    {
        Location: PetLocation.BlackForest,
        Time: PetTime.Day,
        Date: PetDate.Any,
        Special: false
    },
    {
        Location: PetLocation.Northrunt,
        Time: PetTime.Night,
        Date: PetDate.Any,
        Special: false
    },
    {
        Location: PetLocation.TuskMountain,
        Time: PetTime.Day,
        Date: PetDate.Summer,
        Special: false
    },
    {
        Location: PetLocation.BlackWaterSwamp,
        Time: PetTime.Day,
        Date: PetDate.Fall,
        Special: false
    },
    {
        Location: PetLocation.SplitCanyon,
        Time: PetTime.Day,
        Date: PetDate.Winter,
        Special: false
    },
    {
        Location: PetLocation.Magmaron,
        Time: PetTime.Day,
        Date: PetDate.Spring,
        Special: false
    },
    {
        Location: PetLocation.Magmaron,
        Time: PetTime.Night,
        Date: PetDate.Sunday,
        Special: false
    },
    {
        Location: PetLocation.Maerwyn,
        Time: PetTime.Day,
        Date: PetDate.Monday,
        Special: false
    },
    {
        Location: PetLocation.BustedLands,
        Time: PetTime.Night,
        Date: PetDate.Tuesday,
        Special: false
    },
    {
        Location: PetLocation.EvernightForest,
        Time: PetTime.Day,
        Date: PetDate.Wednesday,
        Special: false
    },
    {
        Location: PetLocation.RottenLands,
        Time: PetTime.Day,
        Date: PetDate.Thursday,
        Special: false
    },
    {
        Location: PetLocation.Maerwyn,
        Time: PetTime.Any,
        Date: PetDate.Easter,
        Special: false
    },
    {
        Location: PetLocation.SprawlingJungle,
        Time: PetTime.Any,
        Date: PetDate.Whitsun,
        Special: false
    },
    {
        Location: PetLocation.PlainsOfOzkorr,
        Time: PetTime.Any,
        Date: PetDate.EventGold,
        Special: false
    },
    {
        Location: PetLocation.StumbleSteppe,
        Time: PetTime.Any,
        Date: PetDate.Any,
        Special: true
    },
    {
        Location: PetLocation.GemMine,
        Time: PetTime.Any,
        Date: PetDate.Any,
        Special: true
    },
    {
        Location: PetLocation.MoldyForest,
        Time: PetTime.Any,
        Date: PetDate.Any,
        Special: true
    },
    {
        Location: PetLocation.Nevermoor,
        Time: PetTime.Day,
        Date: PetDate.Any,
        Special: false
    },
    {
        Location: PetLocation.FloodedCaldwell,
        Time: PetTime.Night,
        Date: PetDate.Any,
        Special: false
    },
    {
        Location: PetLocation.BlackWaterSwamp,
        Time: PetTime.Night,
        Date: PetDate.Any,
        Special: false
    },
    {
        Location: PetLocation.TuskMountain,
        Time: PetTime.Day,
        Date: PetDate.Any,
        Special: false
    },
    {
        Location: PetLocation.BustedLands,
        Time: PetTime.Night,
        Date: PetDate.Tuesday,
        Special: false
    },
    {
        Location: PetLocation.MoldyForest,
        Time: PetTime.Night,
        Date: PetDate.Fall,
        Special: false
    },
    {
        Location: PetLocation.SplitCanyon,
        Time: PetTime.Day,
        Date: PetDate.Monday,
        Special: false
    },
    {
        Location: PetLocation.SunburnDesert,
        Time: PetTime.Day,
        Date: PetDate.Spring,
        Special: false
    },
    {
        Location: PetLocation.PlainsOfOzkorr,
        Time: PetTime.Day,
        Date: PetDate.Winter,
        Special: false
    },
    {
        Location: PetLocation.SprawlingJungle,
        Time: PetTime.Night,
        Date: PetDate.Wednesday,
        Special: false
    },
    {
        Location: PetLocation.StumbleSteppe,
        Time: PetTime.Day,
        Date: PetDate.Thursday,
        Special: false
    },
    {
        Location: PetLocation.BlackForest,
        Time: PetTime.Day,
        Date: PetDate.Summer,
        Special: false
    },
    {
        Location: PetLocation.Magmaron,
        Time: PetTime.Day,
        Date: PetDate.Friday,
        Special: false
    },
    {
        Location: PetLocation.EvernightForest,
        Time: PetTime.Night,
        Date: PetDate.Saturday,
        Special: false
    },
    {
        Location: PetLocation.MagicShop,
        Time: PetTime.Any,
        Date: PetDate.Any,
        Special: true
    },
    {
        Location: PetLocation.Maerwyn,
        Time: PetTime.Any,
        Date: PetDate.EventForest,
        Special: false
    },
    {
        Location: PetLocation.FloodedCaldwell,
        Time: PetTime.Any,
        Date: PetDate.Valentine,
        Special: false
    },
    {
        Location: PetLocation.EvernightForest,
        Time: PetTime.Any,
        Date: PetDate.NewYear,
        Special: false
    },
    {
        Location: PetLocation.SkullIsland,
        Time: PetTime.Any,
        Date: PetDate.Any,
        Special: true
    },
    {
        Location: PetLocation.Gnarogrim,
        Time: PetTime.Any,
        Date: PetDate.Any,
        Special: true
    },
    {
        Location: PetLocation.Magmaron,
        Time: PetTime.Day,
        Date: PetDate.Any,
        Special: false
    },
    {
        Location: PetLocation.SkullIsland,
        Time: PetTime.Day,
        Date: PetDate.Any,
        Special: false
    },
    {
        Location: PetLocation.EvernightForest,
        Time: PetTime.Night,
        Date: PetDate.Any,
        Special: false
    },
    {
        Location: PetLocation.Northrunt,
        Time: PetTime.Day,
        Date: PetDate.Any,
        Special: false
    },
    {
        Location: PetLocation.RottenLands,
        Time: PetTime.Day,
        Date: PetDate.Monday,
        Special: false
    },
    {
        Location: PetLocation.TuskMountain,
        Time: PetTime.Night,
        Date: PetDate.Tuesday,
        Special: false
    },
    {
        Location: PetLocation.SplitCanyon,
        Time: PetTime.Day,
        Date: PetDate.Wednesday,
        Special: false
    },
    {
        Location: PetLocation.FloodedCaldwell,
        Time: PetTime.Day,
        Date: PetDate.Winter,
        Special: false
    },
    {
        Location: PetLocation.MoldyForest,
        Time: PetTime.Night,
        Date: PetDate.Thursday,
        Special: false
    },
    {
        Location: PetLocation.SkullIsland,
        Time: PetTime.Day,
        Date: PetDate.Friday,
        Special: false
    },
    {
        Location: PetLocation.BlackWaterSwamp,
        Time: PetTime.Day,
        Date: PetDate.Saturday,
        Special: false
    },
    {
        Location: PetLocation.Erogenion,
        Time: PetTime.Night,
        Date: PetDate.Fall,
        Special: false
    },
    {
        Location: PetLocation.SprawlingJungle,
        Time: PetTime.Day,
        Date: PetDate.Summer,
        Special: false
    },
    {
        Location: PetLocation.ShadowrockMountain,
        Time: PetTime.Night,
        Date: PetDate.Sunday,
        Special: false
    },
    {
        Location: PetLocation.SkullIsland,
        Time: PetTime.Any,
        Date: PetDate.Any,
        Special: true
    },
    {
        Location: PetLocation.MagicShop,
        Time: PetTime.Any,
        Date: PetDate.Any,
        Special: true
    },
    {
        Location: PetLocation.SkullIsland,
        Time: PetTime.Any,
        Date: PetDate.Birthday,
        Special: false
    },
    {
        Location: PetLocation.Toilet,
        Time: PetTime.Any,
        Date: PetDate.Any,
        Special: true
    },
    {
        Location: PetLocation.BustedLands,
        Time: PetTime.Any,
        Date: PetDate.Any,
        Special: true
    },
    {
        Location: PetLocation.Nevermoor,
        Time: PetTime.Any,
        Date: PetDate.Any,
        Special: true
    }
];

const PetDescriptions = [
    'Can be found in Nevermoor during the day.',
    'Can be found in Maerwynn at night.',
    'Can be found in Sprawling Jungle at night.',
    'Can be found in Split Canyon at night.',
    'Can be found in Black Forest on Monday night.',
    'Can be found in Black Water Swamp during witching hour. (00:00 - 01:00 a.m.)',
    'Can be found in Evernight Forest on summer days.',
    'Can be found on Skull Island on winter days.',
    'Can be found on Shadowrock Mountain on Friday night.',
    'Can be found in Moldy Forest on fall days.',
    'Can be found in Flooded Caldwell on Monday night.',
    'Can be found on Tusk Mountain on Tuesday night.',
    'Can be found in Erogenion on Wednesday night.',
    'Can be found in Stumble Steppe on Thursday during the day.',
    'Can be found in Black Forest on Halloween.',
    'Can be found in Gnarogrim. Required: Hall of fame top 1,000 or 50,000 honor when finishing the quest.',
    'Can be found in Busted Lands during XP Event.',
    'Can be found in Rotten Lands on Friday the 13th.',
    'Is rewarded for clearing 10th floor of the 15th dungeon of the Shadow World. Location: Plains of Oz\'Korr.',
    'Can be found on the last floor of the Shadow Habitat. Location: Sunburn Desert.',
    'Can be found in Stumble Steppe during the day.',
    'Can be found in Moldy Forest at night.',
    'Can be found in Erogenion during the day.',
    'Can be found on Shadowrock Mountain during the day.',
    'Can be found in Sprawling Jungle on spring nights.',
    'Can be found in Nevermoor on Saturday during the day.',
    'Can be found in Sunburn Desert on summer days.',
    'Can be found in Flooded Caldwell on fall days.',
    'Can be found on Skull Island on Monday night.',
    'Can be found in Busted Lands on Tuesday during the day.',
    'Can be found on Tusk Mountain on Sunday during the day.',
    'Can be found in Northrunt on Wednesday night.',
    'Can be found in Evernight Forest on Thursday during the day.',
    'Can be found in Black Water Swamp on Friday during the day.',
    'Can be found in Erogenion. Required: Guild hall of fame top 100 or 2,500 honor when finishing the quest.',
    'Can be found in  Northrunt in December.',
    'Can be found in Split Canyon on April Fools\' Day. For real!',
    'Can be found in Erogenion during Epic Event.',
    'Is a reward for clearing the Tower. Location: Rotten Lands.',
    'Can be found on the last floor of the Light Habitat. Location: Plains of Oz\'Korr.',
    'Can be found in Stumble Steppe during the day.',
    'Can be found in Gnarogrim at night.',
    'Can be found in Erogenion during the day.',
    'Can be found in Black Forest during the day.',
    'Can be found in Northrunt at night.',
    'Can be found on Tusk Mountain on summer days.',
    'Can be found in Black Water Swamp on fall days.',
    'Can be found in in Split Canyon on winter days.',
    'Can be found in Magmaron on spring days.',
    'Can be found in Nevermoor on Sunday night.',
    'Can be found in Maerwynn on Monday during the day.',
    'Can be found in Busted Lands on Tuesday night.',
    'Can be found in Evernight Forest on Wednesday during the day.',
    'Can be found in Rotten Lands on Thursday during the day.',
    'Can be found in Maerwynn on Easter.',
    'Can be found in Sprawling Jungle on Whitsun.',
    'Can be found in Plains of Oz\'Korr during Gold Event.',
    'Can be found in Stumble Steppe. Required: Fortress hall of fame top 100 or 2,500 honor when finishing the quest.',
    'Can be found in the gem mine. Required: Mine level 20.',
    'Can be found on the last floor of the Earth Habitat. Location: Moldy Forest.',
    'Can be found in Nevermoor during the day.',
    'Can be found in Flooded Caldwell at night.',
    'Can be found in Black Water Swamp at night.',
    'Can be found on Tusk Mountain during the day.',
    'Can be found in Busted Lands on Tuesday night.',
    'Can be found in Moldy Forest on fall nights.',
    'Can be found in Split Canyon on Monday during the day.',
    'Can be found in Sunburn Desert on spring days.',
    'Can be found in Plains of Oz\'Korr on winter days.',
    'Can be found in Sprawling Jungle on Wednesday night.',
    'Can be found in Stumble Steppe on Thursday during the day.',
    'Can be found in Black Forest on summer days.',
    'Can be found in Magmaron on Friday during the day.',
    'Can be found in Evernight Forest on Saturday night.',
    'Can\'t be found in the wild, but in your local weapon shop.',
    'Can be found in Maerwynn during Forest Rarities Event.',
    'Can be found in Flooded Caldwell on Valentine\'s Day.',
    'Can be found in Evernight Forest on New Year\'s Eve & Day.',
    'Is a reward for clearing the single-player Demon Portal. Location: Skull Island.',
    'Can be found on the last floor of the Fire Habitat. Location: Gnarogrim.',
    'Can be found in Magmaron during the day.',
    'Can be found on Skull Island during the day.',
    'Can be found in Evernight Forest at night.',
    'Can be found in Northrunt during the day.',
    'Can be found in Rotten Lands on Monday during the day.',
    'Can be found on Tusk Mountain on Tuesday night.',
    'Can be found in Split Canyon on Wednesday during the day.',
    'Can be found in Flooded Caldwell on winter days.',
    'Can be found in Moldy Forest on Thursday night.',
    'Can be found on Skull Island on Friday during the day.',
    'Can be found in Black Water Swamp on Saturday during the day.',
    'Can be found in Erogenion on fall nights.',
    'Can be found in Sprawling Jungle on summer days.',
    'Can be found on Shadowrock Mountain on Sunday night.',
    'Can be found on Skull Island. Required: Pets hall of fame top 100 or 4,000 honor when finishing the quest.',
    'Can\'t be found in the wild, but in your local magic shop.',
    'Can be found on Skull Island during the Birthday Event.',
    'Can be found in the Arcane Toilet. Required: Aura level 20.',
    'Is rewarded for the next quest after clearing dungeon 22. Location: Busted Lands.',
    'Can be found on the last floor of the Water Habitat. Location: Nevermoor.'
];
