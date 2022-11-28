// WebWorker hooks
self.addEventListener('message', function ({ data: { flags, player, players, mode, iterations, log } }) {
    SIMULATOR_FLAGS.set(flags);

    if (log) {
        FIGHT_LOG_ENABLED = true;
    }

    var ts = Date.now();

    // Set default
    iterations ||= 100000;

    // Sim type decision
    if (mode == 'all') {
        new FightSimulator().simulateMultiple(player, players, iterations);
        self.postMessage({
            results: player,
            logs: FIGHT_LOG.dump(),
            time: Date.now() - ts
        });
    } else if (mode == 'attack') {
        new FightSimulator().simulateSingle(player, players, iterations, false);
        self.postMessage({
            results: players,
            logs: FIGHT_LOG.dump(),
            time: Date.now() - ts
        });
    } else if (mode == 'defend') {
        new FightSimulator().simulateSingle(player, players, iterations, true);
        self.postMessage({
            results: players,
            logs: FIGHT_LOG.dump(),
            time: Date.now() - ts
        });
    } else if (mode == 'tournament') {
        new FightSimulator().simulateTournament(player, players, iterations);
        self.postMessage({
            results: player,
            logs: FIGHT_LOG.dump(),
            time: Date.now() - ts
        });
    }

    self.close();
});

class FightSimulator extends SimulatorBase {
    // Fight group
    simulate (players, iterations = 100000, target = null, assource = false) {
        var scores = [];
        for (var i = 0; i < players.length; i++) {
            var score = 0;
            var min = iterations;
            var max = 0;

            if (target) {
                if (assource) {
                    this.cache(target, players[i].player);
                    for (var k = 0; k < iterations; k++) {
                        score += this.fight();
                    }

                    players[i].score = {
                        avg: 100 * score / iterations,
                        min: 100 * score / iterations,
                        max: 100 * score / iterations
                    };
                } else {
                    this.cache(players[i].player, target);
                    for (var k = 0; k < iterations; k++) {
                        score += this.fight();
                    }

                    players[i].score = {
                        avg: 100 * score / iterations,
                        min: 100 * score / iterations,
                        max: 100 * score / iterations
                    };
                }
            } else {
                for (var j = 0; j < players.length; j++) {
                    if (i != j) {
                        var s = 0;

                        this.cache(players[i].player, players[j].player);
                        for (var k = 0; k < iterations; k++) {
                            s += this.fight();
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
        }

        if (!target && players.length == 2) {
            players[1].score.avg = 100 - players[0].score.avg,
            players[1].score.min = players[1].score.avg;
            players[1].score.max = players[1].score.avg;
        }
    }

    // Fight 1vAl only
    simulateMultiple (player, players, iterations) {
        var scores = [];
        for (var i = 0; i < player.length; i++) {
            var score = 0;
            var min = iterations;
            var max = 0;

            for (var j = 0; j < players.length; j++) {
                if (player[i].index != players[j].index) {
                    var s = 0;
                    this.cache(player[i].player, players[j].player);
                    for (var k = 0; k < iterations; k++) {
                        s += this.fight();
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

            player[i].score = {
                avg: 100 * score / (players.length - 1) / iterations,
                min: 100 * min / iterations,
                max: 100 * max / iterations
            };
        }

        if (player.length == 2 && players.length == 2) {
            player[0].score.min = player[0].score.avg;
            player[0].score.max = player[0].score.avg;

            player[1].score.avg = 100 - player[0].score.avg,
            player[1].score.min = player[1].score.avg;
            player[1].score.max = player[1].score.avg;
        }
    }

    // Tournament only
    simulateTournament (player, players, iterations) {
        for (var i = 0; i < player.length; i++) {
            player[i].score = {
                avg: 0,
                max: players.findIndex(p => p.index == player[i].index)
            };

            for (var j = 0; j < players.length; j++) {
                var s = 0;
                this.cache(player[i].player, players[j].player);
                for (var k = 0; k < iterations; k++) {
                    s += this.fight();
                }

                if (s > iterations / 2) {
                    player[i].score.avg++;
                } else {
                    break;
                }
            }
        }
    }

    // Fight 1v1s only
    simulateSingle (player, players, iterations, invert) {
        var scores = [];
        for (var i = 0; i < players.length; i++) {
            if (player.player == players[i].player) {
                players[i].score = {
                    avg: 50
                };
            } else {
                var score = 0;
                this.cache(player.player, players[i].player);

                for (var j = 0; j < iterations; j++) {
                    score += this.fight();
                }

                if (invert) {
                    score = iterations - score;
                }

                players[i].score = {
                    avg: 100 * score / iterations
                };
            }
        }
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
