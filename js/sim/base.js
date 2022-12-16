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

    _newRound (attacker, target, type, damage) {
        let lastRound = {
            attacker: attacker.Player.ID || attacker.Index,
            target: target.Player.ID || target.Index,
            targetHealth: Math.max(0, (target.Health - (type === 15 ? 0 : damage)) / target.TotalHealth),
            attackDamage: damage,
            attackRage: this.currentRage || 1,
            attackType: type,
            attackSecondary: type <= 100 && (type >= 10 && type <= 14),
            attackCrit: type <= 100 && (type % 10 == 1),
            attackMissed: type <= 100 && ((type % 10 == 3) || (type % 10 == 4))
        }

        if (FIGHT_LOG_STORE_STATE) {
            lastRound.attackerState = this._storeState(attacker);
            lastRound.targetState = this._storeState(target);
        }

        this.lastLog.rounds.push(lastRound);
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
                ID: playerA.Player.ID || playerA.Index, Name: playerA.Player.Name, Mask: playerA.Player.Mask,
                Instrument: playerA.Player.Instrument, Level: playerA.Player.Level,
                MaximumLife: playerA.TotalHealth, Life: playerA.TotalHealth, Strength: playerA.Player.Strength.Total,
                Dexterity: playerA.Player.Dexterity.Total, Intelligence: playerA.Player.Intelligence.Total,
                Constitution: playerA.Player.Constitution.Total, Luck: playerA.Player.Luck.Total, Face: playerA.Player.Face,
                Race: playerA.Player.Race, Gender: playerA.Player.Gender, Class: playerA.Player.Class,
                Wpn1: playerA.Player.Items.Wpn1, Wpn2: playerA.Player.Items.Wpn2
            },
            targetB: {
                ID: playerB.Player.ID || playerB.Index, Name: playerB.Player.Name, Mask: playerB.Player.Mask,
                Instrument: playerB.Player.Instrument, Level: playerB.Player.Level,
                MaximumLife: playerB.TotalHealth, Life: playerB.TotalHealth, Strength: playerB.Player.Strength.Total,
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

    logAttack (source, target, type, damage) {
        this._newRound(
            source,
            target,
            type,
            damage
        )
    }

    logFireball (source, target, damage) {
        this._newRound(
            source,
            target,
            damage == 0 ? 16 : 15,
            damage
        )
    }

    logRevive (source) {
        this._newRound(
            source,
            source,
            100,
            0
        )
    }

    logSpell (source, level, notes, damage = 0) {
        this._newRound(
            source,
            source == this.playerA ? this.playerB : this.playerA,
            200 + 10 * notes + level,
            damage
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
CONFIG = Object.defineProperty(
    {
        DemonHunter: {
            ReviveChance: 400 / 9,
            ReviveChanceDecay: 2,
            ReviveHealth: 0.9,
            ReviveHealthMin: 0.1,
            ReviveHealthDecay: 0.1
        },
        Druid: {
            EagleDamageMultiplier: 1 / 3,
            BearDamageMultiplier: 4 / 9,
            CatDamageMultiplier: 5 / 9,

            EagleSwoopChance: 50,
            EagleSwoopChanceMin: 5,
            EagleSwoopChanceDecay: 5,
            EagleSwoopMultiplier: 16,
        
            BearBracket: 25,
            BearMaxTrigger: 75,
            BearMedTrigger: 50,
            BearMinTrigger: 25,
        
            BearMaxMultiplier: 1,
            BearMedMultiplier: 0.5,
            BearMinMultiplier: 0.3,
            
            CatNormalEvadeChance: 35,
            CatRageCriticalChanceBonus: 25,
            CatRageCriticalDamageMultiplier: 2.5
        },
        Bard: {
            EffectRounds: 4,

            HarpValues: [ 40, 55, 75 ],
            LuteValues: [ 20, 40, 60 ],
            FluteValues: [ 5, 7.5, 10 ]
        },
    },
    'set',
    {
        value: function (config) {
            for (const key of Object.keys(this)) {
                this[key] = mergeDeep(this[key], (config || {})[key]);
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

function getRuneValue (item, rune) {
    return item.AttributeTypes[2] == rune ? item.Attributes[2] : 0;
}

// States
const STATE_DEAD = 0;
const STATE_ALIVE = 1;

// Attacks
const ATTACK_PRIMARY = 0;
const ATTACK_SECONDARY = 1;
const ATTACK_SPECIAL = 2;

// Masks
const MASK_EAGLE = 0;
const MASK_BEAR = 1;
const MASK_CAT = 2;

// Instruments
const INSTRUMENT_HARP = 0;
const INSTRUMENT_LUTE = 1;
const INSTRUMENT_FLUTE = 2;

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
        switch (source.Player.Class) {
            case WARRIOR:
            case BERSERKER:
            case BATTLEMAGE:
                return this.Player.Strength.Total;
            case SCOUT:
            case DEMONHUNTER:
            case ASSASSIN:
                return this.Player.Dexterity.Total;
            case MAGE:
            case DRUID:
            case BARD:
                return this.Player.Intelligence.Total;
            default:
                return 0;
        }
    }

    // Damage Reduction
    getDamageReduction (source, maximumReduction = this.getMaximumDamageReduction()) {
        if (source.Player.Class == MAGE || source.Player.Class == BARD) {
            return 0;
        } else if (this.Player.ForceArmor) {
            let multiplier = this.Player.ForceArmor * this.Player.Level / source.Player.Level;
            let reductionBonus = this.Player.Class == BATTLEMAGE ? 40 : 0;

            return Math.min(maximumReduction, maximumReduction * multiplier) + reductionBonus;
        } else {
            if (this.Player.Class == BATTLEMAGE) {
                return Math.min(maximumReduction, this.Player.Armor / source.Player.Level) + 40;
            } else if (this.Player.Class == DRUID && this.Player.Mask == MASK_BEAR) {
                return Math.min(maximumReduction, 2 * this.Player.Armor / source.Player.Level);
            } else {
                return Math.min(maximumReduction, this.Player.Armor / source.Player.Level);
            }
        }
    }

    // Maximum Damage Reduction
    getMaximumDamageReduction () {
        switch (this.Player.Class) {
            case WARRIOR:
            case DEMONHUNTER:
                return 50;
            case SCOUT:
            case ASSASSIN:
            case BERSERKER:
            case BARD:
                return 25;
            case MAGE:
            case BATTLEMAGE:
                return 10;
            case DRUID:
                switch (this.Player.Mask) {
                    case MASK_EAGLE: return 10;
                    case MASK_BEAR: return 50;
                    case MASK_CAT: return 25;
                    default: 0;
                }
            default:
                return 0;
        }
    }

    // Block Chance
    getBlockChance (source) {
        if (source.Player.Class == MAGE) {
            return 0;
        } else {
            switch (this.Player.Class) {
                case SCOUT:
                case ASSASSIN:
                    return 50;
                case WARRIOR:
                    return typeof this.Player.BlockChance !== 'undefined' ? this.Player.BlockChance : 25;
                case DRUID:
                    if (this.Player.Mask == MASK_BEAR) {
                        return 20;
                    } else {
                        return 0;
                    }
                default:
                    return 0;
            }
        }
    }

    // Health multiplier
    getHealthMultiplier () {
        switch (this.Player.Class) {
            case WARRIOR:
            case BATTLEMAGE:
                return 5;
            case DEMONHUNTER:
            case SCOUT:
            case ASSASSIN:
            case BERSERKER:
                return 4;
            case MAGE:
            case BARD:
                return 2;
            case DRUID:
                switch (this.Player.Mask) {
                    case MASK_EAGLE: return 3;
                    case MASK_BEAR: return 5;
                    case MASK_CAT: return 4;
                    default: 0;
                }
            default:
                return 0;
        }
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
        switch (this.Player.Class) {
            case WARRIOR:
            case ASSASSIN:
            case BATTLEMAGE:
            case BERSERKER:
                return 2;
            case SCOUT:
            case DEMONHUNTER:
                return 2.5;
            case MAGE:
            case DRUID:
            case BARD:
                return 4.5;
            default:
                return 0;
        }
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

    // Get damage range
    getDamageRange (weapon, target, secondary = false) {
        let mf = (1 - target.Player.Runes.ResistanceFire / 100) * (getRuneValue(weapon, RUNE_FIRE_DAMAGE) / 100);
        let mc = (1 - target.Player.Runes.ResistanceCold / 100) * (getRuneValue(weapon, RUNE_COLD_DAMAGE) / 100);
        let ml = (1 - target.Player.Runes.ResistanceLightning / 100) * (getRuneValue(weapon, RUNE_LIGHTNING_DAMAGE) / 100);

        let mm = (1 + this.Player.Dungeons.Group / 100) * target.DamageReduction * (1 + mf + mc + ml);

        let aa = this.getAttribute(this);
        let ad = FLAGS.NoAttributeReduction ? 0 : (target.getAttribute(this) / 2);
        let dc = this.getDamageMultiplier(target);
        let dm = dc * mm * (1 + Math.max(aa / 2, aa - ad) / 10);
        let bd = this.getBaseDamage(secondary);

        return {
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
        if (this.UseSecondaryWeapon) {
            this.Weapon2 = this.getDamageRange(weapon2, target, true);
        }

        this.Critical = this.getCriticalMultiplier(weapon1, weapon2, target);
    }

    reset (resetHealth = true) {
        if (resetHealth) {
            this.Health = this.TotalHealth || this.getHealth();
        }
    }

    getInitialDamage (target) {
        return false;
    }

    // Triggers after player receives damage (blocked or evaded damage appears as 0)
    onDamageTaken (source, damage, type = ATTACK_PRIMARY) {
        return (this.Health -= damage) > 0 ? STATE_ALIVE : STATE_DEAD;
    }

    // Allows player to skip opponent's turn completely
    skipNextRound () {
        return false;
    }

    // Triggers before damage is finalized
    onBeforeDamageFinalized (damage, target) {
        return damage;
    }

    attack (damage, target, skipped, critical, type, directType = false) {
        if (skipped) {
            damage = 0;
        } else {
            if (target.BeforeDamageFinalized) {
                damage = target.onBeforeDamageFinalized(damage, target);
            }

            if (critical) {
                damage *= this.Critical;
            }

            damage = Math.ceil(damage);
        }

        if (FIGHT_LOG_ENABLED) {
            FIGHT_LOG.logAttack(
                this,
                target,
                directType ? (skipped ? (target.Player.Class == WARRIOR ? 3 : 4) : type) : ((skipped ? (target.Player.Class == WARRIOR ? 3 : 4) : (critical ? 1 : 0)) + type * 10),
                damage
            )
        }

        return damage;
    }

    fetchSkipChance (source) {
        return this.SkipChance;
    }

    fetchCriticalChance (target) {
        return this.CriticalChance;
    }

    getDamageMultiplier (target) {
        return 1;
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
    constructor (i, p) {
        super(i, p);

        this.UseSecondaryWeapon = true;
    }

    getDamageMultiplier (target) {
        return 5 / 8;
    }
}

class DruidModel extends FighterModel {
    reset (resetHealth = true) {
        super.reset(resetHealth);

        if (this.Player.Mask == MASK_EAGLE) {
            this.SwoopChance = this.Config.EagleSwoopChance;
        } else if (this.Player.Mask == MASK_CAT) {
            this.DamageTaken = true;

            this.RageState = false;
        }
    }

    initialize (target) {
        super.initialize(target);

        if (this.Player.Mask == MASK_CAT) {
            this.RageCriticalChance = this.getCriticalChance(target, 50 + this.Config.CatRageCriticalChanceBonus);
        }
    }

    getDamageMultiplier (target) {
        let multiplier = 1;

        if (this.Player.Mask == MASK_EAGLE) {
            multiplier = this.Config.EagleDamageMultiplier;
        } else if (this.Player.Mask == MASK_CAT) {
            multiplier = this.Config.CatDamageMultiplier;
        }

        if (target.Player.Class == MAGE || target.Player.Class == BARD) {
            multiplier /= 2;
        }

        return multiplier;
    }

    getHealthLossDamageMultiplier () {
        let healthMissing = 100 - Math.trunc(100 * this.Health / this.TotalHealth);

        let missingLow = healthMissing > this.Config.BearMinTrigger ? Math.min(this.Config.BearBracket, healthMissing - this.Config.BearMinTrigger) : 0;
        let missingMed = healthMissing > this.Config.BearMedTrigger ? Math.min(this.Config.BearBracket, healthMissing - this.Config.BearMedTrigger) : 0;
        let missingMax = healthMissing > this.Config.BearMaxTrigger ? Math.min(this.Config.BearBracket, healthMissing - this.Config.BearMaxTrigger) : 0;

        return missingLow * this.Config.BearMinMultiplier + missingMed * this.Config.BearMedMultiplier + missingMax * this.Config.BearMaxMultiplier;
    }

    attack (damage, target, skipped, critical, type) {
        if (this.Player.Mask == MASK_EAGLE) {
            if (this.SwoopChance > 0 && getRandom(this.SwoopChance)) {
                this.SwoopChance = Math.max(this.Config.EagleSwoopChanceMin, this.SwoopChance - this.Config.EagleSwoopChanceDecay);

                // Swoop
                return super.attack(
                    damage * this.Config.EagleSwoopMultiplier,
                    target,
                    skipped,
                    false,
                    5,
                    true
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
        } else if (this.Player.Mask == MASK_BEAR) {
            return super.attack(
                damage * (this.Config.BearDamageMultiplier + this.getHealthLossDamageMultiplier() / 100),
                target,
                skipped,
                critical,
                type
            );
        } else if (this.Player.Mask == MASK_CAT) {
            if (!skipped && critical && this.RageState) {
                damage *= this.Config.CatRageCriticalDamageMultiplier;

                this.RageState = false;
            }

            return super.attack(
                damage,
                target,
                skipped,
                critical,
                type
            );
        }
    }

    onDamageTaken (source, damage, type) {
        if (damage == 0) {
            this.RageState = true;
        }

        return super.onDamageTaken(source, damage, type);
    }

    fetchCriticalChance (target) {
        if (this.Player.Mask == MASK_CAT && this.RageState) {
            return this.RageCriticalChance;
        } else {
            return this.CriticalChance;
        }
    }

    fetchSkipChance (source) {
        if (source.Player.Class == MAGE) {
            return 0;
        } else if (this.Player.Mask == MASK_CAT && !this.RageState) {
            return this.Config.CatNormalEvadeChance;
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
            let is4x = target.Player.Class == SCOUT || target.Player.Class == ASSASSIN || target.Player.Class == BERSERKER || (target.Player.Class == DRUID && target.Player.Mask == MASK_CAT);
            let is5x = target.Player.Class == WARRIOR || target.Player.Class == DEMONHUNTER || (target.Player.Class == DRUID && target.Player.Mask == MASK_BEAR);

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
    constructor (i, p) {
        super(i, p);

        this.SkipNext = true;
    }

    getDamageMultiplier () {
        // Thanks burningcherry for narrowing the hidden damage boost range
        return 5 / 4;
    }

    skipNextRound () {
        return getRandom(50);
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

    onDamageTaken (source, damage, type = ATTACK_PRIMARY) {
        let state = super.onDamageTaken(source, damage, type);

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
    }

    resetEffects () {
        this.HealMultiplier = 0;
        this.DamageMultiplier = 0;
        this.IncomingDamageMultiplier = 0;
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
        this.BeforeDamageFinalized = this.Player.Instrument == INSTRUMENT_HARP;
    }

    rollEffectLevel () {
        let roll = Math.random() * 100;

        return roll < 25 ? 0 : (roll < 75 ? 1 : 2);
    }

    rollEffectRounds (level) {
        let rounds = Math.min(1, level);

        if (this.Player.Constitution.Total >= this.Player.Intelligence.Total / 2) {
            rounds++;
        }

        if (this.Player.Constitution.Total >= 3 * this.Player.Intelligence.Total / 4) {
            rounds++;
        }

        return rounds;
    }

    rollEffect (target) {
        let level = this.rollEffectLevel();

        this.EffectLevel = level + 1;
        this.EffectReset = this.rollEffectRounds(level);
        this.EffectCounter = 0;
        this.EffectRound = 0;

        if (this.Player.Instrument == INSTRUMENT_HARP) {
            let multiplier = 1 / this.DamageReduction * (1 - this.getDamageReduction(target, this.Config.HarpValues[level]) / 100);

            this.IncomingDamageMultiplier = multiplier;
        } else if (this.Player.Instrument == INSTRUMENT_LUTE) {
            let multiplier = 1 + this.Config.LuteValues[level] / 100;

            this.DamageMultiplier = multiplier;
        } else if (this.Player.Instrument == INSTRUMENT_FLUTE) {
            let multiplier = this.Config.FluteValues[level] / 100;

            this.HealMultiplier = multiplier;
        }

        if (FIGHT_LOG_ENABLED && this.Player.Instrument != INSTRUMENT_LUTE) {
            FIGHT_LOG.logSpell(this, this.EffectLevel, this.EffectReset);
        }
    }

    consumeMultiplier () {
        this.EffectCounter += 1;

        if (FIGHT_LOG_ENABLED) {
            FIGHT_LOG.logSpell(
                this,
                this.EffectLevel,
                this.EffectReset - this.EffectCounter + 1,
                this.Player.Instrument == INSTRUMENT_FLUTE ? this.LastHealthDelta : 0
            );
        }

        if (this.EffectCounter >= this.EffectReset) {
            this.resetEffects();
        }
    }

    onBeforeAttack (target, type) {
        // When this player attacks
        if (this != target) {
            if (this.HealMultiplier) {
                let oldHealth = this.Health;
                let newHealth = Math.min(this.TotalHealth, this.Health + this.HealMultiplier * this.TotalHealth);

                this.Health = newHealth;
                this.LastHealthDelta = newHealth - oldHealth;

                this.consumeMultiplier();
            }

            this.EffectRound += 1;

            if (this.EffectRound >= this.Config.EffectRounds) {
                this.rollEffect(target);
            }
        }
    }

    attack (damage, target, skipped, critical, type) {
        if (this.DamageMultiplier && critical && skipped) {
            skipped = false;
        }

        if (skipped) {
            damage = 0;
        } else {
            if (this.DamageMultiplier) {
                damage *= this.DamageMultiplier;
            }

            damage = super.attack(
                damage,
                target,
                skipped,
                critical,
                type
            );
        }

        if (this.DamageMultiplier) {
            this.consumeMultiplier();
        }

        return damage;
    }

    onBeforeDamageFinalized (damage, target) {
        if (target.IncomingDamageMultiplier) {
            damage *= target.IncomingDamageMultiplier;

            target.consumeMultiplier();
        }

        return damage;
    }
}

// Shared class between all simulators in order to make updates simple
class SimulatorBase {
    setRandomInitialFighter () {
        if (this.a.AttackFirst == this.b.AttackFirst ? getRandom(50) : this.b.AttackFirst) {
            [this.a, this.b] = [this.b, this.a];
        }
    }

    // Thanks to rafa97sam for testing and coding this part that broke me
    forwardToBersekerAttack () {
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

    skipAndAttack () {
        this.turn++;

        if (this.a.BeforeAttack) this.a.onBeforeAttack(this.b, ATTACK_SPECIAL);
        if (this.b.BeforeAttack) this.b.onBeforeAttack(this.b, ATTACK_SPECIAL);

        var damage3 = this.attack(this.a, this.b, this.a.Weapon1, ATTACK_SPECIAL);

        if (this.b.DamageTaken) {
            return this.b.onDamageTaken(this.a, damage3) != STATE_DEAD;
        } else {
            this.b.Health -= damage3;
            return this.b.Health >= 0
        }
    }

    fight () {
        this.turn = 0;

        // Special damage
        if (this.a.Initial !== false || this.b.Initial !== false) {
            this.turn++;

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

        this.setRandomInitialFighter();
        this.forwardToBersekerAttack();

        while (this.a.Health > 0 && this.b.Health > 0) {
            if (this.a.BeforeAttack) this.a.onBeforeAttack(this.b, ATTACK_PRIMARY);
            if (this.b.BeforeAttack) this.b.onBeforeAttack(this.b, ATTACK_PRIMARY);

            var damage = this.attack(this.a, this.b);

            if (this.b.DamageTaken) {
                if (this.b.onDamageTaken(this.a, damage) == STATE_DEAD) {
                    break;
                }
            } else {
                this.b.Health -= damage;
                if (this.b.Health <= 0) {
                    break;
                }
            }

            if (this.a.Weapon2) {
                if (this.a.BeforeAttack) this.a.onBeforeAttack(this.b, ATTACK_SECONDARY);
                if (this.b.BeforeAttack) this.b.onBeforeAttack(this.b, ATTACK_SECONDARY);

                var damage2 = this.attack(this.a, this.b, this.a.Weapon2, ATTACK_SECONDARY);

                if (this.b.DamageTaken) {
                    if (this.b.onDamageTaken(this.a, damage2, ATTACK_SECONDARY) == STATE_DEAD) {
                        break;
                    }
                } else {
                    this.b.Health -= damage2;
                    if (this.b.Health <= 0) {
                        break;
                    }
                }
            }

            if (this.a.SkipNext) {
                while (this.a.skipNextRound() && this.skipAndAttack());
            }

            [this.a, this.b] = [this.b, this.a];
        }

        // Winner
        return (this.a.Health > 0 ? this.a.Index : this.b.Index) == 0;
    }

    attack (source, target, weapon = source.Weapon1, type = ATTACK_PRIMARY) {
        if (FIGHT_LOG_ENABLED) {
            FIGHT_LOG.logRage(1 + this.turn / 6);
        }

        // Random damage for current round
        let damage = (1 + this.turn++ / 6) * (Math.random() * (1 + weapon.Max - weapon.Min) + weapon.Min);

        return source.attack(
            damage,
            target,
            getRandom(target.fetchSkipChance(source)),
            getRandom(source.fetchCriticalChance(target)),
            type
        );
    }
}
