const PLAYER_CLASS = [
    '',
    'Warrior',
    'Mage',
    'Scout',
    'Assassin',
    'Battle Mage',
    'Berserker'
];

const PLAYER_MOUNT = [
    '',
    '10',
    '20',
    '30',
    '50'
];

function getMirrorPieces (value) {
    return [
        ((value >> 0) & 1) != 0,
        ((value >> 1) & 1) != 0,
        ((value >> 2) & 1) != 0,
        ((value >> 3) & 1) != 0,
        ((value >> 4) & 1) != 0,
        ((value >> 5) & 1) != 0,
        ((value >> 6) & 1) != 0,
        ((value >> 7) & 1) != 0,
        ((value >> 8) & 1) != 0,
        ((value >> 9) & 1) != 0,
        ((value >> 10) & 1) != 0,
        ((value >> 11) & 1) != 0,
        ((value >> 11) & 1) != 0,
        ((value >> 13) & 1) != 0,
        ((value >> 14) & 1) != 0
    ];
}

const POTIONS = [
    '',
    'Strength',
    'Dexterity',
    'Intelligence',
    'Constitution',
    'Luck',
    'Life'
];

const GROUP_ROLES = [
    '',
    'Leader',
    'Officer',
    'Member',
    'Invited'
];

const FORTRESS_BUILDINGS = [
    '',
    'Fortress',
    'Laborers\' Quarters',
    'Woodcutter Guild',
    'Quarry',
    'Gem Mine',
    'Academy',
    'Archery Guild',
    'Barracks',
    'Mages\' Tower',
    'Treasury',
    'Smithy',
    'Fortifications'
];

// Guild Roles
const GUILD_ROLE_NONE = 0;
const GUILD_ROLE_LEADER = 1;
const GUILD_ROLE_OFFICER = 2;
const GUILD_ROLE_MEMBER = 3;
const GUILD_ROLE_INVITED = 4;

// Constants
const SCRAPBOOK_COUNT = 2170;
const ACHIEVEMENT_COUNT = 80;

// Attributes
const ATTRIBUTE_NONE = 0;
const ATTRIBUTE_STRENGTH = 1;
const ATTRIBUTE_DEXTERITY = 2;
const ATTRIBUTE_INTELLIGENCE = 3;
const ATTRIBUTE_CONSTITUTION = 4;
const ATTRIBUTE_LUCK = 5;

// Classes
const CLASS_NONE = 0;
const CLASS_WARRIOR = 1;
const CLASS_MAGE = 2;
const CLASS_SCOUT = 3;
const CLASS_ASSASSIN = 4;
const CLASS_WARLOCK = 5;
const CLASS_BERSERKER = 6;

// Potions
const POTION_NONE = 0;
const POTION_STRENGTH = 1;
const POTION_DEXTERITY = 2;
const POTION_INTELLIGENCE = 3;
const POTION_CONSTITUTION = 4;
const POTION_LUCK = 5;
const POTION_LIFE = 16;

// Potion sizes
const POTION_SMALL = 5;
const POTION_MEDIUM = 15;
const POTION_LARGE = 25;

// Potion variations
const POTION_STRENGTH_SMALL = 1;
const POTION_DEXTERITY_SMALL = 2;
const POTION_INTELLIGENCE_SMALL = 3;
const POTION_CONSTITUTION_SMALL = 4;
const POTION_LUCK_SMALL = 5;
const POTION_STRENGTH_MEDIUM = 6;
const POTION_DEXTERITY_MEDIUM = 7;
const POTION_INTELLIGENCE_MEDIUM = 8;
const POTION_CONSTITUTION_MEDIUM = 9;
const POTION_LUCK_MEDIUM = 10;
const POTION_STRENGTH_LARGE = 11;
const POTION_DEXTERITY_LARGE = 12;
const POTION_INTELLIGENCE_LARGE = 13;
const POTION_CONSTITUTION_LARGE = 14;
const POTION_LUCK_LARGE = 15;
