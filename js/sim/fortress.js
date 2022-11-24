// WebWorker hooks
self.addEventListener('message', function ({ data: { iterations, player, target, index } }) {
    self.postMessage({
        score: new FortressSimulator().simulate(player, target, iterations),
        index
    });

    self.close();
});

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

            FighterModel.initializeFighters(this.a, this.b);

            if (this.fight() == 0) {
                this.la.shift();
            } else {
                this.lb.shift();
            }
        }

        return this.la.length > 0 ? 1 : 0;
    }

    fight () {
        // Reset counters
        this.a.reset(false);
        this.b.reset(false);

        return super.fight();
    }
}
