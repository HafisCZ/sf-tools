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

FIGHT_DUMP_ENABLED = false;
FIGHT_DUMP_OUTPUT = [];

// WebWorker hooks
self.addEventListener('message', function (message) {
    var ts = Date.now();

    // Sent vars
    var player = message.data.player;
    var players = message.data.players;
    var mode = message.data.mode;
    var iterations = message.data.iterations || 100000;
    if (message.data.dev || false) {
        FIGHT_DUMP_ENABLED = true;
    }

    var tracking = message.data.tracking || 0;

    // Sim type decision
    if (mode == SimulatorType.PlayerAll) {
        new FightSimulator().simulateMultiple(player, players, iterations);
        self.postMessage({
            command: 'finished',
            results: player,
            logs: FIGHT_DUMP_OUTPUT,
            time: Date.now() - ts
        });
    } else if (mode == SimulatorType.PlayerOne) {
        new FightSimulator().simulateSingle(player, players, iterations);
        self.postMessage({
            command: 'finished',
            results: players,
            logs: FIGHT_DUMP_OUTPUT,
            time: Date.now() - ts
        });
    } else if (mode == SimulatorType.PlayerTournament) {
        new FightSimulator().simulateTournament(player, players, iterations);
        self.postMessage({
            command: 'finished',
            results: player,
            logs: FIGHT_DUMP_OUTPUT,
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

    setRandomInitialFighter () {
        if (this.a.AttackFirst == this.b.AttackFirst ? getRandom(50) : this.b.AttackFirst) {
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

        this.setRandomInitialFighter();
        this.forwardToBersekerAttack();

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
    }

    attack (source, target, weapon = source.Weapon1) {
        var turn = this.turn++;
        var rage = 1 + turn / 6;

        var damage = 0;
        var skipped = getRandom(target.SkipChance);
        var critical = false;

        if (!skipped) {
            damage = rage * (Math.random() * (1 + weapon.Max - weapon.Min) + weapon.Min);

            critical = getRandom(source.CriticalChance);
            if (critical) {
                damage *= source.Critical;
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

        if (!target && players.length == 2) {
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

    setRandomInitialFighter () {
        if (this.a.AttackFirst == this.b.AttackFirst ? getRandom(50) : this.b.AttackFirst) {
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

    // Fight
    fight () {
        // Create fighters
        this.a = this.ca;
        this.b = this.cb;

        if (FIGHT_DUMP_ENABLED) this.log(0);

        this.a.reset();
        this.b.reset();

        // Turn counter
        this.turn = 0;

        // Apply special damage
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

        // Simulation
        while (this.a.Health > 0 && this.b.Health > 0) {
            var damage = this.attack(this.a, this.b);
            if (this.a.DamageDealt) {
                this.a.onDamageDealt(this.b, damage);
            }

            if (this.b.DamageTaken) {
                var alive = this.b.onDamageTaken(this.a, damage);

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
                var damage2 = this.attack(this.a, this.b, this.a.Weapon2, 1);
                if (this.a.DamageDealt) {
                    this.a.onDamageDealt(this.b, damage2);
                }

                if (this.b.DamageTaken) {
                    var alive = this.b.onDamageTaken(this.a, damage2);

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

    skipAndAttack () {
        this.turn++;

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

    // Attack
    attack (source, target, weapon = source.Weapon1, extra = 0) {
        // Rage
        var turn = this.turn++;
        var rage = 1 + turn / 6;

        // Test for skip
        var damage = 0;
        var skipped = getRandom(target.SkipChance);
        var critical = false;

        if (!skipped) {
            damage = rage * (Math.random() * (weapon.Max - weapon.Min) + weapon.Min);

            critical = getRandom(source.CriticalChance);
            if (critical) {
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
                attackType: (critical ? 1 : (skipped ? (target.Player.Class == WARRIOR ? 3 : 4) : 0)) + 10 * extra,
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
