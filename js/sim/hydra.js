// Override some methods
FighterModel.prototype.getHealth = function () {
    if (this.Player.ForceHealth) {
        return this.Player.ForceHealth;
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

    let aa = this.getAttribute(this);
    let ad = target.getAttribute(this) / 2;

    let dm = target.DamageReduction * (1 + Math.max(aa / 2, aa - ad) / 10);

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
    this.AttackFirst = false;
    this.SkipChance = this.getBlockChance(target);
    this.CriticalChance = this.getCriticalChance(target);
    this.TotalHealth = this.getHealth();

    this.MaxAttacks = this.Player.Attacks || 1;

    target.DamageReduction = 1 - target.getDamageReduction(this) / 100;

    this.Weapon1 = this.getDamageRange(this.Player.Items.Wpn1, target);
    this.Critical = 2;
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

class HydraSimulator extends SimulatorBase {
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

    battle () {
        this.ca.Attacks = 1;
        this.cb.reset();

        do {
            this.ca.reset();

            this.a = this.ca;
            this.b = this.cb;

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
}
