/*
    Shakes & Fidget Battle Simulator
    - Implementation by mar21 (c) 2019 HIRAISHIN SOFTWARE

    - All dungeon values are from https://www.4m7.de/

    Features:
    - Any number of players (companions) & enemies (works with both 1v1 and guild fights)
    - Rune damage & resistances
*/

const WARRIOR = 'warrior';
const SCOUT = 'scout';
const MAGE = 'mage';
const BATTLEMAGE = 'battlemage';
const ASSASSIN = 'assassin';
const BERSERKER = 'berserker';

function rand (successChance) {
    if (successChance) {
        return Math.random() * 100 < successChance;
    } else {
        return false;
    }
}

/*
    clear(); runBattleAnalytic([ new EntityModel(TEST_MODEL) ], [ new EntityModel(toModel(DUNGEONS.DUNGEON[17][11])) ], 1);
*/

function toModel (preset) {
    let base = 2 * DAMAGE_BASE[Math.min(97, Math.trunc(preset.enemy_level / 5))] * (preset.enemy_class === WARRIOR ? 0.4 : (preset.enemy_class === SCOUT ? 0.56 : 0.8));
    return {
        class: preset.enemy_class,
        level: preset.enemy_level,
        str: preset.strength,
        dex: preset.dexterity,
        int: preset.intelligence,
        con: preset.constitution,
        lck: preset.luck,
        // armor: { },
        damage: {
            min: base * 0.5,
            max: base * 1.5,
            fire: 0,
            cold: 0,
            lightning: 0
        },
        healthbonus: 0,
        damagebonus: 0,
        lifepotion: false,
        gladiator: 0,
        runehealth: 0,
        enchantcrit: false,
        enchatdamage: false
    }
}

const TEST_MODEL = {
    class: BATTLEMAGE,
    level: 345,
    str: 19076,
    dex: 7569,
    int: 7452,
    con: 18249,
    lck: 13914,
    armor: {
        normal: 4363,
        total: 29,
        fire: 0,
        cold: 0,
        lightning: 0
    },
    damage: {
        min: 611,
        max: 1021,
        fire: 0,
        cold: 13,
        lightning: 0
    },
    healthbonus: 35,
    damagebonus: 32,
    lifepotion: true,
    gladiator: 11,
    runehealth: 0,
    enchantcrit: true,
    enchantquick: true
};

const EMPTY_MODEL = {
    class: WARRIOR,
    level: 0,
    str: 0,
    dex: 0,
    int: 0,
    con: 0,
    lck: 0,
    armor: {
        normal: 0,
        total: 0,
        fire: 0,
        cold: 0,
        lightning: 0
    },
    damage: {
        min: 0,
        max: 0,
        fire: 0,
        cold: 0,
        lightning: 0
    },
    healthbonus: 0,
    damagebonus: 0,
    lifepotion: false,
    gladiator: 0,
    runehealth: 0,
    enchantcrit: false,
    enchantquick: false
};

class EntityModel {
    // Create entity model from model
    constructor (model) {
        this.model = model;
    }

    // Create copy of entity model
    copy () {
        return new EntityModel(this.model);
    }

    // Critical chance against leveled oponent
    getCritChance (target) {
        return Math.min(50, this.model.lck * 2.5 / target.model.level);
    }

    // Critical damage multiplier
    getCritMult () {
        return 2 + 0.05 * this.model.gladiator + (this.model.enchantcrit ? 0.05 : 0);
    }

    // Damage min max
    getDamageRange (target) {
        // Target resistance
        let targetResistances = target.getResistances(this);

        // Base damage resistance
        let nMult = 1 - targetResistances.normal / 100;

        // Elemental resistances
        let fMult = nMult * (1 - targetResistances.fire / 100) * (this.model.damage.fire / 100);
        let cMult = nMult * (1 - targetResistances.cold / 100) * (this.model.damage.cold / 100);
        let lMult = nMult * (1 - targetResistances.lightning / 100) * (this.model.damage.lightning / 100);

        // Damage multiplier from dungeon
        let bMult = 1 + this.model.damagebonus / 100;

        // Base damage multiplier
        let base = bMult * (nMult + fMult + cMult + lMult);

        if (this.model.class === WARRIOR || this.model.class === BERSERKER || this.model.class === BATTLEMAGE) {
            base *= (1 + Math.max(this.model.str / 2, this.model.str - target.model.str / 2)) / 10;
        } else if (this.model.class === MAGE) {
            base *= (1 + Math.max(this.model.int / 2, this.model.int - target.model.int / 2)) / 10;
        } else if (this.model.class === SCOUT) {
            base *= (1 + Math.max(this.model.dex / 2, this.model.dex - target.model.dex / 2)) / 10;
        } else if (this.model.class === ASSASSIN) {
            base *= 1.25 * (1 + Math.max(this.model.dex / 2, this.model.dex - target.model.dex / 2)) / 10;
        }

        return {
            min: this.model.damage.min * base,
            max: this.model.damage.max * base + 1
        }
    }

    // Health
    getHealth () {
        let base = (1 + this.model.level) * this.model.con * (1 + this.model.healthbonus / 100) * (1 + this.model.runehealth / 100);
        if (this.model.lifepotion) {
            base *= 1.25;
        }

        switch (this.model.class) {
            case WARRIOR:
            case BERSERKER:
            case BATTLEMAGE:
                return base * 5;
            case ASSASSIN:
            case SCOUT:
                return base * 4;
            case MAGE:
                return base * 2;
        }
    }

    // Calculate damage resistance from leveled opponent
    getApproxResistance (attacker) {
        let res = 50 * this.model.level / attacker.model.level;
        switch (this.model.class) {
            case WARRIOR: return Math.min(50, res);
            case BERSERKER: return Math.min(25, res / 2);
            case BATTLEMAGE: return Math.min(50, 40 + res / 5);
            case SCOUT:
            case ASSASSIN: return Math.min(25, res);
            case MAGE: return Math.min(10, res / 5)
        }
    }

    // Get resistances
    getResistances (attacker) {
        if (!this.model.armor) {
            return {
                normal: this.getApproxResistance(attacker),
                fire: 0,
                cold: 0,
                lightning: 0
            }
        }

        let normal = 0;
        switch (this.model.class) {
            case WARRIOR:
            {
                normal = Math.min(50, this.model.armor.normal / attacker.model.level);
                break;
            }
            case BERSERKER:
            {
                normal = Math.min(25, this.model.armor.normal / attacker.model.level / 2);
                break;
            }
            case BATTLEMAGE:
            {
                normal = Math.min(50, 40 + this.model.armor.normal / attacker.model.level);
                break;
            }
            case SCOUT:
            case ASSASSIN:
            {
                normal = Math.min(25, this.model.armor.normal / attacker.model.level);
                break;
            }
            case MAGE:
            {
                normal = Math.min(10, this.model.armor.normal / attacker.model.level);
                break;
            }
        }

        return {
            normal: normal,
            fire: this.model.armor.total + this.model.armor.fire,
            cold: this.model.armor.total + this.model.armor.cold,
            lightning: this.model.armor.total + this.model.armor.lightning
        }
    }

    // Fireball damage of battlemages
    getSpecialDamage (target) {
        if (this.model.class === BATTLEMAGE && (target.model.class != MAGE || target.model.class != BATTLEMAGE)) {
            return Math.min(target.getHealth(), this.getHealth()) / 3;
        } else {
            return 0;
        }
    }

    // Chance to attack twice in a row
    getSecondAttackChance () {
        return this.model.class === BERSERKER ? 50 : 0;
    }

    // Chance to skip incoming damage
    getSkipChance (attacker) {
        if (attacker.model.class === MAGE) {
            return 0;
        } else {
            switch (this.model.class) {
                case WARRIOR:
                    return 25;
                case SCOUT:
                case ASSASSIN:
                    return 50;
                default:
                    return 0;
            }
        }
    }
}

function runBattleAnalytic (groupA, groupB, samples = 100000) {
    let result = {
        samples: samples,
        wins: 0,
        averageHP: 0
    };

    for (let i = 0; i < samples; i++) {
        let hp = runBattle(groupA.map(a => a.copy()), groupB.map(b => b.copy()));
        result.wins += (hp <= 0 ? 1 : 0);
        result.averageHP += Math.max(0, hp);
    }

    result.averageHP /= result.samples;

    return result;
}

function runBattle (groupA, groupB) {
    while (groupA.length && groupA.length) {
        // Pick the first entity from both groups
        let a = groupA[0];
        let b = groupB[0];

        // Add health to entities if they start fresh
        if (!b.health) b.health = b.getHealth();
        if (!a.health) a.health = a.getHealth();

        // Deal initial damage to enemies if they deal any
        if (!rand(a.getSkipChance(b))) {
            a.health -= b.getSpecialDamage(a);
        }

        if (!rand(b.getSkipChance(a))) {
            b.health -= a.getSpecialDamage(b);
        }

        // Set damage ranges
        a.range = a.getDamageRange(b);
        b.range = b.getDamageRange(a);

        // Decide who starts first in a duel
        let aStrikeFirst = true;
        if (a.model.enchantquick && b.model.enchantquick) {
            aStrikeFirst = rand(50);
        } else if (b.model.enchantquick) {
            aStrikeFirst = false;
        }

        // Duel data
        let data = {
            attacks: 0,
            hits: 0,
            damagemult: 1
        }

        // Fight until any is dead
        while (a.health > 0 && b.health > 0) {
            if (aStrikeFirst) {
                runAttack(a, b, data);
                if (rand(a.getSecondAttackChance())) {
                    runAttack(a, b, data);
                }

                if (b.health < 0) {
                    break;
                } else {
                    runAttack(b, a, data);
                    if (rand(b.getSecondAttackChance())) {
                        runAttack(b, a, data);
                    }
                }
            } else {
                runAttack(b, a, data);
                if (rand(b.getSecondAttackChance())) {
                    runAttack(b, a, data);
                }

                if (a.health < 0) {
                    break;
                } else {
                    runAttack(a, b, data);
                    if (rand(a.getSecondAttackChance())) {
                        runAttack(a, b, data);
                    }
                }
            }
        }

        // Remove dead entities from queue
        if (a.health < 0) {
            groupA.shift();
        }

        if (b.health < 0) {
            groupB.shift();
        }

        // Win condition
        if (!groupA.length || !groupB.length) {
            return b.health / b.getHealth();
        }
    }
}

function formatNumber (num) {
    return num.toString().split('').map((n, i, a) => (((a.length - i - 1) % 3 == 2 && i != 0) ? ` ${n}` : `${n}`)).join('');
}

function runAttack (attacker, target, data) {
    // Roll chances
    let skipRoll = rand(target.getSkipChance(attacker));
    let critRoll = rand(attacker.getCritChance(target));

    // Fight parameters
    let damage = (attacker.range.min + Math.random() * (1 + attacker.range.max - attacker.range.min)) * (critRoll ? attacker.getCritMult() : 1) * (skipRoll ? 0 : 1) * data.damagemult;

    // Sub damage from target health
    target.health -= damage;

    // Scale damage with more hits are dealt
    data.attacks++;
    data.hits += skipRoll ? 0 : 1;

    if (data.hits > 4) {
        data.damagemult *= 1.4;
    }

    if (data.hits > 12) {
        data.hits = 0;
    }
}

const DAMAGE_BASE = [
    0, 0, 20, 25, 35, 60, 75, 85, 90, 100, 120, 130, 140, 150, 165, 175, 185, 195, 205, 215, 225, 235, 250, 260, 270, 280, 300, 310, 320, 330, 340, 350, 365, 380, 400, 420, 430, 440, 455, 470, 480, 490, 500, 505, 515, 535, 540, 550, 560, 570, 575, 590, 600, 620, 630, 675, 715, 750, 765, 780, 825, 880, 900, 915, 925, 950, 980, 1025, 1045, 1065, 1080, 1105, 1150, 1175, 1200, 1280, 1310, 1330, 1350, 1375, 1400, 1425, 1500, 1530, 1560, 1585, 1630, 1670, 1700, 1725, 1755, 1795, 1820, 1850, 1880, 1920, 1970, 2000
];

const DUNGEONS = {
  'TOWER': {
    '1': {
      'enemy_name': 'Living Cake Man',
      'enemy_level': 200,
      'enemy_class': 'warrior',
      'strength': 4194,
      'dexterity': 1697,
      'intelligence': 1665,
      'constitution': 15940,
      'luck': 2589,
      'health': 16019700
    },
    '2': {
      'enemy_name': 'Green Fairy Drinkerbell',
      'enemy_level': 202,
      'enemy_class': 'mage',
      'strength': 1714,
      'dexterity': 1678,
      'intelligence': 4242,
      'constitution': 16140,
      'luck': 2622,
      'health': 6552840
    },
    '3': {
      'enemy_name': 'Tinvalid',
      'enemy_level': 204,
      'enemy_class': 'scout',
      'strength': 1730,
      'dexterity': 4292,
      'intelligence': 1695,
      'constitution': 16328,
      'luck': 2654,
      'health': 13388960
    },
    '4': {
      'enemy_name': 'Harmless Teddy Bear',
      'enemy_level': 206,
      'enemy_class': 'warrior',
      'strength': 4340,
      'dexterity': 1746,
      'intelligence': 1715,
      'constitution': 16512,
      'luck': 2690,
      'health': 17089920
    },
    '5': {
      'enemy_name': 'Flowerlina',
      'enemy_level': 208,
      'enemy_class': 'warrior',
      'strength': 4385,
      'dexterity': 1763,
      'intelligence': 1733,
      'constitution': 16712,
      'luck': 2726,
      'health': 17464040
    },
    '6': {
      'enemy_name': 'Tooth Fairy',
      'enemy_level': 210,
      'enemy_class': 'mage',
      'strength': 1782,
      'dexterity': 1747,
      'intelligence': 4434,
      'constitution': 16896,
      'luck': 2757,
      'health': 7130112
    },
    '7': {
      'enemy_name': 'Ugly Chick',
      'enemy_level': 212,
      'enemy_class': 'warrior',
      'strength': 4482,
      'dexterity': 1794,
      'intelligence': 1766,
      'constitution': 17100,
      'luck': 2790,
      'health': 18211500
    },
    '8': {
      'enemy_name': 'Warbling Birdie',
      'enemy_level': 214,
      'enemy_class': 'mage',
      'strength': 1813,
      'dexterity': 1787,
      'intelligence': 4529,
      'constitution': 17284,
      'luck': 2822,
      'health': 7432120
    },
    '9': {
      'enemy_name': 'Well-Meaning Fairy',
      'enemy_level': 216,
      'enemy_class': 'mage',
      'strength': 1828,
      'dexterity': 1800,
      'intelligence': 4578,
      'constitution': 17484,
      'luck': 2858,
      'health': 7588056
    },
    '10': {
      'enemy_name': 'Trickeribook\'s Cheatinchild',
      'enemy_level': 218,
      'enemy_class': 'warrior',
      'strength': 4627,
      'dexterity': 1847,
      'intelligence': 1818,
      'constitution': 17680,
      'luck': 2891,
      'health': 19359600
    },
    '11': {
      'enemy_name': 'Singing Dumpling',
      'enemy_level': 220,
      'enemy_class': 'mage',
      'strength': 1861,
      'dexterity': 1835,
      'intelligence': 4674,
      'constitution': 17860,
      'luck': 2927,
      'health': 7894120
    },
    '12': {
      'enemy_name': 'Puppeteer\'s Right',
      'enemy_level': 222,
      'enemy_class': 'mage',
      'strength': 1878,
      'dexterity': 1855,
      'intelligence': 4723,
      'constitution': 18064,
      'luck': 2957,
      'health': 8056544
    },
    '13': {
      'enemy_name': 'Grinning Cat',
      'enemy_level': 224,
      'enemy_class': 'warrior',
      'strength': 4771,
      'dexterity': 1898,
      'intelligence': 1869,
      'constitution': 18244,
      'luck': 2991,
      'health': 20524500
    },
    '14': {
      'enemy_name': 'Ambitious Frog',
      'enemy_level': 226,
      'enemy_class': 'warrior',
      'strength': 4820,
      'dexterity': 1909,
      'intelligence': 1887,
      'constitution': 18440,
      'luck': 3027,
      'health': 20929400
    },
    '15': {
      'enemy_name': 'Pinociwhatsit',
      'enemy_level': 228,
      'enemy_class': 'warrior',
      'strength': 4870,
      'dexterity': 1928,
      'intelligence': 1907,
      'constitution': 18620,
      'luck': 3060,
      'health': 21319900
    },
    '16': {
      'enemy_name': '3x3 Wishes',
      'enemy_level': 230,
      'enemy_class': 'mage',
      'strength': 1943,
      'dexterity': 1921,
      'intelligence': 4914,
      'constitution': 18824,
      'luck': 3094,
      'health': 8696688
    },
    '17': {
      'enemy_name': 'Bootlegged Puss',
      'enemy_level': 232,
      'enemy_class': 'warrior',
      'strength': 4964,
      'dexterity': 1962,
      'intelligence': 1940,
      'constitution': 19020,
      'luck': 3126,
      'health': 22158300
    },
    '18': {
      'enemy_name': 'Dotty from Kansas',
      'enemy_level': 234,
      'enemy_class': 'scout',
      'strength': 1977,
      'dexterity': 5012,
      'intelligence': 1957,
      'constitution': 19204,
      'luck': 3160,
      'health': 18051760
    },
    '19': {
      'enemy_name': 'The Last Airgazer',
      'enemy_level': 236,
      'enemy_class': 'warrior',
      'strength': 5059,
      'dexterity': 1993,
      'intelligence': 1975,
      'constitution': 19392,
      'luck': 3198,
      'health': 22979520
    },
    '20': {
      'enemy_name': 'A Rabbit and a Hedgehog',
      'enemy_level': 238,
      'enemy_class': 'scout',
      'strength': 2009,
      'dexterity': 5109,
      'intelligence': 1991,
      'constitution': 19584,
      'luck': 3230,
      'health': 18722304
    },
    '21': {
      'enemy_name': 'Holger Nilsson',
      'enemy_level': 240,
      'enemy_class': 'warrior',
      'strength': 5157,
      'dexterity': 2024,
      'intelligence': 2009,
      'constitution': 19780,
      'luck': 3262,
      'health': 23834900
    },
    '22': {
      'enemy_name': 'High-Spirited Ghost',
      'enemy_level': 242,
      'enemy_class': 'warrior',
      'strength': 5206,
      'dexterity': 2043,
      'intelligence': 2028,
      'constitution': 19960,
      'luck': 3295,
      'health': 24251400
    },
    '23': {
      'enemy_name': 'Blood-Red Riding Hood',
      'enemy_level': 244,
      'enemy_class': 'warrior',
      'strength': 5252,
      'dexterity': 2058,
      'intelligence': 2042,
      'constitution': 20160,
      'luck': 3330,
      'health': 24696000
    },
    '24': {
      'enemy_name': 'Snowflake',
      'enemy_level': 246,
      'enemy_class': 'warrior',
      'strength': 5302,
      'dexterity': 2077,
      'intelligence': 2061,
      'constitution': 20360,
      'luck': 3362,
      'health': 25144600
    },
    '25': {
      'enemy_name': 'Star Money',
      'enemy_level': 248,
      'enemy_class': 'mage',
      'strength': 2090,
      'dexterity': 2078,
      'intelligence': 5348,
      'constitution': 20544,
      'luck': 3398,
      'health': 10230912
    },
    '26': {
      'enemy_name': 'Miss Match',
      'enemy_level': 250,
      'enemy_class': 'scout',
      'strength': 2109,
      'dexterity': 5398,
      'intelligence': 2098,
      'constitution': 20728,
      'luck': 3430,
      'health': 20810912
    },
    '27': {
      'enemy_name': 'Ice Queen',
      'enemy_level': 252,
      'enemy_class': 'scout',
      'strength': 2139,
      'dexterity': 5448,
      'intelligence': 2128,
      'constitution': 20944,
      'luck': 3477,
      'health': 21195328
    },
    '28': {
      'enemy_name': 'Badly Raised Boys',
      'enemy_level': 254,
      'enemy_class': 'warrior',
      'strength': 5498,
      'dexterity': 2173,
      'intelligence': 2162,
      'constitution': 21160,
      'luck': 3522,
      'health': 26979000
    },
    '29': {
      'enemy_name': 'Lambikins and Fishy',
      'enemy_level': 256,
      'enemy_class': 'warrior',
      'strength': 5549,
      'dexterity': 2207,
      'intelligence': 2198,
      'constitution': 21356,
      'luck': 3567,
      'health': 27442460
    },
    '30': {
      'enemy_name': 'Donkey Shot',
      'enemy_level': 258,
      'enemy_class': 'warrior',
      'strength': 5596,
      'dexterity': 2241,
      'intelligence': 2228,
      'constitution': 21572,
      'luck': 3613,
      'health': 27935740
    },
    '31': {
      'enemy_name': 'Street Thief with Monkey',
      'enemy_level': 260,
      'enemy_class': 'warrior',
      'strength': 5646,
      'dexterity': 2275,
      'intelligence': 2263,
      'constitution': 21792,
      'luck': 3657,
      'health': 28438560
    },
    '32': {
      'enemy_name': 'Alice in Wonder',
      'enemy_level': 262,
      'enemy_class': 'mage',
      'strength': 2306,
      'dexterity': 2296,
      'intelligence': 5695,
      'constitution': 21992,
      'luck': 3705,
      'health': 11567792
    },
    '33': {
      'enemy_name': 'Penterabbit',
      'enemy_level': 264,
      'enemy_class': 'warrior',
      'strength': 5744,
      'dexterity': 2340,
      'intelligence': 2331,
      'constitution': 22204,
      'luck': 3751,
      'health': 29420300
    },
    '34': {
      'enemy_name': 'Dynamic Peter',
      'enemy_level': 266,
      'enemy_class': 'warrior',
      'strength': 5796,
      'dexterity': 2377,
      'intelligence': 2362,
      'constitution': 22412,
      'luck': 3794,
      'health': 29920020
    },
    '35': {
      'enemy_name': 'Foolish Princess',
      'enemy_level': 268,
      'enemy_class': 'warrior',
      'strength': 5846,
      'dexterity': 2405,
      'intelligence': 2396,
      'constitution': 22628,
      'luck': 3840,
      'health': 30434660
    },
    '36': {
      'enemy_name': 'Pleasure Addict',
      'enemy_level': 270,
      'enemy_class': 'scout',
      'strength': 2442,
      'dexterity': 5894,
      'intelligence': 2430,
      'constitution': 22828,
      'luck': 3885,
      'health': 24745552
    },
    '37': {
      'enemy_name': 'Amnastasia Rubliovka',
      'enemy_level': 272,
      'enemy_class': 'scout',
      'strength': 2472,
      'dexterity': 5945,
      'intelligence': 2465,
      'constitution': 23044,
      'luck': 3934,
      'health': 25164048
    },
    '38': {
      'enemy_name': 'Useless Livestock',
      'enemy_level': 274,
      'enemy_class': 'warrior',
      'strength': 5995,
      'dexterity': 2507,
      'intelligence': 2498,
      'constitution': 23264,
      'luck': 3975,
      'health': 31988000
    },
    '39': {
      'enemy_name': 'Humpty Dumpty',
      'enemy_level': 276,
      'enemy_class': 'warrior',
      'strength': 6046,
      'dexterity': 2538,
      'intelligence': 2531,
      'constitution': 23452,
      'luck': 4022,
      'health': 32481020
    },
    '40': {
      'enemy_name': 'King Chinbeard',
      'enemy_level': 278,
      'enemy_class': 'warrior',
      'strength': 6092,
      'dexterity': 2572,
      'intelligence': 2566,
      'constitution': 23668,
      'luck': 4069,
      'health': 33016860
    },
    '41': {
      'enemy_name': 'Sandman',
      'enemy_level': 280,
      'enemy_class': 'mage',
      'strength': 2609,
      'dexterity': 2597,
      'intelligence': 6144,
      'constitution': 23872,
      'luck': 4113,
      'health': 13416064
    },
    '42': {
      'enemy_name': 'John or Tom?',
      'enemy_level': 282,
      'enemy_class': 'mage',
      'strength': 2638,
      'dexterity': 2632,
      'intelligence': 6195,
      'constitution': 24088,
      'luck': 4161,
      'health': 13633808
    },
    '43': {
      'enemy_name': 'Scarecrow',
      'enemy_level': 284,
      'enemy_class': 'warrior',
      'strength': 6245,
      'dexterity': 2671,
      'intelligence': 2668,
      'constitution': 24292,
      'luck': 4203,
      'health': 34616100
    },
    '44': {
      'enemy_name': 'Mirrored Fool',
      'enemy_level': 286,
      'enemy_class': 'scout',
      'strength': 2704,
      'dexterity': 6293,
      'intelligence': 2700,
      'constitution': 24508,
      'luck': 4252,
      'health': 28135184
    },
    '45': {
      'enemy_name': 'Three Little Pigs',
      'enemy_level': 288,
      'enemy_class': 'scout',
      'strength': 2738,
      'dexterity': 6346,
      'intelligence': 2731,
      'constitution': 24716,
      'luck': 4294,
      'health': 28571696
    },
    '46': {
      'enemy_name': 'Goose in Luck',
      'enemy_level': 290,
      'enemy_class': 'warrior',
      'strength': 6396,
      'dexterity': 2771,
      'intelligence': 2765,
      'constitution': 6231,
      'luck': 4340,
      'health': 36264420
    },
    '47': {
      'enemy_name': 'Simpleminded Chicken Thief',
      'enemy_level': 292,
      'enemy_class': 'scout',
      'strength': 2806,
      'dexterity': 6442,
      'intelligence': 2802,
      'constitution': 25132,
      'luck': 4386,
      'health': 29454704
    },
    '48': {
      'enemy_name': 'Baba Yaga',
      'enemy_level': 294,
      'enemy_class': 'mage',
      'strength': 2841,
      'dexterity': 2832,
      'intelligence': 6492,
      'constitution': 25344,
      'luck': 4431,
      'health': 14952960
    },
    '49': {
      'enemy_name': 'Merlin',
      'enemy_level': 296,
      'enemy_class': 'mage',
      'strength': 2870,
      'dexterity': 2867,
      'intelligence': 6543,
      'constitution': 25556,
      'luck': 4479,
      'health': 15180264
    },
    '50': {
      'enemy_name': 'Julio and Romy',
      'enemy_level': 298,
      'enemy_class': 'warrior',
      'strength': 6593,
      'dexterity': 2905,
      'intelligence': 2902,
      'constitution': 25764,
      'luck': 4523,
      'health': 38517180
    },
    '51': {
      'enemy_name': 'Prince in Shepherd\'s Skin',
      'enemy_level': 300,
      'enemy_class': 'warrior',
      'strength': 6640,
      'dexterity': 2937,
      'intelligence': 2932,
      'constitution': 25976,
      'luck': 4569,
      'health': 39093880
    },
    '52': {
      'enemy_name': 'Robin the Redistributor',
      'enemy_level': 302,
      'enemy_class': 'scout',
      'strength': 2974,
      'dexterity': 6711,
      'intelligence': 2971,
      'constitution': 26224,
      'luck': 4611,
      'health': 31783488
    },
    '53': {
      'enemy_name': 'Ali the Sesame Opener',
      'enemy_level': 304,
      'enemy_class': 'warrior',
      'strength': 6776,
      'dexterity': 3010,
      'intelligence': 3013,
      'constitution': 26464,
      'luck': 4654,
      'health': 40357600
    },
    '54': {
      'enemy_name': 'Freshly Dressed Emperor',
      'enemy_level': 306,
      'enemy_class': 'mage',
      'strength': 3048,
      'dexterity': 3053,
      'intelligence': 6840,
      'constitution': 26728,
      'luck': 4697,
      'health': 16410992
    },
    '55': {
      'enemy_name': 'Dumbo',
      'enemy_level': 308,
      'enemy_class': 'warrior',
      'strength': 6906,
      'dexterity': 3089,
      'intelligence': 3091,
      'constitution': 26964,
      'luck': 4741,
      'health': 41659380
    },
    '56': {
      'enemy_name': 'Hansel and Gretel',
      'enemy_level': 310,
      'enemy_class': 'warrior',
      'strength': 6973,
      'dexterity': 3121,
      'intelligence': 3132,
      'constitution': 27220,
      'luck': 4784,
      'health': 42327100
    },
    '57': {
      'enemy_name': 'Bear Fear',
      'enemy_level': 312,
      'enemy_class': 'warrior',
      'strength': 7040,
      'dexterity': 3160,
      'intelligence': 3173,
      'constitution': 27456,
      'luck': 4828,
      'health': 42968640
    },
    '58': {
      'enemy_name': 'Pokerhontas',
      'enemy_level': 314,
      'enemy_class': 'scout',
      'strength': 3196,
      'dexterity': 7105,
      'intelligence': 3212,
      'constitution': 27708,
      'luck': 4875,
      'health': 34912080
    },
    '59': {
      'enemy_name': 'Mass Fly Murderer',
      'enemy_level': 316,
      'enemy_class': 'mage',
      'strength': 3236,
      'dexterity': 3250,
      'intelligence': 7173,
      'constitution': 27948,
      'luck': 4915,
      'health': 17719032
    },
    '60': {
      'enemy_name': 'Cinderella',
      'enemy_level': 318,
      'enemy_class': 'warrior',
      'strength': 7240,
      'dexterity': 3270,
      'intelligence': 3291,
      'constitution': 28196,
      'luck': 4958,
      'health': 44972620
    },
    '61': {
      'enemy_name': 'The Enchanting Genie',
      'enemy_level': 320,
      'enemy_class': 'warrior',
      'strength': 7303,
      'dexterity': 3309,
      'intelligence': 3331,
      'constitution': 28448,
      'luck': 5005,
      'health': 45659040
    },
    '62': {
      'enemy_name': 'Bronycorn',
      'enemy_level': 322,
      'enemy_class': 'warrior',
      'strength': 7370,
      'dexterity': 3348,
      'intelligence': 3368,
      'constitution': 28692,
      'luck': 5043,
      'health': 46337580
    },
    '63': {
      'enemy_name': 'Hulda the Cloud Fairy',
      'enemy_level': 324,
      'enemy_class': 'warrior',
      'strength': 7436,
      'dexterity': 3382,
      'intelligence': 3409,
      'constitution': 7236,
      'luck': 5088,
      'health': 47034000
    },
    '64': {
      'enemy_name': 'Leprechore',
      'enemy_level': 326,
      'enemy_class': 'scout',
      'strength': 3422,
      'dexterity': 7501,
      'intelligence': 3448,
      'constitution': 29188,
      'luck': 5132,
      'health': 38177904
    },
    '65': {
      'enemy_name': 'Robber Hopsenplops',
      'enemy_level': 328,
      'enemy_class': 'warrior',
      'strength': 7567,
      'dexterity': 3458,
      'intelligence': 3487,
      'constitution': 29436,
      'luck': 5177,
      'health': 48422220
    },
    '66': {
      'enemy_name': 'Thorny Lion',
      'enemy_level': 330,
      'enemy_class': 'warrior',
      'strength': 7634,
      'dexterity': 3495,
      'intelligence': 3528,
      'constitution': 29696,
      'luck': 5217,
      'health': 49146880
    },
    '67': {
      'enemy_name': 'Aquirella the Dazzler',
      'enemy_level': 332,
      'enemy_class': 'scout',
      'strength': 3532,
      'dexterity': 7700,
      'intelligence': 3567,
      'constitution': 29936,
      'luck': 5262,
      'health': 39874752
    },
    '68': {
      'enemy_name': 'Prince Charming',
      'enemy_level': 334,
      'enemy_class': 'mage',
      'strength': 3568,
      'dexterity': 3609,
      'intelligence': 7768,
      'constitution': 30188,
      'luck': 5305,
      'health': 20225960
    },
    '69': {
      'enemy_name': 'B. O. Wolf',
      'enemy_level': 336,
      'enemy_class': 'warrior',
      'strength': 7833,
      'dexterity': 3609,
      'intelligence': 3645,
      'constitution': 30424,
      'luck': 5347,
      'health': 51264440
    },
    '70': {
      'enemy_name': 'Peter the Wolf',
      'enemy_level': 338,
      'enemy_class': 'warrior',
      'strength': 7900,
      'dexterity': 3641,
      'intelligence': 3687,
      'constitution': 30676,
      'luck': 5392,
      'health': 51995820
    },
    '71': {
      'enemy_name': 'Beautiful Princess',
      'enemy_level': 340,
      'enemy_class': 'warrior',
      'strength': 7967,
      'dexterity': 3680,
      'intelligence': 3729,
      'constitution': 30912,
      'luck': 5436,
      'health': 52704960
    },
    '72': {
      'enemy_name': 'Fearless Wanderer',
      'enemy_level': 342,
      'enemy_class': 'warrior',
      'strength': 8031,
      'dexterity': 3717,
      'intelligence': 3764,
      'constitution': 31168,
      'luck': 5480,
      'health': 53453120
    },
    '73': {
      'enemy_name': 'Red&White Forever',
      'enemy_level': 344,
      'enemy_class': 'mage',
      'strength': 3756,
      'dexterity': 3805,
      'intelligence': 8101,
      'constitution': 31408,
      'luck': 5523,
      'health': 21671520
    },
    '74': {
      'enemy_name': 'Friendly Snowman',
      'enemy_level': 346,
      'enemy_class': 'warrior',
      'strength': 8167,
      'dexterity': 3790,
      'intelligence': 3845,
      'constitution': 31656,
      'luck': 5566,
      'health': 54923160
    },
    '75': {
      'enemy_name': 'Parsifal',
      'enemy_level': 348,
      'enemy_class': 'warrior',
      'strength': 8229,
      'dexterity': 3829,
      'intelligence': 3886,
      'constitution': 31908,
      'luck': 5611,
      'health': 55679460
    },
    '76': {
      'enemy_name': 'Brother Barfly',
      'enemy_level': 350,
      'enemy_class': 'warrior',
      'strength': 8297,
      'dexterity': 3868,
      'intelligence': 3923,
      'constitution': 32152,
      'luck': 5651,
      'health': 56426760
    },
    '77': {
      'enemy_name': 'King Arthur',
      'enemy_level': 352,
      'enemy_class': 'warrior',
      'strength': 8541,
      'dexterity': 3976,
      'intelligence': 4007,
      'constitution': 33072,
      'luck': 5767,
      'health': 58372080
    },
    '78': {
      'enemy_name': 'Sigi Musclehead',
      'enemy_level': 354,
      'enemy_class': 'warrior',
      'strength': 8787,
      'dexterity': 4088,
      'intelligence': 4093,
      'constitution': 33976,
      'luck': 5881,
      'health': 60307400
    },
    '79': {
      'enemy_name': 'The Pied Piper of Jamelin',
      'enemy_level': 356,
      'enemy_class': 'scout',
      'strength': 4199,
      'dexterity': 9029,
      'intelligence': 4175,
      'constitution': 34896,
      'luck': 5997,
      'health': 49831488
    },
    '80': {
      'enemy_name': 'The Guys from Oz',
      'enemy_level': 358,
      'enemy_class': 'warrior',
      'strength': 9274,
      'dexterity': 4313,
      'intelligence': 4256,
      'constitution': 35824,
      'luck': 6107,
      'health': 64304080
    },
    '81': {
      'enemy_name': '\'Little\' John',
      'enemy_level': 360,
      'enemy_class': 'warrior',
      'strength': 9996,
      'dexterity': 4642,
      'intelligence': 4556,
      'constitution': 38556,
      'luck': 6534,
      'health': 69593584
    },
    '82': {
      'enemy_name': 'The Easter Bunny',
      'enemy_level': 362,
      'enemy_class': 'warrior',
      'strength': 10761,
      'dexterity': 4999,
      'intelligence': 4877,
      'constitution': 41494,
      'luck': 6989,
      'health': 75311608
    },
    '83': {
      'enemy_name': 'Honey Robbear',
      'enemy_level': 364,
      'enemy_class': 'warrior',
      'strength': 11583,
      'dexterity': 5380,
      'intelligence': 5215,
      'constitution': 44629,
      'luck': 7466,
      'health': 81447928
    },
    '84': {
      'enemy_name': 'Shirk the Ogre',
      'enemy_level': 366,
      'enemy_class': 'warrior',
      'strength': 12460,
      'dexterity': 5781,
      'intelligence': 5578,
      'constitution': 47979,
      'luck': 7980,
      'health': 88041464
    },
    '85': {
      'enemy_name': 'Cozy Bear',
      'enemy_level': 368,
      'enemy_class': 'warrior',
      'strength': 13397,
      'dexterity': 6214,
      'intelligence': 5957,
      'constitution': 51532,
      'luck': 8525,
      'health': 95076544
    },
    '86': {
      'enemy_name': 'Number Nip',
      'enemy_level': 370,
      'enemy_class': 'mage',
      'strength': 6418,
      'dexterity': 6128,
      'intelligence': 13843,
      'constitution': 53238,
      'luck': 8758,
      'health': 39502596
    },
    '87': {
      'enemy_name': 'Three Hungry Bears',
      'enemy_level': 372,
      'enemy_class': 'warrior',
      'strength': 14300,
      'dexterity': 6632,
      'intelligence': 6299,
      'constitution': 54963,
      'luck': 8991,
      'health': 102505992
    },
    '88': {
      'enemy_name': 'Seven Hostages',
      'enemy_level': 374,
      'enemy_class': 'warrior',
      'strength': 14765,
      'dexterity': 6840,
      'intelligence': 6470,
      'constitution': 56701,
      'luck': 9233,
      'health': 106314376
    },
    '89': {
      'enemy_name': 'Seven Dwarfs',
      'enemy_level': 376,
      'enemy_class': 'warrior',
      'strength': 15233,
      'dexterity': 7059,
      'intelligence': 6649,
      'constitution': 58485,
      'luck': 9478,
      'health': 110244224
    },
    '90': {
      'enemy_name': 'Respectable Dragon Slayer',
      'enemy_level': 378,
      'enemy_class': 'warrior',
      'strength': 15716,
      'dexterity': 7280,
      'intelligence': 6822,
      'constitution': 60298,
      'luck': 9716,
      'health': 114264712
    },
    '91': {
      'enemy_name': 'Ducat Donkey',
      'enemy_level': 380,
      'enemy_class': 'warrior',
      'strength': 16203,
      'dexterity': 7500,
      'intelligence': 7506,
      'constitution': 62140,
      'luck': 9973,
      'health': 118376704
    },
    '92': {
      'enemy_name': 'Bean Counter',
      'enemy_level': 382,
      'enemy_class': 'warrior',
      'strength': 16700,
      'dexterity': 7729,
      'intelligence': 7192,
      'constitution': 16000,
      'luck': 10226,
      'health': 122561912
    },
    '93': {
      'enemy_name': 'Happy Dragon',
      'enemy_level': 384,
      'enemy_class': 'warrior',
      'strength': 17199,
      'dexterity': 7961,
      'intelligence': 7373,
      'constitution': 65914,
      'luck': 10493,
      'health': 126884448
    },
    '94': {
      'enemy_name': 'Shockheaded Jack',
      'enemy_level': 386,
      'enemy_class': 'warrior',
      'strength': 17717,
      'dexterity': 8198,
      'intelligence': 7566,
      'constitution': 67861,
      'luck': 10748,
      'health': 131311032
    },
    '95': {
      'enemy_name': 'Papa Frost',
      'enemy_level': 388,
      'enemy_class': 'warrior',
      'strength': 18240,
      'dexterity': 8432,
      'intelligence': 7758,
      'constitution': 69809,
      'luck': 11021,
      'health': 135778512
    },
    '96': {
      'enemy_name': 'Dream Couple',
      'enemy_level': 390,
      'enemy_class': 'warrior',
      'strength': 18767,
      'dexterity': 8678,
      'intelligence': 7954,
      'constitution': 71816,
      'luck': 11296,
      'health': 140400288
    },
    '97': {
      'enemy_name': 'Three Ghosts',
      'enemy_level': 392,
      'enemy_class': 'warrior',
      'strength': 19306,
      'dexterity': 8927,
      'intelligence': 8151,
      'constitution': 73848,
      'luck': 11569,
      'health': 145111328
    },
    '98': {
      'enemy_name': 'Sleepy Princess',
      'enemy_level': 394,
      'enemy_class': 'warrior',
      'strength': 19856,
      'dexterity': 9175,
      'intelligence': 8354,
      'constitution': 75919,
      'luck': 11850,
      'health': 149940032
    },
    '99': {
      'enemy_name': 'Nanobot Porridge',
      'enemy_level': 396,
      'enemy_class': 'warrior',
      'strength': 20413,
      'dexterity': 9432,
      'intelligence': 8564,
      'constitution': 78007,
      'luck': 12138,
      'health': 154843888
    },
    '100': {
      'enemy_name': 'Barbpunzel',
      'enemy_level': 398,
      'enemy_class': 'warrior',
      'strength': 20977,
      'dexterity': 9686,
      'intelligence': 8769,
      'constitution': 80151,
      'luck': 12429,
      'health': 159901248
    }
  },
  'DUNGEON': {
    '1': {
      '1': {
        'enemy_name': 'Ghost',
        'enemy_level': 10,
        'enemy_class': 'mage',
        'strength': 48,
        'dexterity': 52,
        'intelligence': 104,
        'constitution': 77,
        'luck': 47,
        'health': 1694
      },
      '2': {
        'enemy_name': 'Skeleton',
        'enemy_level': 12,
        'enemy_class': 'warrior',
        'strength': 120,
        'dexterity': 68,
        'intelligence': 59,
        'constitution': 101,
        'luck': 51,
        'health': 6565
      },
      '3': {
        'enemy_name': 'Undead',
        'enemy_level': 14,
        'enemy_class': 'warrior',
        'strength': 149,
        'dexterity': 78,
        'intelligence': 69,
        'constitution': 124,
        'luck': 65,
        'health': 9300
      },
      '4': {
        'enemy_name': 'Devious Vampire',
        'enemy_level': 16,
        'enemy_class': 'scout',
        'strength': 84,
        'dexterity': 195,
        'intelligence': 83,
        'constitution': 131,
        'luck': 94,
        'health': 8908
      },
      '5': {
        'enemy_name': 'Night Ghoul',
        'enemy_level': 18,
        'enemy_class': 'warrior',
        'strength': 214,
        'dexterity': 135,
        'intelligence': 122,
        'constitution': 260,
        'luck': 142,
        'health': 16055
      },
      '6': {
        'enemy_name': 'Banshee',
        'enemy_level': 22,
        'enemy_class': 'mage',
        'strength': 97,
        'dexterity': 99,
        'intelligence': 303,
        'constitution': 198,
        'luck': 137,
        'health': 9108
      },
      '7': {
        'enemy_name': 'Skeleton Soldier',
        'enemy_level': 26,
        'enemy_class': 'warrior',
        'strength': 359,
        'dexterity': 135,
        'intelligence': 122,
        'constitution': 260,
        'luck': 142,
        'health': 35100
      },
      '8': {
        'enemy_name': 'Voodoo Master',
        'enemy_level': 30,
        'enemy_class': 'mage',
        'strength': 126,
        'dexterity': 130,
        'intelligence': 460,
        'constitution': 279,
        'luck': 193,
        'health': 17298
      },
      '9': {
        'enemy_name': 'Flesh Golem',
        'enemy_level': 40,
        'enemy_class': 'warrior',
        'strength': 614,
        'dexterity': 207,
        'intelligence': 191,
        'constitution': 445,
        'luck': 238,
        'health': 91225
      },
      '10': {
        'enemy_name': 'Lord of Darkness',
        'enemy_level': 50,
        'enemy_class': 'scout',
        'strength': 221,
        'dexterity': 847,
        'intelligence': 213,
        'constitution': 561,
        'luck': 292,
        'health': 114444
      }
    },
    '2': {
      '1': {
        'enemy_name': 'Water Glompf',
        'enemy_level': 20,
        'enemy_class': 'scout',
        'strength': 101,
        'dexterity': 264,
        'intelligence': 101,
        'constitution': 174,
        'luck': 119,
        'health': 14616
      },
      '2': {
        'enemy_name': 'Yeti',
        'enemy_level': 24,
        'enemy_class': 'warrior',
        'strength': 317,
        'dexterity': 126,
        'intelligence': 117,
        'constitution': 238,
        'luck': 130,
        'health': 29750
      },
      '3': {
        'enemy_name': 'Skeleton',
        'enemy_level': 28,
        'enemy_class': 'warrior',
        'strength': 393,
        'dexterity': 138,
        'intelligence': 125,
        'constitution': 284,
        'luck': 152,
        'health': 41180
      },
      '4': {
        'enemy_name': 'Ugly Gremlin',
        'enemy_level': 34,
        'enemy_class': 'scout',
        'strength': 143,
        'dexterity': 554,
        'intelligence': 144,
        'constitution': 303,
        'luck': 216,
        'health': 42420
      },
      '5': {
        'enemy_name': 'Stone Giant',
        'enemy_level': 38,
        'enemy_class': 'warrior',
        'strength': 592,
        'dexterity': 178,
        'intelligence': 162,
        'constitution': 398,
        'luck': 195,
        'health': 77610
      },
      '6': {
        'enemy_name': 'Fire Elemental',
        'enemy_level': 44,
        'enemy_class': 'mage',
        'strength': 191,
        'dexterity': 190,
        'intelligence': 780,
        'constitution': 411,
        'luck': 259,
        'health': 36990
      },
      '7': {
        'enemy_name': 'Stone Troll',
        'enemy_level': 48,
        'enemy_class': 'warrior',
        'strength': 744,
        'dexterity': 243,
        'intelligence': 230,
        'constitution': 563,
        'luck': 246,
        'health': 137935
      },
      '8': {
        'enemy_name': 'Redlight Succubus',
        'enemy_level': 56,
        'enemy_class': 'scout',
        'strength': 250,
        'dexterity': 960,
        'intelligence': 240,
        'constitution': 680,
        'luck': 345,
        'health': 155040
      },
      '9': {
        'enemy_name': 'Abhorrent Demon',
        'enemy_level': 66,
        'enemy_class': 'scout',
        'strength': 300,
        'dexterity': 1160,
        'intelligence': 290,
        'constitution': 880,
        'luck': 420,
        'health': 235840
      },
      '10': {
        'enemy_name': 'Hell Beast',
        'enemy_level': 70,
        'enemy_class': 'warrior',
        'strength': 1240,
        'dexterity': 385,
        'intelligence': 360,
        'constitution': 960,
        'luck': 340,
        'health': 340800
      }
    },
    '3': {
      '1': {
        'enemy_name': 'Sewer Rat',
        'enemy_level': 32,
        'enemy_class': 'scout',
        'strength': 155,
        'dexterity': 486,
        'intelligence': 161,
        'constitution': 276,
        'luck': 205,
        'health': 36432
      },
      '2': {
        'enemy_name': 'Dusty Bat',
        'enemy_level': 36,
        'enemy_class': 'scout',
        'strength': 141,
        'dexterity': 602,
        'intelligence': 149,
        'constitution': 344,
        'luck': 230,
        'health': 50912
      },
      '3': {
        'enemy_name': 'Terror Tarantula',
        'enemy_level': 42,
        'enemy_class': 'scout',
        'strength': 205,
        'dexterity': 726,
        'intelligence': 224,
        'constitution': 403,
        'luck': 247,
        'health': 69316
      },
      '4': {
        'enemy_name': 'Rowdy Robber',
        'enemy_level': 46,
        'enemy_class': 'warrior',
        'strength': 768,
        'dexterity': 215,
        'intelligence': 183,
        'constitution': 539,
        'luck': 249,
        'health': 126665
      },
      '5': {
        'enemy_name': 'Dirty Rotten Scoundrel',
        'enemy_level': 54,
        'enemy_class': 'warrior',
        'strength': 920,
        'dexterity': 265,
        'intelligence': 240,
        'constitution': 640,
        'luck': 260,
        'health': 176000
      },
      '6': {
        'enemy_name': 'Grim Wolf',
        'enemy_level': 60,
        'enemy_class': 'scout',
        'strength': 270,
        'dexterity': 1040,
        'intelligence': 260,
        'constitution': 760,
        'luck': 375,
        'health': 185400
      },
      '7': {
        'enemy_name': 'Bad Bandit',
        'enemy_level': 64,
        'enemy_class': 'warrior',
        'strength': 1120,
        'dexterity': 340,
        'intelligence': 315,
        'constitution': 840,
        'luck': 310,
        'health': 273000
      },
      '8': {
        'enemy_name': 'Beastie',
        'enemy_level': 76,
        'enemy_class': 'scout',
        'strength': 350,
        'dexterity': 1360,
        'intelligence': 340,
        'constitution': 1080,
        'luck': 495,
        'health': 332640
      },
      '9': {
        'enemy_name': 'Grave Robber',
        'enemy_level': 86,
        'enemy_class': 'warrior',
        'strength': 1560,
        'dexterity': 505,
        'intelligence': 480,
        'constitution': 1280,
        'luck': 420,
        'health': 556800
      },
      '10': {
        'enemy_name': 'Robber Chief',
        'enemy_level': 90,
        'enemy_class': 'warrior',
        'strength': 1640,
        'dexterity': 535,
        'intelligence': 510,
        'constitution': 1360,
        'luck': 440,
        'health': 618800
      }
    },
    '4': {
      '1': {
        'enemy_name': 'Wind Elemental',
        'enemy_level': 52,
        'enemy_class': 'scout',
        'strength': 230,
        'dexterity': 880,
        'intelligence': 220,
        'constitution': 601,
        'luck': 315,
        'health': 127412
      },
      '2': {
        'enemy_name': 'Pirate Dark Beard',
        'enemy_level': 58,
        'enemy_class': 'scout',
        'strength': 260,
        'dexterity': 1000,
        'intelligence': 250,
        'constitution': 720,
        'luck': 360,
        'health': 169920
      },
      '3': {
        'enemy_name': 'Rowdy Robber',
        'enemy_level': 62,
        'enemy_class': 'warrior',
        'strength': 1080,
        'dexterity': 325,
        'intelligence': 300,
        'constitution': 800,
        'luck': 300,
        'health': 252000
      },
      '4': {
        'enemy_name': 'Shadow Alligator',
        'enemy_level': 68,
        'enemy_class': 'warrior',
        'strength': 1200,
        'dexterity': 370,
        'intelligence': 345,
        'constitution': 920,
        'luck': 330,
        'health': 317400
      },
      '5': {
        'enemy_name': 'Sturdy Swashbuckler',
        'enemy_level': 74,
        'enemy_class': 'warrior',
        'strength': 1320,
        'dexterity': 415,
        'intelligence': 390,
        'constitution': 1040,
        'luck': 360,
        'health': 390000
      },
      '6': {
        'enemy_name': 'Mean Monster Rabbit',
        'enemy_level': 82,
        'enemy_class': 'scout',
        'strength': 380,
        'dexterity': 1480,
        'intelligence': 370,
        'constitution': 1200,
        'luck': 540,
        'health': 398400
      },
      '7': {
        'enemy_name': 'Cutthroat',
        'enemy_level': 84,
        'enemy_class': 'warrior',
        'strength': 1520,
        'dexterity': 490,
        'intelligence': 465,
        'constitution': 1240,
        'luck': 410,
        'health': 527000
      },
      '8': {
        'enemy_name': 'Pirate Blood Nose',
        'enemy_level': 96,
        'enemy_class': 'warrior',
        'strength': 1760,
        'dexterity': 580,
        'intelligence': 555,
        'constitution': 1480,
        'luck': 470,
        'health': 717800
      },
      '9': {
        'enemy_name': 'Octopus',
        'enemy_level': 102,
        'enemy_class': 'scout',
        'strength': 480,
        'dexterity': 1880,
        'intelligence': 470,
        'constitution': 1600,
        'luck': 690,
        'health': 659200
      },
      '10': {
        'enemy_name': 'Pirate Leader',
        'enemy_level': 110,
        'enemy_class': 'scout',
        'strength': 520,
        'dexterity': 2040,
        'intelligence': 510,
        'constitution': 1760,
        'luck': 750,
        'health': 781440
      }
    },
    '5': {
      '1': {
        'enemy_name': 'Rattling Cobra',
        'enemy_level': 72,
        'enemy_class': 'scout',
        'strength': 330,
        'dexterity': 1280,
        'intelligence': 320,
        'constitution': 1000,
        'luck': 465,
        'health': 292000
      },
      '2': {
        'enemy_name': 'Slashing Saurus',
        'enemy_level': 78,
        'enemy_class': 'scout',
        'strength': 360,
        'dexterity': 1400,
        'intelligence': 350,
        'constitution': 1120,
        'luck': 510,
        'health': 353920
      },
      '3': {
        'enemy_name': 'Roaring Raptor',
        'enemy_level': 80,
        'enemy_class': 'scout',
        'strength': 370,
        'dexterity': 1440,
        'intelligence': 360,
        'constitution': 1160,
        'luck': 525,
        'health': 375840
      },
      '4': {
        'enemy_name': 'Swamp Warrior',
        'enemy_level': 88,
        'enemy_class': 'scout',
        'strength': 410,
        'dexterity': 1600,
        'intelligence': 400,
        'constitution': 1320,
        'luck': 585,
        'health': 469920
      },
      '5': {
        'enemy_name': 'Green Rex',
        'enemy_level': 94,
        'enemy_class': 'warrior',
        'strength': 1720,
        'dexterity': 565,
        'intelligence': 540,
        'constitution': 1440,
        'luck': 460,
        'health': 684000
      },
      '6': {
        'enemy_name': 'Saurus Rogue',
        'enemy_level': 100,
        'enemy_class': 'scout',
        'strength': 470,
        'dexterity': 1840,
        'intelligence': 460,
        'constitution': 1560,
        'luck': 675,
        'health': 630240
      },
      '7': {
        'enemy_name': 'Swamp Dragon',
        'enemy_level': 108,
        'enemy_class': 'warrior',
        'strength': 2000,
        'dexterity': 670,
        'intelligence': 645,
        'constitution': 1720,
        'luck': 530,
        'health': 937400
      },
      '8': {
        'enemy_name': 'Swamp Gorgon',
        'enemy_level': 114,
        'enemy_class': 'mage',
        'strength': 520,
        'dexterity': 540,
        'intelligence': 2200,
        'constitution': 1760,
        'luck': 775,
        'health': 404800
      },
      '9': {
        'enemy_name': 'Toxic Dragon',
        'enemy_level': 122,
        'enemy_class': 'warrior',
        'strength': 2280,
        'dexterity': 775,
        'intelligence': 750,
        'constitution': 2000,
        'luck': 600,
        'health': 1230000
      },
      '10': {
        'enemy_name': 'King Saurus',
        'enemy_level': 130,
        'enemy_class': 'scout',
        'strength': 620,
        'dexterity': 2440,
        'intelligence': 610,
        'constitution': 2160,
        'luck': 900,
        'health': 1131840
      }
    },
    '6': {
      '1': {
        'enemy_name': 'Toxic Tree',
        'enemy_level': 92,
        'enemy_class': 'warrior',
        'strength': 1680,
        'dexterity': 550,
        'intelligence': 525,
        'constitution': 1400,
        'luck': 450,
        'health': 651000
      },
      '2': {
        'enemy_name': 'Ugly Gremlin',
        'enemy_level': 98,
        'enemy_class': 'scout',
        'strength': 460,
        'dexterity': 1800,
        'intelligence': 450,
        'constitution': 1520,
        'luck': 660,
        'health': 601920
      },
      '3': {
        'enemy_name': 'Rabid Wolf',
        'enemy_level': 104,
        'enemy_class': 'mage',
        'strength': 470,
        'dexterity': 490,
        'intelligence': 2000,
        'constitution': 1560,
        'luck': 700,
        'health': 327600
      },
      '4': {
        'enemy_name': 'Slime Blob',
        'enemy_level': 106,
        'enemy_class': 'scout',
        'strength': 500,
        'dexterity': 1960,
        'intelligence': 490,
        'constitution': 1680,
        'luck': 720,
        'health': 719040
      },
      '5': {
        'enemy_name': 'Greenish Gremlin',
        'enemy_level': 118,
        'enemy_class': 'scout',
        'strength': 560,
        'dexterity': 2200,
        'intelligence': 520,
        'constitution': 1920,
        'luck': 810,
        'health': 913920
      },
      '6': {
        'enemy_name': 'Infected Brown Bear',
        'enemy_level': 124,
        'enemy_class': 'warrior',
        'strength': 2320,
        'dexterity': 790,
        'intelligence': 765,
        'constitution': 2040,
        'luck': 610,
        'health': 1275000
      },
      '7': {
        'enemy_name': 'Greedy Gremlin',
        'enemy_level': 128,
        'enemy_class': 'scout',
        'strength': 610,
        'dexterity': 2400,
        'intelligence': 600,
        'constitution': 2120,
        'luck': 885,
        'health': 1093920
      },
      '8': {
        'enemy_name': 'Swamp Muncher',
        'enemy_level': 136,
        'enemy_class': 'mage',
        'strength': 630,
        'dexterity': 650,
        'intelligence': 2640,
        'constitution': 2200,
        'luck': 940,
        'health': 602800
      },
      '9': {
        'enemy_name': 'Cruel Gremlin',
        'enemy_level': 144,
        'enemy_class': 'scout',
        'strength': 690,
        'dexterity': 2720,
        'intelligence': 680,
        'constitution': 2440,
        'luck': 1005,
        'health': 1415200
      },
      '10': {
        'enemy_name': 'Terrible Toxic Gremlin',
        'enemy_level': 150,
        'enemy_class': 'scout',
        'strength': 720,
        'dexterity': 2840,
        'intelligence': 710,
        'constitution': 2560,
        'luck': 1050,
        'health': 1546240
      }
    },
    '7': {
      '1': {
        'enemy_name': 'Fire Scorpion',
        'enemy_level': 112,
        'enemy_class': 'scout',
        'strength': 530,
        'dexterity': 2080,
        'intelligence': 520,
        'constitution': 1800,
        'luck': 765,
        'health': 813600
      },
      '2': {
        'enemy_name': 'Fire Basilisk',
        'enemy_level': 116,
        'enemy_class': 'scout',
        'strength': 550,
        'dexterity': 2160,
        'intelligence': 540,
        'constitution': 1880,
        'luck': 795,
        'health': 879840
      },
      '3': {
        'enemy_name': 'Lava Blob',
        'enemy_level': 120,
        'enemy_class': 'mage',
        'strength': 550,
        'dexterity': 570,
        'intelligence': 2320,
        'constitution': 1880,
        'luck': 820,
        'health': 454960
      },
      '4': {
        'enemy_name': 'Lava Giant',
        'enemy_level': 126,
        'enemy_class': 'warrior',
        'strength': 2360,
        'dexterity': 805,
        'intelligence': 780,
        'constitution': 2080,
        'luck': 620,
        'health': 1320800
      },
      '5': {
        'enemy_name': 'Dragon of Darkness',
        'enemy_level': 134,
        'enemy_class': 'warrior',
        'strength': 2520,
        'dexterity': 865,
        'intelligence': 840,
        'constitution': 2240,
        'luck': 660,
        'health': 1512000
      },
      '6': {
        'enemy_name': 'Hell Cyclops',
        'enemy_level': 138,
        'enemy_class': 'warrior',
        'strength': 2600,
        'dexterity': 895,
        'intelligence': 870,
        'constitution': 2320,
        'luck': 680,
        'health': 1612400
      },
      '7': {
        'enemy_name': 'Fire Elemental',
        'enemy_level': 142,
        'enemy_class': 'mage',
        'strength': 660,
        'dexterity': 680,
        'intelligence': 2760,
        'constitution': 2320,
        'luck': 985,
        'health': 663520
      },
      '8': {
        'enemy_name': 'Lava Giant',
        'enemy_level': 146,
        'enemy_class': 'warrior',
        'strength': 2760,
        'dexterity': 955,
        'intelligence': 930,
        'constitution': 2480,
        'luck': 720,
        'health': 1822800
      },
      '9': {
        'enemy_name': 'Giant Dragon',
        'enemy_level': 148,
        'enemy_class': 'warrior',
        'strength': 2800,
        'dexterity': 970,
        'intelligence': 945,
        'constitution': 2520,
        'luck': 730,
        'health': 1877400
      },
      '10': {
        'enemy_name': 'Ghost of the Volcano',
        'enemy_level': 170,
        'enemy_class': 'warrior',
        'strength': 3240,
        'dexterity': 1135,
        'intelligence': 1110,
        'constitution': 2960,
        'luck': 840,
        'health': 2530800
      }
    },
    '8': {
      '1': {
        'enemy_name': 'Yeti',
        'enemy_level': 132,
        'enemy_class': 'warrior',
        'strength': 2480,
        'dexterity': 850,
        'intelligence': 825,
        'constitution': 2200,
        'luck': 650,
        'health': 1463000
      },
      '2': {
        'enemy_name': 'Black Phantom',
        'enemy_level': 140,
        'enemy_class': 'scout',
        'strength': 670,
        'dexterity': 2640,
        'intelligence': 660,
        'constitution': 2360,
        'luck': 975,
        'health': 1331040
      },
      '3': {
        'enemy_name': 'Dragon of Cold',
        'enemy_level': 154,
        'enemy_class': 'warrior',
        'strength': 2920,
        'dexterity': 1015,
        'intelligence': 990,
        'constitution': 2640,
        'luck': 760,
        'health': 2046000
      },
      '4': {
        'enemy_name': 'Unholy Monk',
        'enemy_level': 158,
        'enemy_class': 'scout',
        'strength': 760,
        'dexterity': 3000,
        'intelligence': 750,
        'constitution': 2720,
        'luck': 1110,
        'health': 1729920
      },
      '5': {
        'enemy_name': 'Hell Alien',
        'enemy_level': 164,
        'enemy_class': 'scout',
        'strength': 790,
        'dexterity': 3120,
        'intelligence': 780,
        'constitution': 2840,
        'luck': 1155,
        'health': 1874400
      },
      '6': {
        'enemy_name': 'The Extraterrestrial',
        'enemy_level': 168,
        'enemy_class': 'mage',
        'strength': 790,
        'dexterity': 810,
        'intelligence': 3280,
        'constitution': 2840,
        'luck': 1180,
        'health': 959920
      },
      '7': {
        'enemy_name': 'Dragon of Madness',
        'enemy_level': 172,
        'enemy_class': 'warrior',
        'strength': 3280,
        'dexterity': 1150,
        'intelligence': 1125,
        'constitution': 3000,
        'luck': 850,
        'health': 2595000
      },
      '8': {
        'enemy_name': 'Twilight Alien',
        'enemy_level': 180,
        'enemy_class': 'scout',
        'strength': 870,
        'dexterity': 3440,
        'intelligence': 860,
        'constitution': 3160,
        'luck': 1275,
        'health': 2287840
      },
      '9': {
        'enemy_name': 'Out of State Alien',
        'enemy_level': 185,
        'enemy_class': 'mage',
        'strength': 875,
        'dexterity': 895,
        'intelligence': 3620,
        'constitution': 3180,
        'luck': 1305,
        'health': 1182960
      },
      '10': {
        'enemy_name': 'Killing Machine',
        'enemy_level': 200,
        'enemy_class': 'mage',
        'strength': 950,
        'dexterity': 970,
        'intelligence': 3920,
        'constitution': 3480,
        'luck': 1410,
        'health': 1398960
      }
    },
    '9': {
      '1': {
        'enemy_name': 'Cave Cyclops',
        'enemy_level': 152,
        'enemy_class': 'warrior',
        'strength': 2880,
        'dexterity': 1000,
        'intelligence': 975,
        'constitution': 2600,
        'luck': 750,
        'health': 1989000
      },
      '2': {
        'enemy_name': 'Sandstorm',
        'enemy_level': 156,
        'enemy_class': 'mage',
        'strength': 730,
        'dexterity': 750,
        'intelligence': 3040,
        'constitution': 2600,
        'luck': 1090,
        'health': 816400
      },
      '3': {
        'enemy_name': 'Hell Alien',
        'enemy_level': 160,
        'enemy_class': 'scout',
        'strength': 770,
        'dexterity': 3040,
        'intelligence': 760,
        'constitution': 2760,
        'luck': 1125,
        'health': 1777440
      },
      '4': {
        'enemy_name': 'Bigfoot',
        'enemy_level': 162,
        'enemy_class': 'warrior',
        'strength': 3080,
        'dexterity': 1075,
        'intelligence': 1050,
        'constitution': 2800,
        'luck': 800,
        'health': 2282000
      },
      '5': {
        'enemy_name': 'Ghost',
        'enemy_level': 166,
        'enemy_class': 'mage',
        'strength': 780,
        'dexterity': 800,
        'intelligence': 3240,
        'constitution': 2800,
        'luck': 1165,
        'health': 935200
      },
      '6': {
        'enemy_name': 'Timmy Suprino',
        'enemy_level': 174,
        'enemy_class': 'warrior',
        'strength': 3320,
        'dexterity': 1165,
        'intelligence': 1140,
        'constitution': 3040,
        'luck': 860,
        'health': 2660000
      },
      '7': {
        'enemy_name': 'Demoralizing Demon',
        'enemy_level': 176,
        'enemy_class': 'scout',
        'strength': 850,
        'dexterity': 3360,
        'intelligence': 840,
        'constitution': 3080,
        'luck': 1245,
        'health': 2180640
      },
      '8': {
        'enemy_name': 'Pink Monster Rabbit',
        'enemy_level': 178,
        'enemy_class': 'scout',
        'strength': 860,
        'dexterity': 3400,
        'intelligence': 850,
        'constitution': 3120,
        'luck': 1260,
        'health': 2233920
      },
      '9': {
        'enemy_name': 'Banshee',
        'enemy_level': 190,
        'enemy_class': 'mage',
        'strength': 900,
        'dexterity': 920,
        'intelligence': 3720,
        'constitution': 3280,
        'luck': 1340,
        'health': 1252960
      }
    },
    '10': {
      '1': {
        'enemy_name': 'Dark Rider',
        'enemy_level': 205,
        'enemy_class': 'scout',
        'strength': 995,
        'dexterity': 3940,
        'intelligence': 985,
        'constitution': 3660,
        'luck': 1450,
        'health': 3015840
      },
      '2': {
        'enemy_name': 'Skeleton Warrior',
        'enemy_level': 210,
        'enemy_class': 'warrior',
        'strength': 4040,
        'dexterity': 1420,
        'intelligence': 1395,
        'constitution': 3760,
        'luck': 1010,
        'health': 3966800
      },
      '3': {
        'enemy_name': 'Black Skull Warrior',
        'enemy_level': 215,
        'enemy_class': 'warrior',
        'strength': 4140,
        'dexterity': 1455,
        'intelligence': 1430,
        'constitution': 3860,
        'luck': 1030,
        'health': 4168800
      },
      '4': {
        'enemy_name': 'Night Troll',
        'enemy_level': 220,
        'enemy_class': 'warrior',
        'strength': 4240,
        'dexterity': 1490,
        'intelligence': 1465,
        'constitution': 3960,
        'luck': 1050,
        'health': 4375800
      },
      '5': {
        'enemy_name': 'Panther',
        'enemy_level': 225,
        'enemy_class': 'scout',
        'strength': 1095,
        'dexterity': 4340,
        'intelligence': 1085,
        'constitution': 4060,
        'luck': 1590,
        'health': 3670240
      },
      '6': {
        'enemy_name': 'Man-Eater',
        'enemy_level': 230,
        'enemy_class': 'scout',
        'strength': 1120,
        'dexterity': 4440,
        'intelligence': 1110,
        'constitution': 4160,
        'luck': 1645,
        'health': 3843840
      },
      '7': {
        'enemy_name': 'Swamp Dragon',
        'enemy_level': 235,
        'enemy_class': 'mage',
        'strength': 1125,
        'dexterity': 1145,
        'intelligence': 4620,
        'constitution': 4180,
        'luck': 1655,
        'health': 1972960
      },
      '8': {
        'enemy_name': 'Black Skull Warrior',
        'enemy_level': 240,
        'enemy_class': 'warrior',
        'strength': 4640,
        'dexterity': 1630,
        'intelligence': 1605,
        'constitution': 4360,
        'luck': 1130,
        'health': 5253800
      },
      '9': {
        'enemy_name': 'Dragon of Darkness',
        'enemy_level': 245,
        'enemy_class': 'warrior',
        'strength': 4740,
        'dexterity': 1665,
        'intelligence': 1640,
        'constitution': 4460,
        'luck': 1150,
        'health': 5485800
      },
      '10': {
        'enemy_name': 'Knight of the Black Skull',
        'enemy_level': 250,
        'enemy_class': 'warrior',
        'strength': 4840,
        'dexterity': 1700,
        'intelligence': 1675,
        'constitution': 4560,
        'luck': 1170,
        'health': 5722800
      }
    },
    '11': {
      '1': {
        'enemy_name': 'Happy Slappy the Clown',
        'enemy_level': 255,
        'enemy_class': 'warrior',
        'strength': 4940,
        'dexterity': 1735,
        'intelligence': 1710,
        'constitution': 4660,
        'luck': 1190,
        'health': 5964800
      },
      '2': {
        'enemy_name': 'The Blind Knife Thrower',
        'enemy_level': 260,
        'enemy_class': 'scout',
        'strength': 1270,
        'dexterity': 5040,
        'intelligence': 1260,
        'constitution': 4760,
        'luck': 1835,
        'health': 4969440
      },
      '3': {
        'enemy_name': 'Miniature Gnome',
        'enemy_level': 265,
        'enemy_class': 'warrior',
        'strength': 5140,
        'dexterity': 1805,
        'intelligence': 1780,
        'constitution': 4860,
        'luck': 1230,
        'health': 6463800
      },
      '4': {
        'enemy_name': 'The Bearded Lady',
        'enemy_level': 270,
        'enemy_class': 'warrior',
        'strength': 5240,
        'dexterity': 1840,
        'intelligence': 1815,
        'constitution': 4960,
        'luck': 1250,
        'health': 6720800
      },
      '5': {
        'enemy_name': 'The Psycho Juggler',
        'enemy_level': 275,
        'enemy_class': 'mage',
        'strength': 1325,
        'dexterity': 1345,
        'intelligence': 5420,
        'constitution': 4980,
        'luck': 1935,
        'health': 2748960
      },
      '6': {
        'enemy_name': 'Siamese Twins',
        'enemy_level': 280,
        'enemy_class': 'scout',
        'strength': 1370,
        'dexterity': 5440,
        'intelligence': 1360,
        'constitution': 5160,
        'luck': 1975,
        'health': 5799840
      },
      '7': {
        'enemy_name': 'Bronco the Joker',
        'enemy_level': 285,
        'enemy_class': 'warrior',
        'strength': 5540,
        'dexterity': 1945,
        'intelligence': 1920,
        'constitution': 5260,
        'luck': 1310,
        'health': 7521800
      },
      '8': {
        'enemy_name': 'The Snake-man',
        'enemy_level': 290,
        'enemy_class': 'scout',
        'strength': 1420,
        'dexterity': 5640,
        'intelligence': 1410,
        'constitution': 5360,
        'luck': 2045,
        'health': 6239040
      },
      '9': {
        'enemy_name': 'Madame Mystique',
        'enemy_level': 295,
        'enemy_class': 'mage',
        'strength': 1425,
        'dexterity': 1445,
        'intelligence': 5820,
        'constitution': 5380,
        'luck': 2075,
        'health': 3184960
      },
      '10': {
        'enemy_name': 'Bozo the Terror Clown',
        'enemy_level': 300,
        'enemy_class': 'warrior',
        'strength': 5840,
        'dexterity': 2050,
        'intelligence': 2025,
        'constitution': 5560,
        'luck': 1370,
        'health': 8787200
      }
    },
    '12': {
      '1': {
        'enemy_name': 'Restless Soul',
        'enemy_level': 305,
        'enemy_class': 'mage',
        'strength': 1475,
        'dexterity': 1495,
        'intelligence': 6020,
        'constitution': 5580,
        'luck': 2145,
        'health': 3414960
      },
      '2': {
        'enemy_name': 'Furious Soul',
        'enemy_level': 310,
        'enemy_class': 'mage',
        'strength': 1500,
        'dexterity': 1520,
        'intelligence': 6120,
        'constitution': 5680,
        'luck': 2180,
        'health': 3532960
      },
      '3': {
        'enemy_name': 'Old Soul',
        'enemy_level': 315,
        'enemy_class': 'warrior',
        'strength': 6140,
        'dexterity': 2155,
        'intelligence': 2130,
        'constitution': 5860,
        'luck': 2255,
        'health': 9258800
      },
      '4': {
        'enemy_name': 'Pest',
        'enemy_level': 320,
        'enemy_class': 'scout',
        'strength': 1570,
        'dexterity': 6240,
        'intelligence': 1560,
        'constitution': 5960,
        'luck': 2255,
        'health': 7652640
      },
      '5': {
        'enemy_name': 'Soul Clump',
        'enemy_level': 325,
        'enemy_class': 'mage',
        'strength': 1575,
        'dexterity': 1595,
        'intelligence': 6420,
        'constitution': 5980,
        'luck': 2285,
        'health': 3898960
      },
      '6': {
        'enemy_name': 'Scourge',
        'enemy_level': 330,
        'enemy_class': 'warrior',
        'strength': 6440,
        'dexterity': 2260,
        'intelligence': 2235,
        'constitution': 6160,
        'luck': 1490,
        'health': 10194800
      },
      '7': {
        'enemy_name': 'Hellhound',
        'enemy_level': 335,
        'enemy_class': 'scout',
        'strength': 1645,
        'dexterity': 6540,
        'intelligence': 1635,
        'constitution': 6260,
        'luck': 2360,
        'health': 8413440
      },
      '8': {
        'enemy_name': 'The Fuehrer\'s Heap',
        'enemy_level': 340,
        'enemy_class': 'warrior',
        'strength': 6640,
        'dexterity': 2330,
        'intelligence': 2305,
        'constitution': 6360,
        'luck': 1530,
        'health': 10843800
      },
      '9': {
        'enemy_name': 'The Devil\'s Advocate',
        'enemy_level': 345,
        'enemy_class': 'warrior',
        'strength': 6740,
        'dexterity': 2365,
        'intelligence': 2340,
        'constitution': 6460,
        'luck': 1550,
        'health': 11175800
      },
      '10': {
        'enemy_name': 'Beelzeboss',
        'enemy_level': 350,
        'enemy_class': 'warrior',
        'strength': 6840,
        'dexterity': 2400,
        'intelligence': 2375,
        'constitution': 6560,
        'luck': 1570,
        'health': 11512800
      }
    },
    '13': {
      '1': {
        'enemy_name': 'Hellgore the Hellish',
        'enemy_level': 355,
        'enemy_class': 'warrior',
        'strength': 7570,
        'dexterity': 2655,
        'intelligence': 2630,
        'constitution': 7290,
        'luck': 1716,
        'health': 12976200
      },
      '2': {
        'enemy_name': 'Henry the Magic Fairy',
        'enemy_level': 360,
        'enemy_class': 'mage',
        'strength': 1970,
        'dexterity': 1990,
        'intelligence': 8000,
        'constitution': 7560,
        'luck': 2838,
        'health': 5458320
      },
      '3': {
        'enemy_name': 'Jet the Panty Raider',
        'enemy_level': 365,
        'enemy_class': 'warrior',
        'strength': 8290,
        'dexterity': 2908,
        'intelligence': 2882,
        'constitution': 8010,
        'luck': 1860,
        'health': 14658300
      },
      '4': {
        'enemy_name': 'Clapper van Hellsing',
        'enemy_level': 370,
        'enemy_class': 'mage',
        'strength': 2160,
        'dexterity': 2180,
        'intelligence': 8760,
        'constitution': 8320,
        'luck': 3104,
        'health': 6173440
      },
      '5': {
        'enemy_name': 'The KOma KOmmander',
        'enemy_level': 375,
        'enemy_class': 'warrior',
        'strength': 9340,
        'dexterity': 3275,
        'intelligence': 3250,
        'constitution': 9060,
        'luck': 2070,
        'health': 17032800
      },
      '6': {
        'enemy_name': 'Roughian the Ruthless',
        'enemy_level': 380,
        'enemy_class': 'scout',
        'strength': 2682,
        'dexterity': 10690,
        'intelligence': 2672,
        'constitution': 10410,
        'luck': 3812,
        'health': 15864840
      },
      '7': {
        'enemy_name': 'Ben the Marketeer',
        'enemy_level': 385,
        'enemy_class': 'mage',
        'strength': 2888,
        'dexterity': 2908,
        'intelligence': 11670,
        'constitution': 11230,
        'luck': 4122,
        'health': 8669560
      },
      '8': {
        'enemy_name': 'Hector the Contractor',
        'enemy_level': 390,
        'enemy_class': 'warrior',
        'strength': 12540,
        'dexterity': 4395,
        'intelligence': 4370,
        'constitution': 12260,
        'luck': 2710,
        'health': 23968300
      },
      '9': {
        'enemy_name': 'Motu with a Club',
        'enemy_level': 395,
        'enemy_class': 'warrior',
        'strength': 13540,
        'dexterity': 4725,
        'intelligence': 4720,
        'constitution': 13260,
        'luck': 2910,
        'health': 26540800
      },
      '10': {
        'enemy_name': 'Jack the Hammerer',
        'enemy_level': 400,
        'enemy_class': 'warrior',
        'strength': 16840,
        'dexterity': 5900,
        'intelligence': 5875,
        'constitution': 16540,
        'luck': 3570,
        'health': 33202800
      }
    },
    '14': {
      '1': {
        'enemy_name': 'Robert Drunkatheon',
        'enemy_level': 310,
        'enemy_class': 'warrior',
        'strength': 6040,
        'dexterity': 2120,
        'intelligence': 2095,
        'constitution': 5760,
        'luck': 1410,
        'health': 8956800
      },
      '2': {
        'enemy_name': 'Lefty Lennister',
        'enemy_level': 320,
        'enemy_class': 'warrior',
        'strength': 6240,
        'dexterity': 2190,
        'intelligence': 2165,
        'constitution': 5960,
        'luck': 1450,
        'health': 9565800
      },
      '3': {
        'enemy_name': 'Petyr the Pimp',
        'enemy_level': 330,
        'enemy_class': 'mage',
        'strength': 3200,
        'dexterity': 3240,
        'intelligence': 13040,
        'constitution': 12160,
        'luck': 4640,
        'health': 8049920
      },
      '4': {
        'enemy_name': 'Holundor',
        'enemy_level': 340,
        'enemy_class': 'warrior',
        'strength': 13280,
        'dexterity': 4660,
        'intelligence': 4610,
        'constitution': 12720,
        'luck': 3060,
        'health': 21687600
      },
      '5': {
        'enemy_name': 'Drogo the Threatening',
        'enemy_level': 350,
        'enemy_class': 'warrior',
        'strength': 13680,
        'dexterity': 4800,
        'intelligence': 4750,
        'constitution': 13120,
        'luck': 3140,
        'health': 23025600
      },
      '6': {
        'enemy_name': 'The Ginger Slowworm',
        'enemy_level': 360,
        'enemy_class': 'mage',
        'strength': 5910,
        'dexterity': 5970,
        'intelligence': 24000,
        'constitution': 22680,
        'luck': 8514,
        'health': 16374960
      },
      '7': {
        'enemy_name': 'Queen Mother',
        'enemy_level': 370,
        'enemy_class': 'scout',
        'strength': 6540,
        'dexterity': 26040,
        'intelligence': 6510,
        'constitution': 25200,
        'luck': 9327,
        'health': 37396800
      },
      '8': {
        'enemy_name': 'The Miniature Poodle',
        'enemy_level': 380,
        'enemy_class': 'warrior',
        'strength': 32070,
        'dexterity': 11244,
        'intelligence': 11166,
        'constitution': 31230,
        'luck': 7020,
        'health': 59493152
      },
      '9': {
        'enemy_name': 'The Riding Mountainrange',
        'enemy_level': 390,
        'enemy_class': 'warrior',
        'strength': 35000,
        'dexterity': 11800,
        'intelligence': 12000,
        'constitution': 40040,
        'luck': 8000,
        'health': 95873200
      },
      '10': {
        'enemy_name': 'Joffrey the Kid Despot',
        'enemy_level': 400,
        'enemy_class': 'mage',
        'strength': 8500,
        'dexterity': 8500,
        'intelligence': 32000,
        'constitution': 30000,
        'luck': 12000,
        'health': 52867840
      },
      '11': {
        'enemy_name': 'Cool Villain',
        'enemy_level': 410,
        'enemy_class': 'scout',
        'strength': 8720,
        'dexterity': 34720,
        'intelligence': 8680,
        'constitution': 33600,
        'luck': 12436,
        'health': 55238400
      },
      '12': {
        'enemy_name': 'Brygitte',
        'enemy_level': 420,
        'enemy_class': 'mage',
        'strength': 11100,
        'dexterity': 11200,
        'intelligence': 45000,
        'constitution': 42800,
        'luck': 15940,
        'health': 36037600
      },
      '13': {
        'enemy_name': 'Snowman and Shadow Wolf',
        'enemy_level': 430,
        'enemy_class': 'warrior',
        'strength': 45800,
        'dexterity': 16060,
        'intelligence': 15935,
        'constitution': 44400,
        'luck': 10170,
        'health': 95682000
      },
      '14': {
        'enemy_name': 'The Woman in Red',
        'enemy_level': 440,
        'enemy_class': 'scout',
        'strength': 11800,
        'dexterity': 47000,
        'intelligence': 11750,
        'constitution': 45600,
        'luck': 16805,
        'health': 80438400
      },
      '15': {
        'enemy_name': 'Boyish Brienne',
        'enemy_level': 450,
        'enemy_class': 'warrior',
        'strength': 57840,
        'dexterity': 20280,
        'intelligence': 20130,
        'constitution': 56160,
        'luck': 12780,
        'health': 126640800
      },
      '16': {
        'enemy_name': 'Ramsay the Degrader',
        'enemy_level': 460,
        'enemy_class': 'warrior',
        'strength': 59280,
        'dexterity': 20784,
        'intelligence': 20634,
        'constitution': 57600,
        'luck': 13068,
        'health': 132768000
      },
      '17': {
        'enemy_name': 'Faceless',
        'enemy_level': 470,
        'enemy_class': 'mage',
        'strength': 15120,
        'dexterity': 15240,
        'intelligence': 61200,
        'constitution': 58560,
        'luck': 21648,
        'health': 55163520
      },
      '18': {
        'enemy_name': 'Vicious Gnome',
        'enemy_level': 480,
        'enemy_class': 'mage',
        'strength': 18060,
        'dexterity': 18200,
        'intelligence': 73080,
        'constitution': 70000,
        'luck': 25844,
        'health': 67340000
      },
      '19': {
        'enemy_name': 'The Protector',
        'enemy_level': 490,
        'enemy_class': 'warrior',
        'strength': 74200,
        'dexterity': 26012,
        'intelligence': 25837,
        'constitution': 72240,
        'luck': 16254,
        'health': 177349200
      },
      '20': {
        'enemy_name': 'The Hard to Burn',
        'enemy_level': 500,
        'enemy_class': 'scout',
        'strength': 19040,
        'dexterity': 75880,
        'intelligence': 18970,
        'constitution': 73920,
        'luck': 27055,
        'health': 148135680
      }
    },
    '16': {
      '1': {
        'enemy_name': 'Eloquent Hat',
        'enemy_level': 250,
        'enemy_class': 'scout',
        'strength': 1400,
        'dexterity': 11000,
        'intelligence': 1400,
        'constitution': 35000,
        'luck': 4500,
        'health': 62500000
      },
      '2': {
        'enemy_name': 'Sour Argus',
        'enemy_level': 257,
        'enemy_class': 'warrior',
        'strength': 9722,
        'dexterity': 2404,
        'intelligence': 2426,
        'constitution': 43730,
        'luck': 4764,
        'health': 79681528
      },
      '3': {
        'enemy_name': 'Fluffy Friend',
        'enemy_level': 265,
        'enemy_class': 'scout',
        'strength': 1550,
        'dexterity': 11290,
        'intelligence': 1560,
        'constitution': 44000,
        'luck': 4800,
        'health': 68425000
      },
      '4': {
        'enemy_name': 'A. van Blame',
        'enemy_level': 272,
        'enemy_class': 'scout',
        'strength': 1965,
        'dexterity': 12320,
        'intelligence': 1980,
        'constitution': 46000,
        'luck': 5940,
        'health': 73970000
      },
      '5': {
        'enemy_name': 'Phony Locky',
        'enemy_level': 280,
        'enemy_class': 'mage',
        'strength': 3869,
        'dexterity': 3865,
        'intelligence': 12249,
        'constitution': 49255,
        'luck': 7662,
        'health': 39995056
      },
      '6': {
        'enemy_name': 'Killer Stare',
        'enemy_level': 287,
        'enemy_class': 'scout',
        'strength': 4465,
        'dexterity': 12440,
        'intelligence': 4430,
        'constitution': 54100,
        'luck': 7960,
        'health': 94220000
      },
      '7': {
        'enemy_name': 'Bad Kisser',
        'enemy_level': 295,
        'enemy_class': 'scout',
        'strength': 3910,
        'dexterity': 12980,
        'intelligence': 3850,
        'constitution': 54500,
        'luck': 7970,
        'health': 96325000
      },
      '8': {
        'enemy_name': 'Guardian of the Golden Egg',
        'enemy_level': 302,
        'enemy_class': 'warrior',
        'strength': 14874,
        'dexterity': 3132,
        'intelligence': 1986,
        'constitution': 58295,
        'luck': 8022,
        'health': 138640080
      },
      '9': {
        'enemy_name': 'Gentle Giant',
        'enemy_level': 310,
        'enemy_class': 'warrior',
        'strength': 14470,
        'dexterity': 5540,
        'intelligence': 5569,
        'constitution': 70050,
        'luck': 10197,
        'health': 174284400
      },
      '10': {
        'enemy_name': 'Pedigree Bad Boy',
        'enemy_level': 317,
        'enemy_class': 'mage',
        'strength': 5911,
        'dexterity': 4338,
        'intelligence': 12174,
        'constitution': 70050,
        'luck': 8540,
        'health': 71282872
      },
      '11': {
        'enemy_name': 'Unrepentant Penitent',
        'enemy_level': 325,
        'enemy_class': 'mage',
        'strength': 3221,
        'dexterity': 3221,
        'intelligence': 16577,
        'constitution': 61790,
        'luck': 8964,
        'health': 64459324
      },
      '12': {
        'enemy_name': 'The Gifted One (and Ron)',
        'enemy_level': 332,
        'enemy_class': 'mage',
        'strength': 6128,
        'dexterity': 6057,
        'intelligence': 17028,
        'constitution': 76695,
        'luck': 10905,
        'health': 83003160
      },
      '13': {
        'enemy_name': 'Stumbledoor',
        'enemy_level': 340,
        'enemy_class': 'mage',
        'strength': 5151,
        'dexterity': 5237,
        'intelligence': 18553,
        'constitution': 79880,
        'luck': 12130,
        'health': 90152560
      },
      '14': {
        'enemy_name': 'Petey Rat',
        'enemy_level': 347,
        'enemy_class': 'scout',
        'strength': 5875,
        'dexterity': 20170,
        'intelligence': 5870,
        'constitution': 72300,
        'luck': 9320,
        'health': 168640000
      },
      '15': {
        'enemy_name': 'Diabolical Dolores',
        'enemy_level': 355,
        'enemy_class': 'mage',
        'strength': 5650,
        'dexterity': 5744,
        'intelligence': 19876,
        'constitution': 86520,
        'luck': 12519,
        'health': 104723808
      },
      '16': {
        'enemy_name': 'Inconveniently Infinite Inferi',
        'enemy_level': 362,
        'enemy_class': 'warrior',
        'strength': 19163,
        'dexterity': 9228,
        'intelligence': 9077,
        'constitution': 96410,
        'luck': 13359,
        'health': 306222272
      },
      '17': {
        'enemy_name': 'Bella the Beastly',
        'enemy_level': 370,
        'enemy_class': 'mage',
        'strength': 7773,
        'dexterity': 7772,
        'intelligence': 19358,
        'constitution': 91315,
        'luck': 13191,
        'health': 116878632
      },
      '18': {
        'enemy_name': 'Lucius the Pure-Blood',
        'enemy_level': 377,
        'enemy_class': 'mage',
        'strength': 5774,
        'dexterity': 5775,
        'intelligence': 24520,
        'constitution': 96430,
        'luck': 13751,
        'health': 125754360
      },
      '19': {
        'enemy_name': 'Cutsie Cuddler',
        'enemy_level': 385,
        'enemy_class': 'scout',
        'strength': 12400,
        'dexterity': 29300,
        'intelligence': 12600,
        'constitution': 130350,
        'luck': 18640,
        'health': 379430016
      },
      '20': {
        'enemy_name': 'You Should Know Who ...',
        'enemy_level': 400,
        'enemy_class': 'mage',
        'strength': 8447,
        'dexterity': 8378,
        'intelligence': 30585,
        'constitution': 126470,
        'luck': 18375,
        'health': 190324704
      }
    },
    '17': {
      '1': {
        'enemy_name': 'Orc on Warg',
        'enemy_level': 200,
        'enemy_class': 'warrior',
        'strength': 8800,
        'dexterity': 1120,
        'intelligence': 1120,
        'constitution': 28000,
        'luck': 3600,
        'health': 28140000
      },
      '2': {
        'enemy_name': 'Troll Trio',
        'enemy_level': 213,
        'enemy_class': 'warrior',
        'strength': 8069,
        'dexterity': 1995,
        'intelligence': 2014,
        'constitution': 36296,
        'luck': 3954,
        'health': 38836720
      },
      '3': {
        'enemy_name': 'The King',
        'enemy_level': 228,
        'enemy_class': 'mage',
        'strength': 1333,
        'dexterity': 1333,
        'intelligence': 9709,
        'constitution': 37840,
        'luck': 4128,
        'health': 17330720
      },
      '4': {
        'enemy_name': 'Smollum',
        'enemy_level': 242,
        'enemy_class': 'scout',
        'strength': 1749,
        'dexterity': 10965,
        'intelligence': 1762,
        'constitution': 40940,
        'luck': 5287,
        'health': 39793680
      },
      '5': {
        'enemy_name': 'Spiders again',
        'enemy_level': 258,
        'enemy_class': 'scout',
        'strength': 3559,
        'dexterity': 11269,
        'intelligence': 3559,
        'constitution': 45315,
        'luck': 7049,
        'health': 46946340
      },
      '6': {
        'enemy_name': 'Orc Boss',
        'enemy_level': 273,
        'enemy_class': 'warrior',
        'strength': 11818,
        'dexterity': 4209,
        'intelligence': 4209,
        'constitution': 51395,
        'luck': 7562,
        'health': 70411152
      },
      '7': {
        'enemy_name': 'Bezog',
        'enemy_level': 289,
        'enemy_class': 'scout',
        'strength': 3832,
        'dexterity': 12720,
        'intelligence': 3773,
        'constitution': 53410,
        'luck': 7811,
        'health': 61955600
      },
      '8': {
        'enemy_name': 'Smoulder',
        'enemy_level': 305,
        'enemy_class': 'mage',
        'strength': 3163,
        'dexterity': 3163,
        'intelligence': 15023,
        'constitution': 58878,
        'luck': 8102,
        'health': 36033336
      },
      '9': {
        'enemy_name': 'Nazguls...Nazgulses?',
        'enemy_level': 319,
        'enemy_class': 'warrior',
        'strength': 14904,
        'dexterity': 5706,
        'intelligence': 5736,
        'constitution': 72152,
        'luck': 10503,
        'health': 115443200
      },
      '10': {
        'enemy_name': 'Monster in the Lake',
        'enemy_level': 333,
        'enemy_class': 'scout',
        'strength': 6207,
        'dexterity': 12783,
        'intelligence': 6207,
        'constitution': 73553,
        'luck': 8967,
        'health': 98266808
      },
      '11': {
        'enemy_name': 'Valaraukar',
        'enemy_level': 348,
        'enemy_class': 'warrior',
        'strength': 17737,
        'dexterity': 3446,
        'intelligence': 3446,
        'constitution': 66115,
        'luck': 9591,
        'health': 115370672
      },
      '12': {
        'enemy_name': 'Urcsi the Uruk',
        'enemy_level': 362,
        'enemy_class': 'warrior',
        'strength': 18561,
        'dexterity': 6602,
        'intelligence': 6602,
        'constitution': 83598,
        'luck': 11886,
        'health': 151730368
      },
      '13': {
        'enemy_name': 'Prompter Splittongue',
        'enemy_level': 377,
        'enemy_class': 'mage',
        'strength': 5718,
        'dexterity': 5813,
        'intelligence': 20594,
        'constitution': 88667,
        'luck': 13464,
        'health': 67032252
      },
      '14': {
        'enemy_name': 'Samowar the Pale',
        'enemy_level': 392,
        'enemy_class': 'scout',
        'strength': 6639,
        'dexterity': 22792,
        'intelligence': 663,
        'constitution': 81699,
        'luck': 10532,
        'health': 128430832
      },
      '15': {
        'enemy_name': 'Oliphaunt Tamer',
        'enemy_level': 408,
        'enemy_class': 'mage',
        'strength': 6497,
        'dexterity': 6606,
        'intelligence': 22857,
        'constitution': 99498,
        'luck': 14397,
        'health': 81389360
      },
      '16': {
        'enemy_name': 'Undead Army',
        'enemy_level': 424,
        'enemy_class': 'warrior',
        'strength': 22421,
        'dexterity': 10797,
        'intelligence': 10620,
        'constitution': 112800,
        'luck': 15630,
        'health': 239700000
      },
      '17': {
        'enemy_name': 'Shelantula',
        'enemy_level': 440,
        'enemy_class': 'scout',
        'strength': 9250,
        'dexterity': 23036,
        'intelligence': 9250,
        'constitution': 108665,
        'luck': 15697,
        'health': 191685056
      },
      '18': {
        'enemy_name': 'Ruler of the Nine',
        'enemy_level': 456,
        'enemy_class': 'warrior',
        'strength': 29669,
        'dexterity': 6998,
        'intelligence': 6998,
        'constitution': 116680,
        'luck': 16639,
        'health': 266613792
      },
      '19': {
        'enemy_name': 'Mauron\'s Maw',
        'enemy_level': 474,
        'enemy_class': 'warrior',
        'strength': 36039,
        'dexterity': 15498,
        'intelligence': 15498,
        'constitution': 160331,
        'luck': 22927,
        'health': 380786112
      },
      '20': {
        'enemy_name': 'The Necromancer',
        'enemy_level': 500,
        'enemy_class': 'warrior',
        'strength': 38231,
        'dexterity': 10473,
        'intelligence': 10474,
        'constitution': 158088,
        'luck': 22969,
        'health': 396010432
      }
    },
    '19': {
      '1': {
        'enemy_name': 'Heimdall',
        'enemy_level': 210,
        'enemy_class': 'warrior',
        'strength': 8000,
        'dexterity': 2000,
        'intelligence': 2000,
        'constitution': 36000,
        'luck': 4000,
        'health': 43560000
      },
      '2': {
        'enemy_name': 'Valkyries',
        'enemy_level': 240,
        'enemy_class': 'mage',
        'strength': 10965,
        'dexterity': 1762,
        'intelligence': 12000,
        'constitution': 40500,
        'luck': 5000,
        'health': 55687500
      },
      '3': {
        'enemy_name': 'Hel',
        'enemy_level': 270,
        'enemy_class': 'mage',
        'strength': 4000,
        'dexterity': 4000,
        'intelligence': 11500,
        'constitution': 51000,
        'luck': 7500,
        'health': 31416000
      },
      '4': {
        'enemy_name': 'Thor',
        'enemy_level': 305,
        'enemy_class': 'warrior',
        'strength': 15000,
        'dexterity': 3500,
        'intelligence': 3500,
        'constitution': 58500,
        'luck': 8000,
        'health': 101351256
      },
      '5': {
        'enemy_name': 'Odin',
        'enemy_level': 330,
        'enemy_class': 'warrior',
        'strength': 12500,
        'dexterity': 6000,
        'intelligence': 6000,
        'constitution': 73500,
        'luck': 9000,
        'health': 137445008
      },
      '6': {
        'enemy_name': 'Loki',
        'enemy_level': 360,
        'enemy_class': 'scout',
        'strength': 6500,
        'dexterity': 18500,
        'intelligence': 6500,
        'constitution': 83500,
        'luck': 11500,
        'health': 135938000
      },
      '7': {
        'enemy_name': 'Ymir',
        'enemy_level': 390,
        'enemy_class': 'warrior',
        'strength': 22500,
        'dexterity': 6500,
        'intelligence': 6500,
        'constitution': 81500,
        'luck': 10500,
        'health': 143440000
      },
      '8': {
        'enemy_name': 'Midgard Serpent',
        'enemy_level': 420,
        'enemy_class': 'scout',
        'strength': 10500,
        'dexterity': 22500,
        'intelligence': 10500,
        'constitution': 112500,
        'luck': 15500,
        'health': 212850000
      },
      '9': {
        'enemy_name': 'Fenris Wolf',
        'enemy_level': 455,
        'enemy_class': 'warrior',
        'strength': 29500,
        'dexterity': 7000,
        'intelligence': 7000,
        'constitution': 115000,
        'luck': 16000,
        'health': 235290000
      },
      '10': {
        'enemy_name': 'Surtr',
        'enemy_level': 500,
        'enemy_class': 'warrior',
        'strength': 38500,
        'dexterity': 10500,
        'intelligence': 10500,
        'constitution': 158000,
        'luck': 23000,
        'health': 354552000
      }
    }
  },
  'SHADOW_DUNGEON': {
    '1': {
      '1': {
        'enemy_name': 'Ghost',
        'enemy_level': 172,
        'enemy_class': 'mage',
        'strength': 825,
        'dexterity': 894,
        'intelligence': 1788,
        'constitution': 7282,
        'luck': 808,
        'health': 2519572
      },
      '2': {
        'enemy_name': 'Skeleton',
        'enemy_level': 174,
        'enemy_class': 'warrior',
        'strength': 1740,
        'dexterity': 986,
        'intelligence': 855,
        'constitution': 8052,
        'luck': 739,
        'health': 7045500
      },
      '3': {
        'enemy_name': 'Undead',
        'enemy_level': 176,
        'enemy_class': 'warrior',
        'strength': 1873,
        'dexterity': 980,
        'intelligence': 867,
        'constitution': 8569,
        'luck': 817,
        'health': 7583565
      },
      '4': {
        'enemy_name': 'Devious Vampire',
        'enemy_level': 178,
        'enemy_class': 'scout',
        'strength': 934,
        'dexterity': 2169,
        'intelligence': 923,
        'constitution': 8014,
        'luck': 1045,
        'health': 5738024
      },
      '5': {
        'enemy_name': 'Night Ghoul',
        'enemy_level': 180,
        'enemy_class': 'warrior',
        'strength': 2140,
        'dexterity': 1010,
        'intelligence': 890,
        'constitution': 9295,
        'luck': 930,
        'health': 8411975
      },
      '6': {
        'enemy_name': 'Banshee',
        'enemy_level': 182,
        'enemy_class': 'mage',
        'strength': 802,
        'dexterity': 819,
        'intelligence': 2506,
        'constitution': 9009,
        'luck': 1133,
        'health': 3297294
      },
      '7': {
        'enemy_name': 'Skeleton Soldier',
        'enemy_level': 184,
        'enemy_class': 'warrior',
        'strength': 2540,
        'dexterity': 955,
        'intelligence': 863,
        'constitution': 10120,
        'luck': 1004,
        'health': 9361000
      },
      '8': {
        'enemy_name': 'Voodoo Master',
        'enemy_level': 186,
        'enemy_class': 'mage',
        'strength': 781,
        'dexterity': 806,
        'intelligence': 2852,
        'constitution': 9510,
        'luck': 1196,
        'health': 3556740
      },
      '9': {
        'enemy_name': 'Flesh Golem',
        'enemy_level': 188,
        'enemy_class': 'warrior',
        'strength': 2885,
        'dexterity': 972,
        'intelligence': 897,
        'constitution': 11500,
        'luck': 1118,
        'health': 10867500
      },
      '10': {
        'enemy_name': 'Lord of Darkness',
        'enemy_level': 190,
        'enemy_class': 'scout',
        'strength': 839,
        'dexterity': 3218,
        'intelligence': 809,
        'constitution': 11720,
        'luck': 1109,
        'health': 8954080
      }
    },
    '2': {
      '1': {
        'enemy_name': 'Water Glompf',
        'enemy_level': 192,
        'enemy_class': 'scout',
        'strength': 969,
        'dexterity': 2534,
        'intelligence': 969,
        'constitution': 9185,
        'luck': 1142,
        'health': 7090820
      },
      '2': {
        'enemy_name': 'Yeti',
        'enemy_level': 194,
        'enemy_class': 'warrior',
        'strength': 2562,
        'dexterity': 1018,
        'intelligence': 945,
        'constitution': 10576,
        'luck': 1050,
        'health': 10311600
      },
      '3': {
        'enemy_name': 'Skeleton',
        'enemy_level': 196,
        'enemy_class': 'warrior',
        'strength': 2751,
        'dexterity': 966,
        'intelligence': 875,
        'constitution': 10934,
        'luck': 1064,
        'health': 10769990
      },
      '4': {
        'enemy_name': 'Ugly Gremlin',
        'enemy_level': 198,
        'enemy_class': 'scout',
        'strength': 832,
        'dexterity': 3226,
        'intelligence': 838,
        'constitution': 9702,
        'luck': 1257,
        'health': 7722792
      },
      '5': {
        'enemy_name': 'Stone Giant',
        'enemy_level': 200,
        'enemy_class': 'warrior',
        'strength': 3115,
        'dexterity': 936,
        'intelligence': 852,
        'constitution': 11517,
        'luck': 1026,
        'health': 11574585
      },
      '6': {
        'enemy_name': 'Fire Elemental',
        'enemy_level': 202,
        'enemy_class': 'mage',
        'strength': 876,
        'dexterity': 872,
        'intelligence': 3580,
        'constitution': 10373,
        'luck': 1189,
        'health': 4211438
      },
      '7': {
        'enemy_name': 'Stone Troll',
        'enemy_level': 204,
        'enemy_class': 'warrior',
        'strength': 3162,
        'dexterity': 1032,
        'intelligence': 977,
        'constitution': 13156,
        'luck': 1045,
        'health': 13484900
      },
      '8': {
        'enemy_name': 'Redlight Succubus',
        'enemy_level': 206,
        'enemy_class': 'scout',
        'strength': 919,
        'dexterity': 3531,
        'intelligence': 882,
        'constitution': 13756,
        'luck': 1269,
        'health': 11389968
      },
      '9': {
        'enemy_name': 'Abhorrent Demon',
        'enemy_level': 208,
        'enemy_class': 'scout',
        'strength': 945,
        'dexterity': 3655,
        'intelligence': 913,
        'constitution': 15252,
        'luck': 1323,
        'health': 12750672
      },
      '10': {
        'enemy_name': 'Hell Beast',
        'enemy_level': 210,
        'enemy_class': 'warrior',
        'strength': 3720,
        'dexterity': 1155,
        'intelligence': 1080,
        'constitution': 15840,
        'luck': 1020,
        'health': 16711200
      }
    },
    '3': {
      '1': {
        'enemy_name': 'Sewer Rat',
        'enemy_level': 212,
        'enemy_class': 'scout',
        'strength': 1026,
        'dexterity': 3219,
        'intelligence': 1066,
        'constitution': 10054,
        'luck': 1358,
        'health': 8566008
      },
      '2': {
        'enemy_name': 'Dusty Bat',
        'enemy_level': 214,
        'enemy_class': 'scout',
        'strength': 838,
        'dexterity': 3578,
        'intelligence': 885,
        'constitution': 11242,
        'luck': 1367,
        'health': 9668120
      },
      '3': {
        'enemy_name': 'Terror Tarantula',
        'enemy_level': 216,
        'enemy_class': 'scout',
        'strength': 1054,
        'dexterity': 3733,
        'intelligence': 1152,
        'constitution': 11396,
        'luck': 1270,
        'health': 9891728
      },
      '4': {
        'enemy_name': 'Rowdy Robber',
        'enemy_level': 218,
        'enemy_class': 'warrior',
        'strength': 3639,
        'dexterity': 1018,
        'intelligence': 867,
        'constitution': 14047,
        'luck': 1180,
        'health': 15381465
      },
      '5': {
        'enemy_name': 'Dirty Rotten Scoundrel',
        'enemy_level': 220,
        'enemy_class': 'warrior',
        'strength': 3748,
        'dexterity': 1079,
        'intelligence': 977,
        'constitution': 14338,
        'luck': 1059,
        'health': 15843490
      },
      '6': {
        'enemy_name': 'Grim Wolf',
        'enemy_level': 222,
        'enemy_class': 'scout',
        'strength': 999,
        'dexterity': 3848,
        'intelligence': 962,
        'constitution': 15466,
        'luck': 1387,
        'health': 13795672
      },
      '7': {
        'enemy_name': 'Bad Bandit',
        'enemy_level': 224,
        'enemy_class': 'warrior',
        'strength': 3920,
        'dexterity': 1190,
        'intelligence': 1102,
        'constitution': 16170,
        'luck': 1085,
        'health': 18191250
      },
      '8': {
        'enemy_name': 'Beastie',
        'enemy_level': 226,
        'enemy_class': 'scout',
        'strength': 1040,
        'dexterity': 4044,
        'intelligence': 1011,
        'constitution': 17660,
        'luck': 1471,
        'health': 16035280
      },
      '9': {
        'enemy_name': 'Grave Robber',
        'enemy_level': 228,
        'enemy_class': 'warrior',
        'strength': 4135,
        'dexterity': 1338,
        'intelligence': 1272,
        'constitution': 18662,
        'luck': 1113,
        'health': 21367990
      },
      '10': {
        'enemy_name': 'Robber Chief',
        'enemy_level': 230,
        'enemy_class': 'warrior',
        'strength': 4191,
        'dexterity': 1367,
        'intelligence': 1303,
        'constitution': 19112,
        'luck': 1124,
        'health': 22074360
      }
    },
    '4': {
      '1': {
        'enemy_name': 'Wind Elemental',
        'enemy_level': 232,
        'enemy_class': 'scout',
        'strength': 1026,
        'dexterity': 3926,
        'intelligence': 981,
        'constitution': 14746,
        'luck': 1405,
        'health': 13743272
      },
      '2': {
        'enemy_name': 'Pirate Dark Beard',
        'enemy_level': 234,
        'enemy_class': 'scout',
        'strength': 1048,
        'dexterity': 4034,
        'intelligence': 1008,
        'constitution': 15972,
        'luck': 1452,
        'health': 15013680
      },
      '3': {
        'enemy_name': 'Rowdy Robber',
        'enemy_level': 236,
        'enemy_class': 'warrior',
        'strength': 4110,
        'dexterity': 1237,
        'intelligence': 1141,
        'constitution': 16748,
        'luck': 1141,
        'health': 19846380
      },
      '4': {
        'enemy_name': 'Shadow Alligator',
        'enemy_level': 238,
        'enemy_class': 'warrior',
        'strength': 4200,
        'dexterity': 1295,
        'intelligence': 1207,
        'constitution': 17710,
        'luck': 1155,
        'health': 21163450
      },
      '5': {
        'enemy_name': 'Sturdy Swashbuckler',
        'enemy_level': 240,
        'enemy_class': 'warrior',
        'strength': 4281,
        'dexterity': 1345,
        'intelligence': 1264,
        'constitution': 18546,
        'luck': 1167,
        'health': 22347930
      },
      '6': {
        'enemy_name': 'Mean Monster Rabbit',
        'enemy_level': 242,
        'enemy_class': 'scout',
        'strength': 1121,
        'dexterity': 4367,
        'intelligence': 1091,
        'constitution': 19476,
        'luck': 1593,
        'health': 18930672
      },
      '7': {
        'enemy_name': 'Cutthroat',
        'enemy_level': 244,
        'enemy_class': 'warrior',
        'strength': 4415,
        'dexterity': 1423,
        'intelligence': 1350,
        'constitution': 19806,
        'luck': 1190,
        'health': 24262350
      },
      '8': {
        'enemy_name': 'Pirate Blood Nose',
        'enemy_level': 246,
        'enemy_class': 'warrior',
        'strength': 4510,
        'dexterity': 1486,
        'intelligence': 1422,
        'constitution': 20856,
        'luck': 1204,
        'health': 25757160
      },
      '9': {
        'enemy_name': 'Octopus',
        'enemy_level': 248,
        'enemy_class': 'scout',
        'strength': 1167,
        'dexterity': 4570,
        'intelligence': 1142,
        'constitution': 21395,
        'luck': 1677,
        'health': 21309420
      },
      '10': {
        'enemy_name': 'Pirate Leader',
        'enemy_level': 250,
        'enemy_class': 'scout',
        'strength': 1181,
        'dexterity': 4636,
        'intelligence': 1159,
        'constitution': 22000,
        'luck': 1704,
        'health': 22088000
      }
    },
    '5': {
      '1': {
        'enemy_name': 'Rattling Cobra',
        'enemy_level': 252,
        'enemy_class': 'scout',
        'strength': 1155,
        'dexterity': 4480,
        'intelligence': 1120,
        'constitution': 19250,
        'luck': 1627,
        'health': 19481000
      },
      '2': {
        'enemy_name': 'Slashing Saurus',
        'enemy_level': 254,
        'enemy_class': 'scout',
        'strength': 1172,
        'dexterity': 4558,
        'intelligence': 1139,
        'constitution': 20058,
        'luck': 1660,
        'health': 20459160
      },
      '3': {
        'enemy_name': 'Roaring Raptor',
        'enemy_level': 256,
        'enemy_class': 'scout',
        'strength': 1184,
        'dexterity': 4608,
        'intelligence': 1152,
        'constitution': 20416,
        'luck': 1680,
        'health': 20987648
      },
      '4': {
        'enemy_name': 'Swamp Warrior',
        'enemy_level': 258,
        'enemy_class': 'scout',
        'strength': 1202,
        'dexterity': 4690,
        'intelligence': 1172,
        'constitution': 21285,
        'luck': 1715,
        'health': 22051260
      },
      '5': {
        'enemy_name': 'Green Rex',
        'enemy_level': 260,
        'enemy_class': 'warrior',
        'strength': 4757,
        'dexterity': 1562,
        'intelligence': 1493,
        'constitution': 21901,
        'luck': 1272,
        'health': 28580804
      },
      '6': {
        'enemy_name': 'Saurus Rogue',
        'enemy_level': 262,
        'enemy_class': 'scout',
        'strength': 1231,
        'dexterity': 4820,
        'intelligence': 1205,
        'constitution': 22478,
        'luck': 1768,
        'health': 23646856
      },
      '7': {
        'enemy_name': 'Swamp Dragon',
        'enemy_level': 264,
        'enemy_class': 'warrior',
        'strength': 4888,
        'dexterity': 1637,
        'intelligence': 1576,
        'constitution': 23122,
        'luck': 1295,
        'health': 30636650
      },
      '8': {
        'enemy_name': 'Swamp Gorgon',
        'enemy_level': 266,
        'enemy_class': 'mage',
        'strength': 1213,
        'dexterity': 1260,
        'intelligence': 5133,
        'constitution': 22583,
        'luck': 1808,
        'health': 12059322
      },
      '9': {
        'enemy_name': 'Toxic Dragon',
        'enemy_level': 268,
        'enemy_class': 'warrior',
        'strength': 5008,
        'dexterity': 1702,
        'intelligence': 1647,
        'constitution': 24162,
        'luck': 1318,
        'health': 32497890
      },
      '10': {
        'enemy_name': 'King Saurus',
        'enemy_level': 270,
        'enemy_class': 'scout',
        'strength': 1287,
        'dexterity': 5067,
        'intelligence': 1266,
        'constitution': 24673,
        'luck': 1869,
        'health': 26745532
      }
    },
    '6': {
      '1': {
        'enemy_name': 'Toxic Tree',
        'enemy_level': 272,
        'enemy_class': 'warrior',
        'strength': 4966,
        'dexterity': 1626,
        'intelligence': 1552,
        'constitution': 22764,
        'luck': 1330,
        'health': 31072860
      },
      '2': {
        'enemy_name': 'Ugly Gremlin',
        'enemy_level': 274,
        'enemy_class': 'scout',
        'strength': 1286,
        'dexterity': 5032,
        'intelligence': 1258,
        'constitution': 23370,
        'luck': 1845,
        'health': 25707000
      },
      '3': {
        'enemy_name': 'Rabid Wolf',
        'enemy_level': 276,
        'enemy_class': 'mage',
        'strength': 1247,
        'dexterity': 1300,
        'intelligence': 5307,
        'constitution': 22770,
        'luck': 1857,
        'health': 12614580
      },
      '4': {
        'enemy_name': 'Slime Blob',
        'enemy_level': 278,
        'enemy_class': 'scout',
        'strength': 1311,
        'dexterity': 5140,
        'intelligence': 1285,
        'constitution': 24233,
        'luck': 1888,
        'health': 27044028
      },
      '5': {
        'enemy_name': 'Greenish Gremlin',
        'enemy_level': 280,
        'enemy_class': 'scout',
        'strength': 1328,
        'dexterity': 5220,
        'intelligence': 1305,
        'constitution': 25052,
        'luck': 1922,
        'health': 28158448
      },
      '6': {
        'enemy_name': 'Infected Brown Bear',
        'enemy_level': 282,
        'enemy_class': 'warrior',
        'strength': 5276,
        'dexterity': 1796,
        'intelligence': 1739,
        'constitution': 25514,
        'luck': 1387,
        'health': 36102312
      },
      '7': {
        'enemy_name': 'Greedy Gremlin',
        'enemy_level': 284,
        'enemy_class': 'scout',
        'strength': 1353,
        'dexterity': 5325,
        'intelligence': 1331,
        'constitution': 25866,
        'luck': 1963,
        'health': 29487240
      },
      '8': {
        'enemy_name': 'Swamp Muncher',
        'enemy_level': 286,
        'enemy_class': 'mage',
        'strength': 1324,
        'dexterity': 1366,
        'intelligence': 5551,
        'constitution': 25443,
        'luck': 1976,
        'health': 16604282
      },
      '9': {
        'enemy_name': 'Cruel Gremlin',
        'enemy_level': 288,
        'enemy_class': 'scout',
        'strength': 1380,
        'dexterity': 5440,
        'intelligence': 1360,
        'constitution': 26840,
        'luck': 2010,
        'health': 31027040
      },
      '10': {
        'enemy_name': 'Terrible Toxic Gremlin',
        'enemy_level': 290,
        'enemy_class': 'scout',
        'strength': 1392,
        'dexterity': 5490,
        'intelligence': 1372,
        'constitution': 27220,
        'luck': 2030,
        'health': 31684080
      }
    },
    '7': {
      '1': {
        'enemy_name': 'Fire Scorpion',
        'enemy_level': 292,
        'enemy_class': 'scout',
        'strength': 1381,
        'dexterity': 5422,
        'intelligence': 1355,
        'constitution': 25806,
        'luck': 1994,
        'health': 30244632
      },
      '2': {
        'enemy_name': 'Fire Basilisk',
        'enemy_level': 294,
        'enemy_class': 'scout',
        'strength': 1393,
        'dexterity': 5474,
        'intelligence': 1368,
        'constitution': 26202,
        'luck': 2014,
        'health': 30918360
      },
      '3': {
        'enemy_name': 'Lava Blob',
        'enemy_level': 296,
        'enemy_class': 'mage',
        'strength': 1356,
        'dexterity': 1406,
        'intelligence': 5722,
        'constitution': 25504,
        'luck': 2022,
        'health': 15149376
      },
      '4': {
        'enemy_name': 'Lava Giant',
        'enemy_level': 298,
        'enemy_class': 'warrior',
        'strength': 5581,
        'dexterity': 1903,
        'intelligence': 1844,
        'constitution': 27054,
        'luck': 1466,
        'health': 40445728
      },
      '5': {
        'enemy_name': 'Dragon of Darkness',
        'enemy_level': 300,
        'enemy_class': 'warrior',
        'strength': 5641,
        'dexterity': 1936,
        'intelligence': 1880,
        'constitution': 27577,
        'luck': 1477,
        'health': 41503384
      },
      '6': {
        'enemy_name': 'Hell Cyclops',
        'enemy_level': 302,
        'enemy_class': 'warrior',
        'strength': 5689,
        'dexterity': 1958,
        'intelligence': 1903,
        'constitution': 27924,
        'luck': 1488,
        'health': 42304860
      },
      '7': {
        'enemy_name': 'Fire Elemental',
        'enemy_level': 304,
        'enemy_class': 'mage',
        'strength': 1412,
        'dexterity': 1455,
        'intelligence': 5908,
        'constitution': 27313,
        'luck': 2108,
        'health': 16660930
      },
      '8': {
        'enemy_name': 'Lava Giant',
        'enemy_level': 306,
        'enemy_class': 'warrior',
        'strength': 5784,
        'dexterity': 2001,
        'intelligence': 1949,
        'constitution': 28584,
        'luck': 1509,
        'health': 43876440
      },
      '9': {
        'enemy_name': 'Giant Dragon',
        'enemy_level': 308,
        'enemy_class': 'warrior',
        'strength': 5827,
        'dexterity': 2018,
        'intelligence': 1966,
        'constitution': 28842,
        'luck': 1519,
        'health': 44560888
      },
      '10': {
        'enemy_name': 'Ghost of the Volcano',
        'enemy_level': 310,
        'enemy_class': 'warrior',
        'strength': 5908,
        'dexterity': 2069,
        'intelligence': 2024,
        'constitution': 29684,
        'luck': 1531,
        'health': 46158620
      }
    },
    '8': {
      '1': {
        'enemy_name': 'Yeti',
        'enemy_level': 312,
        'enemy_class': 'warrior',
        'strength': 5861,
        'dexterity': 2009,
        'intelligence': 1950,
        'constitution': 28600,
        'luck': 1536,
        'health': 44759000
      },
      '2': {
        'enemy_name': 'Black Phantom',
        'enemy_level': 314,
        'enemy_class': 'scout',
        'strength': 1502,
        'dexterity': 5921,
        'intelligence': 1480,
        'constitution': 29112,
        'luck': 2186,
        'health': 36681120
      },
      '3': {
        'enemy_name': 'Dragon of Cold',
        'enemy_level': 316,
        'enemy_class': 'warrior',
        'strength': 5991,
        'dexterity': 2082,
        'intelligence': 2031,
        'constitution': 29794,
        'luck': 1559,
        'health': 47223488
      },
      '4': {
        'enemy_name': 'Unholy Monk',
        'enemy_level': 318,
        'enemy_class': 'scout',
        'strength': 1529,
        'dexterity': 6037,
        'intelligence': 1509,
        'constitution': 30107,
        'luck': 2234,
        'health': 38416532
      },
      '5': {
        'enemy_name': 'Hell Alien',
        'enemy_level': 320,
        'enemy_class': 'scout',
        'strength': 1541,
        'dexterity': 6087,
        'intelligence': 1521,
        'constitution': 30476,
        'luck': 2253,
        'health': 39131184
      },
      '6': {
        'enemy_name': 'The Extraterrestrial',
        'enemy_level': 322,
        'enemy_class': 'mage',
        'strength': 1514,
        'dexterity': 1552,
        'intelligence': 6286,
        'constitution': 29936,
        'luck': 2261,
        'health': 19338656
      },
      '7': {
        'enemy_name': 'Dragon of Madness',
        'enemy_level': 324,
        'enemy_class': 'warrior',
        'strength': 6178,
        'dexterity': 2166,
        'intelligence': 2119,
        'constitution': 31080,
        'luck': 1601,
        'health': 50505000
      },
      '8': {
        'enemy_name': 'Twilight Alien',
        'enemy_level': 326,
        'enemy_class': 'scout',
        'strength': 1575,
        'dexterity': 6230,
        'intelligence': 1557,
        'constitution': 31476,
        'luck': 2309,
        'health': 41170608
      },
      '9': {
        'enemy_name': 'Out of State Alien',
        'enemy_level': 328,
        'enemy_class': 'mage',
        'strength': 1551,
        'dexterity': 1586,
        'intelligence': 6418,
        'constitution': 31009,
        'luck': 2313,
        'health': 20403922
      },
      '10': {
        'enemy_name': 'Killing Machine',
        'enemy_level': 330,
        'enemy_class': 'mage',
        'strength': 1567,
        'dexterity': 1600,
        'intelligence': 6468,
        'constitution': 31581,
        'luck': 2326,
        'health': 20906622
      }
    },
    '9': {
      '1': {
        'enemy_name': 'Cave Cyclops',
        'enemy_level': 332,
        'enemy_class': 'warrior',
        'strength': 6290,
        'dexterity': 2184,
        'intelligence': 2129,
        'constitution': 31229,
        'luck': 1638,
        'health': 51996284
      },
      '2': {
        'enemy_name': 'Sandstorm',
        'enemy_level': 334,
        'enemy_class': 'mage',
        'strength': 1562,
        'dexterity': 1605,
        'intelligence': 6508,
        'constitution': 30613,
        'luck': 2333,
        'health': 20510710
      },
      '3': {
        'enemy_name': 'Hell Alien',
        'enemy_level': 336,
        'enemy_class': 'scout',
        'strength': 1617,
        'dexterity': 6384,
        'intelligence': 1596,
        'constitution': 31878,
        'luck': 2362,
        'health': 42971544
      },
      '4': {
        'enemy_name': 'Bigfoot',
        'enemy_level': 338,
        'enemy_class': 'warrior',
        'strength': 6426,
        'dexterity': 2242,
        'intelligence': 2190,
        'constitution': 32126,
        'luck': 1669,
        'health': 54453568
      },
      '5': {
        'enemy_name': 'Ghost',
        'enemy_level': 340,
        'enemy_class': 'mage',
        'strength': 1597,
        'dexterity': 1638,
        'intelligence': 6636,
        'constitution': 31537,
        'luck': 2386,
        'health': 21508234
      },
      '6': {
        'enemy_name': 'Timmy Suprino',
        'enemy_level': 342,
        'enemy_class': 'warrior',
        'strength': 6525,
        'dexterity': 2289,
        'intelligence': 2240,
        'constitution': 32862,
        'luck': 1690,
        'health': 56358328
      },
      '7': {
        'enemy_name': 'Demoralizing Demon',
        'enemy_level': 344,
        'enemy_class': 'scout',
        'strength': 1661,
        'dexterity': 6567,
        'intelligence': 1641,
        'constitution': 33110,
        'luck': 2433,
        'health': 45691800
      },
      '8': {
        'enemy_name': 'Pink Monster Rabbit',
        'enemy_level': 346,
        'enemy_class': 'scout',
        'strength': 1671,
        'dexterity': 6608,
        'intelligence': 1652,
        'constitution': 33352,
        'luck': 2449,
        'health': 46292576
      },
      '9': {
        'enemy_name': 'Banshee',
        'enemy_level': 348,
        'enemy_class': 'mage',
        'strength': 1648,
        'dexterity': 1685,
        'intelligence': 6813,
        'constitution': 33038,
        'luck': 2454,
        'health': 23060524
      }
    },
    '10': {
      '1': {
        'enemy_name': 'Dark Rider',
        'enemy_level': 352,
        'enemy_class': 'scout',
        'strength': 1708,
        'dexterity': 6765,
        'intelligence': 1691,
        'constitution': 34562,
        'luck': 2489,
        'health': 48801544
      },
      '2': {
        'enemy_name': 'Skeleton Warrior',
        'enemy_level': 354,
        'enemy_class': 'warrior',
        'strength': 6810,
        'dexterity': 2393,
        'intelligence': 2351,
        'constitution': 34859,
        'luck': 1702,
        'health': 61874724
      },
      '3': {
        'enemy_name': 'Black Skull Warrior',
        'enemy_level': 356,
        'enemy_class': 'warrior',
        'strength': 6855,
        'dexterity': 2409,
        'intelligence': 2367,
        'constitution': 35150,
        'luck': 1705,
        'health': 62742752
      },
      '4': {
        'enemy_name': 'Night Troll',
        'enemy_level': 358,
        'enemy_class': 'warrior',
        'strength': 6899,
        'dexterity': 2424,
        'intelligence': 2383,
        'constitution': 35442,
        'luck': 1708,
        'health': 63618392
      },
      '5': {
        'enemy_name': 'Panther',
        'enemy_level': 360,
        'enemy_class': 'scout',
        'strength': 1752,
        'dexterity': 6944,
        'intelligence': 1736,
        'constitution': 35728,
        'luck': 2544,
        'health': 51591232
      },
      '6': {
        'enemy_name': 'Man-Eater',
        'enemy_level': 362,
        'enemy_class': 'scout',
        'strength': 1762,
        'dexterity': 6988,
        'intelligence': 1747,
        'constitution': 36008,
        'luck': 2557,
        'health': 52283616
      },
      '7': {
        'enemy_name': 'Swamp Dragon',
        'enemy_level': 364,
        'enemy_class': 'mage',
        'strength': 1742,
        'dexterity': 1773,
        'intelligence': 7156,
        'constitution': 35607,
        'luck': 2563,
        'health': 25993110
      },
      '8': {
        'enemy_name': 'Black Skull Warrior',
        'enemy_level': 366,
        'enemy_class': 'warrior',
        'strength': 7076,
        'dexterity': 2485,
        'intelligence': 2447,
        'constitution': 36570,
        'luck': 1723,
        'health': 67105952
      },
      '9': {
        'enemy_name': 'Dragon of Darkness',
        'enemy_level': 368,
        'enemy_class': 'warrior',
        'strength': 7119,
        'dexterity': 2500,
        'intelligence': 2463,
        'constitution': 36844,
        'luck': 1727,
        'health': 67977184
      },
      '10': {
        'enemy_name': 'Knight of the Black Skull',
        'enemy_level': 370,
        'enemy_class': 'warrior',
        'strength': 7163,
        'dexterity': 2516,
        'intelligence': 2479,
        'constitution': 37114,
        'luck': 1731,
        'health': 68846472
      }
    },
    '11': {
      '1': {
        'enemy_name': 'Happy Slappy the Clown',
        'enemy_level': 372,
        'enemy_class': 'warrior',
        'strength': 7206,
        'dexterity': 2531,
        'intelligence': 2494,
        'constitution': 37389,
        'luck': 1736,
        'health': 69730488
      },
      '2': {
        'enemy_name': 'The Blind Knife Thrower',
        'enemy_level': 374,
        'enemy_class': 'scout',
        'strength': 1826,
        'dexterity': 7249,
        'intelligence': 1812,
        'constitution': 37658,
        'luck': 2639,
        'health': 56487000
      },
      '3': {
        'enemy_name': 'Miniature Gnome',
        'enemy_level': 376,
        'enemy_class': 'warrior',
        'strength': 7292,
        'dexterity': 2561,
        'intelligence': 2525,
        'constitution': 37922,
        'luck': 1745,
        'health': 71482968
      },
      '4': {
        'enemy_name': 'The Bearded Lady',
        'enemy_level': 378,
        'enemy_class': 'warrior',
        'strength': 7336,
        'dexterity': 2576,
        'intelligence': 2541,
        'constitution': 38192,
        'luck': 1750,
        'health': 72373840
      },
      '5': {
        'enemy_name': 'The Psycho Juggler',
        'enemy_level': 380,
        'enemy_class': 'mage',
        'strength': 1830,
        'dexterity': 1858,
        'intelligence': 7489,
        'constitution': 37846,
        'luck': 2673,
        'health': 28838652
      },
      '6': {
        'enemy_name': 'Siamese Twins',
        'enemy_level': 382,
        'enemy_class': 'scout',
        'strength': 1869,
        'dexterity': 7421,
        'intelligence': 1855,
        'constitution': 38714,
        'luck': 2694,
        'health': 59309848
      },
      '7': {
        'enemy_name': 'Bronco the Joker',
        'enemy_level': 384,
        'enemy_class': 'warrior',
        'strength': 7464,
        'dexterity': 2620,
        'intelligence': 2586,
        'constitution': 38978,
        'luck': 1765,
        'health': 75032648
      },
      '8': {
        'enemy_name': 'The Snake-man',
        'enemy_level': 386,
        'enemy_class': 'scout',
        'strength': 1890,
        'dexterity': 7507,
        'intelligence': 1876,
        'constitution': 39237,
        'luck': 2721,
        'health': 60738876
      },
      '9': {
        'enemy_name': 'Madame Mystique',
        'enemy_level': 388,
        'enemy_class': 'mage',
        'strength': 1874,
        'dexterity': 1900,
        'intelligence': 7654,
        'constitution': 38918,
        'luck': 2729,
        'health': 30278204
      },
      '10': {
        'enemy_name': 'Bozo the Terror Clown',
        'enemy_level': 390,
        'enemy_class': 'warrior',
        'strength': 7592,
        'dexterity': 2665,
        'intelligence': 2632,
        'constitution': 39754,
        'luck': 1781,
        'health': 77719072
      }
    },
    '12': {
      '1': {
        'enemy_name': 'Restless Soul',
        'enemy_level': 392,
        'enemy_class': 'mage',
        'strength': 1895,
        'dexterity': 1921,
        'intelligence': 7737,
        'constitution': 39440,
        'luck': 2756,
        'health': 30999840
      },
      '2': {
        'enemy_name': 'Furious Soul',
        'enemy_level': 394,
        'enemy_class': 'mage',
        'strength': 1906,
        'dexterity': 1931,
        'intelligence': 7778,
        'constitution': 39704,
        'luck': 2770,
        'health': 31366160
      },
      '3': {
        'enemy_name': 'Old Soul',
        'enemy_level': 396,
        'enemy_class': 'warrior',
        'strength': 7718,
        'dexterity': 2709,
        'intelligence': 2677,
        'constitution': 40513,
        'luck': 1797,
        'health': 80418304
      },
      '4': {
        'enemy_name': 'Pest',
        'enemy_level': 398,
        'enemy_class': 'scout',
        'strength': 1952,
        'dexterity': 7761,
        'intelligence': 1940,
        'constitution': 40766,
        'luck': 2804,
        'health': 65062536
      },
      '5': {
        'enemy_name': 'Soul Clump',
        'enemy_level': 400,
        'enemy_class': 'mage',
        'strength': 1938,
        'dexterity': 1963,
        'intelligence': 7901,
        'constitution': 40480,
        'luck': 2812,
        'health': 32464960
      },
      '6': {
        'enemy_name': 'Scourge',
        'enemy_level': 404,
        'enemy_class': 'warrior',
        'strength': 7884,
        'dexterity': 2766,
        'intelligence': 2736,
        'constitution': 41476,
        'luck': 1824,
        'health': 83988896
      },
      '7': {
        'enemy_name': 'Hellhound',
        'enemy_level': 408,
        'enemy_class': 'scout',
        'strength': 2003,
        'dexterity': 7965,
        'intelligence': 1991,
        'constitution': 41932,
        'luck': 2874,
        'health': 68600752
      },
      '8': {
        'enemy_name': 'The Fuehrer\'s Heap',
        'enemy_level': 412,
        'enemy_class': 'warrior',
        'strength': 8046,
        'dexterity': 2823,
        'intelligence': 2793,
        'constitution': 42383,
        'luck': 1854,
        'health': 87520896
      },
      '9': {
        'enemy_name': 'The Devil\'s Advocate',
        'enemy_level': 416,
        'enemy_class': 'warrior',
        'strength': 8127,
        'dexterity': 2851,
        'intelligence': 2821,
        'constitution': 42840,
        'luck': 1868,
        'health': 89321400
      },
      '10': {
        'enemy_name': 'Beelzeboss',
        'enemy_level': 420,
        'enemy_class': 'warrior',
        'strength': 8208,
        'dexterity': 2880,
        'intelligence': 2850,
        'constitution': 43296,
        'luck': 1884,
        'health': 91138080
      }
    },
    '13': {
      '1': {
        'enemy_name': 'Hellgore the Hellish',
        'enemy_level': 424,
        'enemy_class': 'warrior',
        'strength': 9041,
        'dexterity': 3171,
        'intelligence': 3141,
        'constitution': 47883,
        'luck': 2049,
        'health': 101751376
      },
      '2': {
        'enemy_name': 'Henry the Magic Fairy',
        'enemy_level': 428,
        'enemy_class': 'mage',
        'strength': 2342,
        'dexterity': 2365,
        'intelligence': 9511,
        'constitution': 49432,
        'luck': 3374,
        'health': 42414372
      },
      '3': {
        'enemy_name': 'Jet the Panty Raider',
        'enemy_level': 432,
        'enemy_class': 'warrior',
        'strength': 9811,
        'dexterity': 3441,
        'intelligence': 3411,
        'constitution': 52140,
        'luck': 2201,
        'health': 112883104
      },
      '4': {
        'enemy_name': 'Clapper van Hellsing',
        'enemy_level': 436,
        'enemy_class': 'mage',
        'strength': 2545,
        'dexterity': 2568,
        'intelligence': 10322,
        'constitution': 53922,
        'luck': 3657,
        'health': 47127828
      },
      '5': {
        'enemy_name': 'The KOma KOmmander',
        'enemy_level': 440,
        'enemy_class': 'warrior',
        'strength': 10958,
        'dexterity': 3842,
        'intelligence': 3813,
        'constitution': 58465,
        'luck': 2428,
        'health': 128915328
      },
      '6': {
        'enemy_name': 'Roughian the Ruthless',
        'enemy_level': 444,
        'enemy_class': 'scout',
        'strength': 3133,
        'dexterity': 12490,
        'intelligence': 3122,
        'constitution': 66896,
        'luck': 4454,
        'health': 119074880
      },
      '7': {
        'enemy_name': 'Ben the Marketeer',
        'enemy_level': 448,
        'enemy_class': 'mage',
        'strength': 3360,
        'dexterity': 3383,
        'intelligence': 13579,
        'constitution': 71868,
        'luck': 4796,
        'health': 64537464
      },
      '8': {
        'enemy_name': 'Hector the Contractor',
        'enemy_level': 452,
        'enemy_class': 'warrior',
        'strength': 14533,
        'dexterity': 5093,
        'intelligence': 5064,
        'constitution': 78150,
        'luck': 3140,
        'health': 177009744
      },
      '9': {
        'enemy_name': 'Motu with a Club',
        'enemy_level': 456,
        'enemy_class': 'warrior',
        'strength': 15630,
        'dexterity': 5477,
        'intelligence': 5448,
        'constitution': 84188,
        'luck': 3359,
        'health': 192369584
      },
      '10': {
        'enemy_name': 'Jack the Hammerer',
        'enemy_level': 460,
        'enemy_class': 'warrior',
        'strength': 19366,
        'dexterity': 6785,
        'intelligence': 6756,
        'constitution': 104742,
        'luck': 4105,
        'health': 241430304
      }
    },
    '14': {
      '1': {
        'enemy_name': 'Robert Drunkatheon',
        'enemy_level': 464,
        'enemy_class': 'warrior',
        'strength': 9040,
        'dexterity': 3173,
        'intelligence': 3135,
        'constitution': 47416,
        'luck': 2110,
        'health': 110242200
      },
      '2': {
        'enemy_name': 'Lefty Lennister',
        'enemy_level': 468,
        'enemy_class': 'warrior',
        'strength': 9126,
        'dexterity': 3202,
        'intelligence': 3166,
        'constitution': 47938,
        'luck': 2120,
        'health': 112414608
      },
      '3': {
        'enemy_name': 'Petyr the Pimp',
        'enemy_level': 472,
        'enemy_class': 'mage',
        'strength': 4576,
        'dexterity': 4634,
        'intelligence': 18651,
        'constitution': 95656,
        'luck': 6636,
        'health': 90490576
      },
      '4': {
        'enemy_name': 'Holundor',
        'enemy_level': 476,
        'enemy_class': 'warrior',
        'strength': 18592,
        'dexterity': 6524,
        'intelligence': 6454,
        'constitution': 97944,
        'luck': 4284,
        'health': 233596448
      },
      '5': {
        'enemy_name': 'Drogo the Threatening',
        'enemy_level': 480,
        'enemy_class': 'warrior',
        'strength': 18761,
        'dexterity': 6582,
        'intelligence': 6514,
        'constitution': 98962,
        'luck': 4306,
        'health': 238003616
      },
      '6': {
        'enemy_name': 'The Ginger Slowworm',
        'enemy_level': 484,
        'enemy_class': 'mage',
        'strength': 7945,
        'dexterity': 8026,
        'intelligence': 32266,
        'constitution': 167706,
        'luck': 11446,
        'health': 162674816
      },
      '7': {
        'enemy_name': 'Queen Mother',
        'enemy_level': 488,
        'enemy_class': 'scout',
        'strength': 8625,
        'dexterity': 34344,
        'intelligence': 8586,
        'constitution': 182798,
        'luck': 12301,
        'health': 357552896
      },
      '8': {
        'enemy_name': 'The Miniature Poodle',
        'enemy_level': 492,
        'enemy_class': 'warrior',
        'strength': 41522,
        'dexterity': 14558,
        'intelligence': 14457,
        'constitution': 222387,
        'luck': 9089,
        'health': 548183936
      },
      '9': {
        'enemy_name': 'The Riding Mountainrange',
        'enemy_level': 496,
        'enemy_class': 'warrior',
        'strength': 47500,
        'dexterity': 16500,
        'intelligence': 16000,
        'constitution': 270000,
        'luck': 11000,
        'health': 852414656
      },
      '10': {
        'enemy_name': 'Joffrey the Kid Despot',
        'enemy_level': 500,
        'enemy_class': 'mage',
        'strength': 9500,
        'dexterity': 11000,
        'intelligence': 40200,
        'constitution': 190000,
        'luck': 29800,
        'health': 454106400
      },
      '11': {
        'enemy_name': 'Cool Villain',
        'enemy_level': 504,
        'enemy_class': 'scout',
        'strength': 10719,
        'dexterity': 42680,
        'intelligence': 10670,
        'constitution': 227166,
        'luck': 15287,
        'health': 458875328
      },
      '12': {
        'enemy_name': 'Brygitte',
        'enemy_level': 508,
        'enemy_class': 'mage',
        'strength': 13425,
        'dexterity': 13546,
        'intelligence': 54428,
        'constitution': 284718,
        'luck': 19279,
        'health': 289842912
      },
      '13': {
        'enemy_name': 'Snowman and Shadow Wolf',
        'enemy_level': 512,
        'enemy_class': 'warrior',
        'strength': 54533,
        'dexterity': 19122,
        'intelligence': 18973,
        'constitution': 290763,
        'luck': 12109,
        'health': 745807104
      },
      '14': {
        'enemy_name': 'The Woman in Red',
        'enemy_level': 516,
        'enemy_class': 'scout',
        'strength': 13838,
        'dexterity': 55118,
        'intelligence': 13779,
        'constitution': 294118,
        'luck': 19707,
        'health': 608236032
      },
      '15': {
        'enemy_name': 'Boyish Brienne',
        'enemy_level': 520,
        'enemy_class': 'warrior',
        'strength': 66837,
        'dexterity': 23434,
        'intelligence': 23261,
        'constitution': 356928,
        'luck': 14768,
        'health': 929797440
      },
      '16': {
        'enemy_name': 'Ramsay the Degrader',
        'enemy_level': 524,
        'enemy_class': 'warrior',
        'strength': 67527,
        'dexterity': 23675,
        'intelligence': 23504,
        'constitution': 360872,
        'luck': 14886,
        'health': 947289024
      },
      '17': {
        'enemy_name': 'Faceless',
        'enemy_level': 528,
        'enemy_class': 'mage',
        'strength': 16985,
        'dexterity': 17120,
        'intelligence': 68752,
        'constitution': 361823,
        'luck': 24319,
        'health': 382808736
      },
      '18': {
        'enemy_name': 'Vicious Gnome',
        'enemy_level': 532,
        'enemy_class': 'mage',
        'strength': 20016,
        'dexterity': 20171,
        'intelligence': 80997,
        'constitution': 426706,
        'luck': 28643,
        'health': 454868608
      },
      '19': {
        'enemy_name': 'The Protector',
        'enemy_level': 536,
        'enemy_class': 'warrior',
        'strength': 81165,
        'dexterity': 28453,
        'intelligence': 28262,
        'constitution': 434616,
        'luck': 17779,
        'health': 1166944000
      },
      '20': {
        'enemy_name': 'The Hard to Burn',
        'enemy_level': 540,
        'enemy_class': 'scout',
        'strength': 20563,
        'dexterity': 81950,
        'intelligence': 20487,
        'constitution': 439082,
        'luck': 29219,
        'health': 950173440
      }
    },
    '16': {
      '1': {
        'enemy_name': 'Eloquent Hat',
        'enemy_level': 410,
        'enemy_class': 'scout',
        'strength': 8400,
        'dexterity': 66000,
        'intelligence': 8400,
        'constitution': 157500,
        'luck': 27000,
        'health': 468750016
      },
      '2': {
        'enemy_name': 'Sour Argus',
        'enemy_level': 420,
        'enemy_class': 'warrior',
        'strength': 58332,
        'dexterity': 14424,
        'intelligence': 14556,
        'constitution': 196785,
        'luck': 28584,
        'health': 597611456
      },
      '3': {
        'enemy_name': 'Fluffy Friend',
        'enemy_level': 430,
        'enemy_class': 'scout',
        'strength': 9300,
        'dexterity': 67740,
        'intelligence': 9360,
        'constitution': 198000,
        'luck': 28800,
        'health': 513187488
      },
      '4': {
        'enemy_name': 'A. van Blame',
        'enemy_level': 440,
        'enemy_class': 'scout',
        'strength': 11790,
        'dexterity': 73920,
        'intelligence': 11880,
        'constitution': 207000,
        'luck': 35640,
        'health': 554774976
      },
      '5': {
        'enemy_name': 'Phony Locky',
        'enemy_level': 450,
        'enemy_class': 'mage',
        'strength': 23214,
        'dexterity': 23190,
        'intelligence': 73494,
        'constitution': 221647,
        'luck': 45972,
        'health': 299962912
      },
      '6': {
        'enemy_name': 'Killer Stare',
        'enemy_level': 460,
        'enemy_class': 'scout',
        'strength': 26790,
        'dexterity': 74640,
        'intelligence': 26580,
        'constitution': 243450,
        'luck': 47760,
        'health': 706649984
      },
      '7': {
        'enemy_name': 'Bad Kisser',
        'enemy_level': 470,
        'enemy_class': 'scout',
        'strength': 23460,
        'dexterity': 77880,
        'intelligence': 23100,
        'constitution': 245250,
        'luck': 47820,
        'health': 722437504
      },
      '8': {
        'enemy_name': 'Guardian of the Golden Egg',
        'enemy_level': 480,
        'enemy_class': 'warrior',
        'strength': 89244,
        'dexterity': 18792,
        'intelligence': 11916,
        'constitution': 262327,
        'luck': 48132,
        'health': 1039800576
      },
      '9': {
        'enemy_name': 'Gentle Giant',
        'enemy_level': 490,
        'enemy_class': 'warrior',
        'strength': 86820,
        'dexterity': 33240,
        'intelligence': 33414,
        'constitution': 315225,
        'luck': 61182,
        'health': 1307133056
      },
      '10': {
        'enemy_name': 'Pedigree Bad Boy',
        'enemy_level': 500,
        'enemy_class': 'mage',
        'strength': 35466,
        'dexterity': 26028,
        'intelligence': 73044,
        'constitution': 315225,
        'luck': 51240,
        'health': 534621568
      },
      '11': {
        'enemy_name': 'Unrepentant Penitent',
        'enemy_level': 510,
        'enemy_class': 'mage',
        'strength': 19326,
        'dexterity': 19326,
        'intelligence': 99462,
        'constitution': 278055,
        'luck': 53784,
        'health': 483444928
      },
      '12': {
        'enemy_name': 'The Gifted One (and Ron)',
        'enemy_level': 520,
        'enemy_class': 'mage',
        'strength': 36768,
        'dexterity': 36342,
        'intelligence': 102168,
        'constitution': 345127,
        'luck': 65430,
        'health': 622523712
      },
      '13': {
        'enemy_name': 'Stumbledoor',
        'enemy_level': 530,
        'enemy_class': 'mage',
        'strength': 30906,
        'dexterity': 31422,
        'intelligence': 111318,
        'constitution': 359460,
        'luck': 72780,
        'health': 676144192
      },
      '14': {
        'enemy_name': 'Petey Rat',
        'enemy_level': 540,
        'enemy_class': 'scout',
        'strength': 35250,
        'dexterity': 121020,
        'intelligence': 35220,
        'constitution': 325350,
        'luck': 55920,
        'health': 1264800000
      },
      '15': {
        'enemy_name': 'Diabolical Dolores',
        'enemy_level': 550,
        'enemy_class': 'mage',
        'strength': 33900,
        'dexterity': 34464,
        'intelligence': 119256,
        'constitution': 389340,
        'luck': 75114,
        'health': 785428544
      },
      '16': {
        'enemy_name': 'Inconveniently Infinite Inferi',
        'enemy_level': 560,
        'enemy_class': 'warrior',
        'strength': 224978,
        'dexterity': 55368,
        'intelligence': 54462,
        'constitution': 433845,
        'luck': 80154,
        'health': 1196667008
      },
      '17': {
        'enemy_name': 'Bella the Beastly',
        'enemy_level': 570,
        'enemy_class': 'mage',
        'strength': 46638,
        'dexterity': 46632,
        'intelligence': 116148,
        'constitution': 410917,
        'luck': 79146,
        'health': 876589696
      },
      '18': {
        'enemy_name': 'Lucius the Pure-Blood',
        'enemy_level': 580,
        'enemy_class': '',
        'strength': 0,
        'dexterity': 0,
        'intelligence': 0,
        'constitution': 0,
        'luck': 0,
        'health': 0
      },
      '19': {
        'enemy_name': 'Cutsie Cuddler',
        'enemy_level': 590,
        'enemy_class': 'scout',
        'strength': 45021,
        'dexterity': 165800,
        'intelligence': 75600,
        'constitution': 44342,
        'luck': 101840,
        'health': 1545725056
      },
      '20': {
        'enemy_name': 'You Should Know Who ...',
        'enemy_level': 0,
        'enemy_class': '',
        'strength': 0,
        'dexterity': 0,
        'intelligence': 0,
        'constitution': 0,
        'luck': 0,
        'health': 0
      }
    },
    '17': {
      '1': {
        'enemy_name': 'Orc on Warg',
        'enemy_level': 328,
        'enemy_class': 'warrior',
        'strength': 52800,
        'dexterity': 6720,
        'intelligence': 6720,
        'constitution': 126000,
        'luck': 21600,
        'health': 207270000
      },
      '2': {
        'enemy_name': 'Troll Trio',
        'enemy_level': 349,
        'enemy_class': 'warrior',
        'strength': 48416,
        'dexterity': 11972,
        'intelligence': 12081,
        'constitution': 163332,
        'luck': 23725,
        'health': 285831008
      },
      '3': {
        'enemy_name': 'The King',
        'enemy_level': 370,
        'enemy_class': 'mage',
        'strength': 7998,
        'dexterity': 7998,
        'intelligence': 58256,
        'constitution': 170280,
        'luck': 24768,
        'health': 126347760
      },
      '4': {
        'enemy_name': 'Smollum',
        'enemy_level': 392,
        'enemy_class': 'scout',
        'strength': 10493,
        'dexterity': 65789,
        'intelligence': 10573,
        'constitution': 184230,
        'luck': 31720,
        'health': 289609568
      },
      '5': {
        'enemy_name': 'Spiders again',
        'enemy_level': 414,
        'enemy_class': 'scout',
        'strength': 21357,
        'dexterity': 67614,
        'intelligence': 21357,
        'constitution': 203916,
        'luck': 42294,
        'health': 338500544
      },
      '6': {
        'enemy_name': 'Orc Boss',
        'enemy_level': 437,
        'enemy_class': 'warrior',
        'strength': 70908,
        'dexterity': 25251,
        'intelligence': 25251,
        'constitution': 231278,
        'luck': 45372,
        'health': 506498816
      },
      '7': {
        'enemy_name': 'Bezog',
        'enemy_level': 461,
        'enemy_class': 'scout',
        'strength': 22991,
        'dexterity': 76322,
        'intelligence': 22638,
        'constitution': 240345,
        'luck': 46864,
        'health': 444157568
      },
      '8': {
        'enemy_name': 'Smoulder',
        'enemy_level': 485,
        'enemy_class': 'mage',
        'strength': 18980,
        'dexterity': 18980,
        'intelligence': 90136,
        'constitution': 264951,
        'luck': 48613,
        'health': 257532368
      },
      '9': {
        'enemy_name': 'Nazguls...Nazgulses?',
        'enemy_level': 505,
        'enemy_class': 'warrior',
        'strength': 89425,
        'dexterity': 34237,
        'intelligence': 34416,
        'constitution': 324682,
        'luck': 63017,
        'health': 821445440
      },
      '10': {
        'enemy_name': 'Monster in the Lake',
        'enemy_level': 525,
        'enemy_class': 'scout',
        'strength': 37239,
        'dexterity': 76696,
        'intelligence': 37239,
        'constitution': 330986,
        'luck': 53802,
        'health': 696394560
      },
      '11': {
        'enemy_name': 'Valaraukar',
        'enemy_level': 546,
        'enemy_class': 'warrior',
        'strength': 106424,
        'dexterity': 20679,
        'intelligence': 20679,
        'constitution': 347519,
        'luck': 57549,
        'health': 950464448
      },
      '12': {
        'enemy_name': 'Urcsi the Uruk',
        'enemy_level': 567,
        'enemy_class': 'warrior',
        'strength': 111363,
        'dexterity': 39613,
        'intelligence': 39613,
        'constitution': 376189,
        'luck': 71319,
        'health': 1068376768
      },
      '13': {
        'enemy_name': 'Prompter Splittongue',
        'enemy_level': 588,
        'enemy_class': 'scout',
        'strength': 34306,
        'dexterity': 123563,
        'intelligence': 34306,
        'constitution': 399001,
        'luck': 80786,
        'health': 940046336
      },
      '14': {
        'enemy_name': 'Samowar the Pale',
        'enemy_level': 600,
        'enemy_class': 'mage',
        'strength': 39832,
        'dexterity': 39832,
        'intelligence': 136753,
        'constitution': 417645,
        'luck': 63190,
        'health': 502009280
      },
      '15': {
        'enemy_name': 'Oliphaunt Tamer',
        'enemy_level': 612,
        'enemy_class': 'warrior',
        'strength': 137144,
        'dexterity': 39634,
        'intelligence': 39634,
        'constitution': 447741,
        'luck': 86381,
        'health': 1372326144
      },
      '16': {
        'enemy_name': 'Undead Army',
        'enemy_level': 624,
        'enemy_class': 'warrior',
        'strength': 163224,
        'dexterity': 64781,
        'intelligence': 63721,
        'constitution': 507599,
        'luck': 93780,
        'health': 1586246912
      },
      '17': {
        'enemy_name': 'Shelantula',
        'enemy_level': 636,
        'enemy_class': 'scout',
        'strength': 55499,
        'dexterity': 174216,
        'intelligence': 55499,
        'constitution': 538992,
        'luck': 94184,
        'health': 1373351680
      },
      '18': {
        'enemy_name': 'Ruler of the Nine',
        'enemy_level': 0,
        'enemy_class': '',
        'strength': 0,
        'dexterity': 0,
        'intelligence': 0,
        'constitution': 0,
        'luck': 0,
        'health': 0
      },
      '19': {
        'enemy_name': 'Mauron\'s Maw',
        'enemy_level': 0,
        'enemy_class': '',
        'strength': 0,
        'dexterity': 0,
        'intelligence': 0,
        'constitution': 0,
        'luck': 0,
        'health': 0
      },
      '20': {
        'enemy_name': 'The Necromancer',
        'enemy_level': 0,
        'enemy_class': '',
        'strength': 0,
        'dexterity': 0,
        'intelligence': 0,
        'constitution': 0,
        'luck': 0,
        'health': 0
      }
    },
    '18': {
      '1': {
        'enemy_name': 'DoctorBenx',
        'enemy_level': 222,
        'enemy_class': 'warrior',
        'strength': 90000,
        'dexterity': 2000,
        'intelligence': 2000,
        'constitution': 74000,
        'luck': 5000,
        'health': 80000000
      },
      '2': {
        'enemy_name': 'Zakreble',
        'enemy_level': 244,
        'enemy_class': 'warrior',
        'strength': 100000,
        'dexterity': 2500,
        'intelligence': 2500,
        'constitution': 84000,
        'luck': 6000,
        'health': 100000000
      },
      '3': {
        'enemy_name': 'Golden Gianpy',
        'enemy_level': 266,
        'enemy_class': 'mage',
        'strength': 3000,
        'dexterity': 3000,
        'intelligence': 120000,
        'constitution': 100000,
        'luck': 7200,
        'health': 120000000
      },
      '4': {
        'enemy_name': 'Willyrex',
        'enemy_level': 288,
        'enemy_class': 'scout',
        'strength': 3500,
        'dexterity': 140000,
        'intelligence': 3500,
        'constitution': 120000,
        'luck': 8600,
        'health': 144000000
      },
      '5': {
        'enemy_name': 'Alvaro845',
        'enemy_level': 333,
        'enemy_class': 'mage',
        'strength': 4000,
        'dexterity': 4000,
        'intelligence': 180000,
        'constitution': 144000,
        'luck': 10300,
        'health': 172000000
      },
      '6': {
        'enemy_name': 'Paul Terra',
        'enemy_level': 366,
        'enemy_class': 'mage',
        'strength': 4500,
        'dexterity': 4500,
        'intelligence': 215000,
        'constitution': 172000,
        'luck': 12400,
        'health': 206000000
      },
      '7': {
        'enemy_name': 'Spieletrend',
        'enemy_level': 399,
        'enemy_class': 'mage',
        'strength': 5000,
        'dexterity': 5000,
        'intelligence': 240000,
        'constitution': 206000,
        'luck': 15000,
        'health': 248000000
      },
      '8': {
        'enemy_name': 'Fatty Pillow',
        'enemy_level': 444,
        'enemy_class': 'warrior',
        'strength': 290000,
        'dexterity': 6000,
        'intelligence': 6000,
        'constitution': 248000,
        'luck': 18000,
        'health': 300000000
      },
      '9': {
        'enemy_name': 'Gimper',
        'enemy_level': 488,
        'enemy_class': 'warrior',
        'strength': 350000,
        'dexterity': 7000,
        'intelligence': 7000,
        'constitution': 300000,
        'luck': 21500,
        'health': 360000000
      },
      '10': {
        'enemy_name': 'Unge',
        'enemy_level': 555,
        'enemy_class': 'scout',
        'strength': 10000,
        'dexterity': 400000,
        'intelligence': 10000,
        'constitution': 360000,
        'luck': 24000,
        'health': 430000000
      }
    },
    '19': {
      '1': {
        'enemy_name': 'Heimdall',
        'enemy_level': 345,
        'enemy_class': 'warrior',
        'strength': 48500,
        'dexterity': 12000,
        'intelligence': 12000,
        'constitution': 163000,
        'luck': 23500,
        'health': 318257504
      },
      '2': {
        'enemy_name': 'Valkyries',
        'enemy_level': 390,
        'enemy_class': 'warrior',
        'strength': 65500,
        'dexterity': 10500,
        'intelligence': 10500,
        'constitution': 184000,
        'luck': 31500,
        'health': 404800000
      },
      '3': {
        'enemy_name': 'Hel',
        'enemy_level': 435,
        'enemy_class': 'mage',
        'strength': 25000,
        'dexterity': 25000,
        'intelligence': 70500,
        'constitution': 231000,
        'luck': 45000,
        'health': 226149008
      },
      '4': {
        'enemy_name': 'Thor',
        'enemy_level': 485,
        'enemy_class': 'warrior',
        'strength': 90000,
        'dexterity': 19000,
        'intelligence': 18500,
        'constitution': 265000,
        'luck': 48500,
        'health': 721462528
      },
      '5': {
        'enemy_name': 'Odin',
        'enemy_level': 525,
        'enemy_class': 'warrior',
        'strength': 76500,
        'dexterity': 37000,
        'intelligence': 37000,
        'constitution': 330500,
        'luck': 53500,
        'health': 972496256
      },
      '6': {
        'enemy_name': 'Loki',
        'enemy_level': 565,
        'enemy_class': 'scout',
        'strength': 39500,
        'dexterity': 111000,
        'intelligence': 39500,
        'constitution': 376000,
        'luck': 71500,
        'health': 951280000
      },
      '7': {
        'enemy_name': 'Ymir',
        'enemy_level': 600,
        'enemy_class': 'warrior',
        'strength': 136500,
        'dexterity': 39500,
        'intelligence': 39500,
        'constitution': 417500,
        'luck': 63000,
        'health': 1120570112
      },
      '8': {
        'enemy_name': 'Midgard Serpent',
        'enemy_level': 0,
        'enemy_class': '',
        'strength': 0,
        'dexterity': 0,
        'intelligence': 0,
        'constitution': 0,
        'luck': 0,
        'health': 0
      },
      '9': {
        'enemy_name': 'Fenris Wolf',
        'enemy_level': 0,
        'enemy_class': '',
        'strength': 0,
        'dexterity': 0,
        'intelligence': 0,
        'constitution': 0,
        'luck': 0,
        'health': 0
      },
      '10': {
        'enemy_name': 'Surtr',
        'enemy_level': 0,
        'enemy_class': '',
        'strength': 0,
        'dexterity': 0,
        'intelligence': 0,
        'constitution': 0,
        'luck': 0,
        'health': 0
      }
    }
  },
  'PORTAL': {
      '1': {
        'enemy_name': 'Beast',
        'enemy_level': 200,
        'enemy_class': 'warrior',
        'strength': 3835,
        'dexterity': 1344,
        'intelligence': 1330,
        'constitution': 35760,
        'luck': 945,
        'health': 35938800
      },
      '2': {
        'enemy_name': 'Hunchbacked Zombie',
        'enemy_level': 206,
        'enemy_class': 'warrior',
        'strength': 4308,
        'dexterity': 1490,
        'intelligence': 1475,
        'constitution': 39810,
        'luck': 1077,
        'health': 41203352
      },
      '3': {
        'enemy_name': 'Full Duplex Zombie',
        'enemy_level': 212,
        'enemy_class': 'warrior',
        'strength': 4654,
        'dexterity': 1646,
        'intelligence': 1577,
        'constitution': 43090,
        'luck': 1139,
        'health': 45890848
      },
      '4': {
        'enemy_name': 'Thorny Devourer',
        'enemy_level': 218,
        'enemy_class': 'scout',
        'strength': 1259,
        'dexterity': 5010,
        'intelligence': 1257,
        'constitution': 46900,
        'luck': 1811,
        'health': 41084400
      },
      '5': {
        'enemy_name': 'Sinister Smasher',
        'enemy_level': 224,
        'enemy_class': 'warrior',
        'strength': 5357,
        'dexterity': 1877,
        'intelligence': 1857,
        'constitution': 50300,
        'luck': 1334,
        'health': 56587500
      },
      '6': {
        'enemy_name': 'Unspeakable',
        'enemy_level': 230,
        'enemy_class': 'mage',
        'strength': 1448,
        'dexterity': 1473,
        'intelligence': 5852,
        'constitution': 52910,
        'luck': 2092,
        'health': 24444420
      },
      '7': {
        'enemy_name': 'Corpus Eruptus',
        'enemy_level': 236,
        'enemy_class': 'warrior',
        'strength': 6307,
        'dexterity': 2225,
        'intelligence': 2190,
        'constitution': 59480,
        'luck': 1514,
        'health': 70483800
      },
      '8': {
        'enemy_name': 'Masterful Massacrist',
        'enemy_level': 242,
        'enemy_class': 'warrior',
        'strength': 6707,
        'dexterity': 2351,
        'intelligence': 2327,
        'constitution': 63300,
        'luck': 1641,
        'health': 76909504
      },
      '9': {
        'enemy_name': 'Eight Legged Ariane',
        'enemy_level': 248,
        'enemy_class': 'scout',
        'strength': 1825,
        'dexterity': 7181,
        'intelligence': 1768,
        'constitution': 67370,
        'luck': 2599,
        'health': 67100520
      },
      '10': {
        'enemy_name': 'King Knuckelbone',
        'enemy_level': 254,
        'enemy_class': 'warrior',
        'strength': 7575,
        'dexterity': 2670,
        'intelligence': 2643,
        'constitution': 71650,
        'luck': 1804,
        'health': 91353752
    },
      '11': {
        'enemy_name': 'Ritualist',
        'enemy_level': 260,
        'enemy_class': 'scout',
        'strength': 2021,
        'dexterity': 8052,
        'intelligence': 2015,
        'constitution': 76260,
        'luck': 2945,
        'health': 79615440
      },
      '12': {
        'enemy_name': 'Desert Devourer',
        'enemy_level': 266,
        'enemy_class': 'mage',
        'strength': 2145,
        'dexterity': 2137,
        'intelligence': 8676,
        'constitution': 79570,
        'luck': 3108,
        'health': 42490380
      },
      '13': {
        'enemy_name': 'Snaker',
        'enemy_level': 272,
        'enemy_class': 'mage',
        'strength': 2252,
        'dexterity': 2298,
        'intelligence': 9240,
        'constitution': 84820,
        'luck': 3271,
        'health': 46311720
      },
      '14': {
        'enemy_name': 'Snake Mage',
        'enemy_level': 278,
        'enemy_class': 'scout',
        'strength': 2411,
        'dexterity': 9601,
        'intelligence': 2403,
        'constitution': 91250,
        'luck': 3501,
        'health': 101835000
      },
      '15': {
        'enemy_name': 'Gory Gatherer',
        'enemy_level': 284,
        'enemy_class': 'warrior',
        'strength': 10178,
        'dexterity': 3546,
        'intelligence': 3499,
        'constitution': 96320,
        'luck': 2404,
        'health': 137256000
      },
      '16': {
        'enemy_name': 'Lithic Leviathan',
        'enemy_level': 290,
        'enemy_class': 'warrior',
        'strength': 10716,
        'dexterity': 3773,
        'intelligence': 3736,
        'constitution': 102050,
        'luck': 2507,
        'health': 148482752
      },
      '17': {
        'enemy_name': 'Ghastly Grey',
        'enemy_level': 296,
        'enemy_class': 'scout',
        'strength': 2833,
        'dexterity': 11280,
        'intelligence': 2823,
        'constitution': 107530,
        'luck': 4102,
        'health': 127745640
      },
      '18': {
        'enemy_name': 'Malicious Martha',
        'enemy_level': 302,
        'enemy_class': 'mage',
        'strength': 2942,
        'dexterity': 2941,
        'intelligence': 11900,
        'constitution': 110310,
        'luck': 4250,
        'health': 66847860
      },
      '19': {
        'enemy_name': 'Big Z',
        'enemy_level': 308,
        'enemy_class': 'mage',
        'strength': 2993,
        'dexterity': 3032,
        'intelligence': 12183,
        'constitution': 112620,
        'luck': 4313,
        'health': 69599160
      },
      '20': {
        'enemy_name': 'Father of Lies',
        'enemy_level': 314,
        'enemy_class': 'mage',
        'strength': 3032,
        'dexterity': 3083,
        'intelligence': 12402,
        'constitution': 115330,
        'luck': 4440,
        'health': 72657904
    },
      '21': {
        'enemy_name': 'Spikey Spiteful',
        'enemy_level': 320,
        'enemy_class': 'scout',
        'strength': 3163,
        'dexterity': 12462,
        'intelligence': 3113,
        'constitution': 119120,
        'luck': 4513,
        'health': 152950080
      },
      '22': {
        'enemy_name': 'Hellmutt',
        'enemy_level': 326,
        'enemy_class': 'scout',
        'strength': 3214,
        'dexterity': 12733,
        'intelligence': 3204,
        'constitution': 121430,
        'luck': 4576,
        'health': 158830432
      },
      '23': {
        'enemy_name': 'Soldier of Doom',
        'enemy_level': 332,
        'enemy_class': 'scout',
        'strength': 3253,
        'dexterity': 12964,
        'intelligence': 3243,
        'constitution': 124140,
        'luck': 4703,
        'health': 165354480
      },
      '24': {
        'enemy_name': 'Blood Occultist',
        'enemy_level': 338,
        'enemy_class': 'mage',
        'strength': 3304,
        'dexterity': 3303,
        'intelligence': 13354,
        'constitution': 124730,
        'luck': 4756,
        'health': 84566944
      },
      '25': {
        'enemy_name': 'Biting Batbuck',
        'enemy_level': 344,
        'enemy_class': 'scout',
        'strength': 3395,
        'dexterity': 13454,
        'intelligence': 3385,
        'constitution': 128640,
        'luck': 4829,
        'health': 177853200
      },
      '26': {
        'enemy_name': 'His Pestilence',
        'enemy_level': 350,
        'enemy_class': 'warrior',
        'strength': 13674,
        'dexterity': 4805,
        'intelligence': 4754,
        'constitution': 131350,
        'luck': 3166,
        'health': 230519248
      },
      '27': {
        'enemy_name': 'Obstructor',
        'enemy_level': 356,
        'enemy_class': 'scout',
        'strength': 3909,
        'dexterity': 15600,
        'intelligence': 3899,
        'constitution': 150620,
        'luck': 5613,
        'health': 215085360
      },
      '28': {
        'enemy_name': 'Martyrdom\'s Maiden',
        'enemy_level': 362,
        'enemy_class': 'warrior',
        'strength': 16416,
        'dexterity': 5727,
        'intelligence': 5728,
        'constitution': 158250,
        'luck': 3680,
        'health': 287223744
      },
      '29': {
        'enemy_name': 'Muscular Muzzle',
        'enemy_level': 368,
        'enemy_class': 'mage',
        'strength': 4283,
        'dexterity': 4334,
        'intelligence': 17409,
        'constitution': 165280,
        'luck': 6139,
        'health': 121976640
      },
      '30': {
        'enemy_name': 'Azmo Fantasmo',
        'enemy_level': 374,
        'enemy_class': 'mage',
        'strength': 4494,
        'dexterity': 4533,
        'intelligence': 18268,
        'constitution': 173990,
        'luck': 6478,
        'health': 130492496
    },
      '31': {
        'enemy_name': 'Premature Hellspawn',
        'enemy_level': 380,
        'enemy_class': 'scout',
        'strength': 4733,
        'dexterity': 18756,
        'intelligence': 4671,
        'constitution': 182060,
        'luck': 6713,
        'health': 277459456
      },
      '32': {
        'enemy_name': 'Angel of Pain',
        'enemy_level': 386,
        'enemy_class': 'warrior',
        'strength': 19740,
        'dexterity': 6929,
        'intelligence': 6890,
        'constitution': 192010,
        'luck': 4328,
        'health': 371539360
      },
      '33': {
        'enemy_name': 'h4xx0r',
        'enemy_level': 392,
        'enemy_class': 'warrior',
        'strength': 20459,
        'dexterity': 7164,
        'intelligence': 7125,
        'constitution': 199200,
        'luck': 4505,
        'health': 391428000
      },
      '34': {
        'enemy_name': 'Loricate Biter',
        'enemy_level': 398,
        'enemy_class': 'warrior',
        'strength': 21242,
        'dexterity': 7417,
        'intelligence': 7366,
        'constitution': 206510,
        'luck': 4646,
        'health': 411987456
      },
      '35': {
        'enemy_name': 'Slender Person',
        'enemy_level': 404,
        'enemy_class': 'mage',
        'strength': 5477,
        'dexterity': 5528,
        'intelligence': 22179,
        'constitution': 212580,
        'luck': 7809,
        'health': 172189792
      },
      '36': {
        'enemy_name': 'Hammerer',
        'enemy_level': 410,
        'enemy_class': 'mage',
        'strength': 5588,
        'dexterity': 5639,
        'intelligence': 22638,
        'constitution': 217690,
        'luck': 8020,
        'health': 178941184
      },
      '37': {
        'enemy_name': 'Horrendous Hag',
        'enemy_level': 416,
        'enemy_class': 'mage',
        'strength': 5739,
        'dexterity': 5738,
        'intelligence': 23109,
        'constitution': 222280,
        'luck': 8167,
        'health': 185381520
      },
      '38': {
        'enemy_name': 'Deeply Fallen',
        'enemy_level': 422,
        'enemy_class': 'warrior',
        'strength': 23450,
        'dexterity': 8225,
        'intelligence': 8186,
        'constitution': 228590,
        'luck': 5070,
        'health': 483467840
      },
      '39': {
        'enemy_name': 'Demon of Terror',
        'enemy_level': 428,
        'enemy_class': 'mage',
        'strength': 6037,
        'dexterity': 6088,
        'intelligence': 24435,
        'constitution': 235660,
        'luck': 8649,
        'health': 202196288
      },
      '40': {
        'enemy_name': 'Exitus Prime',
        'enemy_level': 434,
        'enemy_class': 'mage',
        'strength': 6192,
        'dexterity': 6191,
        'intelligence': 24918,
        'constitution': 240370,
        'luck': 8800,
        'health': 209121904
    },
      '41': {
        'enemy_name': 'Brute',
        'enemy_level': 440,
        'enemy_class': 'warrior',
        'strength': 25271,
        'dexterity': 8862,
        'intelligence': 8823,
        'constitution': 246800,
        'luck': 5435,
        'health': 544193984
      },
      '42': {
        'enemy_name': 'Nasty Trapper',
        'enemy_level': 446,
        'enemy_class': 'scout',
        'strength': 6448,
        'dexterity': 25753,
        'intelligence': 6438,
        'constitution': 252030,
        'luck': 9178,
        'health': 450629632
      },
      '43': {
        'enemy_name': 'Executor',
        'enemy_level': 452,
        'enemy_class': 'warrior',
        'strength': 26669,
        'dexterity': 9318,
        'intelligence': 9279,
        'constitution': 260780,
        'luck': 5735,
        'health': 590666688
      },
      '44': {
        'enemy_name': 'Fatty on the Rocks',
        'enemy_level': 458,
        'enemy_class': 'mage',
        'strength': 6780,
        'dexterity': 6831,
        'intelligence': 27334,
        'constitution': 264130,
        'luck': 9628,
        'health': 242471344
      },
      '45': {
        'enemy_name': 'Ex-Exorcist',
        'enemy_level': 464,
        'enemy_class': 'warrior',
        'strength': 27647,
        'dexterity': 9694,
        'intelligence': 9655,
        'constitution': 271080,
        'luck': 5959,
        'health': 630260992
      },
      '46': {
        'enemy_name': 'Death Dispenser',
        'enemy_level': 470,
        'enemy_class': 'scout',
        'strength': 7042,
        'dexterity': 28141,
        'intelligence': 7032,
        'constitution': 276030,
        'luck': 10000,
        'health': 520040512
      },
      '47': {
        'enemy_name': 'Shadow of Power',
        'enemy_level': 476,
        'enemy_class': 'mage',
        'strength': 8063,
        'dexterity': 8114,
        'intelligence': 32463,
        'constitution': 315420,
        'luck': 11423,
        'health': 300910688
      },
      '48': {
        'enemy_name': 'Horned Witch',
        'enemy_level': 482,
        'enemy_class': 'mage',
        'strength': 8192,
        'dexterity': 8243,
        'intelligence': 33054,
        'constitution': 321730,
        'luck': 11664,
        'health': 310791168
      },
      '49': {
        'enemy_name': 'Death\'s Best Buddy',
        'enemy_level': 488,
        'enemy_class': 'scout',
        'strength': 8373,
        'dexterity': 33462,
        'intelligence': 8363,
        'constitution': 329240,
        'luck': 11863,
        'health': 643993472
      },
      '50': {
        'enemy_name': 'Devourer of Souls',
        'enemy_level': 500,
        'enemy_class': 'mage',
        'strength': 8664,
        'dexterity': 8715,
        'intelligence': 34864,
        'constitution': 339430,
        'luck': 12264,
        'health': 340108864
      }
  }
};

const OPTIONS = {
    0: { name: 'TOWER', enemies: DUNGEONS.TOWER, group: 'GENERAL' },
    1: { name: 'PORTAL', enemies: DUNGEONS.PORTAL },

    2: { name: 'DESECRATED CATACOMBS', enemies: DUNGEONS.DUNGEON[1], group: 'DUNGEONS' },
    3: { name: 'THE MINES OF GLORIA', enemies: DUNGEONS.DUNGEON[2] },
    4: { name: 'THE RUINS OF GNARK', enemies: DUNGEONS.DUNGEON[3] },
    5: { name: 'THE CUTTHROAT GROTTO', enemies: DUNGEONS.DUNGEON[4] },
    6: { name: 'THE EMERALD SCALE ALTAR', enemies: DUNGEONS.DUNGEON[5] },
    7: { name: 'THE TOXIC TREE', enemies: DUNGEONS.DUNGEON[6] },
    8: { name: 'THE MAGMA STREAM', enemies: DUNGEONS.DUNGEON[7] },
    9: { name: 'THE FROST BLOOD TEMPLE', enemies: DUNGEONS.DUNGEON[8] },
    10: { name: 'THE PYRAMID OF MADNESS', enemies: DUNGEONS.DUNGEON[9] },
    11: { name: 'BLACK SKULL FORTRESS', enemies: DUNGEONS.DUNGEON[10] },
    12: { name: 'CIRCUS OF TERROR', enemies: DUNGEONS.DUNGEON[11] },
    13: { name: 'HELL', enemies: DUNGEONS.DUNGEON[12] },
    14: { name: 'THE 13TH FLOOR', enemies: DUNGEONS.DUNGEON[13] },
    16: { name: 'EASTEROS', enemies: DUNGEONS.DUNGEON[14] },
    17: { name: 'TIME-HONORED SCHOOL OF MAGIC', enemies: DUNGEONS.DUNGEON[16] },
    17: { name: 'HEMORRIDOR', enemies: DUNGEONS.DUNGEON[17] },
    19: { name: 'NORDIC GODS', enemies: DUNGEONS.DUNGEON[19] },

    20: { name: 'DESECRATED CATACOMBS ', enemies: DUNGEONS.SHADOW_DUNGEON[1], group: 'SHADOW DUNGEONS' },
    21: { name: 'THE MINES OF GLORIA ', enemies: DUNGEONS.SHADOW_DUNGEON[2] },
    22: { name: 'THE RUINS OF GNARK ', enemies: DUNGEONS.SHADOW_DUNGEON[3] },
    23: { name: 'THE CUTTHROAT GROTTO ', enemies: DUNGEONS.SHADOW_DUNGEON[4] },
    24: { name: 'THE EMERALD SCALE ALTAR ', enemies: DUNGEONS.SHADOW_DUNGEON[5] },
    25: { name: 'THE TOXIC TREE ', enemies: DUNGEONS.SHADOW_DUNGEON[6] },
    26: { name: 'THE MAGMA STREAM ', enemies: DUNGEONS.SHADOW_DUNGEON[7] },
    27: { name: 'THE FROST BLOOD TEMPLE ', enemies: DUNGEONS.SHADOW_DUNGEON[8] },
    28: { name: 'THE PYRAMID OF MADNESS ', enemies: DUNGEONS.SHADOW_DUNGEON[9] },
    29: { name: 'BLACK SKULL FORTRESS ', enemies: DUNGEONS.SHADOW_DUNGEON[10] },
    30: { name: 'CIRCUS OF TERROR ', enemies: DUNGEONS.SHADOW_DUNGEON[11] },
    31: { name: 'HELL ', enemies: DUNGEONS.SHADOW_DUNGEON[12] },
    32: { name: 'THE 13TH FLOOR ', enemies: DUNGEONS.SHADOW_DUNGEON[13] },
    33: { name: 'EASTEROS ', enemies: DUNGEONS.SHADOW_DUNGEON[14] },
    34: { name: 'TIME-HONORED SCHOOL OF MAGIC ', enemies: DUNGEONS.SHADOW_DUNGEON[16] },
    35: { name: 'HEMORRIDOR ', enemies: DUNGEONS.SHADOW_DUNGEON[17] },
    36: { name: 'NORDIC GODS ', enemies: DUNGEONS.SHADOW_DUNGEON[19] }
};
