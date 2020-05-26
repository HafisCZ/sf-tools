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
    Birthday: d => d.getDate() == 21 && d.getMonth() == 5,
    Easter: d => {

    },
    EventXP: d => {

    },
    EventEpic: d => {

    },
    EventGold: d => {

    },
    EventForest: d => {

    },
    Whitsun: d => {

    }
}

const Pets = [
    {
        Location: PetLocation.Nevermoor,
        Time: PetTime.Day,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.Maerwyn,
        Time: PetTime.Night,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.SprawlingJungle,
        Time: PetTime.Night,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.SplitCanyon,
        Time: PetTime.Night,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.BlackForest,
        Time: PetTime.Night,
        Date: PetDate.Monday
    },
    {
        Location: PetLocation.BlackWaterSwamp,
        Time: PetTime.FirstHour,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.EvernightForest,
        Time: PetTime.Day,
        Date: PetDate.Summer
    },
    {
        Location: PetLocation.SkullIsland,
        Time: PetTime.Day,
        Date: PetDate.Winter
    },
    {
        Location: PetLocation.ShadowrockMountain,
        Time: PetTime.Night,
        Date: PetDate.Friday
    },
    {
        Location: PetLocation.MoldyForest,
        Time: PetTime.Day,
        Date: PetDate.Fall
    },
    {
        Location: PetLocation.FloodedCaldwell,
        Time: PetTime.Night,
        Date: PetDate.Monday
    },
    {
        Location: PetLocation.TuskMountain,
        Time: PetTime.Night,
        Date: PetDate.Tuesday
    },
    {
        Location: PetLocation.Erogenion,
        Time: PetTime.Night,
        Date: PetDate.Wednesday
    },
    {
        Location: PetLocation.StumbleSteppe,
        Time: PetTime.Day,
        Date: PetDate.Thursday
    },
    {
        Location: PetLocation.BlackForest,
        Time: PetTime.Any,
        Date: PetDate.Halloween
    },
    {
        Location: PetLocation.Gnarogrim,
        Time: PetTime.Any,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.BustedLands,
        Time: PetTime.Any,
        Date: PetDate.EventXP
    },
    {
        Location: PetLocation.RottenLands,
        Time: PetTime.Any,
        Date:  PetDate.Friday13th
    },
    {
        Location: PetLocation.PlainsOfOzkorr,
        Time: PetTime.Any,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.SunburnDesert,
        Time: PetTime.Any,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.StumbleSteppe,
        Time: PetTime.Day,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.MoldyForest,
        Time: PetTime.Night,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.Erogenion,
        Time: PetTime.Day,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.ShadowrockMountain,
        Time: PetTime.Day,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.SprawlingJungle,
        Time: PetTime.Night,
        Date: PetDate.Spring
    },
    {
        Location: PetLocation.Nevermoor,
        Time: PetTime.Day,
        Date: PetDate.Saturday
    },
    {
        Location: PetLocation.SunburnDesert,
        Time: PetTime.Day,
        Date: PetDate.Summer
    },
    {
        Location: PetLocation.FloodedCaldwell,
        Time: PetTime.Day,
        Date: PetDate.Fall
    },
    {
        Location: PetLocation.SkullIsland,
        Time: PetTime.Night,
        Date: PetDate.Monday
    },
    {
        Location: PetLocation.BustedLands,
        Time: PetTime.Day,
        Date: PetDate.Tuesday
    },
    {
        Location: PetLocation.TuskMountain,
        Time: PetTime.Day,
        Date: PetDate.Sunday
    },
    {
        Location: PetLocation.Northrunt,
        Time: PetTime.Night,
        Date: PetDate.Wednesday
    },
    {
        Location: PetLocation.EvernightForest,
        Time: PetTime.Day,
        Date: PetDate.Thursday
    },
    {
        Location: PetLocation.BlackWaterSwamp,
        Time: PetTime.Day,
        Date: PetDate.Friday
    },
    {
        Location: PetLocation.Erogenion,
        Time: PetTime.Any,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.Northrunt,
        Time: PetTime.Any,
        Date: PetDate.December
    },
    {
        Location: PetLocation.SplitCanyon,
        Time: PetTime.Any,
        Date: PetDate.AprilFools
    },
    {
        Location: PetLocation.Erogenion,
        Time: PetTime.Any,
        Date: PetDate.EventEpic
    },
    {
        Location: PetLocation.RottenLands,
        Time: PetTime.Any,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.PlainsOfOzkorr,
        Time: PetTime.Any,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.StumbleSteppe,
        Time: PetTime.Day,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.Gnarogrim,
        Time: PetTime.Night,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.Erogenion,
        Time: PetTime.Day,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.BlackForest,
        Time: PetTime.Day,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.Northrunt,
        Time: PetTime.Night,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.TuskMountain,
        Time: PetTime.Day,
        Date: PetDate.Summer
    },
    {
        Location: PetLocation.BlackWaterSwamp,
        Time: PetTime.Day,
        Date: PetDate.Fall
    },
    {
        Location: PetLocation.SplitCanyon,
        Time: PetTime.Day,
        Date: PetDate.Winter
    },
    {
        Location: PetLocation.Magmaron,
        Time: PetTime.Day,
        Date: PetDate.Spring
    },
    {
        Location: PetLocation.Magmaron,
        Time: PetTime.Night,
        Date: PetDate.Sunday
    },
    {
        Location: PetLocation.Maerwyn,
        Time: PetTime.Day,
        Date: PetDate.Monday
    },
    {
        Location: PetLocation.BustedLands,
        Time: PetTime.Night,
        Date: PetDate.Tuesday
    },
    {
        Location: PetLocation.EvernightForest,
        Time: PetTime.Day,
        Date: PetDate.Wednesday
    },
    {
        Location: PetLocation.RottenLands,
        Time: PetTime.Day,
        Date: PetDate.Thursday
    },
    {
        Location: PetLocation.Maerwyn,
        Time: PetTime.Any,
        Date: PetDate.Easter
    },
    {
        Location: PetLocation.SprawlingJungle,
        Time: PetTime.Any,
        Date: PetDate.Whitsun
    },
    {
        Location: PetLocation.PlainsOfOzkorr,
        Time: PetTime.Any,
        Date: PetDate.EventGold
    },
    {
        Location: PetLocation.StumbleSteppe,
        Time: PetTime.Any,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.GemMine,
        Time: PetTime.Any,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.MoldyForest,
        Time: PetTime.Any,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.Nevermoor,
        Time: PetTime.Day,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.FloodedCaldwell,
        Time: PetTime.Night,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.BlackWaterSwamp,
        Time: PetTime.Night,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.TuskMountain,
        Time: PetTime.Day,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.BustedLands,
        Time: PetTime.Night,
        Date: PetDate.Tuesday
    },
    {
        Location: PetLocation.MoldyForest,
        Time: PetTime.Night,
        Date: PetDate.Fall
    },
    {
        Location: PetLocation.SplitCanyon,
        Time: PetTime.Day,
        Date: PetDate.Monday
    },
    {
        Location: PetLocation.SunburnDesert,
        Time: PetTime.Day,
        Date: PetDate.Spring
    },
    {
        Location: PetLocation.PlainsOfOzkorr,
        Time: PetTime.Day,
        Date: PetDate.Winter
    },
    {
        Location: PetLocation.SprawlingJungle,
        Time: PetTime.Night,
        Date: PetDate.Wednesday
    },
    {
        Location: PetLocation.StumbleSteppe,
        Time: PetTime.Day,
        Date: PetDate.Thursday
    },
    {
        Location: PetLocation.BlackForest,
        Time: PetTime.Day,
        Date: PetDate.Summer
    },
    {
        Location: PetLocation.Magmaron,
        Time: PetTime.Day,
        Date: PetDate.Friday
    },
    {
        Location: PetLocation.EvernightForest,
        Time: PetTime.Night,
        Date: PetDate.Saturday
    },
    {
        Location: PetLocation.MagicShop,
        Time: PetTime.Any,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.Maerwyn,
        Time: PetTime.Any,
        Date: PetDate.EventForest
    },
    {
        Location: PetLocation.FloodedCaldwell,
        Time: PetTime.Any,
        Date: PetDate.Valentine
    },
    {
        Location: PetLocation.EvernightForest,
        Time: PetTime.Any,
        Date: PetDate.NewYear
    },
    {
        Location: PetLocation.SkullIsland,
        Time: PetTime.Any,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.Gnarogrim,
        Time: PetTime.Any,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.Magmaron,
        Time: PetTime.Day,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.SkullIsland,
        Time: PetTime.Day,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.EvernightForest,
        Time: PetTime.Night,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.Northrunt,
        Time: PetTime.Day,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.RottenLands,
        Time: PetTime.Day,
        Date: PetDate.Monday
    },
    {
        Location: PetLocation.TuskMountain,
        Time: PetTime.Night,
        Date: PetDate.Tuesday
    },
    {
        Location: PetLocation.SplitCanyon,
        Time: PetTime.Day,
        Date: PetDate.Wednesday
    },
    {
        Location: PetLocation.FloodedCaldwell,
        Time: PetTime.Day,
        Date: PetDate.Winter
    },
    {
        Location: PetLocation.MoldyForest,
        Time: PetTime.Night,
        Date: PetDate.Thursday
    },
    {
        Location: PetLocation.SkullIsland,
        Time: PetTime.Day,
        Date: PetDate.Friday
    },
    {
        Location: PetLocation.BlackWaterSwamp,
        Time: PetTime.Day,
        Date: PetDate.Saturday
    },
    {
        Location: PetLocation.Erogenion,
        Time: PetTime.Night,
        Date: PetDate.Fall
    },
    {
        Location: PetLocation.SprawlingJungle,
        Time: PetTime.Day,
        Date: PetDate.Summer
    },
    {
        Location: PetLocation.ShadowrockMountain,
        Time: PetTime.Night,
        Date: PetDate.Sunday
    },
    {
        Location: PetLocation.SkullIsland,
        Time: PetTime.Any,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.MagicShop,
        Time: PetTime.Any,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.SkullIsland,
        Time: PetTime.Any,
        Date: PetDate.Birthday
    },
    {
        Location: PetLocation.Toilet,
        Time: PetTime.Any,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.BustedLands,
        Time: PetTime.Any,
        Date: PetDate.Any
    },
    {
        Location: PetLocation.Nevermoor,
        Time: PetTime.Any,
        Date: PetDate.Any
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
    'Can be found in Gnarogrim. <br/>Required: Hall of fame top 1,000 or 50,000 honor when finishing the quest.',
    'Can be found in Busted Lands during XP Event.',
    'Can be found in Rotten Lands on Friday the 13th.',
    'Is rewarded for clearing the 13th dungeon of the Shadow World. <br/>Location: Plains of Oz\'Korr.',
    'Can be found on the last floor of the Shadow Habitat. <br/>Location: Sunburn Desert.',
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
    'Can be found in Erogenion. <br/>Required: Guild hall of fame top 100 or 2,500 honor when finishing the quest.',
    'Can be found in  Northrunt in December.',
    'Can be found in Split Canyon on April Fools\' Day. For real!',
    'Can be found in Erogenion during Epic Event.',
    'Is a reward for clearing the Tower. <br/>Location: Rotten Lands.',
    'Can be found on the last floor of the Light Habitat. <br/>Location: Plains of Oz\'Korr.',
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
    'Can be found in Stumble Steppe. <br/>Required: Fortress hall of fame top 100 or 2,500 honor when finishing the quest.',
    'Can be found in the gem mine. <br/>Required: Mine level 20.',
    'Can be found on the last floor of the Earth Habitat. <br/>Location: Moldy Forest.',
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
    'Is a reward for clearing the single-player Demon Portal. <br/>Location: Skull Island.',
    'Can be found on the last floor of the Fire Habitat. <br/>Location: Gnarogrim.',
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
    'Can be found on Skull Island. <br/>Required: Pets hall of fame top 100 or 4,000 honor when finishing the quest.',
    'Can\'t be found in the wild, but in your local magic shop.',
    'Can be found on Skull Island during the Birthday Event.',
    'Can be found in the Arcane Toilet. <br/>Required: Aura level 20.',
    'Is rewarded for the next quest after clearing dungeon 14. <br/>Location: Busted Lands.',
    'Can be found on the last floor of the Water Habitat. <br/>Location: Nevermoor.'
];
