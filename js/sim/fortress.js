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

    target.DamageReduction = 1 - target.getDamageReduction(this) / 100;

    this.Weapon1 = this.getDamageRange(this.Player.Items.Wpn1, target);
    this.Critical = 2;
}

// WebWorker hooks
self.addEventListener('message', function (message) {
    let { iterations, player, target } = message.data;

    self.postMessage({
        command: 'finished',
        results: new FortressSimulator().simulate(player, target, iterations)
    });

    self.close();
});

class FortressSimulator extends SimulatorBase {
    simulate (player, target, iterations) {
        if (target.length == 0) {
            return {
                score: iterations,
                iterations,
                player_units: player.length,
                target_units: 0,
                avg_player_units: player.length,
                avg_target_units: 0
            }
        }

        this.ga = this.cache(player, 0);
        this.gb = this.cache(target, 1);

        let score = 0;
        let avg_fights = 0;
        let avg_player_units = 0;
        let avg_target_units = 0;

        for (let i = 0; i < iterations; i++) {
            let { win, fights, player_units, target_units } = this.battle();

            score += win;
            avg_fights += fights;
            avg_player_units += player_units;
            avg_target_units += target_units;
        }

        return {
            score,
            iterations,
            player_units: player.length,
            target_units: target.length,
            avg_player_units: avg_player_units / iterations,
            avg_target_units: avg_target_units / iterations
        }
    }

    cache (array, index) {
        return array.map((player) => FighterModel.create(index, player));
    }

    battle () {
        this.la = [ ... this.ga ];
        this.lb = [ ... this.gb ];

        for (let player of this.la) player.reset();
        for (let player of this.lb) player.reset();

        while (this.la.length > 0 && this.lb.length > 0) {
            this.a = this.la[0];
            this.b = this.lb[0];

            this.a.initialize(this.b);
            this.b.initialize(this.a);

            this.as = this.a.onBeforeFight(this.b);
            this.bs = this.b.onBeforeFight(this.a);

            if (this.fight() == 0) {
                this.la.shift();
            } else {
                this.lb.shift();
            }
        }

        return {
            win: this.la.length > 0,
            player_units: this.la.length,
            target_units: this.lb.length
        };
    }

    fight () {
        // Reset counters
        this.a.reset(false);
        this.b.reset(false);

        return super.fight();
    }
}
