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

// Masks
const MASK_NONE = 0;
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
        if (source.Player.Class == MAGE) {
            return 0;
        } else if (typeof this.Player.ForceArmor !== 'undefined') {
            return Math.min(maximumReduction, this.Player.ForceArmor * maximumReduction * this.Player.Level / source.Player.Level);
        } else {
            if (this.Player.Class == BATTLEMAGE) {
                return Math.min(maximumReduction, this.Player.Armor / source.Player.Level + 40);
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
            case BATTLEMAGE:
            case DEMONHUNTER:
                return 50;
            case SCOUT:
            case ASSASSIN:
            case BERSERKER:
            case BARD:
                return 25;
            case MAGE:
                return 10;
            case DRUID:
                switch (this.Player.Mask) {
                    case MASK_BEAR: return 50;
                    case MASK_CAT: return 25;
                    default: 10;
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
                switch (this.Player.Mask) {
                    case MASK_BEAR: return 25;
                    case MASK_CAT: return 50;
                    default: 0;
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
                    case MASK_BEAR: return 5;
                    case MASK_CAT: return 4;
                    default: 2;
                }
            default:
                return 0;
        }
    }

    // Critical Chance
    getCriticalChance (target) {
        return Math.min(50, this.Player.Luck.Total * 2.5 / target.Player.Level);
    }

    // Critical Multiplier
    getCriticalMultiplier (weapon, weapon2, target) {
        let baseMultiplier = (weapon.HasEnchantment || (weapon2 && weapon2.HasEnchantment)) ? 1.05 : 1;

        let multiplier = 0.05 * Math.max(0, this.Player.Fortress.Gladiator - target.Player.Fortress.Gladiator);
        if (this.Player.ForceGladiator === true) {
            multiplier = 0.05 * this.Player.Fortress.Gladiator;
        } else if (this.Player.ForceGladiator) {
            multiplier = 0.05 * this.Player.ForceGladiator;
        }

        return 2 * baseMultiplier * (1 + multiplier);
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

            return Math.ceil(Math.ceil(Math.ceil(Math.ceil(Math.ceil(this.Player.Constitution.Total * a) * b) * c) * d) * e) % Math.pow(2, 32);
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
            let num = Math.trunc((this.Player.Level - 9) * this.getDamageMultiplier());
            let mul = secondary ? 0.1 : 0.7;

            min = Math.trunc(mul * num * 2 / 3);
            max = Math.trunc(mul * num * 4 / 3);
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

    reset () {
        this.Health = this.TotalHealth || this.getHealth();

        // Trigger counters
        this.DeathTriggers = 0;
    }

    onFightStart (target) {
        return false;
    }

    onDeath (source) {

    }

    onDamageDealt (target, damage) {

    }

    onDamageTaken (source, damage, secondary = false) {
        this.Health -= damage;
        if (this.Health < 0 && this.onDeath(source)) {
            this.DeathTriggers++;

            return 2;
        } else {
            return this.Health > 0 ? 1 : 0;
        }
    }

    skipNextRound () {
        return false;
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

class DruidModel extends FighterModel {
    constructor (i, p) {
        super(i, p);
    }

    getDamageRange (weapon, target) {
        var range = super.getDamageRange(weapon, target);

        if (this.Player.Mask == MASK_BEAR) {
            return {
                Max: Math.ceil((1 + 1 / 3) * range.Max / 3),
                Min: Math.ceil((1 + 1 / 3) * range.Min / 3)
            }
        } else if (this.Player.Mask == MASK_CAT) {
            return {
                Max: Math.ceil((1 + 2 / 3) * range.Max / 3),
                Min: Math.ceil((1 + 2 / 3) * range.Min / 3)
            }
        } else {
            return {
                Max: Math.ceil(range.Max / 3),
                Min: Math.ceil(range.Min / 3)
            }
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
    }

    onFightStart (target) {
        if (target.Player.Class == MAGE || target.Player.Class == BATTLEMAGE) {
            return 0;
        } else if (target.Player.Class == BERSERKER || target.Player.Class == DEMONHUNTER || target.Player.Class == DRUID) {
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

class DemonHunterModel extends FighterModel {
    constructor (i, p) {
        super(i, p);
        this.DamageTaken = true;
    }

    onDeath (source) {
        let reviveChance = DH_REVIVE_CHANCE - 2 * this.DeathTriggers;

        if (source.Player.Class != MAGE && getRandom(reviveChance)) {
            this.Health = this.TotalHealth * Math.max(0.1, 0.9 - this.DeathTriggers * 0.1);

            return true;
        }

        return false;
    }
}

const BARD_EFFECT_ROUNDS = 4;

class BardModel extends FighterModel {
    constructor (i, p) {
        super(i, p);

        this.BeforeAttack = true;
        this.DamageTaken = p.Instrument == INSTRUMENT_FLUTE;

        this.resetEffects();
        this.resetTimers();
    }

    resetEffects () {
        this.HealMultiplier = 0;
        this.DamageMultiplier = 0;
        this.IncomingDamageMultiplier = 0;
    }

    resetTimers () {
        this.EffectReset = 0;
        this.EffectCounter = BARD_EFFECT_ROUNDS;
    }

    reset () {
        super.reset();

        this.resetEffects();
        this.resetTimers();
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

        this.EffectReset = this.rollEffectRounds(level);
        this.EffectCounter = 0;

        if (this.Player.Instrument == INSTRUMENT_HARP) {
            let multiplier = 1 / this.DamageReduction * (1 - this.getDamageReduction(target, [ 40, 55, 75 ][level]) / 100);

            this.IncomingDamageMultiplier = multiplier;
        } else if (this.Player.Instrument == INSTRUMENT_LUTE) {
            let multiplier = 1 + [ 20, 40, 60 ][level] / 100;

            this.DamageMultiplier = multiplier;
        } else /* INSTRUMENT_FLUTE */ {
            let multiplier = [ 5, 7.5, 10 ][level] / 100;

            this.HealMultiplier = multiplier;
        }
    }

    onDamageTaken (source, damage, secondary = false) {
        let state = super.onDamageTaken(source, damage, secondary);
        if (state == 1 && this.HealMultiplier && (source.Player.Class != ASSASSIN || secondary)) {
            this.Health += this.HealMultiplier * this.TotalHealth;
        }

        return state;
    }

    onBeforeAttack (target) {
        let shouldCount = this == target;
        let shouldRoll = this == target;

        // Set up exceptions
        if (this.Player.Instrument == INSTRUMENT_HARP) {
            shouldRoll = true;
        } else if (this.Player.Instrument == INSTRUMENT_LUTE) {
            shouldCount = this != target;
            shouldRoll = this != target;
        } else /* INSTRUMENT_FLUTE */ {
            shouldRoll = true;
        }

        if (shouldCount) {
            this.EffectCounter += 1;

            if (this.EffectCounter >= this.EffectReset) {
                this.resetEffects();
            }
        }

        if (shouldRoll && this.EffectCounter >= BARD_EFFECT_ROUNDS) {
            this.EffectCounter = 0;
            this.rollEffect(target);
        }
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

        if (this.a.BeforeAttack) this.a.onBeforeAttack(this.b);
        if (this.b.BeforeAttack) this.b.onBeforeAttack(this.b);

        var damage3 = this.attack(this.a, this.b, this.a.Weapon1, 2);
        if (this.a.DamageDealt) {
            this.a.onDamageDealt(this.b, damage3);
        }

        if (this.b.DamageTaken) {
            var alive = this.b.onDamageTaken(this.a, damage3);

            if (FIGHT_DUMP_ENABLED && alive == 2) this.log(5);

            return alive > 0;
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
                if (FIGHT_DUMP_ENABLED) this.log(1);
            } else if (this.bs > 0) {
                this.a.Health -= this.bs;
                if (FIGHT_DUMP_ENABLED) this.log(2);
            } else {
                if (FIGHT_DUMP_ENABLED) this.log(3);
            }
        }

        this.setRandomInitialFighter();
        this.forwardToBersekerAttack();

        while (this.a.Health > 0 && this.b.Health > 0) {
            if (this.a.BeforeAttack) this.a.onBeforeAttack(this.b);
            if (this.b.BeforeAttack) this.b.onBeforeAttack(this.b);

            var damage = this.attack(this.a, this.b);
            if (this.a.DamageDealt) {
                this.a.onDamageDealt(this.b, damage);
            }

            if (this.b.DamageTaken) {
                let alive = this.b.onDamageTaken(this.a, damage);

                if (FIGHT_DUMP_ENABLED && alive == 2) this.log(5);

                if (alive == 0) {
                    break;
                }
            } else {
                this.b.Health -= damage;
                if (this.b.Health <= 0) {
                    break;
                }
            }

            if (this.a.Weapon2) {
                if (this.a.BeforeAttack) this.a.onBeforeAttack(this.b);
                if (this.b.BeforeAttack) this.b.onBeforeAttack(this.b);

                var damage2 = this.attack(this.a, this.b, this.a.Weapon2, 1);
                if (this.a.DamageDealt) {
                    this.a.onDamageDealt(this.b, damage2);
                }

                if (this.b.DamageTaken) {
                    let alive = this.b.onDamageTaken(this.a, damage2, true);

                    if (FIGHT_DUMP_ENABLED && alive == 2) this.log(5);

                    if (alive == 0) {
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

    attack (source, target, weapon = source.Weapon1, extra = 0) {
        var turn = this.turn++;
        var rage = 1 + turn / 6;

        var damage = 0;
        var skipped = getRandom(target.SkipChance);
        var critical = false;

        if (!skipped) {
            damage = rage * (Math.random() * (1 + weapon.Max - weapon.Min) + weapon.Min);
            if (source.DamageMultiplier) {
                damage *= source.DamageMultiplier;
            }

            if (target.IncomingDamageMultiplier) {
                damage *= target.IncomingDamageMultiplier;
            }

            if (critical = getRandom(source.CriticalChance)) {
                damage *= source.Critical;
            }

            damage = Math.ceil(damage);
        }

        if (FIGHT_DUMP_ENABLED) this.log(4, source, target, weapon, damage, skipped, critical, extra);

        return damage;
    }

    log (stage, ... args) {
        if (stage == 0) {
            this.log_obj = {
                targetA: {
                    ID: this.a.Player.ID || this.a.Index,
                    Name: this.a.Player.Name,
                    Level: this.a.Player.Level,
                    MaximumLife: this.a.TotalHealth,
                    Life: this.a.TotalHealth,
                    Strength: this.a.Player.Strength.Total,
                    Dexterity: this.a.Player.Dexterity.Total,
                    Intelligence: this.a.Player.Intelligence.Total,
                    Constitution: this.a.Player.Constitution.Total,
                    Luck: this.a.Player.Luck.Total,
                    Face: this.a.Player.Face,
                    Race: this.a.Player.Race,
                    Gender: this.a.Player.Gender,
                    Class: this.a.Player.Class,
                    Wpn1: this.a.Player.Items.Wpn1,
                    Wpn2: this.a.Player.Items.Wpn2
                },
                targetB: {
                    ID: this.b.Player.ID || this.b.Index,
                    Name: this.b.Player.Name,
                    Level: this.b.Player.Level,
                    MaximumLife: this.b.TotalHealth,
                    Life: this.b.TotalHealth,
                    Strength: this.b.Player.Strength.Total,
                    Dexterity: this.b.Player.Dexterity.Total,
                    Intelligence: this.b.Player.Intelligence.Total,
                    Constitution: this.b.Player.Constitution.Total,
                    Luck: this.b.Player.Luck.Total,
                    Face: this.b.Player.Face,
                    Race: this.b.Player.Race,
                    Gender: this.b.Player.Gender,
                    Class: this.b.Player.Class,
                    Wpn1: this.b.Player.Items.Wpn1,
                    Wpn2: this.b.Player.Items.Wpn2
                },
                rounds: []
            };

            FIGHT_DUMP_OUTPUT.push(this.log_obj);
        } else if (stage == 1) {
            this.log_obj.rounds.push({
                attackCrit: false,
                attackType: 15,
                attackMissed: false,
                attackDamage: this.as,
                attackSecondary: false,
                attacker: this.a.Player.ID || this.a.Index,
                target: this.b.Player.ID || this.b.Index
            });
        } else if (stage == 2) {
            this.log_obj.rounds.push({
                attackCrit: false,
                attackType: 15,
                attackMissed: false,
                attackSecondary: false,
                attackDamage: this.bs,
                attacker: this.b.Player.ID || this.b.Index,
                target: this.a.Player.ID || this.a.Index
            });
        } else if (stage == 3) {
            this.log_obj.rounds.push({
                attackCrit: false,
                attackType: 16,
                attackMissed: true,
                attackSecondary: false,
                attackDamage: 0,
                attacker: this.a.Player.ID || this.a.Index,
                target: this.b.Player.ID || this.b.Index
            });
        } else if (stage == 4) {
            let [ source, target, weapon, damage, skipped, critical, extra ] = args;
            this.log_obj.rounds.push({
                attackCrit: critical,
                attackType: (critical ? 1 : (skipped ? (target.Player.Class == WARRIOR ? 3 : 4) : 0)) + (extra ? 20 : 0),
                attackMissed: skipped,
                attackDamage: damage,
                attackSecondary: weapon != source.Weapon1,
                attacker: source.Player.ID || source.Index,
                target: target.Player.ID || target.Index
            });
        } else if (stage == 5) {
            this.log_obj.rounds.push({
                attackCrit: false,
                attackType: 100,
                attackMissed: false,
                attackDamage: 0,
                attackSecondary: false,
                attacker: this.a.Player.ID || this.a.Index,
                target: this.b.Player.ID || this.b.Index
            });
        }
    }
}
