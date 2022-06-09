FIGHT_DUMP_ENABLED = false;
FIGHT_DUMP_OUTPUT = [];

// WebWorker hooks
self.addEventListener('message', function (message) {
    let players = message.data.players;
    let boss = message.data.boss;
    let index = message.data.index;
    let hpcap = message.data.hpcap || 5000;
    let iterations = message.data.iterations || 100000;
    if (message.data.log || false) {
        FIGHT_DUMP_ENABLED = true;
    }

    if (players && boss) {
        self.postMessage({
            command: 'finished',
            results: new DungeonSimulator().simulate(players, boss, iterations, hpcap),
            log: FIGHT_DUMP_OUTPUT,
            index: index
        });
    }

    self.close();
});

class DungeonSimulator {
    simulate (players, boss, iterations, hpcap) {
        this.cache(players, boss);

        let score = 0;
        let healths = [];

        for (let i = 0; i < iterations; i++) {
            let { win, health } = this.battle();

            score += win;
            healths.push(health);
        }

        let healthsLength = healths.length;
        let truncSteps = Math.max(1, Math.floor(healthsLength / hpcap));
        if (truncSteps > 1) {
            let truncLength = Math.ceil(healthsLength / truncSteps);
            let truncHealths = new Array(truncLength);

            healths.sort((a, b) => a - b);

            for (let i = 0; i < truncLength; i++) {
                let sliceSum = 0;
                let slices = 0;
                for (let j = 0; j < truncSteps; j++) {
                    let iterator = i * truncSteps + j;
                    if (iterator >= healthsLength) {
                        break;
                    } else {
                        slices++;
                        sliceSum += healths[iterator];
                    }
                }

                if (slices > 0) {
                    truncHealths[i] = Math.max(0, sliceSum / slices);
                }
            }

            healths = truncHealths;
        } else {
            healths.sort((a, b) => a - b);
        }

        return {
            iterations: iterations,
            score: score,
            healths: healths
        };
    }

    cache (players, boss) {
        this.cache_players = players.map(player => FighterModel.create(0, player));
        this.cache_boss = FighterModel.create(1, boss);
    }

    reset (player) {
        player.Health = player.TotalHealth;
        player.DeathTriggers = 0;
    }

    battle () {
        this.la = [ ... this.cache_players ];
        this.lb = [ this.cache_boss ];

        // Reset health
        for (let p of this.la) this.reset(p);
        for (let p of this.lb) this.reset(p);

        // Run fight
        while (this.la.length > 0 && this.lb.length > 0) {
            this.a = this.la[0];
            this.b = this.lb[0];

            this.a.initialize(this.b);
            this.b.initialize(this.a);

            this.as = this.a.onFightStart(this.b);
            this.bs = this.b.onFightStart(this.a);

            if (FIGHT_DUMP_ENABLED) this.log(0);

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
                var damage2 = this.attack(this.a, this.b, this.a.Weapon2);
                if (this.a.DamageDealt) {
                    this.a.onDamageDealt(this.b, damage2);
                }

                if (this.b.DamageTaken) {
                    let alive = this.b.onDamageTaken(this.a, damage2);
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

        var damage3 = this.attack(this.a, this.b, this.a.Weapon1, true);
        if (this.a.DamageDealt) {
            this.a.onDamageDealt(this.b, damage3);
        }

        if (this.b.DamageTaken) {
            let alive = this.b.onDamageTaken(this.a, damage3);
            if (FIGHT_DUMP_ENABLED && alive == 2) this.log(5);
            return alive > 0;
        } else {
            this.b.Health -= damage3;
            return this.b.Health >= 0
        }
    }

    attack (source, target, weapon = source.Weapon1, extra = false) {
        var turn = this.turn++;
        var rage = 1 + turn / 6;

        var damage = 0;
        var skipped = getRandom(target.SkipChance);
        var critical = getRandom(source.CriticalChance);

        if (!skipped) {
            damage = rage * (Math.random() * (1 + weapon.Max - weapon.Min) + weapon.Min);
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
