const DEFAULT_SETTINGS = {
  "level-enabled": 0,
  "level-difference": 1,
  "level-min": 275,
  "level-req": 300,
  "scrapbook-enabled": 1,
  "scrapbook-difference": 1,
  "scrapbook-min": 75,
  "scrapbook-req": 90,
  "mount-enabled": 1,
  "mount-min": 1,
  "mount-req": 4,
  "achievements-enabled": 0,
  "achievements-difference": 0,
  "achievements-min": 40,
  "achievements-req": 60,
  "potions-enabled": 1,
  "potions-min": 1,
  "potions-req": 3,
  "treasure-enabled": 0,
  "treasure-difference": 1,
  "treasure-min": 10,
  "treasure-req": 40,
  "instructor-enabled": 0,
  "instructor-difference": 1,
  "instructor-min": 10,
  "instructor-req": 40,
  "pet-enabled": 1,
  "pet-difference": 1,
  "pet-min": 250,
  "pet-req": 350,
  "knights-enabled": 1,
  "knights-difference": 1,
  "knights-min": 13,
  "knights-req": 15,
  "fortress-enabled": 0,
  "fortress-difference": 0,
  "fortress-min": 15,
  "fortress-req": 20,
  "show-class": 0,
  "show-id": 0,
  "show-rank": 0,
  "show-achievements": 1,
  "show-hydra": 1,
  "show-book-style": 0,
  "show-treasure": 1,
  "show-instructor": 1,
  "show-pet": 1,
  "show-knights": 1,
  "show-knights-style": 0
};

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
