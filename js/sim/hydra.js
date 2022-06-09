// Override some methods
FighterModel.prototype.getCriticalChance = function (target) {
    return Math.min(50, this.Player.Luck.Total * 2.5 / target.Player.Level);
}

FighterModel.prototype.getHealth = function () {
    if (this.Player.Health) {
        return this.Player.Health;
    } else {
        return (this.getHealthMultiplier() * (this.Player.Level + 1) * this.Player.Constitution.Total) % Math.pow(2, 32);
    }
}

FighterModel.prototype.getFixedDamage = function () {
    return Math.trunc((this.Player.Level + 1) * this.getDamageMultiplier());
}

FighterModel.prototype.getDamageRange = function (weapon, target) {
    let min = weapon.DamageMin;
    let max = weapon.DamageMax;

    let mp = 1 - target.getDamageReduction(this) / 100;
    let aa = this.getAttribute(this);
    let ad = target.getAttribute(this) / 2;

    let dm = mp * (1 + Math.max(aa / 2, aa - ad) / 10);

    if (!min || !max) {
        min = max = this.getFixedDamage();
    }

    return {
        Max: Math.ceil(dm * min),
        Min: Math.ceil(dm * max)
    };
}

FighterModel.prototype.initialize = function (target) {
    // Round modifiers
    this.SkipChance = this.getBlockChance(target);
    this.CriticalChance = this.getCriticalChance(target);
    this.TotalHealth = this.getHealth();

    this.MaxAttacks = this.Player.Attacks || 1;

    this.Damage1 = this.getDamageRange(this.Player, target);
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
    }

    reset (player) {
        player.Health = player.TotalHealth;
        player.DeathTriggers = 0;
    }

    battle () {
        this.ca.Attacks = 1;
        this.reset(this.cb);

        do {
            this.reset(this.ca);

            if (!this.fight()) {
                this.ca.Attacks++;
            }
        } while (this.ca.Attacks <= this.ca.MaxAttacks && this.cb.Health > 0);

        return {
            win: this.cb.Health <= 0,
            health: Math.max(0, this.cb.Health),
            fights: Math.min(this.ca.Attacks, this.ca.MaxAttacks)
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
        this.a = this.ca;
        this.b = this.cb;

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
