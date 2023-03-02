FIGHT_LOG_ENABLED = false;
FIGHT_LOG_STORE_STATE = false;

FIGHT_LOG = new (class {
    constructor () {
        this.allLogs = [];
    }

    _storeState (model) {
        return Object.entries(model).reduce((memo, [key, value]) => {
            if (typeof value !== 'object' && typeof value !== 'undefined') {
                memo[key] = value;
            }

            return memo;
        }, {});
    }

    _logRound (attacker, target, damage, type, skip, critical, special) {
        const round = {
            attacker: attacker.Player.ID || attacker.Index,
            attackerSpecialState: !!special,
            target: target.Player.ID || target.Index,
            targetHealth: Math.max(0, (target.Health - (type === ATTACK_FIREBALL || type === ATTACK_FIREBALL_BLOCKED || type >= ATTACK_BARD_SONG ? 0 : damage)) / target.TotalHealth),
            attackDamage: damage,
            attackRage: this.currentRage || 1,
            attackType: type,
            attackSecondary: (type >= ATTACK_SECONDARY_NORMAL && type <= ATTACK_SECONDARY_EVADED) || type === ATTACK_SECONDARY_CRITICAL_BLOCKED || type === ATTACK_SECONDARY_CRITICAL_EVADED,
            attackCrit: critical,
            attackMissed: skip
        }

        if (FIGHT_LOG_STORE_STATE) {
            round.attackerState = this._storeState(attacker);
            round.targetState = this._storeState(target);
        }

        this.lastLog.rounds.push(round);
    }

    dump () {
        return this.allLogs;
    }

    clear () {
        this.allLogs = [];
    }

    logInit (playerA, playerB) {
        this.playerA = playerA;
        this.playerB = playerB;

        this.lastLog = {
            targetA: {
                ID: playerA.Player.ID || playerA.Index, Name: playerA.Player.Name, Level: playerA.Player.Level,
                MaximumLife: playerA.TotalHealth, Life: playerA.Health, Strength: playerA.Player.Strength.Total,
                Dexterity: playerA.Player.Dexterity.Total, Intelligence: playerA.Player.Intelligence.Total,
                Constitution: playerA.Player.Constitution.Total, Luck: playerA.Player.Luck.Total, Face: playerA.Player.Face,
                Race: playerA.Player.Race, Gender: playerA.Player.Gender, Class: playerA.Player.Class,
                Wpn1: playerA.Player.Items.Wpn1, Wpn2: playerA.Player.Items.Wpn2
            },
            targetB: {
                ID: playerB.Player.ID || playerB.Index, Name: playerB.Player.Name, Level: playerB.Player.Level,
                MaximumLife: playerB.TotalHealth, Life: playerB.Health, Strength: playerB.Player.Strength.Total,
                Dexterity: playerB.Player.Dexterity.Total, Intelligence: playerB.Player.Intelligence.Total,
                Constitution: playerB.Player.Constitution.Total, Luck: playerB.Player.Luck.Total, Face: playerB.Player.Face,
                Race: playerB.Player.Race, Gender: playerB.Player.Gender, Class: playerB.Player.Class,
                Wpn1: playerB.Player.Items.Wpn1, Wpn2: playerB.Player.Items.Wpn2
            },
            rounds: []
        }

        this.allLogs.push(this.lastLog)
    }

    logRage (currentRage) {
        this.currentRage = currentRage;
    }

    _calculateType (target, type, skip, critical) {
        const targetWarrior = target.Class === WARRIOR;
        if (type == ATTACK_SWOOP) {
            if (skip) {
                return targetWarrior ? ATTACK_SWOOP_BLOCKED : ATTACK_SWOOP_EVADED;
            } else {
                return ATTACK_SWOOP;
            }
        } else if (type === ATTACK_NORMAL || type === ATTACK_SECONDARY_NORMAL || type === ATTACK_CHAIN_NORMAL) {
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

    logAttack (source, target, damage, baseType, skip, critical, special) {
        const type = this._calculateType(target, baseType, skip, critical);
        this._logRound(
            source,
            target,
            damage,
            type,
            skip,
            critical,
            special
        )
    }

    logFireball (source, target, damage) {
        this._logRound(
            source,
            target,
            damage,
            damage == 0 ? ATTACK_FIREBALL_BLOCKED : ATTACK_FIREBALL,
            false,
            false,
            false
        )
    }

    logRevive (source) {
        this._logRound(
            source,
            source,
            0,
            ATTACK_REVIVE,
            false,
            false,
            false
        )
    }

    logSpell (source, level, notes, damage = 0) {
        this._logRound(
            source,
            source == this.playerA ? this.playerB : this.playerA,
            damage,
            ATTACK_BARD_SONG + 10 * notes + level,
            false,
            false,
            false
        )
    }
})();

// Flags
FLAGS = Object.defineProperty(
    {
        // Values
        Gladiator15: false,
        // Reductions
        NoGladiatorReduction: false,
        NoAttributeReduction: false,
        // Behaviors
        FireballFix: false,
    },
    'set',
    {
        value: function (flags) {
            for (const [key, val] of Object.entries(flags || {})) {
                this[key] = !!val;
            }
        }
    }
);

// Configuration
CONFIG = Object.defineProperties(
    {
        Warrior: {
            Attribute: 'Strength',

            HealthMultiplier: 5,
            WeaponDamageMultiplier: 2,
            MaximumDamageReduction: 50,

            SkipChance: 25
        },
        Mage: {
            Attribute: 'Intelligence',

            HealthMultiplier: 2,
            WeaponDamageMultiplier: 4.5,
            MaximumDamageReduction: 10
        },
        Scout: {
            Attribute: 'Dexterity',

            HealthMultiplier: 4,
            WeaponDamageMultiplier: 2.5,
            MaximumDamageReduction: 25,

            SkipChance: 50
        },
        Assassin: {
            Attribute: 'Dexterity',

            HealthMultiplier: 4,
            WeaponDamageMultiplier: 2,
            MaximumDamageReduction: 25,

            DamageMultiplier: 5 / 8,
            SkipChance: 50
        },
        Battlemage: {
            Attribute: 'Strength',

            HealthMultiplier: 5,
            WeaponDamageMultiplier: 2,
            MaximumDamageReduction: 10
        },
        Berserker: {
            Attribute: 'Strength',

            HealthMultiplier: 4,
            WeaponDamageMultiplier: 2,
            MaximumDamageReduction: 25,

            DamageMultiplier: 5 / 4
        },
        DemonHunter: {
            Attribute: 'Dexterity',

            HealthMultiplier: 4,
            WeaponDamageMultiplier: 2.5,
            MaximumDamageReduction: 50,

            ReviveChance: 400 / 9,
            ReviveChanceDecay: 2,
            ReviveHealth: 0.9,
            ReviveHealthMin: 0.1,
            ReviveHealthDecay: 0.1
        },
        Druid: {
            Attribute: 'Intelligence',

            HealthMultiplier: 5,
            WeaponDamageMultiplier: 4.5,
            MaximumDamageReduction: 40,

            DamageMultiplier: 1 / 3,

            SwoopChance: 25,
            SwoopChanceMin: 0,
            SwoopChanceMax: 50,
            SwoopChanceDecay: -5,
            SwoopMultiplier: 3.3,

            SkipChance: 35,
            RageSkipChance: 0,

            RageCriticalChance: 75,
            RageCriticalDamageMultiplier: 1.8
        },
        Bard: {
            Attribute: 'Intelligence',

            HealthMultiplier: 2,
            WeaponDamageMultiplier: 4.5,
            MaximumDamageReduction: 50,

            DamageMultiplier: 1.125,

            EffectRounds: 4,
            EffectBaseDuration: [1, 1, 2],
            EffectBaseChance: [25, 50, 25],
            EffectValues: [ 20, 40, 60 ]
        },
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
                return Object.values(this)[index - 1];
            }
        },
        indexes: {
            value: function () {
                return Object.keys(this).map((value, index) => index + 1);
            }
        }
    }
);

// Returns true if random chance occured
function getRandom (success) {
    return success > 0 && (Math.random() * 100 < success);
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

// Rune values
const RUNE_FIRE_DAMAGE = 40;
const RUNE_COLD_DAMAGE = 41;
const RUNE_LIGHTNING_DAMAGE = 42;

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

const ATTACK_CHAIN_NORMAL = 20;
const ATTACK_CHAIN_CRITICAL = 21;
const ATTACK_CHAIN_BLOCKED = 23;
const ATTACK_CHAIN_EVADED = 24;
const ATTACK_CHAIN_CRITICAL_BLOCKED = 28;
const ATTACK_CHAIN_CRITICAL_EVADED = 29;

const ATTACK_CATAPULT = 2;

const ATTACK_FIREBALL = 15;
const ATTACK_FIREBALL_BLOCKED = 16;

const ATTACK_SWOOP = 5;
const ATTACK_SWOOP_BLOCKED = 6;
const ATTACK_SWOOP_EVADED = 7;

const ATTACK_REVIVE = 100;
const ATTACK_BARD_SONG = 200;

// Fighter models
class FighterModel {
    static initializeFighters (fighterA, fighterB) {
        fighterA.initialize(fighterB);
        fighterB.initialize(fighterA);

        fighterA.Initial = fighterA.getInitialDamage(fighterB);
        fighterB.Initial = fighterB.getInitialDamage(fighterA);
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
            [BARD]: BardModel
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
        this.Player = FighterModel.normalize(player);
        this.Config = CONFIG[this.constructor.name.slice(0, -5)];
    }

    getAttribute (source) {
        return this.Player[source.Config.Attribute].Total;
    }

    // Damage Reduction
    getDamageReduction (source, maximumReduction = this.getMaximumDamageReduction()) {
        if (source.Player.Class == MAGE) {
            return 0;
        } else if (this.Player.ForceArmor) {
            let multiplier = this.Player.ForceArmor * this.Player.Level / source.Player.Level;
            let reductionBonus = this.Player.Class == BATTLEMAGE ? 40 : 0;

            return Math.min(maximumReduction, maximumReduction * multiplier) + reductionBonus;
        } else {
            if (this.Player.Class == BARD || this.Player.Class == DRUID) {
                return Math.min(maximumReduction, 2.0 * this.Player.Armor / source.Player.Level);
            } else if (this.Player.Class == BATTLEMAGE) {
                return Math.min(maximumReduction, this.Player.Armor / source.Player.Level) + 40;
            } else {
                return Math.min(maximumReduction, this.Player.Armor / source.Player.Level);
            }
        }
    }
    
    // Block Chance
    getBlockChance (source) {
        if (source.Player.Class == MAGE) {
            return 0;
        } else if (this.Player.Class == WARRIOR) {
            return typeof this.Player.BlockChance !== 'undefined' ? this.Player.BlockChance : this.Config.SkipChance;
        } else {
            return this.Config.SkipChance || 0;
        }
    }

    // Maximum Damage Reduction
    getMaximumDamageReduction () {
        return this.Config.MaximumDamageReduction;
    }
            
    // Health multiplier
    getHealthMultiplier () {
        return this.Config.HealthMultiplier;
    }

    // Critical Chance
    getCriticalChance (target, maximumChance = 50) {
        return Math.min(maximumChance, this.Player.Luck.Total * 2.5 / target.Player.Level);
    }

    // Critical Multiplier
    getCriticalMultiplier (weapon, weapon2, target) {
        let baseMultiplier = (weapon.HasEnchantment || (weapon2 && weapon2.HasEnchantment)) ? 1.05 : 1;

        let ownGladiator = this.Player.Fortress.Gladiator || 0;
        let reducingGladiator = target.Player.Fortress.Gladiator || 0;

        if (FLAGS.Gladiator15) {
            ownGladiator = 15;
            reducingGladiator = 15;
        }

        if (FLAGS.NoGladiatorReduction) {
            reducingGladiator = 0;
        }

        return 2 * baseMultiplier * (1 + 0.05 * Math.max(0, ownGladiator - reducingGladiator));
    }

    // Health
    getHealth () {
        if (this.Player.ForceHealth) {
            return this.Player.ForceHealth;
        } else {
            var a = 1 + this.Player.Potions.Life / 100;
            var b = 1 + this.Player.Dungeons.Player / 100;
            var c = 1 + this.Player.Runes.Health / 100;
            var d = this.Player.Level + 1;
            var e = this.getHealthMultiplier();
            var f = (typeof this.Player.ForceHealthMultiplier === 'undefined' ? 1 : this.Player.ForceHealthMultiplier);

            return Math.ceil(Math.ceil(Math.ceil(Math.ceil(Math.ceil(Math.ceil(this.Player.Constitution.Total * a) * b) * c) * d) * e) * f);
        }
    }

    getWeaponDamageMultiplier () {
        return this.Config.WeaponDamageMultiplier;
    }

    getBaseDamage (secondary = false) {
        if (this.Player.Level > 10 && !this.Player.NoBaseDamage) {
            const num = (this.Player.Level - 9) * this.getWeaponDamageMultiplier();
            const mul = secondary ? 0.1 : 0.7;

            return {
                Min: Math.max(1, Math.ceil(mul * num * 2 / 3)),
                Max: Math.max(2, Math.round(mul * num * 4 / 3))
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

        let mm = (1 + this.Player.Dungeons.Group / 100) * target.DamageReduction * (1 + mf + mc + ml);

        let aa = this.getAttribute(this);
        let ad = FLAGS.NoAttributeReduction ? 0 : (target.getAttribute(this) / 2);
        let dc = this.getDamageMultiplier(target);
        let dm = dc * mm * (1 + Math.max(aa / 2, aa - ad) / 10);

        return dm;
    }

    // Get damage range
    getDamageRange (weapon, target, secondary = false) {
        let dm = this.getDamageBase(weapon, target);
        let bd = this.getBaseDamage(secondary);

        return {
            Base: dm,
            Max: Math.ceil(dm * Math.max(weapon.DamageMax, bd.Max)),
            Min: Math.ceil(dm * Math.max(weapon.DamageMin, bd.Min))
        };
    }

    // Initialize model
    initialize (target) {
        // Round modifiers
        this.AttackFirst = this.Player.Items.Hand.HasEnchantment || false;
        this.SkipChance = this.getBlockChance(target);
        this.CriticalChance = this.getCriticalChance(target);
        this.TotalHealth = this.getHealth();

        target.DamageReduction = 1 - target.getDamageReduction(this) / 100;

        // Weapon
        let weapon1 = this.Player.Items.Wpn1;
        let weapon2 = this.Player.Items.Wpn2;

        this.Weapon1 = this.getDamageRange(weapon1, target);

        this.Critical = this.getCriticalMultiplier(weapon1, weapon2, target);
    }

    reset (resetHealth = true) {
        if (resetHealth) {
            this.Health = this.TotalHealth || this.getHealth();
        }
    }

    // Return false for none or any damage to be initially dealt at the beginning of the round (eg BM's Fireball)
    getInitialDamage (target) {
        return false;
    }

    // Triggers after player receives damage (blocked or evaded damage appears as 0)
    onDamageTaken (source, damage) {
        return (this.Health -= damage) > 0 ? STATE_ALIVE : STATE_DEAD;
    }

    // Attack
    attack (damage, target, skipped, critical, type, special) {
        if (skipped) {
            damage = 0;
        } else {
            if (critical) {
                damage *= this.Critical;
            }

            damage = Math.ceil(damage);
        }

        if (FIGHT_LOG_ENABLED) {
            FIGHT_LOG.logAttack(
                this,
                target,
                damage,
                type,
                skipped,
                critical,
                special
            )
        }

        return damage;
    }

    // Runtime getters
    fetchSkipChance (source) {
        return this.SkipChance;
    }

    fetchCriticalChance (target) {
        return this.CriticalChance;
    }

    // Returns extra damage multiplier, default is 1 for no extra damage
    getDamageMultiplier (target) {
        return this.Config.DamageMultiplier || 1;
    }

    // Control wrapper around attack
    controlAttack (instance, target, weapon, attackType) {
        const source = this;

        if (source.BeforeAttack) source.onBeforeAttack(target);
        if (target.BeforeAttack) target.onBeforeAttack(target);

        // Random damage for current round
        const damage = source.attack(
            instance.getRage() * (Math.random() * (1 + weapon.Max - weapon.Min) + weapon.Min),
            target,
            getRandom(target.fetchSkipChance(source)),
            getRandom(source.fetchCriticalChance(target)),
            attackType
        );

        if (target.DamageTaken) {
            return target.onDamageTaken(source, damage) != STATE_DEAD;
        } else {
            return (target.Health -= damage) > 0;
        }
    }

    // Take control
    control (instance, target) {
        this.controlAttack(instance, target, this.Weapon1, ATTACK_NORMAL);
    }
}

class WarriorModel extends FighterModel {

}

class MageModel extends FighterModel {
    getDamageMultiplier (target) {
        if (target.Player.Class == BERSERKER) {
            return 2;
        } else {
            return 1;
        }
    }
}

class ScoutModel extends FighterModel {

}

class AssassinModel extends FighterModel {
    initialize (target) {
        super.initialize(target);

        this.Weapon2 = this.getDamageRange(this.Player.Items.Wpn2, target, true);
    }

    control (instance, target) {
        if (this.controlAttack(instance, target, this.Weapon1, ATTACK_NORMAL) == false) {
            return;
        }

        this.controlAttack(instance, target, this.Weapon2, ATTACK_SECONDARY_NORMAL);
    }
}

class DruidModel extends FighterModel {
    constructor (i, p) {
        super(i, p);

        this.DamageTaken = true;
    }

    reset (resetHealth = true) {
        super.reset(resetHealth);

        this.SwoopChance = this.Config.SwoopChance;

        this.RageState = false;
    }

    initialize (target) {
        super.initialize(target);

        this.RageCriticalChance = Math.min(this.Config.RageCriticalChance, 10 + this.Player.Luck.Total * 2.5 / target.Player.Level);
    }

    attack (damage, target, skipped, critical, type) {
        if (this.RageState) {
            if (critical) {
                damage *= this.Config.RageCriticalDamageMultiplier;
            }

            const returnValue = super.attack(
                damage,
                target,
                skipped,
                critical,
                type,
                true
            );

            this.RageState = false;

            return returnValue;
        } else if (this.SwoopChance > 0 && getRandom(this.SwoopChance)) {
            this.SwoopChance = clamp(this.SwoopChance - this.Config.SwoopChanceDecay, this.Config.SwoopChanceMin, this.Config.SwoopChanceMax);
            
            // Swoop
            return super.attack(
                damage * this.Config.SwoopMultiplier,
                target,
                skipped,
                false,
                5
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
        if (damage == 0) {
            this.RageState = true;
        }

        return super.onDamageTaken(source, damage);
    }

    fetchCriticalChance (target) {
        if (this.RageState) {
            return this.RageCriticalChance;
        } else {
            return this.CriticalChance;
        }
    }

    fetchSkipChance (source) {
        if (source.Player.Class == MAGE) {
            return 0;
        } else if (this.RageState) {
            return this.Config.RageSkipChance;
        } else {
            return this.SkipChance;
        }
    }
}

class BattlemageModel extends FighterModel {
    getInitialDamage (target) {
        if (target.Player.Class == MAGE || target.Player.Class == BATTLEMAGE) {
            return 0;
        } else if (FLAGS.FireballFix) {
            let is2x = target.Player.Class == DRUID || target.Player.Class == BARD;
            let is4x = target.Player.Class == SCOUT || target.Player.Class == ASSASSIN || target.Player.Class == BERSERKER;
            let is5x = target.Player.Class == WARRIOR || target.Player.Class == DEMONHUNTER || target.Player.Class == DRUID;

            if (is5x) {
                return Math.min(Math.ceil(target.TotalHealth / 3), Math.ceil(this.TotalHealth / 4));
            } else if (is4x) {
                return Math.min(Math.ceil(target.TotalHealth / 3), Math.ceil(this.TotalHealth / 5));
            } else if (is2x) {
                return Math.min(Math.ceil(target.TotalHealth / 3), Math.ceil(this.TotalHealth / 10));
            } else {
                return 0;
            }
        } else {
            if (target.Player.Class == BERSERKER || target.Player.Class == DEMONHUNTER || target.Player.Class == DRUID || target.Player.Class == BARD) {
                return Math.ceil(target.TotalHealth / 3);
            } else if (target.Player.Class == WARRIOR) {
                return Math.min(Math.ceil(target.TotalHealth / 3), Math.ceil(this.TotalHealth / 4));
            } else if (target.Player.Class == SCOUT || target.Player.Class == ASSASSIN) {
                return Math.min(Math.ceil(target.TotalHealth / 3), Math.ceil(this.TotalHealth / 5));
            } else {
                return 0;
            }
        }
    }
}

class BerserkerModel extends FighterModel {
    control (instance, target) {
        if (this.controlAttack(instance, target, this.Weapon1, ATTACK_NORMAL) == false) {
            return;
        }

        while (getRandom(50) && instance.getRage() && this.controlAttack(instance, target, this.Weapon1, ATTACK_CHAIN_NORMAL));
    }
}

class DemonHunterModel extends FighterModel {
    constructor (i, p) {
        super(i, p);

        this.DamageTaken = true;
    }

    reset (resetHealth = true) {
        super.reset(resetHealth);

        this.DeathTriggers = 0;
    }

    onDamageTaken (source, damage) {
        let state = super.onDamageTaken(source, damage);

        if (state == STATE_DEAD) {
            let reviveChance = this.Config.ReviveChance - this.Config.ReviveChanceDecay * this.DeathTriggers;

            if (source.Player.Class != MAGE && getRandom(reviveChance)) {
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
}

class BardModel extends FighterModel {
    constructor (i, p) {
        super(i, p);

        this.resetEffects();
        this.resetTimers();

        this.Bracket0 = this.Config.EffectBaseChance[0];
        this.Bracket1 = this.Bracket0 + this.Config.EffectBaseChance[1];
        this.Bracket2 = this.Bracket1 + this.Config.EffectBaseChance[2];
    }

    resetEffects () {
        this.EffectCurrent = 0;
    }

    resetTimers () {
        // How many notes were casted
        this.EffectReset = 0;
        // How many notes were consumed
        this.EffectCounter = this.Config.EffectRounds;
        // How many rounds passed since cast
        this.EffectRound = this.Config.EffectRounds;
    }

    reset (resetHealth = true) {
        super.reset(resetHealth);

        this.resetEffects();
        this.resetTimers();
    }

    initialize (target) {
        super.initialize(target);

        this.BeforeAttack = target.Player.Class != MAGE;

        this.BonusRounds = 0;

        const mainAttribute = this.getAttribute(this);
        if (this.Player.Constitution.Total >= mainAttribute / 2) {
            this.BonusRounds++;
        }
        if (this.Player.Constitution.Total >= 3 * mainAttribute / 4) {
            this.BonusRounds++;
        }
    }

    rollEffectLevel () {
        const roll = Math.random() * this.Bracket2;

        return roll <= this.Bracket0 ? 0 : (roll <= this.Bracket1 ? 1 : 2);
    }

    rollEffect (target) {
        let level = this.rollEffectLevel();

        this.EffectLevel = level + 1;
        this.EffectReset = this.Config.EffectBaseDuration[level] + this.BonusRounds;
        this.EffectCounter = 0;
        this.EffectRound = 0;

        this.EffectCurrent = 1 + this.Config.EffectValues[level] / 100;
    }

    consumeMultiplier () {
        this.EffectCounter += 1;

        if (FIGHT_LOG_ENABLED) {
            FIGHT_LOG.logSpell(
                this,
                this.EffectLevel,
                this.EffectReset - this.EffectCounter + 1,
                0
            );
        }

        if (this.EffectCounter >= this.EffectReset) {
            this.resetEffects();
        }
    }

    onBeforeAttack (target) {
        // When this player attacks
        if (this != target) {
            this.EffectRound += 1;

            if (this.EffectRound >= this.Config.EffectRounds) {
                this.rollEffect(target);
            }
        }
    }

    attack (damage, target, skipped, critical, type) {
        if (this.EffectCurrent) {
            damage *= this.EffectCurrent;
        }

        damage = super.attack(
            damage,
            target,
            skipped,
            critical,
            type
        )

        if (this.EffectCurrent) {
            this.consumeMultiplier();
        }

        return damage;
    }
}

// Shared class between all simulators in order to make updates simple
class SimulatorBase {
    setInitialFighter () {
        if (this.a.AttackFirst == this.b.AttackFirst ? getRandom(50) : this.b.AttackFirst) {
            [this.a, this.b] = [this.b, this.a];
        }

        // Thanks to rafa97sam for testing and coding this part that broke me
        if (this.b.Player.Class == BERSERKER && getRandom(50)) {
            let turnIncrease = 1;

            if (this.a.Player.Class == BERSERKER) {
                while (getRandom(50)) {
                    turnIncrease += 1;
                    [this.a, this.b] = [this.b, this.a];
                }
            }

            this.turn += turnIncrease;

            [this.a, this.b] = [this.b, this.a];
        }
    }

    performSpecialAttack () {
        if (this.a.Initial !== false || this.b.Initial !== false) {
            this.getRage();

            if (this.a.Initial > 0) {
                this.b.Health -= this.a.Initial;

                if (FIGHT_LOG_ENABLED) {
                    FIGHT_LOG.logFireball(this.a, this.b, this.a.Initial);
                }
            } else if (this.b.Initial > 0) {
                this.a.Health -= this.b.Initial;

                if (FIGHT_LOG_ENABLED) {
                    FIGHT_LOG.logFireball(this.b, this.a, this.b.Initial);
                }
            } else if (FIGHT_LOG_ENABLED) {
                // Report fireball blocked
                if (this.a.Player.Class === BATTLEMAGE) {
                    FIGHT_LOG.logFireball(this.a, this.b, 0);
                } else {
                    FIGHT_LOG.logFireball(this.b, this.a, 0);
                }
            }
        }
    }

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

        this.setInitialFighter();
        this.performSpecialAttack();

        while (this.a.Health > 0 && this.b.Health > 0) {
            this.a.control(this, this.b);

            [this.a, this.b] = [this.b, this.a];
        }

        // Winner
        return (this.a.Health > 0 ? this.a.Index : this.b.Index) == 0;
    }
}
