function getRuneValue (item, rune) {
    return item.AttributeTypes[2] == rune ? item.Attributes[2] : 0;
}

function getRandom (success) {
    return success > 0 && (Math.random() * 100 < success);
}

class FighterModel {
    constructor (index, player) {
        this.Index = index;
        this.Player = player;
    }

    // Get defense attribute against a player
    getDefenseAtribute (source) {
        return source.Player.Class == 2 ? this.Player.Intelligence : (source.Player.Class == 3 || source.Player.Class == 4 || source.Player.Class == 7 ? this.Player.Dexterity : this.Player.Strength);
    }

    // Get damage reduction against a player
    getDamageReduction (source) {
        return source.Player.Class == 2 ? 0 : Math.min(this.getMaximumDamageReduction(), this.Player.Armor / source.Player.Level + (this.Player.Class == 5 ? 40 : 0));
    }

    // Get maximum damage reduction
    getMaximumDamageReduction () {
        return this.Player.Class % 4 == 1 || this.Player.Class == 7 ? 50 : (this.Player.Class == 2 ? 10 : 25);
    }

    // Get block chance
    getBlockChance (source) {
        return source.Player.Class == 2 ? 0 : (this.Player.Class == 1 ? 25 : (this.Player.Class == 3 || this.Player.Class == 4 ? 50 : 0));
    }

    // Get critical chance
    getCriticalChance (target) {
        return Math.min(50, this.Player.Luck.Total * 2.5 / target.Player.Level);
    }

    // Get critical damage multiplier
    getCriticalMultiplier (weapon, target) {
        return 2 * (1 + 0.05 * Math.max(0, this.Player.Fortress.Gladiator - target.Player.Fortress.Gladiator)) * (weapon.HasEnchantment ? 1.05 : 1);
    }

    // Get damage range
    getDamageRange (weapon, target) {
        let mp = 1 - target.getDamageReduction(this) / 100;

        let mf = (1 - target.Player.Runes.ResistanceFire / 100) * (getRuneValue(weapon, RUNE.FIRE_DAMAGE) / 100);
        let mc = (1 - target.Player.Runes.ResistanceCold / 100) * (getRuneValue(weapon, RUNE.COLD_DAMAGE) / 100);
        let ml = (1 - target.Player.Runes.ResistanceLightning / 100) * (getRuneValue(weapon, RUNE.LIGHTNING_DAMAGE) / 100);

        let m = (1 + this.Player.Dungeons.Group / 100) * mp * (1 + mf + mc + ml) * (this.Player.Class == 2 && target.Player.Class == 6 ? 2 : (this.Player.Class == 6 ? 1.5 : 1));

        if (this.Player.Class == 2 && target.Player.Class == 6) {
            m = m * (2 / 1);
        } else if (this.Player.Class == 6) {
            m = m * (3 / 2);
        } else if (this.Player.Class == 4) {
            m = m * (3 / 5);
        }

        let aa = this.Player.getPrimaryAttribute().Total;
        let ad = target.getDefenseAtribute(this).Total;

        let dm = m * (1 + Math.max(aa / 2, aa - ad / 2) / 10);

        return {
            Max: Math.ceil(dm * weapon.DamageMax),
            Min: Math.ceil(dm * weapon.DamageMin)
        };
    }

    // Get special damage
    getSpecialDamage (target) {
        if (this.Player.Class == 5) {
            if (target.Player.Class == 5 || target.Player.Class == 2) {
                return 0;
            } else if (target.Player.Level < this.Player.Level + 10 || target.Player.Class == 6) {
                return Math.ceil(target.Health / 3);
            } else if (target.Player.Class == 1) {
                return Math.ceil(this.Health / 4);
            } else if (target.Player.Class == 3 || target.Player.Class == 4 || target.Player.Class == 7) {
                return Math.ceil(this.Health / 5);
            } else {
                return 0;
            }
        } else {
            // -1 if player cannot cast special damage
            return -1;
        }
    }

    // Get special death
    getRevivalChance (source) {
        if (this.Player.Class == 7 && source.Player.Class != 2) {
            return 25;
        } else {
            return 0;
        }
    }

    // Initialize model
    initialize (target) {
        // Health
        this.Health = this.Player.getHealth();

        // Round modifiers
        this.AttackFirst = this.Player.Items.Hand.HasEnchantment;
        this.RepeatAttackChance = this.Player.Class == 6 ? 50 : 0;
        this.SkipChance = this.getBlockChance(target);
        this.CriticalChance = this.getCriticalChance(target);
        this.RevivalChance = this.getRevivalChance(target);

        // Weapon
        var weapon1 = this.Player.Items.Wpn1;
        this.Weapon1 = {
            Range: this.getDamageRange(weapon1, target),
            Critical: this.getCriticalMultiplier(weapon1, target)
        }

        // Weapon 2
        var weapon2 = this.Player.Class == 4 ? this.Player.Items.Wpn2 : undefined;
        if (weapon2) {
            this.Weapon2 = {
                Range: this.getDamageRange(weapon2, target),
                Critical: this.getCriticalMultiplier(weapon2, target)
            }
        }
    }

    revive () {
        this.Health = this.Player.getHealth();
    }
}

class FightSimulator {
    // Fight group
    simulate (players, iterations = 100000) {
        var scores = [];
        for (var i = 0; i < players.length; i++) {
            var score = 0;
            var min = iterations;
            var max = 0;

            for (var j = 0; j < players.length; j++) {
                if (i != j) {
                    var s = 0;
                    for (var k = 0; k < iterations; k++) {
                        s += this.fight(players[i].player, players[j].player);
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

        if (players.length == 2) {
            players[1].score.avg = 100 - players[0].score.avg,
            players[1].score.min = players[1].score.avg;
            players[1].score.max = players[1].score.avg;
        }
    }

    // Fight 1v1s only
    simulateSingle (player, players, iterations = 100000) {
        var scores = [];
        for (var i = 0; i < players.length; i++) {
            var score = 0;
            for (var j = 0; j < iterations; j++) {
                score += this.fight(player.player, players[i].player);
            }

            players[i].score = {
                avg: 100 * score / iterations,
                min: 100 * score / iterations,
                max: 100 * score / iterations
            }
        }
    }

    // Fight
    fight (source, target) {
        // Create fighters
        this.a = new FighterModel(0, source);
        this.b = new FighterModel(1, target);

        // Initialize fighters
        this.a.initialize(this.b);
        this.b.initialize(this.a);

        //console.log(source.Name, this.a.Weapon1.Range.Min, this.a.Weapon1.Range.Max, ...(this.a.Weapon2 ? [ this.a.Weapon2.Range.Min, this.a.Weapon2.Range.Max ] : []));
        //console.log(target.Name, this.b.Weapon1.Range.Min, this.b.Weapon1.Range.Max, ...(this.b.Weapon2 ? [ this.b.Weapon2.Range.Min, this.b.Weapon2.Range.Max ] : []));

        // Decide who starts first
        if (this.a.AttackFirst && this.b.AttackFirst ? getRandom(50) : this.a.AttackFirst) {
            [this.a, this.b] = [this.b, this.a];
        }

        // Turn counter
        this.turn = 0;

        // Special damage
        var as = this.a.getSpecialDamage(this.b);
        var bs = this.b.getSpecialDamage(this.a);
        if (as >= 0 || bs >= 0) {
            this.turn++;

            if (as > 0) {
                this.b.Health -= as;
            }

            if (bs > 0) {
                this.a.Health -= bs;
            }
        }

        // Run simulation
        while (this.a.Health > 0 && this.b.Health > 0) {
            this.attack(this.a, this.b);
            if (this.a.Weapon2) {
                if (this.b.Health <= 0 && getRandom(this.b.RevivalChance)) {
                    this.b.revive();
                }

                this.attack(this.a, this.b, this.a.Weapon2);
            } else if (this.a.RepeatAttackChance) {
                while (getRandom(this.a.RepeatAttackChance)) {
                    if (this.b.Health <= 0 && getRandom(this.b.RevivalChance)) {
                        this.b.revive();
                    }

                    this.attack(this.a, this.b);
                }
            }

            if (this.b.Health <= 0 && getRandom(this.b.RevivalChance)) {
                this.b.revive();
            }

            if (this.b.Health > 0) {
                this.attack(this.b, this.a);
                if (this.b.Weapon2) {
                    if (this.a.Health <= 0 && getRandom(this.a.RevivalChance)) {
                        this.a.revive();
                    }

                    this.attack(this.b, this.a, this.b.Weapon2);
                } else if (this.b.RepeatAttackChance) {
                    while (getRandom(this.b.RepeatAttackChance)) {
                        if (this.a.Health <= 0 && getRandom(this.a.RevivalChance)) {
                            this.a.revive();
                        }

                        this.attack(this.b, this.a);
                    }
                }
            }

            if (this.a.Health <= 0 && getRandom(this.a.RevivalChance)) {
                this.a.revive();
            }

            if (this.turn > 100) {
                break;
            }
        }

        // Winner
        return (this.a.Health > 0 ? this.a.Index : this.b.Index) == 0;
    }

    // Attack
    attack (source, target, weapon = source.Weapon1) {
        // Rage
        var turn = this.turn++;
        var rage = 1 + turn / 6;

        // Test for skip
        if (!getRandom(target.SkipChance)) {
            var damage = rage * (Math.random() * (1 + weapon.Range.Max - weapon.Range.Min) + weapon.Range.Min);
            if (getRandom(source.CriticalChance)) {
                damage *= weapon.Critical;
            }

            target.Health -= Math.ceil(damage);
        }
    }
}
