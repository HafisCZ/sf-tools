// WebWorker hooks
self.addEventListener('message', function ({ data: { flags, config, player, target, mode, iterations, log } }) {
    FLAGS.set(flags);
    CONFIG.set(config);

    if (log) {
        FIGHT_LOG_ENABLED = true;
    }

    // Sim type decision
    if (mode == 'all') {
        self.postMessage({
            results: new FightSimulator().simulateMultiple(player, target, iterations),
            logs: FIGHT_LOG.dump()
        });
    } else if (mode == 'attack') {
        self.postMessage({
            results: new FightSimulator().simulateSingle(player, target, iterations, false),
            logs: FIGHT_LOG.dump()
        });
    } else if (mode == 'defend') {
        self.postMessage({
            results: new FightSimulator().simulateSingle(player, target, iterations, true),
            logs: FIGHT_LOG.dump()
        });
    } else if (mode == 'tournament') {
        self.postMessage({
            results: new FightSimulator().simulateTournament(player, target, iterations),
            logs: FIGHT_LOG.dump()
        });
    }

    self.close();
});

class FightSimulator extends SimulatorBase {
    // Fight 1vAl only
    simulateMultiple (player, targets, iterations) {
        let score = 0;
        let min = iterations;
        let max = 0;

        for (let i = 0; i < targets.length; i++) {
            if (player.index != targets[i].index) {
                let subscore = 0;
                this.cache(player.player, targets[i].player);

                for (let j = 0; j < iterations; j++) {
                    subscore += this.fight();
                }

                score += subscore;

                if (subscore > max) {
                    max = subscore;
                }

                if (subscore < min) {
                    min = subscore;
                }
            }
        }

        player.score = {
            avg: 100 * score / (targets.length - 1) / iterations,
            min: 100 * min / iterations,
            max: 100 * max / iterations
        };

        return player;
    }

    // Tournament only
    simulateTournament (player, targets, iterations) {
        player.score = {
            avg: 0,
            max: targets.findIndex(p => p.index == player.index)
        };

        for (let i = 0; i < targets.length; i++) {
            let subscore = 0;
            this.cache(player.player, targets[i].player);

            for (let j = 0; j < iterations; j++) {
                subscore += this.fight();
            }

            if (subscore > iterations / 2) {
                player.score.avg++;
            } else {
                break;
            }
        }

        return player;
    }

    // Fight 1v1s only
    simulateSingle (player, target, iterations, invert) {
        if (player.player == target.player) {
            target.score = {
                avg: 50
            };
        } else {
            let score = 0;
            this.cache(player.player, target.player);

            for (let i = 0; i < iterations; i++) {
                score += this.fight();
            }

            if (invert) {
                score = iterations - score;
            }

            target.score = {
                avg: 100 * score / iterations
            };
        }

        return target;
    }

    // Cache Players initially
    cache (source, target) {
        this.ca = FighterModel.create(0, source);
        this.cb = FighterModel.create(1, target);

        FighterModel.initializeFighters(this.ca, this.cb);
    }

    fight () {
        this.a = this.ca;
        this.b = this.cb;

        if (FIGHT_LOG_ENABLED) {
            FIGHT_LOG.logInit(this.a, this.b);
        }

        this.a.reset();
        this.b.reset();

        return super.fight();
    }
}
