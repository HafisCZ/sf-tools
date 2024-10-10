let FIGHT_LOG_ENABLED = false;

class FIGHT_LOG {
    static #allLogs = [];

    static logRound (attacker, target, damage, attackType, defenseType) {
        this.lastLog.rounds.push({
            attackerId: attacker.Player.ID || attacker.Index,
            targetId: target.Player.ID || target.Index,
            attackerState: attacker.getCurrentStateForLog(),
            targetState: target.getCurrentStateForLog(),
            attackType,
            defenseType,
            attackerHealth: attacker.Health,
            targetHealth: Math.max(0, target.Health - damage),
            attackerEffects: attacker.getCurrentEffectsForLog(),
            targetEffects: target.getCurrentEffectsForLog(),
            // Extra fields emitted by the simulator to avoid having to re-compute these in analyzer
            attackDamage: damage,
            attackRage: this.currentRage || 1,
            // Types
            attackTypeSecondary: ATTACK_TYPES_SECONDARY.includes(attackType),
            attackTypeCritical: ATTACK_TYPES_CRITICAL.includes(attackType),
            attackTypeSpecial: ATTACK_TYPE_SPECIAL.includes(attackType)
        })
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
            MaximumDamageReduction: 50,
            MaximumDamageReductionMultiplier: 0.5,

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
            ReviveChanceDecay: 0.11,
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
            MaximumDamageReduction: 25,
            MaximumDamageReductionMultiplier: 1,

            SkipChance: 0.35,
            SkipLimit: 999,
            SkipType: SKIP_TYPE_DEFAULT,

            DemonHunterDamageMultiplier: 1.15,
            MageDamageMultiplier: 4 / 3,

            SwoopChance: 0.15,
            SwoopChanceMin: 0,
            SwoopChanceMax: 0.50,
            SwoopChanceDecay: -0.05,
            SwoopBonus: 0.8,

            Rage: {
                SkipChance: 0,
                CriticalChance: 0.75,
                CriticalChanceBonus: 0.1,
                CriticalBonus: 4
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
            EffectValues: [ 0.2, 0.4, 0.6 ]
        },
        Necromancer: {
            Attribute: 'Intelligence',

            HealthMultiplier: 4,
            WeaponMultiplier: 4.5,
            DamageMultiplier: 5 / 9,
            MaximumDamageReduction: 10,
            MaximumDamageReductionMultiplier: 2,

            SkipChance: 0,
            SkipLimit: 999,
            SkipType: SKIP_TYPE_DEFAULT,

            DemonHunterDamageBonus: 0.1,

            SummonChance: 0.5,
            SummonImmediateAttack: true,
            Summons: [
                {
                    Duration: 3,
                    DamageBonus: 0.25,
                    SkipChance: 0,
                    CriticalBonus: 0,
                    CriticalChance: 0.5,
                    CriticalChanceBonus: 0,
                    ReviveCount: 2,
                    ReviveDuration: 1,
                    ReviveChance: 0.5
                },
                {
                    Duration: 2,
                    DamageBonus: 1,
                    SkipChance: 0,
                    CriticalBonus: 0.5,
                    CriticalChance: 0.6,
                    CriticalChanceBonus: 0.1
                },
                {
                    Duration: 4,
                    DamageBonus: 0,
                    SkipChance: 0.25,
                    CriticalBonus: 0,
                    CriticalChance: 0.5,
                    CriticalChanceBonus: 0
                }
            ]
        },
        Paladin: {
            Attribute: 'Strength',

            HealthMultiplier: 7,
            WeaponMultiplier: 2,
            DamageMultiplier: 0.72,

            MaximumDamageReduction: 55,
            MaximumDamageReductionMultiplier: 1,

            SkipChance: 0,
            SkipLimit: 999,
            SkipType: SKIP_TYPE_DEFAULT,

            AssassinDamageMultiplier: 1,
            DruidDamageMultiplier: 1,
            
            StanceInitial: 0,
            Stances: [
                {
                    Name: 'NEUTRAL',
                    /* Nothing, he just sad */
                    DamageBonus: 0,
                    DamageReductionBonus: 0,
                    MaximumDamageReductionBonus: 0,
                    SkipChance: 0,
                    CriticalBonus: 0,
                    CriticalChance: 0.5,
                    CriticalChanceBonus: 0,
                    StanceChangeChance: 0.5
                },
                {
                    Name: 'DEFENSIVE',
                    DamageBonus: 0,
                    DamageReductionBonus: 11.25,
                    MaximumDamageReductionBonus: 0,
                    SkipChance: 0,
                    CriticalBonus: 0,
                    CriticalChance: 0.5,
                    CriticalChanceBonus: 0,
                    StanceChangeChance: 0.5
                },
                {
                    Name: 'OFFENSIVE',
                    DamageBonus: 0.35,
                    DamageReductionBonus: 0,
                    MaximumDamageReductionBonus: 0,
                    SkipChance: 0,
                    CriticalBonus: 0,
                    CriticalChance: 0.5,
                    CriticalChanceBonus: 0,
                    StanceChangeChance: 0.5
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
                output[key] = mergeDeep(target[key] || {}, source[key]);
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
const PALADIN = 11;

// Rune values
const RUNE_FIRE_DAMAGE = 40;
const RUNE_COLD_DAMAGE = 41;
const RUNE_LIGHTNING_DAMAGE = 42;
const RUNE_AUTO_DAMAGE = 999;

// States
const STATE_DEAD = 0;
const STATE_ALIVE = 1;

// Attack types
const FIGHTER_STATE_NORMAL = 0;
const FIGHTER_STATE_DRUID_HIDDEN = 10;
const FIGHTER_STATE_DRUID_RAGE = 11;
const FIGHTER_STATE_PALADIN_DEFENSIVE = 20;
const FIGHTER_STATE_PALADIN_OFFENSIVE = 21;
const FIGHTER_STATE_BERSERKER_RAGE = 30;

const ATTACK_TYPE_NORMAL = 0;
const ATTACK_TYPE_CRITICAL = 1;
const ATTACK_TYPE_CATAPULT = 2;
const ATTACK_TYPE_FIREBALL = 10;
const ATTACK_TYPE_MINION_SUMMON = 11;
const ATTACK_TYPE_MINION = 12;
const ATTACK_TYPE_SWOOP = 13;
const ATTACK_TYPE_REVIVE = 14;
const ATTACK_TYPE_MINION_CRITICAL = 15;
const ATTACK_TYPE_SWOOP_CRITICAL = 16;
const ATTACK_TYPE_NORMAL_SECONDARY = 100;
const ATTACK_TYPE_CRITICAL_SECONDARY = 101;

const ATTACK_TYPES_SECONDARY = [
    ATTACK_TYPE_NORMAL_SECONDARY,
    ATTACK_TYPE_CRITICAL_SECONDARY
]

const ATTACK_TYPES_CRITICAL = [
    ATTACK_TYPE_CRITICAL,
    ATTACK_TYPE_SWOOP_CRITICAL,
    ATTACK_TYPE_CRITICAL_SECONDARY,
    ATTACK_TYPE_MINION_CRITICAL
]

const ATTACK_TYPE_SPECIAL = [
    ATTACK_TYPE_MINION_SUMMON,
    ATTACK_TYPE_REVIVE
]

const DEFENSE_TYPE_NONE = 0;
const DEFENSE_TYPE_BLOCK = 3;
const DEFENSE_TYPE_EVADE = 4;
const DEFENSE_TYPE_MAGIC = 5;

const EFFECT_TYPE_SONG = 1;
const EFFECT_TYPE_MINION = 2;

// Modifiers
const SNACKS = {
    '1': { RuneDamageType: RUNE_FIRE_DAMAGE, RuneDamageBonus: 30 },
    '1_legendary': { RuneDamageType: RUNE_FIRE_DAMAGE, RuneDamageBonus: 50 },
    '2': { RuneDamageType: RUNE_COLD_DAMAGE, RuneDamageBonus: 30 },
    '2_legendary': { RuneDamageType: RUNE_COLD_DAMAGE, RuneDamageBonus: 50 },
    '3': { RuneDamageType: RUNE_LIGHTNING_DAMAGE, RuneDamageBonus: 30 },
    '3_legendary': { RuneDamageType: RUNE_LIGHTNING_DAMAGE, RuneDamageBonus: 50 },
    '4': { RuneResistanceFireBonus: 30, RuneResistanceColdBonus: 30 },
    '4_legendary': { RuneResistanceFireBonus: 50, RuneResistanceColdBonus: 50 },
    '5': { RuneResistanceLightningBonus: 30, RuneResistanceFireBonus: 30 },
    '5_legendary': { RuneResistanceLightningBonus: 50, RuneResistanceFireBonus: 50 },
    '6': { RuneResistanceColdBonus: 30, RuneResistanceLightningBonus: 30 },
    '6_legendary': { RuneResistanceColdBonus: 50, RuneResistanceLightningBonus: 50 },
    '7': { AttributeBonus: 0.1 },
    '7_legendary': { AttributeBonus: 0.2 },
    '8': { ConstitutionBonus: 0.1 },
    '8_legendary': { ConstitutionBonus: 0.2 },
    '9': { LuckBonus: 0.15 },
    '9_legendary': { LuckBonus: 0.3 },
    '10': { CriticalBonus: 0.35 },
    '10_legendary': { CriticalBonus: 0.5 },
    '11': { MaximumDamageReductionBonus: 10 },
    '11_legendary': { MaximumDamageReductionBonus: 20 },
    '12': { SideAttributeBonus: 0.15 },
    '12_legendary': { SideAttributeBonus: 0.3 },
    '13': { /* No fight bonus */ },
    '13_legendary': { /* No fight bonus */ }
}

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
            [NECROMANCER]: NecromancerModel,
            [PALADIN]: PaladinModel
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

        // Snacks
        const snack = SNACKS[player.Snack];

        this.Snack = snack ?? {};
        if (snack) {
            this.Snack.DamageBonus = this.Player.SnackPotency;
        }

        // Caching
        this.Data = null;
        this.DataHash = String(Math.random());
        this.DataCache = Object.create(null);

        // Configuration
        this.ConfigKey = this.constructor.name.slice(0, -5);
        this.Config = Object.assign(
            Object.create(null),
            CONFIG[this.ConfigKey],
            CONFIG.General
        );

        // Random modifiers
        this.AttackFirst = this.Player.Items.Hand.HasEnchantment || false;
        this.TotalHealth = this.getHealth();
    }

    getAttribute (source) {
        let attribute = this.Player[source.Config.Attribute].Total;

        // Following is true if it's main attribute
        if (this.Config.Attribute === source.Config.Attribute) {
            attribute *= 1 + (this.Snack.AttributeBonus ?? 0);
        } else {
            attribute *= 1 + (this.Snack.SideAttributeBonus ?? 0);
        }

        return attribute;
    }

    // Damage Reduction
    getDamageReduction (source, maximumReduction = this.Config.MaximumDamageReduction, flatBonusReduction = 0) {
        if (source.Config.BypassDamageReduction) {
            return 0;
        } else {
            return this.Config.MaximumDamageReductionMultiplier * Math.min(maximumReduction + (this.Snack.MaximumDamageReductionBonus ?? 0), flatBonusReduction + this.Player.Armor / source.Player.Level);
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
        multiplier += this.Snack.CriticalBonus ?? 0;

        return multiplier;
    }

    // Health
    getHealth () {
        if (this.Player.Health) {
            return this.Player.Health;
        } else {
            let health = this.Player.Constitution.Total;
            health *= this.Config.HealthMultiplier;
            health *= 1 + (this.Snack.ConstitutionBonus ?? 0);
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
            let multiplier = 0.7;
            if (this.Player.Class === ASSASSIN) {
                multiplier = secondary ? 1.25 : 0.875;
            }

            const num = multiplier * (this.Player.Level - 9) * this.getWeaponMultiplier();

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
        // Rune resistances
        const rf = target.Player.Runes.ResistanceFire + (target.Snack.RuneResistanceFireBonus ?? 0);
        const rc = target.Player.Runes.ResistanceCold + (target.Snack.RuneResistanceColdBonus ?? 0);
        const rl = target.Player.Runes.ResistanceLightning + (target.Snack.RuneResistanceLightningBonus ?? 0);

        let rd = weapon.Attributes[2]; // Rune damage
        let rr = 0; // Rune resistance

        if (weapon.AttributeTypes[2] === RUNE_AUTO_DAMAGE) {
            rd += this.Snack.RuneDamageBonus ?? 0;
            rr = Math.min(rf, rc, rl);
        } else if (weapon.AttributeTypes[2] === RUNE_FIRE_DAMAGE || this.Snack.RuneDamageType === RUNE_FIRE_DAMAGE) {
            rd += this.Snack.RuneDamageBonus ?? 0;
            rr = rf;
        } else if (weapon.AttributeTypes[2] === RUNE_COLD_DAMAGE || this.Snack.RuneDamageType === RUNE_COLD_DAMAGE) {
            rd += this.Snack.RuneDamageBonus ?? 0;
            rr = rc;
        } else if (weapon.AttributeTypes[2] === RUNE_LIGHTNING_DAMAGE || this.Snack.RuneDamageType === RUNE_LIGHTNING_DAMAGE) {
            rd += this.Snack.RuneDamageBonus ?? 0;
            rr = rl;
        }  else {
            rd = 0;
        }

        let aa = this.getAttribute(this);
        let ad = FLAGS.NoAttributeReduction ? 0 : (target.getAttribute(this) / 2);

        let base = (1 + this.Player.Dungeons.Group / 100) * (1 - target.getDamageReduction(this) / 100) * (1 + (1 - Math.min(75, rr) / 100) * (Math.min(60, rd) / 100));
        base *= this.getDamageMultiplier(target);
        base *= 1 + Math.max(aa / 2, aa - ad) / 10;
        base *= 1 + (this.Snack.DamageBonus ?? 0) / 100;

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

        // Default multiplier for all incoming damage
        this.Data.ReceivedDamageMultiplier = 1;
    }

    resetHealth () {
        this.Health = this.TotalHealth;
    }

    resetInternalState () {
        this.State = this.Data;
        this.SkipCount = 0;
    }

    // Triggers after player receives damage (blocked or evaded damage appears as 0)
    onDamageTaken (instance, source, damage) {
        return (this.Health -= damage) > 0 ? STATE_ALIVE : STATE_DEAD;
    }

    // Returns type of current state of player, only for logging
    getCurrentStateForLog () {
        return FIGHTER_STATE_NORMAL;
    }

    // Returns list of current effects on player, only for logging
    getCurrentEffectsForLog () {
        return [];
    }

    specialState () {
        return this.State !== this.Data
    }

    // Enters special or default state if no state given
    enterState (state = this.Data) {
        this.State = state;
    }

    // Attack
    attack (instance, damage, target, skipped, critical, attackType, attackTypeCritical) {
        if (skipped) {
            damage = 0;

            // Advance skip count
            target.SkipCount++;
        } else {
            if (critical) {
                damage *= this.State.CriticalMultiplier;
            }

            damage = Math.trunc(damage * target.State.ReceivedDamageMultiplier);

            // Reset skip count
            target.SkipCount = 0;
        }

        if (FIGHT_LOG_ENABLED) {
            FIGHT_LOG.logRound(
                this,
                target,
                damage,
                critical ? attackTypeCritical : attackType,
                skipped ? (target.Player.Class === WARRIOR? DEFENSE_TYPE_BLOCK : DEFENSE_TYPE_EVADE) : DEFENSE_TYPE_NONE
            )
        }

        return target.onDamageTaken(instance, this, damage) != STATE_DEAD;
    }

    // Returns extra damage multiplier, default is 1 for no extra damage
    getDamageMultiplier (target) {
        let multiplier = this.Config.DamageMultiplier;

        if (typeof this.Config[`${target.ConfigKey}DamageBonus`] !== 'undefined') {
            multiplier += this.Config[`${target.ConfigKey}DamageBonus`];
        }

        if (typeof this.Config[`${target.ConfigKey}DamageMultiplier`] !== 'undefined') {
            multiplier *= this.Config[`${target.ConfigKey}DamageMultiplier`];
        }

        return multiplier;
    }

    // Before anyone takes control
    before (instance, target) {

    }

    // Take control
    control (instance, target) {
        const weapon = this.State.Weapon1;

        this.attack(
            instance,
            instance.getRage() * (Math.random() * (1 + weapon.Max - weapon.Min) + weapon.Min),
            target,
            target.skip(SKIP_TYPE_DEFAULT),
            getRandom(this.State.CriticalChance),
            ATTACK_TYPE_NORMAL,
            ATTACK_TYPE_CRITICAL
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
            CriticalMultiplier: (this.Config.CritBase + config.CriticalBonus) * this.Data.CriticalMultiplier / this.Config.CritBase,
            CriticalChance: this.getCriticalChance(target, config.CriticalChance, config.CriticalChanceBonus),
            ReceivedDamageMultiplier: 1,
            Weapon1: this.Data.Weapon1
        }
    
        if (typeof config.DamageBonus !== 'undefined') {
            const base = this.getDamageMultiplier(target);
            const multiplier = (base + config.DamageBonus) / base;

            state.Weapon1 = {
                Base: multiplier * this.Data.Weapon1.Base,
                Max: multiplier * this.Data.Weapon1.Max,
                Min: multiplier * this.Data.Weapon1.Min
            }
        }

        if (typeof config.DamageReductionBonus !== 'undefined' || typeof config.MaximumDamageReductionBonus !== 'undefined') {
            state.ReceivedDamageMultiplier = (
                1 - this.getDamageReduction(target, this.Config.MaximumDamageReduction + config.MaximumDamageReductionBonus ?? 0, config.DamageReductionBonus ?? 0) / 100
            ) / (
                1 - this.getDamageReduction(target) / 100
            );
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
        const weapon1 = this.State.Weapon1;

        if (this.attack(
            instance,
            instance.getRage() * (Math.random() * (1 + weapon1.Max - weapon1.Min) + weapon1.Min),
            target,
            getRandom(target.State.SkipChance) && target.Config.SkipType === SKIP_TYPE_DEFAULT,
            getRandom(this.State.CriticalChance),
            ATTACK_TYPE_NORMAL,
            ATTACK_TYPE_CRITICAL
        )) {
            const weapon2 = this.State.Weapon2;

            this.attack(
                instance,
                instance.getRage() * (Math.random() * (1 + weapon2.Max - weapon2.Min) + weapon2.Min),
                target,
                getRandom(target.State.SkipChance) && target.Config.SkipType === SKIP_TYPE_DEFAULT,
                getRandom(this.State.CriticalChance),
                ATTACK_TYPE_NORMAL_SECONDARY,
                ATTACK_TYPE_CRITICAL_SECONDARY
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
            FIGHT_LOG.logRound(
                this,
                target,
                damage,
                ATTACK_TYPE_FIREBALL,
                damage === 0 ? DEFENSE_TYPE_MAGIC : DEFENSE_TYPE_NONE
            )
        }

        if (damage === 0) {
            // Do nothing
        } else {
            target.onDamageTaken(instance, this, damage);
        }
    }
}

class BerserkerModel extends SimulatorModel {
    getCurrentStateForLog () {
        return this.SkipCount > 0 ? FIGHTER_STATE_BERSERKER_RAGE : FIGHTER_STATE_NORMAL;
    }

    control (instance, target) {
        const weapon = this.State.Weapon1;

        this.attack(
            instance,
            instance.getRage() * (Math.random() * (1 + weapon.Max - weapon.Min) + weapon.Min),
            target,
            getRandom(target.State.SkipChance) && target.Config.SkipType === SKIP_TYPE_DEFAULT,
            getRandom(this.State.CriticalChance),
            ATTACK_TYPE_NORMAL,
            ATTACK_TYPE_CRITICAL
        )
    }
}

class DemonHunterModel extends SimulatorModel {
    constructor (i, p) {
        super(i, p);
    }

    resetInternalState () {
        this.DeathTriggers = 0;
    }

    onDamageTaken (instance, source, damage) {
        let state = super.onDamageTaken(instance, source, damage);

        if (state == STATE_DEAD) {
            const reviveChance = this.Config.ReviveChance - this.Config.ReviveChanceDecay * this.DeathTriggers;

            if (!source.Config.BypassSpecial && this.DeathTriggers < this.Config.ReviveMax && getRandom(reviveChance)) {
                this.Health = this.TotalHealth * Math.max(this.Config.ReviveHealthMin, this.Config.ReviveHealth - this.DeathTriggers * this.Config.ReviveHealthDecay);
                this.DeathTriggers += 1;

                instance.getRage()

                if (FIGHT_LOG_ENABLED) {
                    FIGHT_LOG.logRound(
                        this,
                        this,
                        0,
                        ATTACK_TYPE_REVIVE,
                        DEFENSE_TYPE_NONE
                    )
                }

                return STATE_ALIVE;
            }
        }

        return state;
    }

    attack (instance, damage, target, skipped, critical, type) {
        const multiplier = Math.max(this.Config.ReviveDamageMin, this.Config.ReviveDamage - this.DeathTriggers * this.Config.ReviveDamageDecay);

        return super.attack(
            instance,
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

    resetInternalState () {
        this.SwoopChance = this.Config.SwoopChance;
        this.RequestState = false;
    }

    initializeData (target) {
        super.initializeData(target);

        this.Data.RageState = this.createState(target, this.Config.Rage);
    }

    getCurrentStateForLog () {
        return this.specialState() ? FIGHTER_STATE_DRUID_RAGE : FIGHTER_STATE_DRUID_HIDDEN;
    }

    control (instance, target) {
        if (this.RequestState) {
            this.RequestState = false;

            this.enterState(this.Data.RageState);
        } else if (this.specialState()) {
            // Reset state if druid was enraged
            this.enterState();
        }

        if (target.Config.BypassSpecial) {
            // Experience sadness
        } else {
            this.attackSwoop(instance, target);
        }

        super.control(instance, target);
    }

    attackSwoop (instance, target) {
        if (this.specialState() || this.Health <= 0) {
            // Do not swoop if enraged or if not alive
            return
        } else if (this.SwoopChance > 0 && getRandom(this.SwoopChance)) {
            this.SwoopChance = clamp(this.SwoopChance - this.Config.SwoopChanceDecay, this.Config.SwoopChanceMin, this.Config.SwoopChanceMax);

            const weapon = this.State.Weapon1;
    
            this.attack(
                instance,
                instance.getRage() * (Math.random() * (1 + weapon.Max - weapon.Min) + weapon.Min) * this.SwoopMultiplier,
                target,
                target.skip(SKIP_TYPE_DEFAULT),
                getRandom(this.State.CriticalChance),
                ATTACK_TYPE_SWOOP,
                ATTACK_TYPE_SWOOP_CRITICAL
            )
        }
    }

    onDamageTaken (instance, source, damage) {
        if (damage == 0 && !this.specialState()) {
            this.RequestState = true;
        }

        return super.onDamageTaken(instance, source, damage);
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

        const attribute = this.getAttribute(this);
        const constitution = this.Player.Constitution.Total * (1 + (this.Snack.ConstitutionBonus ?? 0));

        if (constitution >= attribute / 2) {
            this.BonusRounds++;
        }
        if (constitution >= 3 * attribute / 4) {
            this.BonusRounds++;
        }
    }

    resetInternalState () {
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

        this.Data.Songs = this.Config.EffectValues.map((effectValue) => {
            const multiplier = 1 + effectValue;

            return {
                SkipChance: this.Data.SkipChance,
                CriticalMultiplier: this.Data.CriticalMultiplier,
                CriticalChance: this.Data.CriticalChance,
                ReceivedDamageMultiplier: 1,
                Weapon1: {
                    Base: multiplier * this.Data.Weapon1.Base,
                    Max: multiplier * this.Data.Weapon1.Max,
                    Min: multiplier * this.Data.Weapon1.Min
                }
            }
        });
    }

    getCurrentEffectsForLog () {
        if (this.EffectLevel) {
            return [{
                type: EFFECT_TYPE_SONG,
                duration: this.EffectReset - this.EffectCounter + 1,
                tier: this.EffectLevel
            }]
        } else {
            return []
        }
    }

    rollEffect () {
        const roll = Math.random() * this.Bracket2;
        const level = roll <= this.Bracket0 ? 0 : (roll <= this.Bracket1 ? 1 : 2);

        this.EffectLevel = level + 1;
        this.EffectReset = this.Config.EffectBaseDuration[level] + this.BonusRounds;
        this.EffectCounter = 0;
        this.EffectRound = 0;

        this.enterState(this.Data.Songs[level]);
    }

    consumeMultiplier (target) {
        this.EffectCounter += 1;

        if (this.EffectCounter >= this.EffectReset) {
            this.enterState();
        }
    }

    control (instance, target) {
        if (!target.Config.BypassSpecial) {
            this.EffectRound += 1;

            if (this.EffectRound >= this.Config.EffectRounds) {
                this.rollEffect();
            }
        }

        return super.control(instance, target);
    }

    attack (instance, damage, target, skipped, critical, type) {
        const state = super.attack(
            instance,
            damage,
            target,
            skipped,
            critical,
            type
        )

        if (this.specialState()) {
            this.consumeMultiplier(target);
        }

        return state;
    }
}

class PaladinModel extends SimulatorModel {
    initializeData (target) {
        super.initializeData(target);

        this.Data.Stances = this.Config.Stances.map((stance) => {
            const data = this.createState(target, stance)

            data.StanceChangeChance = stance.StanceChangeChance

            return data
        });
    }

    resetInternalState () {
        this.StanceIndex = this.Config.StanceInitial;

        this.enterState(this.Data.Stances[this.StanceIndex]);
    }

    getCurrentStateForLog () {
        if (this.StanceIndex === 1) {
            return FIGHTER_STATE_PALADIN_OFFENSIVE
        } else if (this.StanceIndex === 2) {
            return FIGHTER_STATE_PALADIN_DEFENSIVE
        } else {
            return FIGHTER_STATE_NORMAL
        }
    }

    control (instance, target) {
        if (!target.Config.BypassSpecial && getRandom(this.State.StanceChangeChance)) {
            this.StanceIndex++;
            if (this.StanceIndex >= this.Config.Stances.length) {
                this.StanceIndex = 0;
            }

            this.enterState(this.Data.Stances[this.StanceIndex]);
        }

        super.control(instance, target);
    }
}

class NecromancerModel extends SimulatorModel {
    initializeData (target) {
        super.initializeData(target);

        this.Data.Minions = this.Config.Summons.map((summon) => this.createState(target, summon));
    }

    resetInternalState () {
        this.Minion = null;
    }

    getCurrentEffectsForLog () {
        if (this.Minion) {
            return [{
                type: EFFECT_TYPE_MINION,
                duration: this.MinionDuration,
                tier: this.MinionType
            }]
        } else {
            return []
        }
    }

    summonMinion (target) {
        const type = Math.trunc(Math.random() * 3);
        const minion = this.Data.Minions[type];

        this.Minion = minion;
        this.MinionType = type + 1;
        this.MinionDuration = minion.Config.Duration;
        this.MinionRevives = minion.Config.ReviveCount;

        if (FIGHT_LOG_ENABLED) {
            FIGHT_LOG.logRound(
                this,
                target,
                0,
                ATTACK_TYPE_MINION_SUMMON,
                DEFENSE_TYPE_NONE
            )
        }
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
                    FIGHT_LOG.logRound(
                        this,
                        target,
                        0,
                        ATTACK_TYPE_MINION_SUMMON,
                        DEFENSE_TYPE_NONE
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
            instance,
            instance.getRage() * (Math.random() * (1 + weapon.Max - weapon.Min) + weapon.Min),
            target,
            target.skip(SKIP_TYPE_DEFAULT),
            getRandom(this.State.CriticalChance),
            ATTACK_TYPE_MINION,
            ATTACK_TYPE_MINION_CRITICAL
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

            // Enter summon state
            this.enterState(this.Minion);

            if (this.Config.SummonImmediateAttack) {
                // Attack as minion
                this.attackMinion(instance, target);

                this.expireMinion(target);
            }
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
        this.a.resetInternalState();
        this.b.resetInternalState();

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
