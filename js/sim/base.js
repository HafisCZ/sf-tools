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
    getDamageReduction (source) {
        if (source.Player.Class == MAGE) {
            return 0;
        } else if (this.Player.ForceArmor) {
            let maximumReduction = this.getMaximumDamageReduction();
            if (this.Player.ForceArmor === true) {
                return maximumReduction;
            } else {
                return Math.min(maximumReduction, this.Player.ForceArmor * maximumReduction * this.Player.Level / source.Player.Level);
            }
        } else {
            if (this.Player.Class == BATTLEMAGE) {
                return Math.min(this.getMaximumDamageReduction(), this.Player.Armor / source.Player.Level + 40);
            } else if (this.Player.Class == DRUID && this.Player.Mask == 1) {
                return Math.min(this.getMaximumDamageReduction(), 2 * this.Player.Armor / source.Player.Level);
            } else {
                return Math.min(this.getMaximumDamageReduction(), this.Player.Armor / source.Player.Level);
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
                return 25;
            case MAGE:
                return 10;
            case DRUID:
                return this.Player.Mask == 1 ? 50 : (this.Player.Mask == 2 ? 25 : 0);
            default:
                return 0;
        }
    }

    // Block Chance
    getBlockChance (source) {
        if (source.Player.Class == MAGE || this.Player.NoSkip) {
            return 0;
        } else {
            switch (this.Player.Class) {
                case SCOUT:
                case ASSASSIN:
                    return 50;
                case WARRIOR:
                    return 25;
                case DRUID:
                    return this.Player.Mask == 1 ? 25 : (this.Player.Mask == 2 ? 50 : 0);
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
                return 2;
            case DRUID:
                return this.Player.Mask == 1 ? 5 : (this.Player.Mask == 2 ? 4 : 2);
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
        return 2 * (1 + 0.05 * (this.Player.ForceGladiator ? this.Player.Fortress.Gladiator : Math.max(0, this.Player.Fortress.Gladiator - target.Player.Fortress.Gladiator))) * (weapon.HasEnchantment || (weapon2 && weapon2.HasEnchantment) ? 1.05 : 1);
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
            case BERSERKER;
                return 2;
            case SCOUT:
            case DEMONHUNTER:
                return 2.5;
            case MAGE:
            case DRUID:
            case BARD:
                return 4.5;
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
        let mp = 1 - target.getDamageReduction(this) / 100;

        let mf = (1 - target.Player.Runes.ResistanceFire / 100) * (getRuneValue(weapon, RUNE_FIRE_DAMAGE) / 100);
        let mc = (1 - target.Player.Runes.ResistanceCold / 100) * (getRuneValue(weapon, RUNE_COLD_DAMAGE) / 100);
        let ml = (1 - target.Player.Runes.ResistanceLightning / 100) * (getRuneValue(weapon, RUNE_LIGHTNING_DAMAGE) / 100);

        let m = (1 + this.Player.Dungeons.Group / 100) * mp * (1 + mf + mc + ml);

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
        this.AttackFirst = this.Player.Items.Hand.HasEnchantment;
        this.SkipChance = this.getBlockChance(target);
        this.CriticalChance = this.getCriticalChance(target);
        this.TotalHealth = this.getHealth();

        // Weapon
        var weapon = this.Player.Items.Wpn1;
        var weapon2 = this.Player.Items.Wpn2;

        this.Weapon1 = this.getDamageRange(weapon, target);
        this.Critical = this.getCriticalMultiplier(weapon, weapon2, target);
    }

    onFightStart (target) {
        return false;
    }

    onDeath (source) {

    }

    onDamageDealt (target, damage) {

    }

    onDamageTaken (source, damage) {
        this.Health -= damage;
        if (this.Health < 0) {
            return this.onDeath(source) ? 2 : (this.Health > 0 ? 1 : 0);
        }

        return this.Health > 0 ? 1 : 0;
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

        if (this.Player.Mask == 1) {
            return {
                Max: Math.ceil((1 + 1 / 3) * range.Max / 3),
                Min: Math.ceil((1 + 1 / 3) * range.Min / 3)
            }
        } else if (this.Player.Mask == 2) {
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

class DemonHunterModel extends FighterModel {
    constructor (i, p) {
        super(i, p);
        this.DamageTaken = true;
    }

    onDeath (source) {
        if (source.Player.Class != MAGE && source.Player.Class != DRUID && getRandom(25)) {
            this.Health = this.TotalHealth;

            return true;
        }

        return false;
    }
}

class BardModel extends FighterModel {
    constructor (i, p) {
        super(i, p);
    }

    // TODO
}
