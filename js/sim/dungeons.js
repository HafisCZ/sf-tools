// WebWorker hooks
self.addEventListener('message', function (message) {
    let players = message.data.players;
    let boss = message.data.boss;
    let index = message.data.index;
    let hpcap = message.data.hpcap || 5000;
    let iterations = message.data.iterations || 100000;
    if (message.data.log) {
        FIGHT_LOG_ENABLED = true;
    }

    if (players && boss) {
        self.postMessage({
            command: 'finished',
            results: new DungeonSimulator().simulate(players, boss, iterations, hpcap),
            log: FIGHT_LOG.dump(),
            index: index
        });
    }

    self.close();
});

class DungeonSimulator extends SimulatorBase {
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

    battle () {
        this.la = [ ... this.cache_players ];
        this.lb = [ this.cache_boss ];

        // Reset health
        for (let p of this.la) p.reset();
        for (let p of this.lb) p.reset();

        // Run fight
        while (this.la.length > 0 && this.lb.length > 0) {
            this.a = this.la[0];
            this.b = this.lb[0];

            this.a.initialize(this.b);
            this.b.initialize(this.a);

            if (FIGHT_LOG_ENABLED) {
                FIGHT_LOG.logInit(this.a, this.b);
            }

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
}
