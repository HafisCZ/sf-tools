let FIGHT_LOG_ENABLED = false;

class FIGHT_LOG {
    static #allLogs = [];

    static #logRound (attacker, target, damage, type, skip, critical) {
        this.lastLog.rounds.push({
            attackerId: attacker.Player.ID || attacker.Index,
            attackerSpecialState: attacker.specialState(),
            targetId: target.Player.ID || target.Index,
            targetSpecialState: target.specialState(),
            targetHealthLeft: Math.max(0, target.Health - damage),
            targetSkipCount: target.SkipCount,
            attackDamage: damage,
            attackRage: this.currentRage || 1,
            attackType: type,
            attackChained: ATTACKS_CHAIN.includes(type),
            attackSecondary: ATTACKS_SECONDARY.includes(type),
            attackCrit: critical,
            attackMissed: skip,
            attackSpecial: type >= ATTACK_REVIVE
        });
    }

    static dump () {
        return this.#allLogs;
    }

    static logInit (playerA, playerB) {
        this.lastLog = {
            fighterA: {
                ID: playerA.Player.ID || playerA.Index, Name: playerA.Player.Name, Level: playerA.Player.Level,
                TotalHealth: playerA.TotalHealth, Health: playerA.Health, Strength: { Total: playerA.Player.Strength.Total },
                Dexterity: { Total: playerA.Player.Dexterity.Total }, Intelligence: { Total: playerA.Player.Intelligence.Total },
                Constitution: { Total: playerA.Player.Constitution.Total }, Luck: { Total: playerA.Player.Luck.Total }, Face: playerA.Player.Face,
                Race: playerA.Player.Race, Gender: playerA.Player.Gender, Class: playerA.Player.Class,
                Items: { Wpn1: playerA.Player.Items.Wpn1, Wpn2: playerA.Player.Items.Wpn2 }
            },
            fighterB: {
                ID: playerB.Player.ID || playerB.Index, Name: playerB.Player.Name, Level: playerB.Player.Level,
                TotalHealth: playerB.TotalHealth, Health: playerB.Health, Strength: { Total: playerB.Player.Strength.Total },
                Dexterity: { Total: playerB.Player.Dexterity.Total }, Intelligence: { Total: playerB.Player.Intelligence.Total },
                Constitution: { Total: playerB.Player.Constitution.Total }, Luck: { Total: playerB.Player.Luck.Total }, Face: playerB.Player.Face,
                Race: playerB.Player.Race, Gender: playerB.Player.Gender, Class: playerB.Player.Class,
                Items: { Wpn1: playerB.Player.Items.Wpn1, Wpn2: playerB.Player.Items.Wpn2 }
            },
            rounds: []
        }

        this.#allLogs.push(this.lastLog)
    }

    static logRage (currentRage) {
        this.currentRage = currentRage;
    }

    static #calculateType (target, type, skip, critical) {
        const targetWarrior = target.Player.Class === WARRIOR;

        if (type == ATTACK_SWOOP) {
            if (skip) {
                return targetWarrior ? ATTACK_SWOOP_BLOCKED : ATTACK_SWOOP_EVADED;
            } else {
                return ATTACK_SWOOP;
            }
        } else if (type === ATTACK_NORMAL || type === ATTACK_SUMMON || type === ATTACK_SECONDARY_NORMAL || type === ATTACK_CHAIN_NORMAL) {
            if (critical) {
                if (skip) {
                    return type + (targetWarrior ? ATTACK_CRITICAL_BLOCKED : ATTACK_CRITICAL_EVADED);
                } else {
                    return type + ATTACK_CRITICAL;
                }
            } else if (skip) {
                return type + (targetWarrior ? ATTACK_BLOCKED : ATTACK_EVADED);
            } else {
                return type;
            }
        } else {
            return type;
        }
    }

    static logAttack (source, target, damage, baseType, skip, critical) {
        const type = this.#calculateType(target, baseType, skip, critical);

        this.#logRound(
            source,
            target,
            damage,
            type,
            skip,
            critical
        )
    }

    static logFireball (source, target, damage) {
        this.#logRound(
            source,
            target,
            damage,
            damage == 0 ? ATTACK_FIREBALL_BLOCKED : ATTACK_FIREBALL,
            damage == 0,
            false
        )
    }

    static logRevive (source) {
        this.#logRound(
            source,
            source,
            0,
            ATTACK_REVIVE,
            false,
            false
        )
    }

    static logSpell (source, target, level, notes) {
        this.#logRound(
            source,
            target,
            0,
            ATTACK_SPECIAL_SONG + 10 * notes + level,
            false,
            false
        )
    }

    static logSummon (source, target, type, duration) {
        this.#logRound(
            source,
            target,
            0,
            ATTACK_SPECIAL_SUMMON + 10 * duration + type,
            false,
            false
        )
    }
}

// Flags
const FLAGS = Object.defineProperties(
    {
        // Values
        Gladiator15: false,
        // Reductions
        NoGladiatorReduction: false,
        NoAttributeReduction: false
    },
    {
        set: {
            value: function (flags) {
                for (const [key, val] of Object.entries(flags || {})) {
                    this[key] = !!val;
                }
            }
        },
        log: {
            value: function (state) {
                FIGHT_LOG_ENABLED = state;
            }
        }
    }
);

const SKIP_TYPE_DEFAULT = 0;
const SKIP_TYPE_CONTROL = 1;

// Configuration
const CONFIG = Object.defineProperties(
    {
        General: {
            CritBase: 2,
            CritGladiatorBonus: 0.11,
            CritEnchantmentBonus: 0.05
        },
        Warrior: {
            Attribute: 'Strength',

            HealthMultiplier: 5,
            WeaponMultiplier: 2,
            DamageMultiplier: 1,
            MaximumDamageReduction: 50,
            MaximumDamageReductionMultiplier: 1,

            SkipChance: 0.25,
            SkipLimit: 999,
            SkipType: SKIP_TYPE_DEFAULT,

            UseBlockChance: true
        },
        Mage: {
            Attribute: 'Intelligence',

            HealthMultiplier: 2,
            WeaponMultiplier: 4.5,
            DamageMultiplier: 1,
            MaximumDamageReduction: 10,
            MaximumDamageReductionMultiplier: 1,

            BypassDamageReduction: true,
            BypassSkipChance: true,
            BypassSpecial: true,

            SkipChance: 0,
            SkipLimit: 999,
            SkipType: SKIP_TYPE_DEFAULT
        },
        Scout: {
            Attribute: 'Dexterity',

            HealthMultiplier: 4,
            WeaponMultiplier: 2.5,
            DamageMultiplier: 1,
            MaximumDamageReduction: 25,
            MaximumDamageReductionMultiplier: 1,

            SkipChance: 0.50,
            SkipLimit: 999,
            SkipType: SKIP_TYPE_DEFAULT
        },
        Assassin: {
            Attribute: 'Dexterity',

            HealthMultiplier: 4,
            WeaponMultiplier: 2,
            DamageMultiplier: 0.625,
            MaximumDamageReduction: 25,
            MaximumDamageReductionMultiplier: 1,

            SkipChance: 0.50,
            SkipLimit: 999,
            SkipType: SKIP_TYPE_DEFAULT
        },
        Battlemage: {
            Attribute: 'Strength',

            HealthMultiplier: 5,
            WeaponMultiplier: 2,
            DamageMultiplier: 1,
            MaximumDamageReduction: 10,
            MaximumDamageReductionMultiplier: 5,

            SkipChance: 0,
            SkipLimit: 999,
            SkipType: SKIP_TYPE_DEFAULT
        },
        Berserker: {
            Attribute: 'Strength',

            HealthMultiplier: 4,
            WeaponMultiplier: 2,
            DamageMultiplier: 1.25,
            MaximumDamageReduction: 25,
            MaximumDamageReductionMultiplier: 1,

            SkipChance: 0.5,
            SkipLimit: 14,
            SkipType: SKIP_TYPE_CONTROL
        },
        DemonHunter: {
            Attribute: 'Dexterity',

            HealthMultiplier: 4,
            WeaponMultiplier: 2.5,
            DamageMultiplier: 1,
            MaximumDamageReduction: 50,
            MaximumDamageReductionMultiplier: 1,

            SkipChance: 0,
            SkipLimit: 999,
            SkipType: SKIP_TYPE_DEFAULT,

            ReviveChance: 0.44,
            ReviveChanceDecay: 0.02,
            ReviveHealth: 0.9,
            ReviveHealthMin: 0.1,
            ReviveHealthDecay: 0.1,
            ReviveDamage: 1,
            ReviveDamageMin: 0,
            ReviveDamageDecay: 0,
            ReviveMax: 999
        },
        Druid: {
            Attribute: 'Intelligence',

            HealthMultiplier: 5,
            WeaponMultiplier: 4.5,
            DamageMultiplier: 1 / 3,
            MaximumDamageReduction: 20,
            MaximumDamageReductionMultiplier: 2,

            SkipChance: 0.35,
            SkipLimit: 999,
            SkipType: SKIP_TYPE_DEFAULT,

            SwoopChance: 0.25,
            SwoopChanceMin: 0,
            SwoopChanceMax: 0.50,
            SwoopChanceDecay: -0.05,
            SwoopBonus: 0.775,

            Rage: {
                SkipChance: 0,
                CriticalChance: 0.75,
                CriticalChanceBonus: 0.1,
                CriticalBonus: 3.6
            }
        },
        Bard: {
            Attribute: 'Intelligence',

            HealthMultiplier: 2,
            WeaponMultiplier: 4.5,
            DamageMultiplier: 1.125,
            MaximumDamageReduction: 25,
            MaximumDamageReductionMultiplier: 2,

            SkipChance: 0,
            SkipLimit: 999,
            SkipType: SKIP_TYPE_DEFAULT,

            EffectRounds: 4,
            EffectBaseDuration: [1, 1, 2],
            EffectBaseChance: [25, 50, 25],
            EffectValues: [ 20, 40, 60 ]
        },
        Necromancer: {
            Attribute: 'Intelligence',

            HealthMultiplier: 2,
            WeaponMultiplier: 4.5,
            DamageMultiplier: 1,
            MaximumDamageReduction: 10,
            MaximumDamageReductionMultiplier: 1,

            BypassDamageReduction: true,

            SkipChance: 0,
            SkipLimit: 999,
            SkipType: SKIP_TYPE_DEFAULT,

            SummonChance: 0.5,
            Summons: [
                {
                    Duration: 2,
                    DamageMultiplier: 1,
                    SkipChance: 0,
                    CriticalBonus: 0,
                    CriticalChance: 0.5,
                    CriticalChanceBonus: 0,
                    ReviveCount: 2,
                    ReviveDuration: 1,
                    ReviveChance: 0.5
                },
                {
                    Duration: 1,
                    DamageMultiplier: 1.75,
                    SkipChance: 0,
                    CriticalBonus: 0.5,
                    CriticalChance: 0.6,
                    CriticalChanceBonus: 0.1
                },
                {
                    Duration: 3,
                    DamageMultiplier: 0.75,
                    SkipChance: 0.25,
                    CriticalBonus: 0,
                    CriticalChance: 0.5,
                    CriticalChanceBonus: 0
                }
            ]
        }
    },
    {
        set: {
            value: function (config) {
                for (const key of Object.keys(this)) {
                    this[key] = mergeDeep(this[key], (config || {})[key]);
                }
            }
        },
        fromIndex: {
            value: function (index) {
                return Object.values(this)[index];
            }
        },
        indexes: {
            value: function () {
                return Array.from({ length: Object.keys(this).length - 1 }, (_, i) => i + 1);
            }
        },
        classes: {
            value: function () {
                return Object.values(this).slice(1);
            }
        }
    }
);

// Returns true if random chance occured
function getRandom (success) {
    return success && (Math.random() < success);
}

function isObject (item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}

function mergeDeep (target, source) {
    let output = Object.assign({}, target);

    if (isObject(target) && isObject(source)) {
        for (const key of Object.keys(source)) {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    output[key] = mergeDeep(target[key], source[key]);
                }
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        }
    }

    return output;
}

function clamp (value, min, max) {
    return value <= min ? min : (value >= max ? max : value);
}

function getRuneValue (item, rune) {
    return item.AttributeTypes[2] == rune ? item.Attributes[2] : 0;
}

// Classes
const WARRIOR = 1;
const MAGE = 2;
const SCOUT = 3;
const ASSASSIN = 4;
const BATTLEMAGE = 5;
const BERSERKER = 6;
const DEMONHUNTER = 7;
const DRUID = 8;
const BARD = 9;
const NECROMANCER = 10;

// Rune values
const RUNE_FIRE_DAMAGE = 40;
const RUNE_COLD_DAMAGE = 41;
const RUNE_LIGHTNING_DAMAGE = 42;
const RUNE_AUTO_DAMAGE = 999;

// States
const STATE_DEAD = 0;
const STATE_ALIVE = 1;

// Attack types
const ATTACK_NORMAL = 0;
const ATTACK_CRITICAL = 1;
const ATTACK_BLOCKED = 3;
const ATTACK_EVADED = 4;
const ATTACK_CRITICAL_BLOCKED = 8;
const ATTACK_CRITICAL_EVADED = 9;

const ATTACK_SECONDARY_NORMAL = 10;
const ATTACK_SECONDARY_CRITICAL = 11;
const ATTACK_SECONDARY_BLOCKED = 13;
const ATTACK_SECONDARY_EVADED = 14;
const ATTACK_SECONDARY_CRITICAL_BLOCKED = 18;
const ATTACK_SECONDARY_CRITICAL_EVADED = 19;

const ATTACKS_SECONDARY = [                     
    ATTACK_SECONDARY_NORMAL,
    ATTACK_SECONDARY_CRITICAL,
    ATTACK_SECONDARY_BLOCKED,
    ATTACK_SECONDARY_EVADED,
    ATTACK_SECONDARY_CRITICAL_BLOCKED,
    ATTACK_SECONDARY_CRITICAL_EVADED
];

const ATTACK_CHAIN_NORMAL = 20;
const ATTACK_CHAIN_CRITICAL = 21;
const ATTACK_CHAIN_BLOCKED = 23;
const ATTACK_CHAIN_EVADED = 24;
const ATTACK_CHAIN_CRITICAL_BLOCKED = 28;
const ATTACK_CHAIN_CRITICAL_EVADED = 29;

const ATTACKS_CHAIN = [
    ATTACK_CHAIN_NORMAL,
    ATTACK_CHAIN_CRITICAL,
    ATTACK_CHAIN_BLOCKED,
    ATTACK_CHAIN_EVADED,
    ATTACK_CHAIN_CRITICAL_BLOCKED,
    ATTACK_CHAIN_CRITICAL_EVADED
];

const ATTACK_CATAPULT = 2;

const ATTACK_FIREBALL = 15;
const ATTACK_FIREBALL_BLOCKED = 16;

const ATTACK_SWOOP = 5;
const ATTACK_SWOOP_BLOCKED = 6;
const ATTACK_SWOOP_EVADED = 7;

const ATTACK_SUMMON = 30;
const ATTACK_SUMMON_CRITICAL = 31;
const ATTACK_SUMMON_BLOCKED = 33;
const ATTACK_SUMMON_EVADED = 34;

const ATTACKS_SUMMON = [
    ATTACK_SUMMON,
    ATTACK_SUMMON_CRITICAL,
    ATTACK_SUMMON_BLOCKED,
    ATTACK_SUMMON_EVADED
]

const ATTACK_REVIVE = 100;
const ATTACK_SPECIAL_SONG = 200;
const ATTACK_SPECIAL_SUMMON = 300;

// Fighter models
class SimulatorModel {
    static initializeFighters (fighterA, fighterB) {
        fighterA.initialize(fighterB);
        fighterB.initialize(fighterA);
    }

    static create (index, player) {
        const MODELS = {
            [WARRIOR]: WarriorModel,
            [MAGE]: MageModel,
            [SCOUT]: ScoutModel,
            [ASSASSIN]: AssassinModel,
            [BATTLEMAGE]: BattlemageModel,
            [BERSERKER]: BerserkerModel,
            [DEMONHUNTER]: DemonHunterModel,
            [DRUID]: DruidModel,
            [BARD]: BardModel,
            [NECROMANCER]: NecromancerModel
        };

        return new MODELS[player.Class](index, player);
    }

    static normalize (player) {
        return mergeDeep({
            Dungeons: {
                Player: 0,
                Group: 0
            },
            Fortress: {
                Gladiator: 0
            },
            Potions: {
                Life: 0
            },
            Runes: {
                Health: 0,
                ResistanceCold: 0,
                ResistanceFire: 0,
                ResistanceLightning: 0
            },
            Items: {
                Hand: {
                    HasEnchantment: false
                },
                Wpn1: {
                    AttributeTypes: {
                        2: 0
                    },
                    Attributes: {
                        2: 0
                    },
                    DamageMax: 2,
                    DamageMin: 1,
                    HasEnchantment: false
                },
                Wpn2: {
                    AttributeTypes: {
                        2: 0
                    },
                    Attributes: {
                        2: 0
                    },
                    DamageMax: 2,
                    DamageMin: 1,
                    HasEnchantment: false
                }
            }
        }, player);
    }

    constructor (index, player) {
        this.Index = index;
        this.Player = SimulatorModel.normalize(player);

        // Caching
        this.Data = null;
        this.DataHash = String(Math.random());
        this.DataCache = Object.create(null);

        // Configuration
        this.Config = Object.assign(
            Object.create(null),
            CONFIG[this.constructor.name.slice(0, -5)],
            CONFIG.General
        );

        // Random modifiers
        this.AttackFirst = this.Player.Items.Hand.HasEnchantment || false;
        this.TotalHealth = this.getHealth();
    }

    getAttribute (source) {
        return this.Player[source.Config.Attribute].Total;
    }

    // Damage Reduction
    getDamageReduction (source, maximumReduction = this.Config.MaximumDamageReduction) {
        if (source.Config.BypassDamageReduction) {
            return 0;
        } else {
            return (this.Config.MaximumDamageReductionMultiplier) * Math.min(maximumReduction, this.Player.Armor / source.Player.Level);
        }
    }
    
    // Block Chance
    getSkipChance (source) {
        if (source.Config.BypassSkipChance) {
            return 0;
        } else if (this.Config.UseBlockChance && typeof this.Player.BlockChance !== 'undefined') {
            return this.Player.BlockChance / 100;
        } else {
            return this.Config.SkipChance;
        }
    }

    // Critical Chance
    getCriticalChance (target, maximumChance = 0.50, bonusChance = 0) {
        return Math.min(maximumChance, bonusChance + this.Player.Luck.Total * 2.5 / target.Player.Level / 100);
    }

    // Critical Multiplier
    getCriticalMultiplier (weapon, weapon2, target) {
        let multiplier = this.Config.CritBase;
        if (weapon.HasEnchantment || (weapon2 && weapon2.HasEnchantment)) {
            multiplier += this.Config.CritEnchantmentBonus;
        }

        let ownGladiator = this.Player.Fortress.Gladiator || 0;
        let reducingGladiator = target.Player.Fortress.Gladiator || 0;

        if (FLAGS.Gladiator15) {
            ownGladiator = this.Player.NoGladiator ? 0 : 15;
            reducingGladiator = target.Player.NoGladiator ? 0 : 15;
        }

        if (FLAGS.NoGladiatorReduction) {
            reducingGladiator = 0;
        }

        multiplier += this.Config.CritGladiatorBonus * Math.max(0, ownGladiator - reducingGladiator);

        return multiplier;
    }

    // Health
    getHealth () {
        if (this.Player.Health) {
            return this.Player.Health;
        } else {
            let health = this.Player.Constitution.Total;
            health *= this.Config.HealthMultiplier;
            health *= this.Player.Level + 1;

            health = Math.ceil(health * (1 + this.Player.Potions.Life / 100));
            health = Math.ceil(health * (1 + this.Player.Dungeons.Player / 100));
            health = Math.ceil(health * (1 + this.Player.Runes.Health / 100));
            health = Math.ceil(health * (typeof this.Player.HealthMultiplier === 'undefined' ? 1 : this.Player.HealthMultiplier));

            return health;
        }
    }

    getWeaponMultiplier () {
        return this.Config.WeaponMultiplier;
    }

    getBaseDamage (secondary = false) {
        if (this.Player.Level > 10 && !this.Player.NoBaseDamage) {
            const num = (secondary ? 0.1 : 0.7) * (this.Player.Level - 9) * this.getWeaponMultiplier();

            return {
                Min: Math.max(1, Math.ceil(num * 2 / 3)),
                Max: Math.max(2, Math.round(num * 4 / 3))
            };
        } else {
            return {
                Min: 1,
                Max: 2
            }
        }
    }

    getDamageBase (weapon, target) {
        let mf = (1 - target.Player.Runes.ResistanceFire / 100) * (getRuneValue(weapon, RUNE_FIRE_DAMAGE) / 100);
        let mc = (1 - target.Player.Runes.ResistanceCold / 100) * (getRuneValue(weapon, RUNE_COLD_DAMAGE) / 100);
        let ml = (1 - target.Player.Runes.ResistanceLightning / 100) * (getRuneValue(weapon, RUNE_LIGHTNING_DAMAGE) / 100);
        let ma = (1 - Math.min(target.Player.Runes.ResistanceFire, target.Player.Runes.ResistanceCold, target.Player.Runes.ResistanceLightning) / 100) * (getRuneValue(weapon, RUNE_AUTO_DAMAGE) / 100);

        let aa = this.getAttribute(this);
        let ad = FLAGS.NoAttributeReduction ? 0 : (target.getAttribute(this) / 2);

        let base = (1 + this.Player.Dungeons.Group / 100) * (1 - target.getDamageReduction(this) / 100) * (1 + mf + mc + ml + ma);
        base *= this.getDamageMultiplier(target);
        base *= 1 + Math.max(aa / 2, aa - ad) / 10

        return base;
    }

    // Get damage range
    getDamageRange (weapon, target, secondary = false) {
        let dm = this.getDamageBase(weapon, target);
        let bd = this.getBaseDamage(secondary);

        return {
            Base: dm,
            Max: dm * Math.max(weapon.DamageMax, bd.Max),
            Min: dm * Math.max(weapon.DamageMin, bd.Min)
        };
    }

    // Initialize model
    initialize (target) {
        if (this.DataCache[target.DataHash]) {
            this.State = this.Data = this.DataCache[target.DataHash];
        } else {
            this.State = this.Data = Object.create(null);
            this.initializeData(target);

            this.DataCache[target.DataHash] = this.Data;
        }
    }

    initializeData (target) {
        const weapon1 = this.Player.Items.Wpn1;
        const weapon2 = this.Player.Items.Wpn2;

        this.Data.Weapon1 = this.getDamageRange(weapon1, target);

        // Default state
        this.Data.SkipChance = this.getSkipChance(target);
        this.Data.CriticalChance = this.getCriticalChance(target);
        this.Data.CriticalMultiplier = this.getCriticalMultiplier(weapon1, weapon2, target);
    }

    reset (resetHealth = true) {
        // Reset state to default
        this.State = this.Data;
        this.SkipCount = 0;

        // Reset health if required (never for guild fights or dungeon fights)
        if (resetHealth) {
            this.Health = this.TotalHealth;
        }
    }

    // Triggers after player receives damage (blocked or evaded damage appears as 0)
    onDamageTaken (source, damage) {
        return (this.Health -= damage) > 0 ? STATE_ALIVE : STATE_DEAD;
    }

    // Returns true when model is in special state
    specialState () {
        return this.State !== this.Data;
    }

    // Enters special or default state if no state given
    enterState (state = this.Data) {
        this.State = state;
    }

    // Attack
    attack (damage, target, skipped, critical, type) {
        if (skipped) {
            damage = 0;

            // Advance skip count
            target.SkipCount++;
        } else {
            if (critical) {
                damage *= this.State.CriticalMultiplier;
            }

            damage = Math.trunc(damage);

            // Reset skip count
            target.SkipCount = 0;
        }

        if (FIGHT_LOG_ENABLED) {
            FIGHT_LOG.logAttack(
                this,
                target,
                damage,
                type,
                skipped,
                critical
            )
        }

        return target.onDamageTaken(this, damage) != STATE_DEAD;
    }

    // Returns extra damage multiplier, default is 1 for no extra damage
    getDamageMultiplier (target) {
        return this.Config.DamageMultiplier;
    }

    // Before anyone takes control
    before (instance, target) {

    }

    // Take control
    control (instance, target) {
        const weapon = this.Data.Weapon1;

        this.attack(
            instance.getRage() * (Math.random() * (1 + weapon.Max - weapon.Min) + weapon.Min),
            target,
            target.skip(SKIP_TYPE_DEFAULT),
            getRandom(this.State.CriticalChance),
            ATTACK_NORMAL
        )
    }

    skip (type) {
        if (this.Config.SkipType === type && getRandom(this.State.SkipChance) && this.SkipCount < this.Config.SkipLimit) {
            this.SkipCount++;

            return true;
        } else {
            return false;
        }
    }

    createState (target, config) {
        const state = {
            Config: config,
            SkipChance: target.Config.BypassSkipChance ? 0 : config.SkipChance,
            CriticalMultiplier: this.Data.CriticalMultiplier + config.CriticalBonus,
            CriticalChance: this.getCriticalChance(target, config.CriticalChance, config.CriticalChanceBonus),
            Weapon1: this.Data.Weapon1
        }
    
        if (typeof config.DamageMultiplier !== 'undefined') {
            state.Weapon1 = {
                Base: config.DamageMultiplier * this.Data.Weapon1.Base,
                Max: config.DamageMultiplier * this.Data.Weapon1.Max,
                Min: config.DamageMultiplier * this.Data.Weapon1.Min
            }
        }
    
        return state;
    }
}

class WarriorModel extends SimulatorModel {

}

class MageModel extends SimulatorModel {

}

class ScoutModel extends SimulatorModel {

}

class AssassinModel extends SimulatorModel {
    initializeData (target) {
        super.initializeData(target);

        this.Data.Weapon2 = this.getDamageRange(this.Player.Items.Wpn2, target, true);
    }

    control (instance, target) {
        const weapon1 = this.Data.Weapon1;
        if (this.attack(
            instance.getRage() * (Math.random() * (1 + weapon1.Max - weapon1.Min) + weapon1.Min),
            target,
            getRandom(target.State.SkipChance) && target.Config.SkipType === SKIP_TYPE_DEFAULT,
            getRandom(this.State.CriticalChance),
            ATTACK_NORMAL
        )) {
            const weapon2 = this.Data.Weapon2;
            this.attack(
                instance.getRage() * (Math.random() * (1 + weapon2.Max - weapon2.Min) + weapon2.Min),
                target,
                getRandom(target.State.SkipChance) && target.Config.SkipType === SKIP_TYPE_DEFAULT,
                getRandom(this.State.CriticalChance),
                ATTACK_SECONDARY_NORMAL
            )
        }
    }
}

class BattlemageModel extends SimulatorModel {
    getFireballDamage (target) {
        if (target.Config.BypassSpecial) {
            return 0;
        } else {
            const multiplier = 0.05 * target.Config.HealthMultiplier;

            return Math.min(Math.ceil(target.TotalHealth / 3), Math.ceil(this.TotalHealth * multiplier));
        }
    }

    before (instance, target) {
        instance.getRage();
        
        const damage = this.getFireballDamage(target);

        if (FIGHT_LOG_ENABLED) {
            FIGHT_LOG.logFireball(this, target, damage);
        }

        if (damage === 0) {
            // Do nothing
        } else {
            target.onDamageTaken(this, damage);
        }
    }
}

class BerserkerModel extends SimulatorModel {
    control (instance, target) {
        const weapon = this.Data.Weapon1;

        this.attack(
            instance.getRage() * (Math.random() * (1 + weapon.Max - weapon.Min) + weapon.Min),
            target,
            getRandom(target.State.SkipChance) && target.Config.SkipType === SKIP_TYPE_DEFAULT,
            getRandom(this.State.CriticalChance),
            this.SkipCount > 0 ? ATTACK_CHAIN_NORMAL : ATTACK_NORMAL
        )
    }
}

class DemonHunterModel extends SimulatorModel {
    constructor (i, p) {
        super(i, p);
    }

    reset (resetHealth = true) {
        super.reset(resetHealth);

        this.DeathTriggers = 0;
    }

    onDamageTaken (source, damage) {
        let state = super.onDamageTaken(source, damage);

        if (state == STATE_DEAD) {
            const reviveChance = this.Config.ReviveChance - this.Config.ReviveChanceDecay * this.DeathTriggers;

            if (!source.Config.BypassSpecial && this.DeathTriggers < this.Config.ReviveMax && getRandom(reviveChance)) {
                this.Health = this.TotalHealth * Math.max(this.Config.ReviveHealthMin, this.Config.ReviveHealth - this.DeathTriggers * this.Config.ReviveHealthDecay);
                this.DeathTriggers += 1;

                if (FIGHT_LOG_ENABLED) {
                    FIGHT_LOG.logRevive(this);
                }

                return STATE_ALIVE;
            }
        }

        return state;
    }

    attack (damage, target, skipped, critical, type) {
        const multiplier = Math.max(this.Config.ReviveDamageMin, this.Config.ReviveDamage - this.DeathTriggers * this.Config.ReviveDamageDecay);

        return super.attack(
            damage * multiplier,
            target,
            skipped,
            critical,
            type
        )
    }
}

class DruidModel extends SimulatorModel {
    constructor (i, p) {
        super(i, p);

        this.SwoopMultiplier = (this.Config.DamageMultiplier + this.Config.SwoopBonus) / this.Config.DamageMultiplier;
    }

    reset (resetHealth = true) {
        super.reset(resetHealth);

        this.SwoopChance = this.Config.SwoopChance;
        this.RequestState = false;
    }

    initializeData (target) {
        super.initializeData(target);

        this.Data.RageState = this.createState(target, this.Config.Rage);
    }

    attack (damage, target, skipped, critical, type) {
        if (this.RequestState) {
            this.RequestState = false;

            this.enterState(this.Data.RageState);
        } else if (this.specialState()) {
            this.enterState();
        }

        if (this.specialState()) {
            return super.attack(
                damage,
                target,
                skipped,
                critical,
                type
            );
        } else if (this.SwoopChance > 0 && getRandom(this.SwoopChance)) {
            this.SwoopChance = clamp(this.SwoopChance - this.Config.SwoopChanceDecay, this.Config.SwoopChanceMin, this.Config.SwoopChanceMax);
            
            // Swoop
            return super.attack(
                damage * this.SwoopMultiplier,
                target,
                skipped,
                false,
                ATTACK_SWOOP
            );
        } else {
            return super.attack(
                damage,
                target,
                skipped,
                critical,
                type
            );
        }
    }

    onDamageTaken (source, damage) {
        if (damage == 0 && !this.specialState()) {
            this.RequestState = true;
        }

        return super.onDamageTaken(source, damage);
    }
}

class BardModel extends SimulatorModel {
    constructor (i, p) {
        super(i, p);

        // Brackets
        this.Bracket0 = this.Config.EffectBaseChance[0];
        this.Bracket1 = this.Bracket0 + this.Config.EffectBaseChance[1];
        this.Bracket2 = this.Bracket1 + this.Config.EffectBaseChance[2];

        // Bonus round
        this.BonusRounds = 0;

        const mainAttribute = this.getAttribute(this);
        if (this.Player.Constitution.Total >= mainAttribute / 2) {
            this.BonusRounds++;
        }
        if (this.Player.Constitution.Total >= 3 * mainAttribute / 4) {
            this.BonusRounds++;
        }
    }

    reset (resetHealth = true) {
        super.reset(resetHealth);

        this.EffectCurrent = 0;

        // How many notes were casted
        this.EffectReset = 0;
        // How many notes were consumed
        this.EffectCounter = this.Config.EffectRounds;
        // How many rounds passed since cast
        this.EffectRound = this.Config.EffectRounds;
    }

    initializeData (target) {
        super.initializeData(target);

        this.Data.BeforeAttack = !target.Config.BypassSpecial;
    }

    rollEffect () {
        const roll = Math.random() * this.Bracket2;
        const level = roll <= this.Bracket0 ? 0 : (roll <= this.Bracket1 ? 1 : 2);

        this.EffectLevel = level + 1;
        this.EffectReset = this.Config.EffectBaseDuration[level] + this.BonusRounds;
        this.EffectCounter = 0;
        this.EffectRound = 0;

        this.EffectCurrent = 1 + this.Config.EffectValues[level] / 100;
    }

    consumeMultiplier (target) {
        this.EffectCounter += 1;

        if (FIGHT_LOG_ENABLED) {
            FIGHT_LOG.logSpell(
                this,
                target,
                this.EffectLevel,
                this.EffectReset - this.EffectCounter + 1
            );
        }

        if (this.EffectCounter >= this.EffectReset) {
            this.EffectCurrent = 0;
        }
    }

    control (instance, target) {
        if (this.Data.BeforeAttack) {
            this.EffectRound += 1;

            if (this.EffectRound >= this.Config.EffectRounds) {
                this.rollEffect();
            }
        }

        return super.control(instance, target);
    }

    attack (damage, target, skipped, critical, type) {
        if (this.EffectCurrent) {
            damage *= this.EffectCurrent;
        }

        const state = super.attack(
            damage,
            target,
            skipped,
            critical,
            type
        )

        if (this.EffectCurrent) {
            this.consumeMultiplier(target);
        }

        return state;
    }
}

class NecromancerModel extends SimulatorModel {
    initializeData (target) {
        super.initializeData(target);

        this.Data.Minions = this.Config.Summons.map((summon) => this.createState(target, summon));
    }

    reset (resetHealth = true) {
        super.reset(resetHealth);

        this.Minion = null;
    }

    summonMinion (target) {
        const type = Math.trunc(Math.random() * 3);
        const minion = this.Data.Minions[type];

        this.Minion = minion;
        this.MinionType = type + 1;
        this.MinionDuration = minion.Config.Duration;
        this.MinionRevives = minion.Config.ReviveCount;

        if (FIGHT_LOG_ENABLED) {
            FIGHT_LOG.logSummon(
                this,
                target,
                this.MinionType,
                this.MinionDuration
            )
        }

        // Enter summon state
        this.enterState(this.Minion);
    }

    expireMinion (target) {
        this.MinionDuration--;

        // Remove minion if expired
        if (this.MinionDuration <= 0) {
            // Check if minion can be revived
            if (getRandom(this.MinionRevives)) {
                this.MinionDuration = this.Minion.Config.ReviveDuration;
                this.MinionRevives--;

                // Log resurrection like another summoning
                if (FIGHT_LOG_ENABLED) {
                    FIGHT_LOG.logSummon(
                        this,
                        target,
                        this.MinionType,
                        this.MinionDuration
                    )
                }
            } else {
                // Remove minion and leave state
                this.Minion = null;

                this.enterState();
            }
        }
    }

    attackMinion (instance, target) {
        const weapon = this.State.Weapon1;

        this.attack(
            instance.getRage() * (Math.random() * (1 + weapon.Max - weapon.Min) + weapon.Min),
            target,
            target.skip(SKIP_TYPE_DEFAULT),
            getRandom(this.State.CriticalChance),
            ATTACK_SUMMON
        )
    }

    control (instance, target) {
        if (target.Config.BypassSpecial) {
            // Necromancer cannot summon against mages
            super.control(instance, target);
        } else if (this.Minion) {
            // Take control as player
            this.enterState();
            super.control(instance, target);

            // Take control as minion
            this.enterState(this.Minion);
            this.attackMinion(instance, target);

            this.expireMinion(target);
        } else if (getRandom(this.Config.SummonChance)) {
            // Increment range to 'waste' a turn
            instance.getRage();

            this.summonMinion(target);
        } else {
            // Attack as usual
            super.control(instance, target);
        }
    }
}

// Shared class between all simulators in order to make updates simple
class SimulatorBase {
    getRage () {
        const rage = 1 + this.turn++ / 6;

        if (FIGHT_LOG_ENABLED) {
            FIGHT_LOG.logRage(rage);
        }

        return rage;
    }

    fight () {
        this.turn = 0;

        if (FIGHT_LOG_ENABLED) {
            FIGHT_LOG.logInit(this.a, this.b);
        }

        // Shuffle
        if (this.a.AttackFirst == this.b.AttackFirst ? getRandom(0.50) : this.b.AttackFirst) {
            const swap = this.a; this.a = this.b; this.b = swap;
        }

        this.a.before(this, this.b);
        this.b.before(this, this.a);

        while (this.a.Health > 0 && this.b.Health > 0) {
            if (this.b.skip(SKIP_TYPE_CONTROL)) {
                this.getRage();
            } else {
                this.a.control(this, this.b);
            }

            // Swap
            const swap = this.a; this.a = this.b; this.b = swap;
        }

        // Winner
        return (this.a.Health > 0 ? this.a.Index : this.b.Index) == 0;
    }
}
