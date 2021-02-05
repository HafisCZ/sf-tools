function getRuneValue (item, rune) {
    return item.AttributeTypes[2] == rune ? item.Attributes[2] : 0;
}

function getRandom (success) {
    return success > 0 && (Math.random() * 100 < success);
}

// Rune / Rune table
const RUNE = {
    GOLD: 31,
    EPIC_FIND: 32,
    ITEM_QUALITY: 33,
    XP: 34,
    HEALTH: 35,
    FIRE_RESISTANCE: 36,
    COLD_RESISTANCE: 37,
    LIGHTNING_RESISTANCE: 38,
    TOTAL_RESITANCE: 39,
    FIRE_DAMAGE: 40,
    COLD_DAMAGE: 41,
    LIGHTNING_DAMAGE: 42
};

// SFGAME classes
const WARRIOR = 1;
const MAGE = 2;
const SCOUT = 3;
const ASSASSIN = 4;
const BATTLEMAGE = 5;
const BERSERKER = 6;
const DEMONHUNTER = 7;
const DRUID = 8;

const ClassMap = {
    1: 'Warrior',
    2: 'Mage',
    3: 'Scout',
    4: 'Assassin',
    5: 'Battle Mage',
    6: 'Berserker',
    7: 'Demon Hunter',
    8: 'Druid'
};

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
    }

    // Defense Attribute
    getDefenseAtribute (source) {
        switch (source.Player.Class) {
            case WARRIOR:
            case BERSERKER:
            case BATTLEMAGE:
                return this.Player.Strength.Total / 2;
            case SCOUT:
            case DEMONHUNTER:
            case ASSASSIN:
                return this.Player.Dexterity.Total / 2;
            case MAGE:
            case DRUID:
                return this.Player.Intelligence.Total / 2;
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
                return this.Player.Strength.Total;
            case SCOUT:
            case DEMONHUNTER:
            case ASSASSIN:
                return this.Player.Dexterity.Total;
            case MAGE:
            case DRUID:
                return this.Player.Intelligence.Total;
            default:
                return 0;
        }
    }

    // Damage Reduction
    getDamageReduction (source) {
        if (this.Player.ArmorAuto) {
            return source.Player.Class == MAGE ? 0 : ((this.getMaximumDamageReduction() * this.Player.Level) / source.Player.Level);
        } else {
            if (source.Player.Class == MAGE) {
                return 0;
            } else if (this.Player.Class == BATTLEMAGE) {
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
        return Math.min(50, this.Player.Luck.Total * 2.5 / target.Player.Level);
    }

    // Critical Multiplier
    getCriticalMultiplier (weapon, target) {
        return 2 * (1 + 0.05 * (this.Player.ForceGladiator ? this.Player.Fortress.Gladiator : Math.max(0, this.Player.Fortress.Gladiator - target.Player.Fortress.Gladiator))) * (weapon.HasEnchantment ? 1.05 : 1);
    }

    // Health
    getHealth () {
        if (this.Player.AutoHealth) {
            return this.Player.AutoHealth;
        } else {
            var a = 1 + this.Player.Potions.Life / 100;
            var b = 1 + this.Player.Dungeons.Player / 100;
            var c = 1 + this.Player.Runes.Health / 100;
            var d = this.Player.Level + 1;
            var e = this.getHealthMultiplier();

            return Math.ceil(Math.ceil(Math.ceil(Math.ceil(Math.ceil(this.Player.Constitution.Total * a) * b) * c) * d) * e);
        }
    }

    // Get damage range
    getDamageRange (weapon, target) {
        let mp = 1 - target.getDamageReduction(this) / 100;

        let mf = (1 - target.Player.Runes.ResistanceFire / 100) * (getRuneValue(weapon, RUNE.FIRE_DAMAGE) / 100);
        let mc = (1 - target.Player.Runes.ResistanceCold / 100) * (getRuneValue(weapon, RUNE.COLD_DAMAGE) / 100);
        let ml = (1 - target.Player.Runes.ResistanceLightning / 100) * (getRuneValue(weapon, RUNE.LIGHTNING_DAMAGE) / 100);

        let m = (1 + this.Player.Dungeons.Group / 100) * mp * (1 + mf + mc + ml);

        let aa = this.getPrimaryAttribute();
        let ad = target.getDefenseAtribute(this);

        let dm = m * (1 + Math.max(aa / 2, aa - ad) / 10);

        return {
            Max: Math.ceil(dm * weapon.DamageMax),
            Min: Math.ceil(dm * weapon.DamageMin)
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
        this.Weapon1 = {
            Range: this.getDamageRange(weapon, target),
            Critical: this.getCriticalMultiplier(weapon, target)
        };
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

    onRoundEnded (action) {

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

    getDamageRange (weapon, target) {
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
            this.Weapon2 = {
                Range: this.getDamageRange(weapon, target),
                Critical: this.getCriticalMultiplier(weapon, target)
            }
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

        this.RoundEnded = true;
    }

    getDamageRange (weapon, target) {
        var range = super.getDamageRange(weapon, target);
        return {
            // Thanks burningcherry for narrowing the hidden damage boost range
            Max: Math.ceil(range.Max * 5 / 4),
            Min: Math.ceil(range.Min * 5 / 4)
        }
    }

    onRoundEnded (action) {
        while (getRandom(50) && action());
    }
}

class DemonHunterModel extends FighterModel {
    constructor (i, p) {
        super(i, p);
        this.DamageTaken = true;
    }

    onDeath (source) {
        if (source.Player.Class != MAGE && getRandom(25)) {
            this.Health = this.getHealth();

            return true;
        }

        return false;
    }
}

// WebWorker hooks
self.addEventListener('message', function (message) {
    var players = message.data.players;
    var boss = message.data.boss;
    var iterations = message.data.iterations || 100000;

    self.postMessage({
        command: 'finished',
        results: new DungeonSimulator().simulate(players, boss, iterations)
    });

    self.close();
});

class DungeonSimulator {
    simulate (players, boss, iterations) {
        this.cache(players, boss);

        let score = 0;
        let healths = [];

        for (let i = 0; i < iterations; i++) {
            let { win, health } = this.battle();

            score += win;
            healths.push(health);
        }

        return {
            winrate: 100 * score / iterations,
            health_min: 100 * Math.min(... healths),
            health_max: 100 * Math.max(... healths),
            health_avg: 100 * healths.reduce((a, b) => a + b, 0) / healths.length
        };
    }

    cache (players, boss) {
        this.cache_players = players.map(player => FighterModel.create(0, player));
        this.cache_boss = FighterModel.create(1, boss);
    }

    battle () {
        this.la = [ ... this.cache_players ];
        this.lb = [ this.cache_boss ];

        // Reset health
        for (let p of this.la) p.Health = p.getHealth();
        for (let p of this.lb) p.Health = p.getHealth();

        // Run fight
        while (this.la.length > 0 && this.lb.length > 0) {
            this.a = this.la[0];
            this.b = this.lb[0];

            this.a.initialize(this.b);
            this.b.initialize(this.a);

            this.as = this.a.onFightStart(this.b);
            this.bs = this.b.onFightStart(this.a);

            if (this.fight() == 0) {
                this.la.shift();
            } else {
                this.lb.shift();
            }
        }

        // Return result based on empty array
        return {
            win: (this.la.length > 0 ? this.la[0].Index : this.lb[0].Index) == 0,
            health: Math.max(0, this.lb.length > 0 ? (this.lb[0].Health / this.lb[0].getHealth()) : 0)
        };
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

        if (this.a.AttackFirst == this.b.AttackFirst ? getRandom(50) : this.b.AttackFirst) {
            [this.a, this.b] = [this.b, this.a];
        }

        while (this.a.Health > 0 && this.b.Health > 0) {
            var damage = this.attack(this.a, this.b);
            if (this.a.DamageDealt) {
                this.a.onDamageDealt(this.b, damage);
            }

            if (this.b.DamageTaken) {
                if (this.b.onDamageTaken(this.a, damage) == 0) {
                    break;
                }
            } else {
                this.b.Health -= damage;
                if (this.b.Health <= 0) {
                    break;
                }
            }

            if (this.a.Weapon2) {
                var damage2 = this.attack(this.a, this.b, this.a.Weapon2);
                if (this.a.DamageDealt) {
                    this.a.onDamageDealt(this.b, damage2);
                }

                if (this.b.DamageTaken) {
                    if (this.b.onDamageTaken(this.a, damage2) == 0) {
                        break;
                    }
                } else {
                    this.b.Health -= damage2;
                    if (this.b.Health <= 0) {
                        break;
                    }
                }
            }

            if (this.a.RoundEnded) {
                this.a.onRoundEnded(() => {
                    this.turn++;

                    var damage3 = this.attack(this.a, this.b);
                    if (this.a.DamageDealt) {
                        this.a.onDamageDealt(this.b, damage3);
                    }

                    if (this.b.DamageTaken) {
                        return this.b.onDamageTaken(this.a, damage3) > 0;
                    } else {
                        this.b.Health -= damage3;
                        return this.b.Health >= 0
                    }
                });
            }

            [this.a, this.b] = [this.b, this.a];

            if (this.turn > 100) break;
        }

        // Winner
        return (this.a.Health > 0 ? this.a.Index : this.b.Index) == 0;
    }

    attack (source, target, weapon = source.Weapon1) {
        var turn = this.turn++;
        var rage = 1 + turn / 6;

        var damage = 0;
        var skipped = getRandom(target.SkipChance);
        var critical = false;

        if (!skipped) {
            damage = rage * (Math.random() * (1 + weapon.Range.Max - weapon.Range.Min) + weapon.Range.Min);

            critical = getRandom(source.CriticalChance);
            if (critical) {
                damage *= weapon.Critical;
            }

            damage = Math.ceil(damage);
        }

        return damage;
    }
}
