if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
    self.addEventListener('message', function ({ data: { flags, iterations, player, target, index } }) {
        FLAGS.set(flags);

        self.postMessage({
            score: new FortressSimulator().simulate(player, target, iterations),
            index
        });

        self.close();
    });
}

class FortressSimulator extends SimulatorBase {
    simulate (player, target, iterations) {
        if (target.length == 0) {
            return 1;
        }

        this.ga = this.cache(player, 0);
        this.gb = this.cache(target, 1);

        let score = 0;
        for (let i = 0; i < iterations; i++) {
            score += this.battle();
        }

        return score / iterations;
    }

    cache (array, index) {
        return array.map((player) => SimulatorModel.create(index, player));
    }

    battle () {
        this.la = [ ... this.ga ];
        this.lb = [ ... this.gb ];

        for (const player of this.la) player.resetHealth();
        for (const player of this.lb) player.resetHealth();

        while (this.la.length > 0 && this.lb.length > 0) {
            this.a = this.la[0];
            this.b = this.lb[0];

            SimulatorModel.initializeFighters(this.a, this.b);

            if (this.fight() == 0) {
                this.la.shift();
            } else {
                this.lb.shift();
            }
        }

        return this.la.length > 0 ? 1 : 0;
    }
}
