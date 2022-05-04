function getRandom (success) {
    return success > 0 && (Math.random() * 100 < success);
}

const WARRIOR = 1;
const MAGE = 2;
const SCOUT = 3;
const ASSASSIN = 4;
const BATTLEMAGE = 5;
const BERSERKER = 6;
const DEMONHUNTER = 7;
const DRUID = 8;

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
            default:
                return null;
        }
    }

    // Constructor
    constructor (index, player) {
        this.Index = index;
        this.Player = player;
        this.MaxAttacks = player.Attacks || 1;
    }

    // Defense Attribute
    getDefenseAtribute (source) {
        switch (source.Player.Class) {
            case WARRIOR:
            case BERSERKER:
            case BATTLEMAGE:
                return this.Player.Strength / 2;
            case SCOUT:
            case DEMONHUNTER:
            case ASSASSIN:
                return this.Player.Dexterity / 2;
            case MAGE:
            case DRUID:
                return this.Player.Intelligence / 2;
            default:
                return 0;
        }
    }

    // Primary Attribute
    getPrimaryAttribute () {
        switch (this.Player.Class) {
            case WARRIOR:
            case BERSERKER:
            case BATTLEMAGE:
                return this.Player.Strength;
            case SCOUT:
            case DEMONHUNTER:
            case ASSASSIN:
                return this.Player.Dexterity;
            case MAGE:
            case DRUID:
                return this.Player.Intelligence;
            default:
                return 0;
        }
    }

    // Damage Reduction
    getDamageReduction (source) {
        if (source.Player.Class == MAGE) {
            return 0;
        } else {
            let max = this.getMaximumDamageReduction();
            let armor = this.Player.Armor || (max * this.Player.Level);

            if (this.Player.Class == BATTLEMAGE) {
                return Math.min(max, armor / source.Player.Level + 40);
            } else if (this.Player.Class == DRUID && this.Player.Mask == 1) {
                return Math.min(max, 2 * armor / source.Player.Level);
            } else {
                return Math.min(max, armor / source.Player.Level);
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
        if (source.Player.Class == MAGE) {
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
        return Math.min(50, this.Player.Luck * 2.5 / target.Player.Level);
    }

    // Health
    getHealth () {
        if (this.Player.Health) {
            return this.Player.Health;
        } else {
            return (this.getHealthMultiplier() * (this.Player.Level + 1) * this.Player.Constitution) % Math.pow(2, 32);
        }
    }

    getDamageMultiplier () {
        switch (this.Player.Class) {
            case WARRIOR:
            case BATTLEMAGE:
            case ASSASSIN:
            case BERSERKER:
                return 2;
            case DEMONHUNTER:
            case SCOUT:
                return 2.5;
            case MAGE:
            case DRUID:
                return 5;
            default:
                return 0;
        }
    }

    getFixedDamage () {
        return Math.trunc((this.Player.Level + 1) * this.getDamageMultiplier())
    }

    // Get damage range
    getDamageRange (min, max, target) {
        let mp = 1 - target.getDamageReduction(this) / 100;
        let aa = this.getPrimaryAttribute();
        let ad = target.getDefenseAtribute(this);

        let dm = mp * (1 + Math.max(aa / 2, aa - ad) / 10);

        if (!min || !max) {
            min = max = this.getFixedDamage();
        }

        return {
            Max: Math.ceil(dm * min),
            Min: Math.ceil(dm * max)
        };
    }

    // Initialize model
    initialize (target) {
        // Round modifiers
        this.SkipChance = this.getBlockChance(target);
        this.CriticalChance = this.getCriticalChance(target);
        this.TotalHealth = this.getHealth();

        this.Damage1 = this.getDamageRange(this.Player.DamageMin, this.Player.DamageMax, target);
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

    getDamageRange (min, max, target) {
        if (target.Player.Class == BERSERKER) {
            var range = super.getDamageRange(min, max, target);
            return {
                Max: Math.ceil(range.Max * 2),
                Min: Math.ceil(range.Min * 2)
            }
        } else {
            return super.getDamageRange(min, max, target);
        }
    }
}

class DruidModel extends FighterModel {
    constructor (i, p) {
        super(i, p);
    }

    getDamageRange (min, max, target) {
        var range = super.getDamageRange(min, max, target);

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

    getDamageRange (min, max, target) {
        var range = super.getDamageRange(min, max, target);
        return {
            Max: Math.ceil(range.Max * 2),
            Min: Math.ceil(range.Min * 2)
        }
    }

    initialize (target) {
        super.initialize(target);

        // Do no damage on second hit but double on first
        this.Damage2 = { Min: 0, Max: 0 }
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

    getDamageRange (min, max, target) {
        var range = super.getDamageRange(min, max, target);
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

// WebWorker hooks
self.addEventListener('message', function (message) {
    let { iterations, hydra, pet } = message.data;

    self.postMessage({
        command: 'finished',
        results: new HydraSimulator().simulate(pet, hydra, iterations)
    });

    self.close();
});

class HydraSimulator {
    simulate (pet, hydra, iterations) {
        this.cache(pet, hydra);

        let score = 0;
        let avg_fights = 0;
        let avg_health = 0;

        for (let i = 0; i < iterations; i++) {
            let { win, health, fights } = this.battle();

            score += win;
            avg_health += health;
            avg_fights += fights;
        }

        return {
            pet,
            hydra,
            iterations,
            score,
            avg_health: avg_health / iterations,
            avg_fights: avg_fights / iterations
        }
    }

    cache (pet, hydra) {
        this.ca = FighterModel.create(0, pet);
        this.cb = FighterModel.create(1, hydra);

        this.ca.initialize(this.cb);
        this.cb.initialize(this.ca);

        this.as = this.ca.onFightStart(this.cb);
        this.bs = this.cb.onFightStart(this.ca);

        this.a = this.ca;
        this.b = this.cb;
    }

    battle () {
        this.ca.Attacks = 1;
        this.cb.Health = this.cb.TotalHealth;

        do {
            this.ca.Health = this.ca.TotalHealth;

            if (!this.fight()) {
                this.ca.Attacks++;
            }
        } while (this.ca.Attacks <= this.ca.MaxAttacks && this.cb.Health > 0);

        return {
            win: this.cb.Health <= 0,
            health: Math.max(0, this.cb.Health),
            fights: this.ca.Attacks
        }
    }

    setRandomInitialFighter () {
        if (getRandom(50)) {
            [this.a, this.b] = [this.b, this.a];
        }
    }

    forwardToBersekerAttack () {
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

    fight () {
        this.turn = 0;

        // Special damage
        if (this.as !== false || this.bs !== false) {
            this.turn++;

            if (this.as > 0) {
                this.b.Health -= this.as;
            } else if (this.bs > 0) {
                this.a.Health -= this.bs;
            }
        }

        this.setRandomInitialFighter();
        this.forwardToBersekerAttack();

        while (this.a.Health > 0 && this.b.Health > 0) {
            var damage = this.attack(this.a, this.b);
            if (this.a.DamageDealt) {
                this.a.onDamageDealt(this.b, damage);
            }

            if (this.b.DamageTaken) {
                let alive = this.b.onDamageTaken(this.a, damage);
                if (alive == 0) {
                    break;
                }
            } else {
                this.b.Health -= damage;
                if (this.b.Health <= 0) {
                    break;
                }
            }

            if (this.a.Damage2) {
                var damage2 = this.attack(this.a, this.b, this.a.Damage2);
                if (this.a.DamageDealt) {
                    this.a.onDamageDealt(this.b, damage2);
                }

                if (this.b.DamageTaken) {
                    let alive = this.b.onDamageTaken(this.a, damage2);
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

    skipAndAttack () {
        this.turn++;

        var damage3 = this.attack(this.a, this.b, this.a.Damage1);
        if (this.a.DamageDealt) {
            this.a.onDamageDealt(this.b, damage3);
        }

        if (this.b.DamageTaken) {
            let alive = this.b.onDamageTaken(this.a, damage3);
            return alive > 0;
        } else {
            this.b.Health -= damage3;
            return this.b.Health >= 0
        }
    }

    attack (source, target, weapon = source.Damage1) {
        var turn = this.turn++;
        var rage = 1 + turn / 6;

        var damage = 0;
        var skipped = getRandom(target.SkipChance);
        var critical = getRandom(source.CriticalChance);

        if (!skipped) {
            damage = rage * (Math.random() * (1 + weapon.Max - weapon.Min) + weapon.Min);
            if (critical) {
                damage *= 2;
            }

            damage = Math.ceil(damage);
        }

        return damage;
    }
}
