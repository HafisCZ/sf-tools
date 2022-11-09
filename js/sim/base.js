FIGHT_LOG_ENABLED = false;
FIGHT_LOG = new (class {
    constructor () {
        this.allLogs = [];
    }

    _newRound (attacker, target, type, damage) {
        this.lastLog.rounds.push({
            attacker: attacker.Player.ID || attacker.Index,
            target: target.Player.ID || target.Index,
            attackDamage: damage,
            attackType: type,
            attackSecondary: type <= 100 && (type >= 10 && type <= 14),
            attackCrit: type <= 100 && (type % 10 == 1),
            attackMissed: type <= 100 && ((type % 10 == 3) || (type % 10 == 4))
        })
    }

    dump () {
        return this.allLogs;
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

    logRevive (source, target) {
        this._newRound(
            source,
            target,
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

// Returns true if random chance occured
function getRandom (success) {
    return success > 0 && (Math.random() * 100 < success);
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
    static create (index, player) {
        switch (player.Class) {
            case WARRIOR:
                return new WarriorModel(index, player);
            case BERSERKER:
                return new BerserkerModel(index, player);
            case BATTLEMAGE:
                return new BattlemageModel(index, player);
            case SCOUT:
                return new ScoutModel(index, player);
            case DEMONHUNTER:
                return new DemonHunterModel(index, player);
            case ASSASSIN:
                return new AssassinModel(index, player);
            case MAGE:
                return new MageModel(index, player);
            case DRUID:
                return new DruidModel(index, player);
            case BARD:
                return new BardModel(index, player);
            default:
                return null;
        }
    }

    // Constructor
    constructor (index, player) {
        this.Index = index;
        this.Player = player;
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

        if (typeof this.Player.ForceGladiator === 'number') {
            ownGladiator = this.Player.ForceGladiator;
        }

        if (typeof target.Player.ForceGladiator === 'number') {
            reducingGladiator = target.Player.ForceGladiator;
        }

        if (this.Player.NoGladiatorReduction) {
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

    getDamageMultiplier () {
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
        let min = 1;
        let max = 2;

        if (this.Player.Level > 10 && !this.Player.NoBaseDamage) {
            let num = (this.Player.Level - 9) * this.getDamageMultiplier();
            let mul = secondary ? 0.1 : 0.7;

            min = Math.ceil(mul * num * 2 / 3);
            max = Math.round(mul * num * 4 / 3);
        }

        return {
            Min: Math.max(1, min),
            Max: Math.max(2, max)
        };
    }

    // Get damage range
    getDamageRange (weapon, target, secondary = false) {
        let mf = (1 - target.Player.Runes.ResistanceFire / 100) * (getRuneValue(weapon, RUNE_FIRE_DAMAGE) / 100);
        let mc = (1 - target.Player.Runes.ResistanceCold / 100) * (getRuneValue(weapon, RUNE_COLD_DAMAGE) / 100);
        let ml = (1 - target.Player.Runes.ResistanceLightning / 100) * (getRuneValue(weapon, RUNE_LIGHTNING_DAMAGE) / 100);

        let m = (1 + this.Player.Dungeons.Group / 100) * target.DamageReduction * (1 + mf + mc + ml);

        let aa = this.getAttribute(this);
        let ad = target.getAttribute(this) / 2;

        let dm = m * (1 + Math.max(aa / 2, aa - ad) / 10);

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
        this.Critical = this.getCriticalMultiplier(weapon1, weapon2, target);
    }

    reset (resetHealth = true) {
        if (resetHealth) {
            this.Health = this.TotalHealth || this.getHealth();
        }
    }

    // Triggers once before each fight and returns special damage to be dealt
    onBeforeFight (target) {
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

    attack (damage, target, type, skipped, critical) {
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
                (critical ? 1 : (skipped ? (target.Player.Class == WARRIOR ? 3 : 4) : 0)) + type * 10,
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
}

class WarriorModel extends FighterModel {
    constructor (i, p) {
        super(i, p);
    }
}

class MageModel extends FighterModel {
    constructor (i, p) {
        super(i, p);
    }

    getDamageRange (weapon, target) {
        if (target.Player.Class == BERSERKER) {
            var range = super.getDamageRange(weapon, target);
            return {
                Max: Math.ceil(range.Max * 2),
                Min: Math.ceil(range.Min * 2)
            }
        } else {
            return super.getDamageRange(weapon, target);
        }
    }
}

const DRUID_EAGLE_CHANCE = 50;
const DRUID_EAGLE_CHANCE_DECAY = 5;

const DRUID_BEAR_BRACKET = 25;

const DRUID_BEAR_MAX_TRIGGER = 75;
const DRUID_BEAR_MED_TRIGGER = 50;
const DRUID_BEAR_MIN_TRIGGER = 25;

const DRUID_BEAR_MAX_MULTIPLIER = 1;
const DRUID_BEAR_MED_MULTIPLIER = 0.5;
const DRUID_BEAR_MIN_MULTIPLIER = 0.3;

class DruidModel extends FighterModel {
    constructor (i, p) {
        super(i, p);
    }

    reset (resetHealth = true) {
        super.reset(resetHealth);

        this.SwoopChance = DRUID_EAGLE_CHANCE;
        this.RageState = false;
    }

    initialize (target) {
        super.initialize(target);

        this.DamageTaken = this.Player.Mask == MASK_CAT;
    }

    getDamageRange (weapon, target) {
        let range = super.getDamageRange(weapon, target);
        let multiplier = 1;

        if (this.Player.Mask == MASK_EAGLE) {
            multiplier = 1 / 3;
        } else if (this.Player.Mask == MASK_CAT) {
            multiplier = 5 / 9;
        }

        if (target.Player.Class == MAGE || target.Player.Class == BARD) {
            multiplier /= 2;
        }

        return {
            Max: Math.ceil(range.Max * multiplier),
            Min: Math.ceil(range.Min * multiplier)
        }
    }

    getHealthLossDamageMultiplier () {
        let healthMissing = 100 - Math.trunc(100 * this.Health / this.TotalHealth);

        let missingLow = healthMissing > DRUID_BEAR_MIN_TRIGGER ? Math.min(DRUID_BEAR_BRACKET, healthMissing - DRUID_BEAR_MIN_TRIGGER) : 0;
        let missingMed = healthMissing > DRUID_BEAR_MED_TRIGGER ? Math.min(DRUID_BEAR_BRACKET, healthMissing - DRUID_BEAR_MED_TRIGGER) : 0;
        let missingMax = healthMissing > DRUID_BEAR_MAX_TRIGGER ? Math.min(DRUID_BEAR_BRACKET, healthMissing - DRUID_BEAR_MAX_TRIGGER) : 0;

        return missingLow * DRUID_BEAR_MIN_MULTIPLIER + missingMed * DRUID_BEAR_MED_MULTIPLIER + missingMax * DRUID_BEAR_MAX_MULTIPLIER;
    }

    attack (damage, target, type, skipped, critical) {
        if (this.Player.Mask == MASK_EAGLE) {
            if (this.SwoopChance > 0 && getRandom(this.SwoopChance)) {
                this.SwoopChance -= DRUID_EAGLE_CHANCE_DECAY;

                // Swoop
                return super.attack(
                    damage * 16,
                    target,
                    5, // TODO: Replace with actual swoop value
                    skipped,
                    false
                );
            } else {
                return super.attack(
                    damage,
                    target,
                    type,
                    skipped,
                    critical
                );
            }
        } else if (this.Player.Mask == MASK_BEAR) {
            return super.attack(
                damage * (4 / 9 + this.getHealthLossDamageMultiplier() / 100),
                target,
                type,
                skipped,
                critical
            );
        } else if (this.Player.Mask == MASK_CAT) {
            if (skipped) {
                damage = 0;
            } else {
                if (target.BeforeDamageFinalized) {
                    damage = target.onBeforeDamageFinalized(damage, target);
                }

                if (critical) {
                    damage *= this.Critical;

                    if (this.RageState) {
                        damage *= 2.5;

                        this.RageState = false;
                    }
                }

                damage = Math.ceil(damage);
            }

            if (FIGHT_LOG_ENABLED) {
                FIGHT_LOG.logAttack(
                    source,
                    target,
                    (critical ? 1 : (skipped ? (target.Player.Class == WARRIOR ? 3 : 4) : 0)) + type * 10,
                    damage
                )
            }

            return damage;
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
            return this.getCriticalChance(target, 75);
        } else {
            return this.CriticalChance;
        }
    }

    fetchSkipChance (source) {
        if (source.Player.Class == MAGE) {
            return 0;
        } else if (this.Player.Mask == MASK_CAT && !this.RageState) {
            return 35;
        } else {
            return this.SkipChance;
        }
    }
}

class ScoutModel extends FighterModel {
    constructor (i, p) {
        super(i, p);
    }
}

class AssassinModel extends FighterModel {
    constructor (i, p) {
        super(i, p);
    }

    getDamageRange (weapon, target, secondary = false) {
        var range = super.getDamageRange(weapon, target);
        return {
            Max: Math.ceil(range.Max * 5 / 8),
            Min: Math.ceil(range.Min * 5 / 8)
        }
    }

    initialize (target) {
        super.initialize(target);

        var weapon = this.Player.Items.Wpn2;
        if (weapon) {
            this.Weapon2 = this.getDamageRange(weapon, target, true);
        }
    }
}

class BattlemageModel extends FighterModel {
    constructor (i, p) {
        super(i, p);

        this.BeforeFight = true;
    }

    onBeforeFight (target) {
        if (target.Player.Class == MAGE || target.Player.Class == BATTLEMAGE) {
            return 0;
        } else if (this.Player.FireballFix) {
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

    getDamageRange (weapon, target) {
        var range = super.getDamageRange(weapon, target);
        return {
            // Thanks burningcherry for narrowing the hidden damage boost range
            Max: Math.ceil(range.Max * 5 / 4),
            Min: Math.ceil(range.Min * 5 / 4)
        }
    }

    skipNextRound () {
        return getRandom(50);
    }
}

const DH_REVIVE_CHANCE = 400 / 9;
const DH_REVIVE_CHANCE_DECAY = 2;
const DH_REVIVE_HP = 0.9;
const DH_REVIVE_HP_DECAY = 0.1;

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
            let reviveChance = DH_REVIVE_CHANCE - DH_REVIVE_CHANCE_DECAY * this.DeathTriggers;

            if (source.Player.Class != MAGE && getRandom(reviveChance)) {
                this.Health = this.TotalHealth * Math.max(DH_REVIVE_HP_DECAY, DH_REVIVE_HP - this.DeathTriggers * DH_REVIVE_HP_DECAY);
                this.DeathTriggers += 1;

                if (FIGHT_LOG_ENABLED) {
                    FIGHT_LOG.logRevive(this, source);
                }

                return STATE_ALIVE;
            }
        }

        return state;
    }
}

const BARD_EFFECT_ROUNDS = 4;

const INSTRUMENT_HARP_VALUES = [ 40, 55, 75 ];
const INSTRUMENT_LUTE_VALUES = [ 20, 40, 60 ];
const INSTRUMENT_FLUTE_VALUES = [ 5, 7.5, 10 ];

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
        this.EffectCounter = BARD_EFFECT_ROUNDS;
        // How many rounds passed since cast
        this.EffectRound = BARD_EFFECT_ROUNDS;
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
            let multiplier = 1 / this.DamageReduction * (1 - this.getDamageReduction(target, INSTRUMENT_HARP_VALUES[level]) / 100);

            this.IncomingDamageMultiplier = multiplier;
        } else if (this.Player.Instrument == INSTRUMENT_LUTE) {
            let multiplier = 1 + INSTRUMENT_LUTE_VALUES[level] / 100;

            this.DamageMultiplier = multiplier;
        } else if (this.Player.Instrument == INSTRUMENT_FLUTE) {
            let multiplier = INSTRUMENT_FLUTE_VALUES[level] / 100;

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

            if (this.EffectRound >= BARD_EFFECT_ROUNDS) {
                this.rollEffect(target);
            }
        }
    }

    attack (damage, target, type, skipped, critical) {
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
                type,
                skipped,
                critical
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
        if (this.as !== false || this.bs !== false) {
            this.turn++;

            if (this.as > 0) {
                this.b.Health -= this.as;

                if (FIGHT_LOG_ENABLED) {
                    FIGHT_LOG.logFireball(this.a, this.b, this.as);
                }
            } else if (this.bs > 0) {
                this.a.Health -= this.bs;

                if (FIGHT_LOG_ENABLED) {
                    FIGHT_LOG.logFireball(this.b, this.a, this.bs);
                }
            } else if (FIGHT_LOG_ENABLED) {
                // Report fireball blocked
                FIGHT_LOG.logFireball(this.a, this.b, 0);
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
        // Random damage for current round
        let damage = (1 + this.turn++ / 6) * (Math.random() * (1 + weapon.Max - weapon.Min) + weapon.Min);

        return source.attack(
            damage,
            target,
            type,
            getRandom(target.fetchSkipChance(source)),
            getRandom(source.fetchCriticalChance(target))
        );
    }
}
