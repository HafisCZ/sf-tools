// Override some methods
SimulatorModel.prototype.getBaseDamage = function () {
    const damage = Math.trunc((this.Player.Level + 1) * this.getWeaponDamageMultiplier());

    return {
        Min: damage,
        Max: damage
    }
}

// WebWorker hooks
self.addEventListener('message', function ({ data: { flags, iterations, hydra, pet } }) {
    FLAGS.set(flags);

    self.postMessage({
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
        this.ca = Array(pet.Attacks).fill(null).map(() => SimulatorModel.create(0, pet));
        this.cb = [ SimulatorModel.create(1, hydra) ];
    }

    battle () {
        this.la = [ ... this.ca ];
        this.lb = [ ... this.cb ];

        for (let player of this.la) player.reset();
        for (let player of this.lb) player.reset();

        while (this.la.length > 0 && this.lb.length > 0) {
            this.a = this.la[0];
            this.b = this.lb[0];

            SimulatorModel.initializeFighters(this.a, this.b);

            if (this.fight() == 0) {
                this.la.shift();
            } else {
                return {
                    win: true,
                    health: 0,
                    fights: this.ca.length - this.la.length
                }
            }
        }

        return {
            win: false,
            health: this.lb[0].Health,
            fights: this.ca.length
        }
    }
}
