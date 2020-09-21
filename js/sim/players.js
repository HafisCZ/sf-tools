const SimulatorType = {
    Pet: 1,
    PetMap: 2,
    PlayerAll: 3,
    PlayerOne: 4,
    PlayerTournament: 5,
    Guild: 6,
    Dungeon: 7,
    PetPath: 8
}

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

// Obsolete now
function hasImplementation (c) {
    return c != DRUID;
}

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
        if (source.Player.Class == MAGE) {
            return 0;
        } else if (this.Player.Class == BATTLEMAGE) {
            return Math.min(this.getMaximumDamageReduction(), this.Player.Armor / source.Player.Level + 40);
        } else {
            return Math.min(this.getMaximumDamageReduction(), this.Player.Armor / source.Player.Level);
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
        return 2 * (1 + 0.05 * Math.max(0, this.Player.Fortress.Gladiator - target.Player.Fortress.Gladiator)) * (weapon.HasEnchantment ? 1.05 : 1);
    }

    // Health
    getHealth () {
        var a = 1 + this.Player.Potions.Life / 100;
        var b = 1 + this.Player.Dungeons.Player / 100;
        var c = 1 + this.Player.Runes.Health / 100;
        var d = this.Player.Level + 1;
        var e = this.getHealthMultiplier();

        return Math.ceil(Math.ceil(Math.ceil(Math.ceil(Math.ceil(this.Player.Constitution.Total * a) * b) * c) * d) * e);
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
        if (source.Player.Class != MAGE && source.Player.Class != DRUID && getRandom(25)) {
            this.Health = this.getHealth();

            return true;
        }

        return false;
    }
}

// WebWorker hooks
self.addEventListener('message', function (message) {
    var ts = Date.now();

    // Sent vars
    var player = message.data.player;
    var players = message.data.players;
    var mode = message.data.mode;
    var iterations = message.data.iterations || 100000;
    var logs = message.data.dev ? [] : null;

    var tracking = message.data.tracking || 0;

    // Sim type decision
    if (mode == SimulatorType.PlayerAll) {
        new FightSimulator().simulateMultiple(player, players, iterations, logs);
        self.postMessage({
            command: 'finished',
            results: player,
            logs: logs,
            time: Date.now() - ts
        });
    } else if (mode == SimulatorType.PlayerOne) {
        new FightSimulator().simulateSingle(player, players, iterations, logs);
        self.postMessage({
            command: 'finished',
            results: players,
            logs: logs,
            time: Date.now() - ts
        });
    } else if (mode == SimulatorType.PlayerTournament) {
        new FightSimulator().simulateTournament(player, players, iterations, logs);
        self.postMessage({
            command: 'finished',
            results: player,
            logs: logs,
            time: Date.now() - ts
        });
    } else if (mode == SimulatorType.Guild) {
        var result = new GuildSimulator().simulate(player, players, iterations);

        self.postMessage({
            command: 'finished',
            results: result,
            time: Date.now() - ts
        });
    }

    self.close();
});

class GuildSimulator {
    simulate (guildA, guildB, iterations = 10000) {
        var score = 0;

        this.cache(guildA, guildB);

        for (var i = 0; i < iterations; i++) {
            score += this.battle();
        }

        return 100 * score / iterations;
    }

    cache (ga, gb) {
        this.ga = ga.map(a => {
            var p = FighterModel.create(0, a.player);
            p.Inactive = a.Inactive;

            return p;
        });

        this.gb = gb.map(b => {
            var p = FighterModel.create(1, b.player);
            p.Inactive = b.Inactive;

            return p;
        });

        this.ga.sort((a, b) => a.Player.Level - b.Player.Level);
        this.gb.sort((a, b) => a.Player.Level - b.Player.Level);

        for (var player of this.ga) {
            player.MaximumHealth = player.getHealth();
            if (player.Inactive) {
                player.MaximumHealth /= 2;
            }
        }

        for (var player of this.gb) {
            player.MaximumHealth = player.getHealth();
            if (player.Inactive) {
                player.MaximumHealth /= 2;
            }
        }
    }

    // Guild battle
    battle () {
        this.la = [ ... this.ga ];
        this.lb = [ ... this.gb ];

        // Reset health
        for (var player of this.la) {
            player.Health = player.MaximumHealth;
        }

        for (var player of this.lb) {
            player.Health = player.MaximumHealth;
        }

        // Go through all players
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

        // Return fight result
        return (this.la.length > 0 ? this.la[0].Index : this.lb[0].Index) == 0;
    }

    // Fighter battle
    fight () {
        // Turn counter
        this.turn = 0;

        // Apply special damage
        if (this.as !== false || this.bs !== false) {
            this.turn++;

            if (this.as > 0) {
                this.b.Health -= this.as;
            } else if (this.bs > 0) {
                this.a.Health -= this.bs;
            }
        }

        // Decide who starts first
        if (this.a.AttackFirst == this.b.AttackFirst ? getRandom(50) : this.b.AttackFirst) {
            [this.a, this.b] = [this.b, this.a];
        }

        // Simulation
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

class FightSimulator {
    // Fight group
    simulate (players, iterations = 100000, target = null, assource = false) {
        var scores = [];
        for (var i = 0; i < players.length; i++) {
            var score = 0;
            var min = iterations;
            var max = 0;

            if (target) {
                if (assource) {
                    this.cache(target, players[i].player);
                    for (var k = 0; k < iterations; k++) {
                        score += this.fight();
                    }

                    players[i].score = {
                        avg: 100 * score / iterations,
                        min: 100 * score / iterations,
                        max: 100 * score / iterations
                    };
                } else {
                    this.cache(players[i].player, target);
                    for (var k = 0; k < iterations; k++) {
                        score += this.fight();
                    }

                    players[i].score = {
                        avg: 100 * score / iterations,
                        min: 100 * score / iterations,
                        max: 100 * score / iterations
                    };
                }
            } else {
                for (var j = 0; j < players.length; j++) {
                    if (i != j) {
                        var s = 0;

                        this.cache(players[i].player, players[j].player);
                        for (var k = 0; k < iterations; k++) {
                            s += this.fight();
                        }

                        score += s;

                        if (s > max) {
                            max = s;
                        }

                        if (s < min) {
                            min = s;
                        }
                    }
                }

                players[i].score = {
                    avg: 100 * score / (players.length - 1) / iterations,
                    min: 100 * min / iterations,
                    max: 100 * max / iterations
                };
            }
        }

        if (players.length == 2) {
            players[1].score.avg = 100 - players[0].score.avg,
            players[1].score.min = players[1].score.avg;
            players[1].score.max = players[1].score.avg;
        }
    }

    // Fight 1vAl only
    simulateMultiple (player, players, iterations, logs) {
        this.logs = logs;
        var scores = [];
        for (var i = 0; i < player.length; i++) {
            var score = 0;
            var min = iterations;
            var max = 0;

            for (var j = 0; j < players.length; j++) {
                if (player[i].index != players[j].index) {
                    var s = 0;
                    this.cache(player[i].player, players[j].player);
                    for (var k = 0; k < iterations; k++) {
                        s += this.fight();
                    }

                    score += s;

                    if (s > max) {
                        max = s;
                    }

                    if (s < min) {
                        min = s;
                    }
                }
            }

            player[i].score = {
                avg: 100 * score / (players.length - 1) / iterations,
                min: 100 * min / iterations,
                max: 100 * max / iterations
            };
        }

        if (player.length == 2 && players.length == 2) {
            player[0].score.min = player[0].score.avg;
            player[0].score.max = player[0].score.avg;

            player[1].score.avg = 100 - player[0].score.avg,
            player[1].score.min = player[1].score.avg;
            player[1].score.max = player[1].score.avg;
        }
    }

    // Tournament only
    simulateTournament (player, players, iterations, logs) {
        this.logs = logs;
        for (var i = 0; i < player.length; i++) {
            player[i].score = {
                avg: 0,
                max: players.findIndex(p => p.index == player[i].index)
            };

            for (var j = 0; j < players.length; j++) {
                var s = 0;
                this.cache(player[i].player, players[j].player);
                for (var k = 0; k < iterations; k++) {
                    s += this.fight();
                }

                if (s > iterations / 2) {
                    player[i].score.avg++;
                } else {
                    break;
                }
            }
        }
    }

    // Fight 1v1s only
    simulateSingle (player, players, iterations, logs) {
        this.logs = logs;
        var scores = [];
        for (var i = 0; i < players.length; i++) {
            if (player.player == players[i].player) {
                players[i].score = {
                    avg: 50
                };
            } else {
                var score = 0;
                this.cache(player.player, players[i].player);
                for (var j = 0; j < iterations; j++) {
                    score += this.fight();
                }

                players[i].score = {
                    avg: 100 * score / iterations
                };
            }
        }
    }

    // Cache Players initially
    cache (source, target) {
        this.ca = FighterModel.create(0, source);
        this.cb = FighterModel.create(1, target);

        this.ca.initialize(this.cb);
        this.cb.initialize(this.ca);

        this.as = this.ca.onFightStart(this.cb);
        this.bs = this.cb.onFightStart(this.ca);
    }

    // Fight
    fight () {
        // Create fighters
        this.a = this.ca;
        this.b = this.cb;

        if (this.logs) {
            this.log = {
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

            this.logs.push(this.log);
        }

        this.a.Health = this.a.TotalHealth;
        this.b.Health = this.b.TotalHealth;

        // Turn counter
        this.turn = 0;

        // Apply special damage
        if (this.as !== false || this.bs !== false) {
            this.turn++;

            if (this.as > 0) {
                this.b.Health -= this.as;

                if (this.log) {
                    this.log.rounds.push({
                        attackCrit: false,
                        attackType: 15,
                        attackMissed: false,
                        attackDamage: this.as,
                        attackSecondary: false,
                        attacker: this.a.Player.ID || this.a.Index,
                        target: this.b.Player.ID || this.b.Index
                    });
                }
            } else if (this.bs > 0) {
                this.a.Health -= this.bs;

                if (this.log) {
                    this.log.rounds.push({
                        attackCrit: false,
                        attackType: 15,
                        attackMissed: false,
                        attackSecondary: false,
                        attackDamage: this.bs,
                        attacker: this.b.Player.ID || this.b.Index,
                        target: this.a.Player.ID || this.a.Index
                    });
                }
            } else {
                if (this.log) {
                    this.log.rounds.push({
                        attackCrit: false,
                        attackType: 16,
                        attackMissed: true,
                        attackSecondary: false,
                        attackDamage: 0,
                        attacker: this.a.Player.ID || this.a.Index,
                        target: this.b.Player.ID || this.b.Index
                    });
                }
            }
        }

        // Decide who starts first
        if (this.a.AttackFirst == this.b.AttackFirst ? getRandom(50) : this.b.AttackFirst) {
            [this.a, this.b] = [this.b, this.a];
        }

        // Simulation
        while (this.a.Health > 0 && this.b.Health > 0) {
            var damage = this.attack(this.a, this.b);
            if (this.a.DamageDealt) {
                this.a.onDamageDealt(this.b, damage);
            }

            if (this.b.DamageTaken) {
                var alive = this.b.onDamageTaken(this.a, damage);

                if (alive == 2 && this.log) {
                    this.log.rounds.push({
                        attackCrit: false,
                        attackType: 100,
                        attackMissed: false,
                        attackDamage: 0,
                        attackSecondary: false,
                        attacker: this.a.Player.ID || this.a.Index,
                        target: this.b.Player.ID || this.b.Index
                    });
                }

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
                var damage2 = this.attack(this.a, this.b, this.a.Weapon2);
                if (this.a.DamageDealt) {
                    this.a.onDamageDealt(this.b, damage2);
                }

                if (this.b.DamageTaken) {
                    var alive = this.b.onDamageTaken(this.a, damage2);

                    if (alive == 2 && this.log) {
                        this.log.rounds.push({
                            attackCrit: false,
                            attackType: 100,
                            attackMissed: false,
                            attackDamage: 0,
                            attackSecondary: false,
                            attacker: this.a.Player.ID || this.a.Index,
                            target: this.b.Player.ID || this.b.Index
                        });
                    }

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

            if (this.a.RoundEnded) {
                this.a.onRoundEnded(() => {
                    this.turn++;

                    var damage3 = this.attack(this.a, this.b, this.a.Weapon1, true);
                    if (this.a.DamageDealt) {
                        this.a.onDamageDealt(this.b, damage3);
                    }

                    if (this.b.DamageTaken) {
                        var alive = this.b.onDamageTaken(this.a, damage3);

                        if (alive == 2 && this.log) {
                            this.log.rounds.push({
                                attackCrit: false,
                                attackType: 100,
                                attackMissed: false,
                                attackDamage: 0,
                                attackSecondary: false,
                                attacker: this.a.Player.ID || this.a.Index,
                                target: this.b.Player.ID || this.b.Index
                            });
                        }

                        return alive > 0;
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

    // Attack
    attack (source, target, weapon = source.Weapon1, extra = false) {
        // Rage
        var turn = this.turn++;
        var rage = 1 + turn / 6;

        // Test for skip
        var damage = 0;
        var skipped = getRandom(target.SkipChance);
        var critical = false;

        if (!skipped) {
            damage = rage * (Math.random() * (weapon.Range.Max - weapon.Range.Min) + weapon.Range.Min);

            critical = getRandom(source.CriticalChance);
            if (critical) {
                damage *= weapon.Critical;
            }

            damage = Math.ceil(damage);
        }

        if (this.log) {
            this.log.rounds.push({
                attackCrit: critical,
                attackType: (critical ? 1 : (skipped ? (target.Player.Class == WARRIOR ? 3 : 4) : 0)) + (extra ? 20 : 0),
                attackMissed: skipped,
                attackDamage: damage,
                attackSecondary: weapon != source.Weapon1,
                attacker: source.Player.ID || source.Index,
                target: target.Player.ID || target.Index
            });
        }

        return damage;
    }
}
