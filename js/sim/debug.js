// Logger is always enabled
FIGHT_LOG_ENABLED = true;
FIGHT_LOG_STORE_STATE = true;

self.addEventListener('message', function ({ data: { flags, config, players } }) {
    FLAGS.set(flags);
    CONFIG.set(config);

    self.postMessage({
        json: new DebugSimulator().generate(players)
    });

    self.close();
});

class DebugSimulator extends SimulatorBase {
    _pairs (array) {
        let output = [];

        for (let i = 0; i < array.length; i++) {
            // output.push({ player1: array[i], player2: array[i] });

            for (let j = i + 1; j < array.length; j++) {
                output.push({ player1: array[i], player2: array[j] });
            }
        }

        return output;
    }

    generate (players) {
        let matches = [];

        for (let { player1, player2 } of this._pairs(players)) {
            [this.a, this.b] = this.prepare(player1, player2);

            matches.push({
                fighters: this.prepare(player1, player2),
                sample: FIGHT_LOG.lastLog.rounds
            });

            FIGHT_LOG.clear();
        }

        return matches;
    }

    prepare (player1, player2) {
        let fighter1 = FighterModel.create(0, player1);
        let fighter2 = FighterModel.create(1, player2);

        FighterModel.initializeFighters(fighter1, fighter2);

        fighter1.reset();
        fighter2.reset();

        return [ fighter1, fighter2 ];
    }
}
