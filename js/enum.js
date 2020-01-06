const DEFAULT_SETTINGS =
{
  "level-enabled": 0,
  "level-difference": 1,
  "level-min": 0,
  "level-req": 0,
  "scrapbook-enabled": 0,
  "scrapbook-difference": 1,
  "scrapbook-min": 0,
  "scrapbook-req": 0,
  "mount-enabled": 0,
  "mount-min": 0,
  "mount-req": 0,
  "achievements-enabled": 0,
  "achievements-difference": 0,
  "achievements-min": 0,
  "achievements-req": 0,
  "potions-enabled": 0,
  "potions-min": 0,
  "potions-req": 0,
  "treasure-enabled": 0,
  "treasure-difference": 1,
  "treasure-min": 0,
  "treasure-req": 0,
  "instructor-enabled": 0,
  "instructor-difference": 1,
  "instructor-min": 0,
  "instructor-req": 0,
  "pet-enabled": 0,
  "pet-difference": 1,
  "pet-min": 0,
  "pet-req": 0,
  "knights-enabled": 0,
  "knights-difference": 1,
  "knights-min": 0,
  "knights-req": 0,
  "fortress-enabled": 0,
  "fortress-difference": 1,
  "fortress-min": 0,
  "fortress-req": 0,
  "gemmine-enabled": 0,
  "gemmine-difference": 1,
  "gemmine-min": 0,
  "gemmine-req": 0,
  "fortressupgrades-enabled": 0,
  "fortressupgrades-difference": 1,
  "fortressupgrades-min": 0,
  "fortressupgrades-req": 0,
  "fortresshonor-difference": 1,
  "show-class": 0,
  "show-id": 0,
  "show-rank": 0,
  "show-role": 0,
  "show-achievements": 1,
  "show-hydra": 1,
  "show-book-style": 0,
  "show-treasure": 1,
  "show-fortress-honor": 1,
  "show-instructor": 1,
  "show-fortress-upgrades": 1,
  "show-pet": 1,
  "show-gemmine": 0,
  "show-knights": 2,
  "show-fortress": 0,
  "show-group": 0,
  "show-difference-style": 0
}

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
    '10%',
    '20%',
    '30%',
    '50%'
];

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
