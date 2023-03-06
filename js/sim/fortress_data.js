const FORTRESS_WARRIOR_MAP = {
    '0': { class: 1, level: 25, str: 425, dex: 10, int: 10, con: 425, lck: 265, min: 46, max: 90 },
    '1': { class: 1, level: 28, str: 470, dex: 10, int: 10, con: 470, lck: 295, min: 51, max: 100 },
    '2': { class: 1, level: 30, str: 500, dex: 10, int: 10, con: 500, lck: 315, min: 55, max: 107 },
    '3': { class: 1, level: 35, str: 575, dex: 10, int: 10, con: 575, lck: 365, min: 62, max: 125 },
    '4': { class: 1, level: 40, str: 650, dex: 10, int: 10, con: 650, lck: 415, min: 72, max: 142 },
    '5': { class: 1, level: 45, str: 725, dex: 10, int: 10, con: 725, lck: 465, min: 81, max: 159 },
    '6': { class: 1, level: 50, str: 800, dex: 10, int: 10, con: 800, lck: 515, min: 88, max: 177 },
    '7': { class: 1, level: 55, str: 875, dex: 10, int: 10, con: 875, lck: 565, min: 98, max: 194 },
    '8': { class: 1, level: 62, str: 980, dex: 10, int: 10, con: 980, lck: 635, min: 109, max: 218 },
    '9': { class: 1, level: 70, str: 1100, dex: 10, int: 10, con: 1100, lck: 715, min: 124, max: 246 },
    '10': { class: 1, level: 77, str: 1205, dex: 10, int: 10, con: 1205, lck: 785, min: 135, max: 270 },
    '11': { class: 1, level: 85, str: 1325, dex: 10, int: 10, con: 1325, lck: 865, min: 150, max: 298 },
    '12': { class: 1, level: 95, str: 1475, dex: 10, int: 10, con: 1475, lck: 965, min: 166, max: 333 },
    '13': { class: 1, level: 105, str: 1625, dex: 10, int: 10, con: 1625, lck: 1065, min: 185, max: 367 },
    '14': { class: 1, level: 115, str: 1775, dex: 10, int: 10, con: 1775, lck: 1165, min: 202, max: 402 },
    '15': { class: 1, level: 125, str: 1925, dex: 10, int: 10, con: 1925, lck: 1265, min: 218, max: 437 },
    '16': { class: 1, level: 130, str: 2000, dex: 10, int: 10, con: 2000, lck: 1315, min: 228, max: 454 },
    '17': { class: 1, level: 135, str: 2075, dex: 10, int: 10, con: 2075, lck: 1365, min: 237, max: 471 },
    '18': { class: 1, level: 140, str: 2150, dex: 10, int: 10, con: 2150, lck: 1415, min: 244, max: 489 },
    '19': { class: 1, level: 145, str: 2225, dex: 10, int: 10, con: 2225, lck: 1465, min: 254, max: 506 },
    '20': { class: 1, level: 150, str: 2300, dex: 10, int: 10, con: 2300, lck: 1515, min: 263, max: 523 }
};

const FORTRESS_ARCHER_MAP = {
    '0': { class: 3, level: 25, str: 10, dex: 425, int: 10, con: 425, lck: 265, min: 57, max: 112 },
    '1': { class: 3, level: 28, str: 10, dex: 470, int: 10, con: 470, lck: 295, min: 62, max: 125 },
    '2': { class: 3, level: 30, str: 10, dex: 500, int: 10, con: 500, lck: 315, min: 68, max: 135 },
    '3': { class: 3, level: 35, str: 10, dex: 575, int: 10, con: 575, lck: 365, min: 78, max: 156 },
    '4': { class: 3, level: 40, str: 10, dex: 650, int: 10, con: 650, lck: 415, min: 88, max: 177 },
    '5': { class: 3, level: 45, str: 10, dex: 725, int: 10, con: 725, lck: 465, min: 100, max: 199 },
    '6': { class: 3, level: 50, str: 10, dex: 800, int: 10, con: 800, lck: 515, min: 112, max: 221 },
    '7': { class: 3, level: 55, str: 10, dex: 875, int: 10, con: 875, lck: 565, min: 122, max: 242 },
    '8': { class: 3, level: 62, str: 10, dex: 980, int: 10, con: 980, lck: 635, min: 138, max: 273 },
    '9': { class: 3, level: 70, str: 10, dex: 1100, int: 10, con: 1100, lck: 715, min: 155, max: 308 },
    '10': { class: 3, level: 77, str: 10, dex: 1205, int: 10, con: 1205, lck: 785, min: 169, max: 338 },
    '11': { class: 3, level: 85, str: 10, dex: 1325, int: 10, con: 1325, lck: 865, min: 187, max: 372 },
    '12': { class: 3, level: 95, str: 10, dex: 1475, int: 10, con: 1475, lck: 965, min: 208, max: 416 },
    '13': { class: 3, level: 105, str: 10, dex: 1625, int: 10, con: 1625, lck: 1065, min: 230, max: 459 },
    '14': { class: 3, level: 115, str: 10, dex: 1775, int: 10, con: 1775, lck: 1165, min: 252, max: 502 },
    '15': { class: 3, level: 125, str: 10, dex: 1925, int: 10, con: 1925, lck: 1265, min: 273, max: 546 },
    '16': { class: 3, level: 130, str: 10, dex: 2000, int: 10, con: 2000, lck: 1315, min: 285, max: 568 },
    '17': { class: 3, level: 135, str: 10, dex: 2075, int: 10, con: 2075, lck: 1365, min: 295, max: 589 },
    '18': { class: 3, level: 140, str: 10, dex: 2150, int: 10, con: 2150, lck: 1415, min: 306, max: 610 },
    '19': { class: 3, level: 145, str: 10, dex: 2225, int: 10, con: 2225, lck: 1465, min: 317, max: 632 },
    '20': { class: 3, level: 150, str: 10, dex: 2300, int: 10, con: 2300, lck: 1515, min: 328, max: 655 }
};

const FORTRESS_MAGE_MAP = {
    '0': { class: 2, level: 25, str: 10, dex: 10, int: 425, con: 425, lck: 265, min: 101, max: 203 },
    '1': { class: 2, level: 28, str: 10, dex: 10, int: 470, con: 470, lck: 295, min: 113, max: 225 },
    '2': { class: 2, level: 30, str: 10, dex: 10, int: 500, con: 500, lck: 315, min: 122, max: 242 },
    '3': { class: 2, level: 35, str: 10, dex: 10, int: 575, con: 575, lck: 365, min: 140, max: 281 },
    '4': { class: 2, level: 40, str: 10, dex: 10, int: 650, con: 650, lck: 415, min: 160, max: 319 },
    '5': { class: 2, level: 45, str: 10, dex: 10, int: 725, con: 725, lck: 465, min: 179, max: 359 },
    '6': { class: 2, level: 50, str: 10, dex: 10, int: 800, con: 800, lck: 515, min: 200, max: 398 },
    '7': { class: 2, level: 55, str: 10, dex: 10, int: 875, con: 875, lck: 565, min: 218, max: 437 },
    '8': { class: 2, level: 62, str: 10, dex: 10, int: 980, con: 980, lck: 635, min: 247, max: 491 },
    '9': { class: 2, level: 70, str: 10, dex: 10, int: 1100, con: 1100, lck: 715, min: 278, max: 554 },
    '10': { class: 2, level: 77, str: 10, dex: 10, int: 1205, con: 1205, lck: 785, min: 304, max: 608 },
    '11': { class: 2, level: 85, str: 10, dex: 10, int: 1325, con: 1325, lck: 865, min: 335, max: 671 },
    '12': { class: 2, level: 95, str: 10, dex: 10, int: 1475, con: 1475, lck: 965, min: 374, max: 749 },
    '13': { class: 2, level: 105, str: 10, dex: 10, int: 1625, con: 1625, lck: 1065, min: 413, max: 827 },
    '14': { class: 2, level: 115, str: 10, dex: 10, int: 1775, con: 1775, lck: 1165, min: 452, max: 902 },
    '15': { class: 2, level: 125, str: 10, dex: 10, int: 1925, con: 1925, lck: 1265, min: 491, max: 983 },
    '16': { class: 2, level: 130, str: 10, dex: 10, int: 2000, con: 2000, lck: 1315, min: 512, max: 1022 },
    '17': { class: 2, level: 135, str: 10, dex: 10, int: 2075, con: 2075, lck: 1365, min: 530, max: 1061 },
    '18': { class: 2, level: 140, str: 10, dex: 10, int: 2150, con: 2225, lck: 1415, min: 550, max: 1099 },
    '19': { class: 2, level: 145, str: 10, dex: 10, int: 2225, con: 2225, lck: 1465, min: 569, max: 1139 },
    '20': { class: 2, level: 150, str: 10, dex: 10, int: 2300, con: 2300, lck: 1515, min: 590, max: 1178 }
};

const FORTRESS_WALL_MAP = {
    '0': { class: 1, level: 1, str: 65, dex: 15, int: 15, con: 195, lck: 0, min: 4, max: 7 },
    '1': { class: 1, level: 10, str: 200, dex: 60, int: 60, con: 600, lck: 0, min: 20, max: 38 },
    '2': { class: 1, level: 18, str: 320, dex: 100, int: 100, con: 960, lck: 0, min: 34, max: 65 },
    '3': { class: 1, level: 25, str: 425, dex: 135, int: 135, con: 1275, lck: 0, min: 46, max: 90 },
    '4': { class: 1, level: 29, str: 485, dex: 155, int: 155, con: 1455, lck: 0, min: 52, max: 104 },
    '5': { class: 1, level: 35, str: 575, dex: 185, int: 185, con: 1725, lck: 0, min: 62, max: 125 },
    '6': { class: 1, level: 40, str: 650, dex: 210, int: 210, con: 1950, lck: 0, min: 72, max: 142 },
    '7': { class: 1, level: 50, str: 800, dex: 260, int: 260, con: 2400, lck: 0, min: 88, max: 177 },
    '8': { class: 1, level: 62, str: 980, dex: 320, int: 320, con: 2940, lck: 0, min: 109, max: 218 },
    '9': { class: 1, level: 76, str: 1190, dex: 390, int: 390, con: 3570, lck: 0, min: 134, max: 267 },
    '10': { class: 1, level: 88, str: 1370, dex: 450, int: 450, con: 4110, lck: 0, min: 155, max: 308 },
    '11': { class: 1, level: 102, str: 1580, dex: 520, int: 520, con: 4740, lck: 0, min: 179, max: 356 },
    '12': { class: 1, level: 118, str: 1820, dex: 600, int: 600, con: 5460, lck: 0, min: 207, max: 412 },
    '13': { class: 1, level: 135, str: 2075, dex: 685, int: 685, con: 6225, lck: 0, min: 237, max: 471 },
    '14': { class: 1, level: 153, str: 2345, dex: 775, int: 775, con: 7035, lck: 0, min: 268, max: 533 },
    '15': { class: 1, level: 170, str: 2600, dex: 860, int: 860, con: 7800, lck: 0, min: 296, max: 593 },
    '16': { class: 1, level: 180, str: 2750, dex: 910, int: 910, con: 8250, lck: 0, min: 315, max: 627 },
    '17': { class: 1, level: 185, str: 2825, dex: 935, int: 935, con: 8475, lck: 0, min: 322, max: 645 },
    '18': { class: 1, level: 190, str: 2900, dex: 960, int: 960, con: 8700, lck: 0, min: 332, max: 662 },
    '19': { class: 1, level: 195, str: 2975, dex: 985, int: 985, con: 8925, lck: 0, min: 341, max: 679 },
    '20': { class: 1, level: 200, str: 3050, dex: 1010, int: 1010, con: 9150, lck: 0, min: 348, max: 697 }
};

const FortressUnits = new (class {
    createData (tier, source, isWall = false) {
        const { class: klass, level, str, dex, int, con, lck, min, max } = source[tier];

        return {
            Level: level,
            Class: klass,
            NoBaseDamage: true,
            Armor: level * CONFIG.fromIndex(klass).MaximumDamageReduction,
            BlockChance: isWall ? 0 : undefined,
            Potions: {
                Life: 0
            },
            Strength: {
                Total: str
            },
            Dexterity: {
                Total: dex
            },
            Intelligence: {
                Total: int
            },
            Constitution: {
                Total: con
            },
            Luck: {
                Total: lck
            },
            Dungeons: {
                Player: 0,
                Group: 0
            },
            Runes: {
                Health: 0,
                ResistanceFire: 0,
                ResistanceCold: 0,
                ResistanceLightning: 0
            },
            Fortress: {
                Gladiator: 0
            },
            Items: {
                Hand: {},
                Wpn1: {
                    AttributeTypes: { 2: 0 },
                    Attributes: { 2: 0 },
                    DamageMax: min,
                    DamageMin: max,
                    HasEnchantment: false
                }
            }
        }
    }

    createFortification (level) {
        if (level > 0) {
            return [
                this.createData(level, FORTRESS_WALL_MAP, true)
            ];
        } else {
            return [];
        }
    }

    createUnits (length, level, source) {
        return Array.from({ length }).map(() => this.createData(level, source));
    }

    fromEditor (data) {
        return {
            player: this.createUnits(data.WarriorCount, data.WarriorLevel, FORTRESS_WARRIOR_MAP),
            target: [
                ...this.createFortification(data.FortificationsLevel),
                ...this.createUnits(data.ArcherCount, data.ArcherLevel, FORTRESS_ARCHER_MAP),
                ...this.createUnits(data.MageCount, data.MageLevel, FORTRESS_MAGE_MAP)
            ]
        }
    }
})();
