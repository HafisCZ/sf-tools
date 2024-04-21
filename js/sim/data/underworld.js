const UNDERWORLD_ATTRIBUTE_CURVE = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 47, 53, 58, 65, 71, 76, 83, 90, 97, 103, 108, 114, 120, 126, 132, 139, 145, 152, 159, 167, 174, 179, 185, 191, 198, 206, 212, 220, 227, 232, 239,
    246, 256, 268, 276, 280, 284, 292, 301, 310, 318, 326, 335, 344, 352, 361, 369, 378, 387, 395, 404, 412, 421, 430, 438, 447, 455, 469, 473, 481, 490, 498, 507, 516, 524, 533, 541,
    550, 559, 567, 576, 584, 593, 602, 610, 619, 627, 636, 645, 653, 662, 670, 679, 688, 696, 705, 714, 727, 740, 752, 768, 783, 798, 813, 828, 843, 858, 873, 888, 903, 918, 933, 948,
    963, 978, 993, 1008, 1023, 1038, 1053, 1069, 1084, 1099, 1114, 1129, 1144, 1159, 1174, 1189, 1204, 1219, 1234, 1249, 1264, 1279, 1294, 1309, 1324, 1339, 1354, 1370, 1385, 1400, 1415,
    1430, 1445, 1460, 1475, 1490, 1505, 1520, 1535, 1550, 1565, 1580, 1595, 1610, 1625, 1640, 1655, 1671, 1686, 1701, 1716, 1731, 1746, 1761, 1776, 1791, 1806, 1821, 1836, 1851, 1866,
    1881, 1896, 1911, 1926, 1941, 1956, 1972, 1987, 2002, 2017, 2032, 2047, 2062, 2077, 2092, 2107, 2122, 2137, 2152, 2167, 2182, 2197, 2212, 2227, 2242, 2257, 2273, 2288, 2303, 2318,
    2333, 2348, 2363, 2378, 2393, 2408, 2423, 2438, 2453, 2468, 2483, 2498, 2513, 2528, 2543, 2558, 2574, 2589, 2604, 2619, 2634, 2649, 2664, 2679, 2694, 2709, 2724, 2739, 2754, 2769,
    2784, 2799, 2814, 2829, 2844, 2859, 2875, 2890, 2905, 2920, 2935, 2950, 2965, 2980, 2995, 3010, 3025, 3040, 3055, 3070, 3085, 3100, 3115, 3130, 3145, 3160, 3176, 3191, 3206, 3221,
    3236, 3251, 3266, 3281, 3309, 3375, 3440, 3507, 3574, 3641, 3708, 3777, 3845, 3914, 3983, 4053, 4123, 4193, 4264, 4336, 4407, 4480, 4552, 4625, 4698, 4772, 4846, 4921, 4996, 5071,
    5147, 5224, 5301, 5378, 5475, 5578, 5685, 5794, 5903, 6013, 6123, 6234, 6346, 6458, 6571, 6684, 6798, 6913, 7028, 7155, 7285, 7407, 7527, 7646, 7765, 7885, 8005, 8126, 8248, 8370,
    8493, 8617, 8741, 8865, 8991, 9117, 9243, 9371, 9498, 9627, 9756, 9886, 10016, 10147, 10289, 10448, 10612, 10778, 10946, 11115, 11284, 11455, 11627, 11799, 12216, 12721, 13017,
    13243, 13580, 13821, 13898, 14055, 14239, 14724, 15019, 15351, 15652, 15953, 16254, 16555, 16856, 17157, 17458, 17759, 18060, 18361, 18662, 18963, 19264, 19565, 19866, 20167, 20468,
    20769, 21070, 21371, 21672, 21973, 22661, 22962, 23263, 23564, 24467, 24768, 25069, 25370, 25671, 25972, 26273, 26574, 26875, 27176, 27477, 27778, 28079, 28380, 28681, 28982, 29283,
    29584, 29885, 30186, 30487, 30788, 31089, 31390, 31691, 31992, 32293, 32594, 32895, 33196, 33497, 33798, 34099, 34400, 34701, 35002, 35303, 35604, 35905, 36206, 36507, 36808, 37109,
    37410, 37711, 38012, 38313, 38614, 38915, 39216, 39818, 40119, 40420, 40721, 41022, 41323, 41624, 41925, 42226, 42527, 42828, 43129, 43430, 43731, 44032, 44333, 44634, 44935, 45236,
    45537, 45838, 46139, 46440, 46741, 47042, 47343, 47644, 47945, 48246, 48547, 48848, 49149, 49450, 49751, 50052, 50353, 50654, 50955, 51256, 51557, 51858, 52159, 52460, 53062, 53363,
    53664, 53965, 54266, 54567, 54868, 55169, 55470, 55771, 56072, 56373, 56674, 56975, 57276, 57577, 57878, 58179, 58480, 58781
  ];

const UnderworldUnits = new (class {
    getUnitCount (building, values) {
        if (building == 0) {
            return 0;
        } else if (building - 1 > values.length) {
            return values[values.length - 1];
        } else {
            return values[building - 1];
        }
    }

    getUnitLevel (building, upgrades) {
        return [12, 15, 20, 30, 40, 55, 70, 85, 100, 120, 140, 165, 190, 220, 250][building - 1] + upgrades;
    }

    createUnits (index, building, upgrades, counts, attributeMultiplier, shieldMode) {
        let units = [];

        let count = this.getUnitCount(building, counts);
        let level = this.getUnitLevel(building, upgrades);

        for (let i = 0; i < count; i++) {
            let cappedLevel = Math.min(600, level);

            let attribute = Math.round((level > 500 ? (408.5 * Math.max(0, level - 500) + UNDERWORLD_ATTRIBUTE_CURVE[500]) : UNDERWORLD_ATTRIBUTE_CURVE[level]) * attributeMultiplier);
            let luck = Math.min(49815, Math.ceil(attribute / 2));

            let damage = (cappedLevel + 1) * 2;

            units.push({
                Name: NAME_UNIT_UNDERWORLD[index],
                Level: cappedLevel,
                Class: 1,
                NoBaseDamage: true, // Keep damage even if too low
                NoGladiator: true,
                Armor: cappedLevel * 50,
                BlockChance: shieldMode ? 25 : 0,
                Potions: {
                    Life: 0
                },
                Strength: {
                    Total: attribute
                },
                Dexterity: {
                    Total: attribute
                },
                Intelligence: {
                    Total: attribute
                },
                Constitution: {
                    Total: attribute
                },
                Luck: {
                    Total: luck
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
                        DamageMax: damage,
                        DamageMin: damage,
                        HasEnchantment: false
                    }
                }
            });
        }

        return units;
    }

    fromEditor (data, shieldMode) {
        let goblins = this.createUnits(0, data.GoblinPit, data.GoblinUpgrades, [1, 2, 3, 4, 5], 1 / Math.sqrt(5), shieldMode);
        let trolls = this.createUnits(1, data.TrollBlock, data.TrollUpgrades, [1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 4], 0.5, shieldMode);
        let keepers = this.createUnits(2, data.Keeper, data.KeeperUpgrades, [1], 1, shieldMode);

        return [...goblins, ...trolls, ...keepers];
    }
})();
