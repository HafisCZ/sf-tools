FIGHT_DUMP_ENABLED = false;
FIGHT_DUMP_OUTPUT = [];

// WebWorker hooks
self.addEventListener('message', function (message) {
    let { units, players, iterations } = message.data;
    let timestamp = Date.now();

    if (units && players) {
        new UnderworldSimulator().simulate(units, players, iterations);

        self.postMessage({
            command: 'finished',
            results: players,
            time: Date.now() - timestamp
        })
    }

    self.close();
});

class UnderworldSimulator extends SimulatorBase {
    simulate (units, players, iterations) {
        for (let i = 0; i < players.length; i++) {
            this.cache(units, players[i].player);

            let score = 0;
            for (let j = 0; j < iterations; j++) {
                score += this.battle();
            }

            players[i].score = 100 * score / iterations;
        }
    }

    cache (units, player) {
        this.units = units.map(unit => {
            let model = FighterModel.create(0, unit);
            model.AttackFirst = false;

            return model;
        });


        this.player = FighterModel.create(1, player);
        this.player.AttackFirst = false;
    }

    battle () {
        this.la = [ ...this.units ];
        this.lb = [ this.player ];

        for (let p of this.la) p.reset();
        for (let p of this.lb) p.reset();

        // Run fight
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

        return (this.la.length > 0 ? this.la[0].Index : this.lb[0].Index) == 0;
    }
}
